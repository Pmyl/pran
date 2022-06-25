FROM rustlang/rust:nightly

RUN apt-get update -y

# node/npm
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash
RUN apt-get install -y nodejs

RUN npm -v

COPY ./tsconfig.json ./app/
COPY ./package-lock.json ./app/
COPY ./package.json ./app/
COPY ./pran-phonemes/ ./app/pran-phonemes/
COPY ./pran-animation/ ./app/pran-animation/
COPY ./pran-gular/ ./app/pran-gular/
COPY ./pran-droid/ ./app/pran-droid/

WORKDIR /app
RUN npm run pran-droid:prepare-deploy

WORKDIR /app/pran-droid/api

RUN cargo build --release

ENV ROCKET_ADDRESS=0.0.0.0
ENV STATIC_PATH=../frontend/dist

CMD API_PORT=$PORT POSTGRE_SQL_DATABASE_URL=$DATABASE_URL DATABASE=PostgreSql ./target/release/pran-droid-api