use rocket::fs::TempFile;

#[derive(FromForm)]
pub struct AudioUpload<'f> {
    pub recording: TempFile<'f>
}

#[derive(FromForm)]
pub struct AudioWithTextUpload<'f> {
    pub recording: TempFile<'f>,
    pub text: String
}

#[derive(FromForm)]
pub struct Text {
    pub text: String
}