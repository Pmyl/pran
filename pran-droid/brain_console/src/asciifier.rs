use std::fs::File;
use std::{thread};
use std::io::{Write};
use std::time::Duration;
use console::{Term};
use image::{AnimationDecoder, GenericImageView, Pixel, RgbaImage};
use image::codecs::gif::GifDecoder;

const HEIGHT: usize = 20;
const WIDTH: usize = 90;
const HEIGHT_F32: f32 = HEIGHT as f32;
const WIDTH_F32: f32 = WIDTH as f32;
const COLOURS: [&str; 11] = ["$", "@", "+", "-", ";", ":", ",", "'", "`", ".", " "];
const COLOURS_TO_INDEX: usize = COLOURS.len() - 1;

// DO NOT MODIFY THIS, CODE IS IN PROJECT Asciifier
pub fn asciify_gif(file_path: &str) {
    let mut terminal = Term::stdout();
    let file = File::open(file_path).unwrap();
    let mut decoder = GifDecoder::new(file).unwrap().into_frames();

    let mut image_height = 0;
    let mut image_width = 0;
    let mut image_height_f32 = 0f32;
    let mut image_width_f32 = 0f32;
    let mut luminance_map = [[0u8; HEIGHT]; WIDTH];
    terminal.hide_cursor().ok();

    if let Some(Ok(first_frame)) = decoder.next() {
        let buffer = first_frame.buffer();

        if image_height == 0 {
            image_height = buffer.height();
            image_height_f32 = image_height as f32;
        }
        if image_width == 0 {
            image_width = buffer.width();
            image_width_f32 = image_width as f32;
        }
        draw_frame(&image_height, &image_width, &image_height_f32, &image_width_f32, &mut luminance_map, buffer, &mut terminal);
    }

    while let Some(Ok(frame)) = decoder.next() {
        thread::sleep(Duration::from_millis(200));
        terminal.move_cursor_up(HEIGHT).ok();
        let buffer = frame.buffer();

        draw_frame(&image_height, &image_width, &image_height_f32, &image_width_f32, &mut luminance_map, buffer, &mut terminal);
    }
    thread::sleep(Duration::from_millis(1000));
    terminal.show_cursor().ok();
}

fn draw_frame(image_height: &u32, image_width: &u32, image_height_f32: &f32, image_width_f32: &f32, luminance_map: &mut [[u8; HEIGHT]; WIDTH], buffer: &RgbaImage, terminal: &mut Term) {
    for i in 0..*image_width {
        for j in 0..*image_height {
            unsafe {
                let rgba = buffer.unsafe_get_pixel(i, j);
                let luminance = rgba.to_luma();
                let target_i = (WIDTH_F32 / image_width_f32 * (i as f32)).floor() as usize;
                let target_j = (HEIGHT_F32 / image_height_f32 * (j as f32)).floor() as usize;
                luminance_map[target_i][target_j] = luminance.0[0];
            }
        }
    }

    for j in 0..HEIGHT {
        for i in 0..WIDTH {
            terminal.write(COLOURS[(luminance_map[i][j] as f32 / 255f32 * COLOURS_TO_INDEX as f32).round() as usize].as_bytes()).ok();
        }
        terminal.write_line("").ok();
    }
}
