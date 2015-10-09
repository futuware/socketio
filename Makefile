PORT = 49100

build:
	docker build -t socketio -f Dockerfile .

fg:
	docker run -it -v $(shell pwd):/application -e REDIS_URLS=$(REDIS_URLS) -p $(PORT):9900 socketio
