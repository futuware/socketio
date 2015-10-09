var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var redis = require('redis');
var redisURLs = process.env.REDIS_URLS.split(',');

io.on('connection', function(socket){
  socket.on('subscribe', function(msg){
    if (!msg.room) { return; }
    socket.join(msg.room);
  });
});

console.log(
    'Connecting to Redis servers at urls ',
    redisURLs.join(', ')
);
redisURLs.map(function(redisURL) {
  var redisClient = redis.createClient(redisURL);

  redisClient.subscribe('socket.io');

  redisClient.on('message', function(channel, message) {
    message =  JSON.parse(message);
    io.to(message.room).emit(message.type, message);
  });

  redisClient.on("error", function (err) {
    console.log("Redis error encountered at " + redisURL, err);
  });

  redisClient.on("end", function() {
    console.log("Redis connection closed at " + redisURL);
  });
});

http.listen(9900, function(){
  console.log('listening on *:9900');
});
