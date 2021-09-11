FROM rustlang/rust:nightly

RUN apt-get update -y
RUN apt-get install -y python3-dev python3-pip
RUN apt-get install -y libsndfile-dev libasound2-dev

# node/npm
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash
RUN apt-get install -y nodejs

COPY ./package.json ./
COPY ./pran-phonemes/ ./pran-phonemes/
COPY ./pran-animation/ ./pran-animation/
COPY ./pran-animation-editor/ ./pran-animation-editor/
COPY ./pran-echo/ ./pran-echo/
COPY ./build-tools/ ./build-tools/

RUN npm run pran-echo:prepare-deploy

WORKDIR /pran-echo/core

RUN pip3 install -r requirements.txt
RUN cargo build --release

# for testing: ENV ROCKET_PORT=8080
ENV ROCKET_PORT=$PORT
ENV ROCKET_ADDRESS=0.0.0.0
ENV STATIC_PATH=../frontend/dist
ENV PYTHON_PATH=./src

CMD ["./target/release/pran-echo-core"]