use std::fmt::{Debug, Display, Formatter};
use std::future::Future;
use reqwest::{Client, Error, RequestBuilder, Response};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Clone)]
pub struct Deta {
    project_key: String,
    project_id: String
}

pub enum DetaService {
    Database,
    Drive
}

impl Display for DetaService {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            DetaService::Database => write!(f, "database"),
            DetaService::Drive => write!(f, "drive")
        }
    }
}

impl Deta {
    pub fn new(project_key: String, project_id: String) -> Self {
        Self { project_key, project_id }
    }

    pub fn base(&self, base_name: &str) -> Base {
        Base::new(self.clone(), base_name)
    }

    pub fn drive(&self, drive_name: &str) -> Drive {
        Drive::new(self.clone(), drive_name)
    }

    pub fn get_on(&self, service: DetaService, url: &str) -> RequestBuilder {
        Client::new().get(format!("https://{}.deta.sh/v1/{}/{}", service, self.project_id, url))
            .header("X-API-Key", self.project_key.clone())
    }

    pub fn get_json_on(&self, service: DetaService, url: &str) -> impl Future<Output = Result<Response, Error>> {
        self.get_on(service, url)
            .header("Content-Type", "application/json")
            .send()
    }

    pub fn post_on(&self, service: DetaService, url: &str) -> RequestBuilder {
        Client::new().post(format!("https://{}.deta.sh/v1/{}/{}", service, self.project_id, url))
            .header("X-API-Key", self.project_key.clone())
    }

    pub fn post_json_on(&self, service: DetaService, url: &str, body: String) -> impl Future<Output = Result<Response, Error>> {
        self.post_on(service, url)
            .header("Content-Type", "application/json")
            .body(body)
            .send()
    }

    pub fn put_json_on(&self, service: DetaService, url: &str, body: String) -> impl Future<Output = Result<Response, Error>> {
        Client::new().put(format!("https://{}.deta.sh/v1/{}/{}", service, self.project_id, url))
            .header("X-API-Key", self.project_key.clone())
            .header("Content-Type", "application/json")
            .body(body)
            .send()
    }

    pub fn delete_on(&self, service: DetaService, url: &str) -> impl Future<Output = Result<Response, Error>> {
        Client::new().delete(format!("https://{}.deta.sh/v1/{}/{}", service, self.project_id, url))
            .header("X-API-Key", self.project_key.clone())
            .send()
    }

    pub fn delete_json_on(&self, service: DetaService, url: &str, body: String) -> impl Future<Output = Result<Response, Error>> {
        Client::new().delete(format!("https://{}.deta.sh/v1/{}/{}", service, self.project_id, url))
            .header("X-API-Key", self.project_key.clone())
            .header("Content-Type", "application/json")
            .body(body)
            .send()
    }
}

pub struct Base {
    base_name: String,
    deta: Deta
}

pub struct Drive {
    drive_name: String,
    deta: Deta
}

#[derive(Debug)]
pub enum GetError {
    Unexpected(String),
    NotFound
}

#[derive(Debug)]
pub enum InsertError {
    Unexpected(String),
    Conflict,
    BadRequest(String)
}

#[derive(Debug)]
pub enum PutError {
    Unexpected(String),
    BadRequest(String)
}

#[derive(Debug)]
pub enum DeleteError {
    Unexpected(String)
}

#[derive(Debug)]
pub enum DownloadError {
    Unexpected(String),
    BadRequest(String),
    NotFound(String),
}

#[derive(Debug)]
pub enum ListError {
    Unexpected(String),
    BadRequest(String),
    NotFound,
}

#[derive(Debug)]
pub enum QueryError {
    Unexpected(String),
    BadRequest(String)
}

#[derive(Debug, Deserialize, Serialize)]
struct Item<I> {
    item: I
}

#[derive(Debug, Deserialize, Serialize)]
struct Items<I> {
    items: Vec<I>
}

#[derive(Debug, Serialize)]
struct DeleteNames {
    names: Vec<String>
}

#[derive(Debug, Deserialize)]
pub enum PutResponse<I> {
    #[serde(rename = "processed")]
    Processed { items: Vec<I> },
    #[serde(rename = "failed")]
    Failed { items: Vec<I> }
}

#[derive(Clone, Debug, Default, Serialize)]
pub struct Query {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub query: Option<Vec<Map<String, Value>>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last: Option<String>
}

#[derive(Clone, Debug, Default)]
pub struct QueryAll {
    pub query: Option<Vec<Map<String, Value>>>,
}

#[derive(Debug, Deserialize)]
pub struct QueryResponse<I> {
    pub paging: Paging,
    pub items: Vec<I>
}

#[derive(Debug, Deserialize)]
pub struct ListResult {
    pub paging: Option<Paging>,
    pub names: Vec<String>
}

#[derive(Debug, Deserialize)]
pub struct Paging {
    pub size: u16,
    pub last: Option<String>
}

#[derive(Deserialize)]
struct AnyItem {
    key: String
}

impl Base {
    pub fn new(deta: Deta, base_name: &str) -> Self {
        Self { deta, base_name: base_name.to_string() }
    }

    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> Result<T, GetError> {
        self.deta.get_json_on(DetaService::Database, format!("{}/items/{}", self.base_name, key).as_str())
            .await
            .and_then(|response| response.error_for_status())
            .map_err(|error| match error.status() {
                Some(status_code) if status_code.as_u16() == 404 => GetError::NotFound,
                _ => GetError::Unexpected(error.to_string())
            })?
            .json::<T>()
            .await
            .map_err(|error| GetError::Unexpected(format!("{}", error)))
    }

    pub async fn put<T: DeserializeOwned + Serialize>(&self, data: Vec<T>) -> Result<PutResponse<T>, PutError> {
        let response = self.deta.put_json_on(
            DetaService::Database,
            format!("{}/items", self.base_name).as_str(),
            serde_json::to_string(&Items { items: data }).map_err(|error| PutError::Unexpected(error.to_string()))?
        ).await.map_err(|error| PutError::Unexpected(format!("{}", error)))?;

        match response.status().as_u16() {
            207 => Ok(response),
            400 => Err(PutError::BadRequest(response.text().await.map_err(|error| PutError::Unexpected(format!("{}", error)))?)),
            _ => Err(PutError::Unexpected(format!("{:?}", response)))
        }?
            .json::<PutResponse<T>>()
            .await
            .map_err(|error| PutError::Unexpected(format!("{}", error)))
    }

    pub async fn insert<T: DeserializeOwned + Serialize>(&self, data: T) -> Result<T, InsertError> {
        let response = self.deta.post_json_on(
            DetaService::Database,
            format!("{}/items", self.base_name).as_str(),
            serde_json::to_string(&Item { item: data }).map_err(|error| InsertError::Unexpected(error.to_string()))?
        ).await.map_err(|error| InsertError::Unexpected(format!("{}", error)))?;

        match response.status().as_u16() {
            201 => Ok(response),
            409 => Err(InsertError::Conflict),
            400 => Err(InsertError::BadRequest(response.text().await.map_err(|error| InsertError::Unexpected(format!("{}", error)))?)),
            _ => Err(InsertError::Unexpected(format!("{:?}", response)))
        }?
            .json::<T>()
            .await
            .map_err(|error| InsertError::Unexpected(format!("{}", error)))
    }

    pub async fn delete(&self, key: &str) -> Result<(), String> {
        self.deta.delete_on(DetaService::Database, format!("{}/items/{}", self.base_name.as_str(), key).as_str())
            .await.map(|_| ()).map_err(|error| error.to_string())
    }

    pub async fn query<T: DeserializeOwned>(&self, query: Query) -> Result<QueryResponse<T>, QueryError> {
        self.query_ref(&query).await
    }

    pub async fn query_all<T: DeserializeOwned>(&self, query_all: QueryAll) -> Result<Vec<T>, QueryError> {
        let mut items = vec![];
        let mut query = Query {
            query: query_all.query,
            .. Query::default()
        };

        loop {
            let query_result = self.query_ref::<T>(&query).await?;
            for item in query_result.items {
                items.push(item);
            }

            query.last = query_result.paging.last;

            if query.last.is_none() { break; }
        }

        Ok(items)
    }

    pub async fn delete_all(&self) -> Result<(), String> {
        let result = self.query_all::<AnyItem>(QueryAll::default()).await;

        if let Err(error) = result {
            return Err(format!("{:?}", error));
        }

        let items = result.unwrap();
        for item in items {
            self.delete(item.key.as_str()).await?;
        }

        Ok(())
    }

    async fn query_ref<T: DeserializeOwned>(&self, query: &Query) -> Result<QueryResponse<T>, QueryError> {
        let response = self.deta.post_json_on(
            DetaService::Database,
            format!("{}/query", self.base_name).as_str(),
            serde_json::to_string(query).map_err(|error| QueryError::Unexpected(error.to_string()))?
        ).await.map_err(|error| QueryError::Unexpected(format!("{}", error)))?;

        match response.status().as_u16() {
            200 => Ok(response),
            400 => Err(QueryError::BadRequest(response.text().await.map_err(|error| QueryError::Unexpected(format!("{}", error)))?)),
            _ => Err(QueryError::Unexpected(format!("{:?}", response)))
        }?
            .json::<QueryResponse<T>>()
            .await
            .map_err(|error| QueryError::Unexpected(format!("{}", error)))
    }
}

#[derive(Debug)]
pub enum DriveFile {
    Png
}

impl Into<String> for DriveFile {
    fn into(self) -> String {
        match self {
            DriveFile::Png => "image/png".to_string()
        }
    }
}

impl Drive {
    pub fn new(deta: Deta, drive_name: &str) -> Self {
        Self { deta, drive_name: drive_name.to_string() }
    }

    pub async fn put(&self, bytes: Vec<u8>, file_name: String, file_type: DriveFile) -> Result<(), PutError> {
        let response = self.deta.post_on(DetaService::Drive, format!("{}/files?name={}", self.drive_name, file_name).as_str())
            .header("Content-Type", Into::<String>::into(file_type))
            .body(bytes)
            .send()
            .await.map_err(|error| PutError::Unexpected(format!("{}", error)))?;

        match response.status().as_u16() {
            201 => Ok(()),
            400 => Err(PutError::BadRequest(response.text().await.map_err(|error| PutError::Unexpected(format!("{}", error)))?)),
            _ => Err(PutError::Unexpected(format!("{:?}", response)))
        }
    }

    pub async fn delete(&self, file_names: Vec<String>) -> Result<(), DeleteError> {
        self.deta.delete_json_on(
            DetaService::Drive,
            format!("{}/files", self.drive_name).as_str(),
            serde_json::to_string(&DeleteNames { names: file_names }).map_err(|error| DeleteError::Unexpected(error.to_string()))?
        ).await.map_err(|error| DeleteError::Unexpected(format!("{}", error)))?;

        Ok(())
    }

    pub async fn download(&self, file_name: String) -> Result<Vec<u8>, DownloadError> {
        let response = self.deta.get_on(
            DetaService::Drive,
            format!("{}/files/download?name={}", self.drive_name, file_name).as_str()
        )
            .send()
            .await.map_err(|error| DownloadError::Unexpected(error.to_string()))?;

        match response.status().as_u16() {
            200 => Ok(response.bytes().await.map_err(|error| DownloadError::Unexpected(format!("{}", error)))?.to_vec()),
            400 => Err(DownloadError::BadRequest(response.text().await.map_err(|error| DownloadError::Unexpected(format!("{}", error)))?)),
            404 => Err(DownloadError::NotFound(response.text().await.map_err(|error| DownloadError::Unexpected(format!("{}", error)))?)),
            _ => Err(DownloadError::Unexpected(format!("{:?}", response))),
        }
    }

    pub async fn list(&self, limit: Option<u16>, prefix: Option<String>, last: Option<String>) -> Result<ListResult, ListError> {
        let query_string = Self::build_query_string(&[
            ("limit".to_string(), limit.map(|i| i.to_string())),
            ("prefix".to_string(), prefix),
            ("last".to_string(), last)
        ]);

        let response = self.deta.get_json_on(
            DetaService::Drive,
            format!("{}/files?{}", self.drive_name, query_string).as_str()
        ).await.map_err(|error| ListError::Unexpected(format!("{}", error)))?;

        match response.status().as_u16() {
            200 => Ok(response.json::<ListResult>().await.map_err(|error| ListError::Unexpected(format!("{}", error)))?),
            400 => Err(ListError::BadRequest(response.text().await.unwrap())),
            404 => Err(ListError::NotFound),
            _ => Err(ListError::Unexpected(response.text().await.unwrap())),
        }
    }

    pub async fn list_all(&self, prefix: Option<String>) -> Result<Vec<String>, ListError> {
        let mut names = vec![];
        let mut last = None;

        loop {
            let list_result = self.list(None, prefix.clone(), last).await?;
            for name in list_result.names {
                names.push(name);
            }

            last = list_result.paging.and_then(|paging| paging.last);

            if last.is_none() { break; }
        }

        Ok(names)
    }

    pub async fn delete_all(&self) -> Result<(), DeleteError> {
        let result = self.list_all(None).await;

        if let Err(error) = result {
            return Err(DeleteError::Unexpected(format!("{:?}", error)));
        }

        self.delete(result.unwrap()).await
    }

    fn build_query_string(arguments: &[(String, Option<String>)]) -> String {
        let query_string = arguments
            .into_iter()
            .filter(|i| i.1.is_some());

        let mut string = String::from("");
        for query_item in query_string {
            string += format!("{}={}", query_item.0, query_item.1.clone().unwrap()).as_str();
        }
        string
    }
}