use std::env;
use std::str::FromStr;

#[derive(Debug)]
pub struct Config {
    pub static_path: String,
    pub api_port: u16,
    pub deta_project_key: String,
    pub deta_project_id: String,
    pub read_api_secret_key: String,
    pub write_api_secret_key: String,
    pub mode: RuntimeMode,
}

#[derive(Debug)]
pub enum RuntimeMode {
    Development,
    Production
}

impl FromStr for RuntimeMode {
    type Err = ();

    fn from_str(input: &str) -> Result<RuntimeMode, Self::Err> {
        match input {
            "Development" => Ok(RuntimeMode::Development),
            "Production" => Ok(RuntimeMode::Production),
            _ => Err(()),
        }
    }
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
            mode: env::var("MODE").or_else(|_| Ok("Development".to_string())).and_then(|mode| mode.parse::<RuntimeMode>()).expect("MODE not a mode, can be Development or Production")
        }
    }
}