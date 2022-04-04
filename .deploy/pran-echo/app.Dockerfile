FROM rustlang/rust:nightly

RUN apt-get update -y
RUN apt-get install -y python3-dev python3-pip
RUN apt-get install -y libsndfile-dev libasound2-dev

# node/npm
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash
RUN apt-get install -y nodejs

RUN npm -v

RUN git clone --depth=1 https://github.com/Pmyl/pran.git pran

WORKDIR /pran

ENV ROCKET_ADDRESS=0.0.0.0
ENV STATIC_PATH=../frontend/dist
ENV PRAN_PHONEMES_PYTHON_PATH=../../pran-phonemes/core/src
ENV GENTLE_ADDRESS=http://lowerquality-gentle
ENV GENTLE_PORT=8765

CMD git pull && npm run pran-echo:prepare-deploy && cd ./pran-phonemes/core && pip3 install -r requirements.txt && cd ../../pran-echo/core && cargo build --release && ./target/release/pran-echo-core