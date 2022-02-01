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
ENV PYTHON_PATH=./src

CMD ["git pull && npm run pran-echo:prepare-deploy && pip3 install -r requirements.txt && cargo build --release && ./pran-echo/core/target/release/pran-echo-core"]