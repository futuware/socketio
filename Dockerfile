FROM ubuntu:trusty

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install --yes npm supervisor \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN npm install -g node-gyp
RUN npm install socket.io redis express

RUN mkdir /application
COPY . /application

CMD supervisord -c /application/supervisord.conf
