@echo off
setlocal

set BUILD=false

:: Parse options
:parse_opts
if "%1"=="" goto done_opts
if "%1"=="-b" set BUILD=true
shift
goto parse_opts
:done_opts

:: If BUILD is true, execute the build process
if "%BUILD%"=="true" (
    echo BUILDING PROJECT
    cd jumpstart-latest\

    echo CLEANING THE MVN PACKAGE
    mvn clean package

    echo REMOVING THE OLD JUMPSTART JAR
    del lib\jumpstart-jar-with-dependencies.jar

    echo MOVE NEW JAR TO LIB FOLDER
    move target\jumpstart-jar-with-dependencies.jar lib\jumpstart-jar-with-dependencies.jar

    cd ..

    echo BUILD DOCKER IMAGE
    docker build --platform linux/amd64 -t username486/flight_data_scraper:latest .
    : amd version so it can run on AWS amd servers
)

:: Run Docker container
echo RUN DOCKER CONTAINER
docker run -it --rm --name flight_data_scraper-fdps-v -v "%cd%\fdps.conf:/app/application.conf" flight_data_scraper

endlocal
