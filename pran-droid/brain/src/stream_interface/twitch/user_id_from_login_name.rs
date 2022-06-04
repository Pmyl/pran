use serde::{Deserialize};
use crate::stream_interface::twitch::twitch_interface::TwitchConnectOptions;

#[derive(Deserialize, Debug)]
#[serde(untagged)]
enum TwitchUsersResponse {
    Success { data: Vec<TwitchUsersResponseData> },
    Error { error: String, status: u16, message: String }
}

#[derive(Deserialize, Debug)]
struct TwitchUsersResponseData {
    id: String
}

pub async fn user_id_from_login_name(options: TwitchConnectOptions) -> u32 {
    info!("Fetching channel id for user {:?}", options.channel);

    let client = reqwest::Client::new();
    let response = client.get(format!("https://api.twitch.tv/helix/users?login={}", options.channel))
        .header("Authorization", format!("Bearer {}", options.token))
        .header("Client-Id", options.client_id)
        .send()
        .await.unwrap()
        .json::<TwitchUsersResponse>()
        .await.unwrap();
    
    match response {
        TwitchUsersResponse::Success { data: users } => {
            let TwitchUsersResponseData { id } = users.first().unwrap();
            let id = id.parse::<u32>().unwrap();
            
            info!("Channel id fetched {}", id);
            id
        },
        response => {
            panic!("{:?}", response);
        }
    }
}