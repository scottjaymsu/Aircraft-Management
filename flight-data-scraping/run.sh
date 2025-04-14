#!/bin/bash

JAVA=false
LOCAL=false
DEBUG=false
PUSH=false

# Parse long options manually
for arg in "$@"; do
    case $arg in
        -java)
            JAVA=true
            ;;
        -local)
            LOCAL=true
            ;;
        -debug)
            DEBUG=true
            ;;
        -push)
            PUSH=true
            ;;
        *)
            echo "Usage: $0 [-java] [-local] [-debug]"
            exit 1
            ;;
    esac
done

if [ "$JAVA" = true ]; then
    echo "COMPILE JAVA MESSAGE CONSUMER APP"
    cd FAA-message-consumer/jumpstart-latest/
    mvn clean package
    rm lib/jumpstart-jar-with-dependencies.jar
    mv target/jumpstart-1.5.0.jar lib/jumpstart-jar-with-dependencies.jar
    cd ..
    cd ..
fi

if [ "$LOCAL" = true ]; then

    if [ "$DEBUG" = true ]; then
        echo "BUILD AND RUN DOCKER IMAGES IN DEBUG MODE"
        docker-compose --profile debug up --build
    else
        echo "BUILD AND RUN DOCKER IMAGES IN NORMAL MODE"
        docker-compose --profile local up --build -d 
    fi
fi

if [ "$PUSH" = true ]; then
    echo "BUILD PRODUCTION DOCKER IMAGES"
    docker-compose --profile production build --no-cache
    echo "LOGIN TO DOCKER HUB"
    source .env
    echo "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin
    echo "PUSH PRODUCTION DOCKER IMAGES TO DOCKER HUB"
    docker-compose --profile production push

    echo "COPY OVER .ENV FILE AND DOCKER-COMPOSE FILE TO SERVER"
    scp -i $SERVER_KEY_LOCAL_PATH .env $SERVER_ADDRESS:/home/ec2-user
    scp -i $SERVER_KEY_LOCAL_PATH docker-compose.yml $SERVER_ADDRESS:/home/ec2-user
    echo "SSH TO SERVER"
    ssh -i $SERVER_KEY_LOCAL_PATH $SERVER_ADDRESS '\
        echo "PULL PRODUCTION DOCKER IMAGES FROM DOCKER HUB" && \
        docker-compose --profile production pull && \
        echo "RUN PRODUCTION DOCKER IMAGES" && \
        docker-compose --profile production up -d && \
        exit'
fi