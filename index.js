'use strict';

var config = {
    port: 9900,
    debug: Boolean(process.env.DEBUG),
    redis: {
        urls: process.env.REDIS_URLS.split(',')
    }
};

var io = require('socket.io')(config.port);
var redis = require('redis');
var redisPublishers = [];

startSocketServer();
connectToRedis(config.redis.urls);


function onSocketMessage (socket, message) {
    log('Message from user received:', message);
    if (!message.room) {
        return;
    }
    message.socketId = socket.id;
    message.ip = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;
    publishRedisMessage('socket.io:auth', message);
}


function onRedisMessage (url, channel, message) {
    log('Message from redis received:', message);
    try {
        var json = JSON.parse(message);
        if (json.type === 'authorize') {
            var socket = io.sockets.connected[json.socketId];
            if (socket && json.room) {
                log('Joining socket ' + json.socketId + ' to room ' + json.room);
                socket.join(json.room);
            }
        } else {
            io.to(json.room).emit(json.type, json);
            log('Message ' + json.type + ' emitted to room ' + json.room + ':', message);
        }
    } catch (error) {
        log('Error occured while parsing the message from redis:', message, error);
    }
}


function startSocketServer() {
    process.on('uncaughtException', onUncaughtException);
    io.on('connection', function (socket) {
        log('New connection is established');
        socket.on('subscribe', onSocketMessage.bind(this, socket));
    });
}


function connectToRedis (urls) {
    urls.forEach(function (url) {
        log('Connecting to redis server at URL ' + url);
        var receiver = redis.createClient(url);
        receiver.subscribe('socket.io');
        receiver.on('message', onRedisMessage.bind(this, url));
        receiver.on('error', onRedisError.bind(this, url));
        receiver.on('end', onRedisEnd.bind(this, url));
        redisPublishers.push(redis.createClient(url));
    });
}

function publishRedisMessage (channel, message) {
    redisPublishers.forEach(function (publisher) {
        publisher.publish(channel, JSON.stringify(message), function (error) {
            if (error) {
                log('Error occured while message publishing to redis:', error);
            } else {
                log('Message published to redis:', message);
            }
        });
    });
}


function onRedisError (url, error) {
    log('Error occured at ' + url + ':', error);
}

function onRedisEnd (url) {
    log('Redis connection closed at ' + url);
}


function onUncaughtException (error) {
    log('Uncaught exception occured:', error);
}

function log () {
    config.debug && console.log.apply(console, arguments);
}
