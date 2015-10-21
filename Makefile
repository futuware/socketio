PORT = 49100
REDIS_URLS = redis://172.17.42.1:6379

build:
	docker build -t socketio -f Dockerfile .

fg:
	docker run -it -v $(shell pwd):/application -e REDIS_URLS=$(REDIS_URLS) -p $(PORT):9900 socketio
