#[macro_use] extern crate log;

mod phonemiser;
#[cfg(feature="twitch")]
pub mod stream_interface;
#[cfg(feature="twitch")]
pub mod run;
pub mod simulate;
pub mod brain_output;
