FROM openjdk:17-jdk-slim

RUN mkdir -p /app/
WORKDIR /app

RUN apt-get update && apt-get install -y curl

COPY ./jumpstart-latest/lib/jumpstart-jar-with-dependencies.jar .
COPY application.conf /app/application.conf

CMD ["java", "-Dconfig.file=/app/application.conf", "-jar", "jumpstart-jar-with-dependencies.jar"]
