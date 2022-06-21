use uuid::Uuid;

pub trait IdGenerator: Send + Sync {
    fn next_id(&mut self) -> String;
}

pub struct IdGeneratorUuid;
impl IdGeneratorUuid {
    pub fn new() -> Self { Self }
}

pub struct IdGeneratorInMemoryIncremental(u16);
impl IdGeneratorInMemoryIncremental {
    pub fn new() -> Self { Self(0) }
}

impl IdGenerator for IdGeneratorUuid {
    fn next_id(&mut self) -> String {
        Uuid::new_v4().to_string()
    }
}

impl IdGenerator for IdGeneratorInMemoryIncremental {
    fn next_id(&mut self) -> String {
        let new_id = self.0.to_string();
        self.0 += 1;

        new_id
    }
}