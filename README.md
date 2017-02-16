# Running in production
To run server in production, take `docker-compose.yml`, place it on server, and

    % sudo SOCKETIO_REDIS_URLS=redis://172.17.0.1:6379,redis://172.17.42.1:6379 SOCKETIO_PORT=31337 docker-compose up
    Creating network "socketio_default" with the default driver
    Creating socketio_socketio_1
    Attaching to socketio_socketio_1
    socketio_1  | 2017-02-16 14:28:01,290 CRIT Supervisor running as root (no user in config file)
    socketio_1  | 2017-02-16 14:28:01,292 INFO supervisord started with pid 5
    socketio_1  | 2017-02-16 14:28:02,295 INFO spawned: 'socketio' with pid 8
    socketio_1  | 2017-02-16 14:28:03,297 INFO success: socketio entered RUNNING state, process has stayed up for > than 1 seconds (startsecs)

If SOCKETIO_PORT variable is not set, port `49100` will be used.
Of course, you can also modify `docker-compose.yml` to specify all required 
variables and avoid passing env vars

# Running for development
To run server for development, use `./compose` utility script, which is basicaly
a shortcut for `sudo docker-compose -f docker-compose.yml -f docker-compose.dev.yml`

The difference is that `docker-compose.dev.yml` specifies a volume for `/application`,
which allows not to build service after every change and also sets default
`SOCKETIO_REDIS_URLS=redis://172.17.0.1:6379`

# How this service works in general
Service will connect to all provided Redis servers and subscribe
to event `socket.io`, expecting incoming messages to be valid `json`
in the following format:

    {
        room: 'roomname',
        type: 'eventtype',
        <key1>: <value1>,
        <key2>: <value2>,
        …
    }


To join specific room, client should emit `subscribe` signal:

    var socket = io();
    socket.emit('subscribe', {room: 'myroom', uid: 'someuid', sid: 'somesid'});

After that, client can subscribe to specific events:

    socket.on('myevent', function(msg){
        console.log('Event "myevent" recieved: ', msg);
    });


Upon receiving such `subscribe` message from socketio, server will publish message 
to a redis channel `socket.io:auth`

    {
        room: 'myroom',
        uid: 'someuid',
        sid: 'somesid',
        socketId: 'Ma1TDKmMl4AHkxhpAAAC',
        ip: '192.168.100.1'
    }

This server is not concerned with what happens next, but if it receives 
redis message of type `authorize`, like this:

    {"socketId": "Ma1TDKmMl4AHkxhpAAAC", "type": "authorize", "room": "myroom"}

it will subscribe socket `Ma1TDKmMl4AHkxhpAAAC` to room `myroom`, 
and all following redis messages with specified room `myroom` will be 
forwarded to socket `Ma1TDKmMl4AHkxhpAAAC`
