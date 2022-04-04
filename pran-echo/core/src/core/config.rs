use dotenv::dotenv;
use std::{env};
use std::fmt::{Display, Formatter};

pub struct Config {
    pub static_path: String,
    pub use_gentle: bool,
    pub gentle_address: String,
    pub gentle_port: u16,
    pub port: u16
}

impl Config {
    pub fn new() -> Config {
        dotenv().ok();

        Config {
            static_path: env::var("STATIC_PATH").expect("STATIC_PATH missing in env variables. .env not existing?"),
            port: env::var("PORT").or(Ok("8000".to_string())).and_then(|port| port.parse::<u16>()).expect("PORT not a number"),
            use_gentle: env::var("USE_GENTLE").or(Ok(true.to_string())).and_then(|use_gentle| use_gentle.parse::<bool>()).expect("USE_GENTLE not a bool"),
            gentle_address: env::var("GENTLE_ADDRESS").unwrap_or("http://127.0.0.1".to_string()),
            gentle_port: env::var("GENTLE_PORT").or(Ok("8765".to_string())).and_then(|port| port.parse::<u16>()).expect("GENTLE_PORT not a number")
        }
    }
}

impl Display for Config {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let base_info = format!("Server configuration:\n\tStatic path: {}\n\tPort: {}", self.static_path, self.port);
        let gentle_info: String;
        if self.use_gentle {
            gentle_info = format!("Using Gentle:\n\tAddress: {}\n\tPort: {}", self.gentle_address, self.gentle_port);
        } else {
            gentle_info = "Not using Gentle".to_string();
        }
        write!(f, "{}\n{}", base_info, gentle_info)
    }
}