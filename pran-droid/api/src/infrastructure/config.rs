use std::env;

#[derive(Debug)]
pub struct Config {
    pub static_path: String,
    pub api_port: u16,
    pub deta_project_key: String,
    pub deta_project_id: String,
    pub read_api_secret_key: String,
    pub write_api_secret_key: String,
}

impl Config {
    pub fn new() -> Config {
        Config {
            static_path: env::var("STATIC_PATH").expect("STATIC_PATH missing in env variables. .env not existing?"),
            api_port: env::var("API_PORT").or(Ok("8000".to_string())).and_then(|port| port.parse::<u16>()).expect("API_PORT not a number"),
            deta_project_key: env::var("DETA_PROJECT_KEY").expect("DETA_PROJECT_KEY missing in env variables"),
            deta_project_id: env::var("DETA_PROJECT_ID").expect("DETA_PROJECT_ID missing in env variables"),
            read_api_secret_key: env::var("READ_API_SECRET_KEY").expect("READ_API_SECRET_KEY missing in env variables"),
            write_api_secret_key: env::var("WRITE_API_SECRET_KEY").expect("WRITE_API_SECRET_KEY missing in env variables"),
        }
    }
}