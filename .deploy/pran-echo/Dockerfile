FROM rustlang/rust:nightly

RUN apt-get update -y
RUN apt-get install -y python3-dev python3-pip
RUN apt-get install -y libsndfile-dev libasound2-dev

# node/npm
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash
RUN apt-get install -y nodejs

RUN npm -v

COPY ./tsconfig.json ./app/
COPY ./package-lock.json ./app/
COPY ./package.json ./app/
COPY ./pran-phonemes/ ./app/pran-phonemes/
COPY ./pran-animation/ ./app/pran-animation/
COPY ./pran-animation-editor/ ./app/pran-animation-editor/
COPY ./pran-echo/ ./app/pran-echo/

WORKDIR /app
RUN npm run pran-echo:prepare-deploy

WORKDIR /app/pran-echo/core

RUN pip3 install -r requirements.txt
RUN cargo build --release

ENV ROCKET_ADDRESS=0.0.0.0
ENV STATIC_PATH=../frontend/dist
ENV PYTHON_PATH=./src

CMD ["./target/release/pran-echo-core"]