FROM ubuntu:trusty

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install --yes npm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN npm install -g node-gyp
RUN npm install socket.io redis

VOLUME /application

CMD nodejs /application/index.js
