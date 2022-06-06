#[macro_use] extern crate log;

use dotenv::dotenv;
use futures::channel::mpsc::{unbounded, UnboundedSender};
use futures::{future, pin_mut, TryStreamExt};
use futures::stream::{StreamExt};
use log::LevelFilter;
use simplelog::{Config, SimpleLogger};
use std::collections::HashMap;
use std::env;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::tungstenite::Message;
use pran_droid_core::application::brain::pran_droid_brain::create_droid_brain;
use pran_droid_core::domain::brain::stimuli::{Source, Stimulus};
use pran_droid_core::domain::reactions::reaction_definition::{ReactionDefinition, ReactionTrigger};
use pran_droid_core::domain::reactions::reaction_repository::ReactionRepository;
use pran_droid_core::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
use crate::future::join;
use crate::stream_interface::events::{ChatEvent, ChatMessage};
use crate::stream_interface::twitch::twitch_interface::{connect_to_twitch, TwitchConnectOptions};
use crate::websocket_output::outputs::ReactionOutput;

mod stream_interface;
mod websocket_output;
mod test_database;

#[tokio::main]
async fn main() {
    dotenv().ok();
    init_logger();

    let reaction_repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
    test_database::build_test_database::build_test_database(reaction_repository.clone());

    let brain = create_droid_brain(&reaction_repository).await;

    let token = authenticate(
        env::var("CLIENT_SECRET").unwrap(),
        env::var("OLD_TOKEN").unwrap()
    ).await;

    let mut event_stream = connect_to_twitch(TwitchConnectOptions {
        token,
        channel: env::var("CHANNEL").unwrap(),
        client_id: env::var("CLIENT_ID").unwrap(),
        user: env::var("USER").unwrap()
    }).await;

    let ws_listeners: Arc<Mutex<HashMap<SocketAddr, UnboundedSender<Message>>>> = Arc::new(Mutex::new(HashMap::new()));
    let websocket = init_websocket(ws_listeners.clone());

    let brain_execution = tokio::spawn(async move {
        while let Some(event) = event_stream.next().await {
            if let Some(reaction) = brain.stimulate(event.into()) {
                let message = serde_json::to_string(&Into::<ReactionOutput>::into(reaction)).unwrap();

                for ws_listener in ws_listeners.lock().unwrap().iter().map(|(_, ws_listener)| ws_listener) {
                    ws_listener.unbounded_send(Message::Text(message.clone())).unwrap();
                }
            }
        }
    });

    join(websocket, brain_execution).await;

    info!("End process");
}

async fn init_websocket(ws_listeners: Arc<Mutex<HashMap<SocketAddr, UnboundedSender<Message>>>>) {
    let addr = format!("127.0.0.1:{}", env::var("WEBSOCKET_PORT").unwrap());

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

fn init_logger() {
    if let Err(_) = SimpleLogger::init(LevelFilter::Info, Config::default()) {
        eprintln!("Failed initializing logger for the application, nothing will be logged.");
    }
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

impl Into<Stimulus> for ChatEvent {
    fn into(self) -> Stimulus {
        match self {
            ChatEvent::Message(chat_message) => Stimulus::ChatMessage {
                text: chat_message.content,
                source: Source {
                    is_mod: chat_message.is_mod, user_name: chat_message.name
                }
            },
            ChatEvent::Action(_) => todo!("unhandled action type")
        }
    }
}