'use strict';

var config = {
    port: 9900,
    debug: Boolean(process.env.DEBUG),
    redis: {
        urls: process.env.REDIS_URLS.split(',')
    }
};

var io = require('socket.io')(config.port);
var ioSockets = {};
var redis = require('redis');
var redisReceivers = [];
var redisPublishers = [];

startSocketServer();
connectToRedis(config.redis.urls);

function startSocketServer () {
    process.on('uncaughtException', onUncaughtException);
    io.on('connection', onSocketConnection);
}

function connectToRedis (urls) {
    urls.forEach(function (url) {
        log('Connecting to redis server at URL ' + url);
        var receiver = redis.createClient(url);
        receiver.subscribe('socket.io');
        receiver.on('message', onRedisMessage.bind(this, url));
        receiver.on('error', onRedisError.bind(this, url));
        receiver.on('end', onRedisEnd.bind(this, url));

        redisReceivers.push(receiver);
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

function log () {
    config.debug && console.log.apply(console, arguments);
}

function onRedisMessage (url, channel, message) {
    log('Message from redis received:', message);
    try {
        var json = JSON.parse(message);
        if (json.uid) {
            var sockets = ioSockets[json.uid] || [];
            if (!sockets.length) {
                log('Sockets for UID ' + json.uid + ' do not exist');
                return;
            }

            sockets.forEach(function (socket) {
                if (json.type === 'authorize') {
                    socket.authorized = true;
                    log('User ' + json.uid + ' was authorized');
                } else if (socket.authorized) {
                    socket.emit(json.type, json);
                    log('Message ' + json.type + ' sent to user ' + json.uid + ':', message);
                }
            });
        } else {
            io.to(json.room).emit(json.type, json);
            log('Message ' + json.type + ' emitted to room ' + json.room + ':', message);
        }
    } catch (error) {
        log('Error occured while parsing the message from redis:', message);
    }
}

function onRedisError (url, error) {
    log('Error occured at ' + url + ':', error);
}

function onRedisEnd (url) {
    log('Redis connection closed at ' + url);
}

function onSocketConnection (socket) {
    log('New connection is established');
    socket.on('subscribe', onSocketMessage.bind(this, socket));
    socket.on('disconnect', onSocketDisconnect.bind(this, socket));
}

function onSocketMessage (socket, message) {
    log('Message from user received:', message);

    if (!message.room && !message.uid) {
        return;
    }

    if (message.uid) {
        socket.uid = message.uid;
        ioSockets[message.uid] = ioSockets[message.uid] || [];
        ioSockets[message.uid].push(socket);
        publishRedisMessage('socket.io:auth', message);
    } else {
        log('User has joined to the room ' + message.room);
        socket.join(message.room);
    }
}

function onSocketDisconnect (socket) {
    var uid = socket.uid;
    if (!uid || !ioSockets[uid]) {
        return;
    }

    var socketIndex = ioSockets[uid].indexOf(socket);
    if (socketIndex === -1) {
        return;
    }

    ioSockets[uid].splice(socketIndex, 1);
    log('Socket with UID ' + uid + ' died');
}

function onUncaughtException (error) {
    log('Uncaught exception occured:', error);
}
