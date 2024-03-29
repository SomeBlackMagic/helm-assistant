include .env


build:
	docker build .docker/node$(DOCKER_NODE_VERSION)-base/ \
		-t $(DOCKER_SERVER_HOST)/$(DOCKER_PROJECT_PATH)/node$(DOCKER_NODE_VERSION)-base:$(DOCKER_IMAGE_VERSION) \
		--build-arg DOCKER_SERVER_HOST=$(DOCKER_SERVER_HOST) \
		--build-arg DOCKER_PROJECT_PATH=$(DOCKER_PROJECT_PATH) \
		--build-arg DOCKER_NODE_VERSION=$(DOCKER_NODE_VERSION) \
		--build-arg DOCKER_IMAGE_VERSION=$(DOCKER_IMAGE_VERSION)

	docker build .docker/node$(DOCKER_NODE_VERSION)-yarn/ \
		-t $(DOCKER_SERVER_HOST)/$(DOCKER_PROJECT_PATH)/node$(DOCKER_NODE_VERSION)-yarn:$(DOCKER_IMAGE_VERSION) \
		--build-arg DOCKER_SERVER_HOST=$(DOCKER_SERVER_HOST) \
		--build-arg DOCKER_PROJECT_PATH=$(DOCKER_PROJECT_PATH) \
		--build-arg DOCKER_NODE_VERSION=$(DOCKER_NODE_VERSION) \
		--build-arg DOCKER_IMAGE_VERSION=$(DOCKER_IMAGE_VERSION)


app:
		docker build -f .docker/app/Dockerfile \
		-t $(DOCKER_SERVER_HOST)/$(DOCKER_PROJECT_PATH)/node$(DOCKER_NODE_VERSION)-test:$(DOCKER_IMAGE_VERSION) \
		--build-arg DOCKER_SERVER_HOST=$(DOCKER_SERVER_HOST) \
		--build-arg DOCKER_PROJECT_PATH=$(DOCKER_PROJECT_PATH) \
		--build-arg DOCKER_NODE_VERSION=$(DOCKER_NODE_VERSION) \
		--build-arg DOCKER_IMAGE_VERSION=$(DOCKER_IMAGE_VERSION) \

	docker-compose build --pull
down:
	docker-compose down
up:
	docker-compose up
