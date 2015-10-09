To run server, build docker container:

    $ sudo make build


And then run it in foreground:

    $ sudo make fg -e REDIS_URLS=redis://172.17.42.1:6379,redis://hostname2:6379


Or background:

    $ sudo make bg -e REDIS_URLS=redis://hostname1:6379,redis://hostname2:6379


By default, server binds to port 49100, but you can change that with `PORT=` option

    sudo make fg -e REDIS_URLS=redis://hostname1:6379 PORT=26026


Server will connect to all provided Redis servers and subscribe
to event `socket.io`, expecting incoming messages to be valid `json`
in the following format:

    {
        room: 'myroom',
        type: 'myevent',
        <key1>: <value1>,
        <key2>: <value2>,
        …
    }


To join specific room, client should emit `subscribe` signal:

    var socket = io();
    socket.emit('subscribe', {room: 'myroom'});


After that, client can subscribe to specific events:

    socket.on('myevent', function(msg){
        console.log('Event "myevent" recieved: ', msg);
    });


At the moment, service lacks any authorization whatsoever
