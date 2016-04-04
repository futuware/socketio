var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var redis = require('redis');
var redisURLs = process.env.REDIS_URLS.split(',');
var isDebug = Boolean(process.env.DEBUG);

function log() {
    if (isDebug) { console.log.apply(console, arguments) }
}

io.on('connection', function (socket) {
    log('Connected');
    socket.on('subscribe', function (msg) {
        log('Subscribed', msg);
        if (!msg.room) {
            return;
        }
        log('Join');
        socket.join(msg.room);
    });
});

log('Connecting to Redis servers at urls ', redisURLs.join(', '));

redisURLs.map(function (redisURL) {
    var redisClient = redis.createClient(redisURL);

    redisClient.subscribe('socket.io');

    redisClient.on('message', function (channel, message) {
        var raw_message = message;
        message = JSON.parse(message);
        io.to(message.room).emit(message.type, message);
        log('Emitted ' + message.type + ' to room ' + message.room + '\n' + raw_message);
    });

    redisClient.on("error", function (err) {
        console.error("Redis error encountered at " + redisURL, err);
    });

    redisClient.on("end", function () {
        console.error("Redis connection closed at " + redisURL);
    });
});

http.listen(9900, function () {
    console.log('listening on *:9900');
});
