#[macro_use] extern crate log;

use futures::channel::mpsc::{unbounded, UnboundedSender};
use futures::{future, pin_mut, TryStreamExt};
use futures::stream::{StreamExt};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use serde::Serialize;
use pran_phonemes_core::phonemes::phonemise_text;
use reqwest::Client;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::tungstenite::Message;
use pran_droid_core::application::brain::pran_droid_brain::{create_droid_brain, TextPhonemiser};
use pran_droid_core::domain::brain::pran_droid_brain::ReactionNotifier;
use pran_droid_core::domain::brain::stimuli::{ChatMessageStimulus, Source, Stimulus};
use pran_droid_core::domain::reactions::reaction_definition::ReactionDefinitionId;
use pran_droid_core::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;
use crate::future::join;
use crate::stream_interface::events::{ChatEvent};
use crate::stream_interface::twitch::twitch_interface::{connect_to_twitch, TwitchConnectOptions};
use crate::websocket_output::outputs::ReactionOutput;

mod stream_interface;
mod websocket_output;

struct PranTextPhonemiser {}

impl TextPhonemiser for PranTextPhonemiser {
    fn phonemise_text(&self, text: &str) -> Vec<String> {
        debug!("Start phonemise {}", text);
        let result = phonemise_text(text.to_string()).unwrap().phonemes.into_iter().flat_map(|s| s).collect();
        debug!("End phonemise {:?}", &result);

        result
    }
}

struct ApiReactionNotifier { api_secret_key: String, api_base_path: String }
impl ReactionNotifier for ApiReactionNotifier {
    fn notify_reaction_usage(&self, reaction_definition_id: &ReactionDefinitionId, new_count: u32) {
        #[derive(Serialize)]
        struct CountUpdatePatchRequest { count: u32 }

        let definition_id = reaction_definition_id.0.clone();
        let api_base_path = self.api_base_path.clone();
        let api_secret_key = self.api_secret_key.clone();
        tokio::spawn(async move {
            Client::new().patch(format!("{}/reactions/{}", api_base_path, definition_id))
                .body(serde_json::to_string(&CountUpdatePatchRequest { count: new_count }).unwrap())
                .header("Content-Type", "application/json")
                .header("api_secret_key", api_secret_key.as_str())
                .send().await.ok();
        });
    }
}


pub struct PranDroidBrainConfig {
    pub twitch_client_secret: String,
    pub twitch_client_id: String,
    pub twitch_token: String,
    pub twitch_channel: String,
    pub twitch_user: String,
    pub websocket_port: u16,
    pub api_base_path: String,
    pub api_secret_key: String,
}

pub async fn start_droid_brain(
    config: PranDroidBrainConfig,
    reaction_repository: Arc<dyn ReactionDefinitionRepository>
) {
    pran_phonemes_core::phonemes::pran_phonemes().expect("PranPhonemes failed to initialise");

    let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(PranTextPhonemiser {});
    let reaction_notifier: Arc<dyn ReactionNotifier> = Arc::new(ApiReactionNotifier {
        api_base_path: config.api_base_path,
        api_secret_key: config.api_secret_key
    });
    let mut brain = create_droid_brain(&reaction_repository, &text_phonemiser, &reaction_notifier).await;

    let token = authenticate(
        config.twitch_client_secret,
        config.twitch_token
    ).await;

    let mut event_stream = connect_to_twitch(TwitchConnectOptions {
        token,
        channel: config.twitch_channel,
        client_id: config.twitch_client_id,
        user: config.twitch_user
    }).await;

    let ws_listeners: Arc<Mutex<HashMap<SocketAddr, UnboundedSender<Message>>>> = Arc::new(Mutex::new(HashMap::new()));
    let websocket = init_websocket(config.websocket_port, ws_listeners.clone());

    let brain_execution = tokio::spawn(async move {
        while let Some(event) = event_stream.next().await {
            Into::<Option<Stimulus>>::into(event)
                .and_then(|stimulus| brain.stimulate(stimulus))
                .map(|reaction| {
                    debug!("Sending message with reaction {:?}", reaction);
                    let message = serde_json::to_string(&Into::<ReactionOutput>::into(reaction)).unwrap();

                    for ws_listener in ws_listeners.lock().unwrap().iter().map(|(_, ws_listener)| ws_listener) {
                        ws_listener.unbounded_send(Message::Text(message.clone())).unwrap();
                    }
                    debug!("Message sent {:?}", message);
                });
        }
    });

    let _ = join(websocket, brain_execution).await;

    info!("End process");
}

async fn init_websocket(port: u16, ws_listeners: Arc<Mutex<HashMap<SocketAddr, UnboundedSender<Message>>>>) {
    let addr = format!("127.0.0.1:{}", port);

    let try_socket = TcpListener::bind(&addr).await;
    let listener = try_socket.expect("Failed to bind");
    info!("Websocket listening on: {}", addr);

    while let Ok((stream, addr)) = listener.accept().await {
        tokio::spawn(handle_connection(ws_listeners.clone(), stream, addr));
    }
}

async fn handle_connection(ws_listeners: Arc<Mutex<HashMap<SocketAddr, UnboundedSender<Message>>>>, stream: TcpStream, addr: SocketAddr) {
    let ws_stream = tokio_tungstenite::accept_async(stream)
        .await
        .expect("Error during the websocket handshake occurred");
    let (tx, rx) = unbounded();
    ws_listeners.lock().unwrap().insert(addr, tx);

    info!("WebSocket connection established: {}", addr);
    let (outgoing, incoming) = ws_stream.split();
    let forwarding_stream = rx.map(Ok).forward(outgoing);

    let incoming_stream = incoming.try_for_each(|_| { future::ok(()) });

    pin_mut!(forwarding_stream, incoming_stream);
    future::select(forwarding_stream, incoming_stream).await;
    info!("WebSocket connection closed: {}", addr);

    ws_listeners.lock().unwrap().remove(&addr);
}

async fn authenticate(client_secret: String, old_token: String) -> String {
    let client_secret = twitch_oauth2::ClientSecret::new(client_secret);

    let token = twitch_oauth2::UserToken::from_existing(
        &reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .build().unwrap(),
        twitch_oauth2::AccessToken::new(old_token),
        None,
        client_secret
    ).await.expect("Could not authenticate");

    token.access_token.secret().to_string()
}

impl Into<Option<Stimulus>> for ChatEvent {
    fn into(self) -> Option<Stimulus> {
        match self {
            ChatEvent::Message(chat_message) => Some(Stimulus::ChatMessage(ChatMessageStimulus {
                text: chat_message.content,
                source: Source {
                    is_mod: chat_message.is_mod, user_name: chat_message.name
                }
            })),
            ChatEvent::Action(_) => None
        }
    }
}
