#!/bin/bash

BUILD=false
TEST=false

while getopts "bt" flag; do
    case ${flag} in
        b) BUILD=true ;;
        t) TEST=true ;;
        *) echo "Usage: $0 [-b] [-t]"; 
           exit 1 ;;
    esac
done

if [ "$BUILD" = true ]; then
    echo "BUILDING PROJECT"
    cd jumpstart-latest/

    echo "CLEANING THE MVN PACKAGE"
    mvn clean package

    echo "REMOVING THE OLD JUMPSTART JAR"
    rm lib/jumpstart-jar-with-dependencies.jar

    echo "MOVE NEW JAR TO LIB FOLDER"
    mv target/jumpstart-jar-with-dependencies.jar lib/jumpstart-jar-with-dependencies.jar

    cd ..

    echo "BUILD DOCKER IMAGE"
    docker build --platform linux/amd64 -t username486/netjets_server:latest .
    # amd version so it can run on AWS amd servers
fi

if [ "$TEST" = true ]; then
    echo "COMPILE JAVA MESSAGE CONSUMER APP"
    cd FAA-message-consumer/jumpstart-latest/
    mvn clean package
    rm lib/jumpstart-jar-with-dependencies.jar
    mv target/jumpstart-jar-with-dependencies.jar lib/jumpstart-jar-with-dependencies.jar
    cd ..
    cd ..

    echo "BUILD DOCKER IMAGES"
    cd testing/
    docker-compose -f docker-compose.test.yml up --build

    echo "TESTING..."

fi

# echo "RUN DOCKER CONTAINER"

# docker run -it --rm --name flight_data_scraper-fdps-v -v "$(pwd)/fdps.conf:/app/application.conf" username486/netjets_server:latest