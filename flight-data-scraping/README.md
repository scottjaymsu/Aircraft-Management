# To use:

### Mac/Linux
`./run.sh -local` to run and build the data scraper locally on a local test database. Note that this only builds the docker images, it does not compile any code (like Java)<br />
`./run.sh -local -debug` to run and build the data scrapper locally with a the ability to attach debugger configurations. More details on this below.<br />
`./run.sh -java` to compile the Java code into a .jar file. When building docker images, the .jar will be automatically inserted into a container. Note that Python does not need to be compiled.<br /> 
`./run.sh -push` to biuld all docker images, push them to a docker hub, pull them onto the server, and run the containers

### Windows
`.sh` cannot be run natively on Windows. One can install a third party tool like Git Bash to easily run `.sh` files, or run the prompts found in the `run.sh` file manually, or convert the logic into a `run.bat` file.
#
# IMPORTANT
* To work, database connection details, Docker Repo details, and the server key details need to be stored in the `.env` file. An example `.env` file is provided. Also, the FAA SWIM data stream details need to be stored in the `FAA-message-consumer/fdps.conf` file, where an example file is provided.
#
# More details:
The `flight-data-scraping` app is designed to have a micro-service architechure. It runs stand alone on a server (probably AWS EC2) at all times. It scrapes real time flight data from the FAA, processes it, and keeps the database current. A `docker-compose.yml` orchestrates the docker containers. Here is breakdown of each micro service:

### message-consumer
The `FAA-message-consumer` directory handles all data messages from the FAA's SWIM TFMS R14 data stream. It makes use of an already existing java application called "jumpstart-latest" to accept the Java Messaging Service messages from SWIM. Licensing can be found in the `jumpstart-latest` folder. The program extracts an XML string from each JMS message. In the `FAA-message-consumer/jumpstart-latest/src/main/java/com/harris/cinnato/outputs` directory you will find the java files that direct the XML string to an output. In that directory, we have created a file called `DatabaseOutput.java`. This file uses a customer buffer and XML builder object to more efficiently search the large amount of XML strings coming through. It will filter the data down to only NetJets flights (tail numbers that end in 'QS') and expose that XML string to an API queue, where another micro-sevice can grab it. The API is found in `FAA-message-consumer/jumpstart-latest/src/main/java/com/harris/cinnato/outputs/MessageController.java`.

### flight-plan-tracking
The entry point is `main.py`, where it continuously grabs flight data message XML string from the `message-consumer` API. It will send the flight data message to the `flightDataProcessor` function where it will be converted into a flight plan dictionary. However, this flight plan with need some pre-processing. Sometimes, the FAA SWIM data usually sends flight plan's airports with ICAO codes (4 letters) but sometimes with IATA codes (3 letters). For consistency, `airport_code_normalizer` will attempt to convert any IATA codes into ICAO by referencing the airport data stored in the database. <br />
An important part of this web app is FBO assignments for flight plans. Netjets has this information internally, but it was not shared with this team. So, `fbo_assigner` attempts to assign flight plans to an open FBO spot at the airport it is flying to. This is just mock data, and the functionaly can be entirely removed in the future. It is meant to demonstate how the NetJets team could implement their internal FBO data. Note, since the database uses it own interal id to identify FBO's, inputted FBO data would need to resolve itself to an FBO id based on its name and its airport.<br />
Lastly, the flight_plan dictionary is exposed as an API, to be used by another micro-service.

### database-manager
The entry point is `main.py`, where it continuously grabs flight plan dictionaries from the `flight-plan-tracking` API. This service will input the flight plan data into the database. It is neccessary to highlight an important feature of the database design. A `netjets_fleet` table stores info about every unique jet that NetJets flies. The `flight_plans` table store info about discrete flight plans, past, presents, and future. The `netjets_fleet` table has a `flightRef` that will point to that jet's most "recently active" flight plan. Specifcally, any time an active in-flight flight plan is processes, that jet in `netjets_fleet` will start pointing at it. This makes it easy to find the relevant flight plans (i.e each jet will be either pointing the flight plan it is currently flying, or the flight plan that brought it to its current location and indicates where this jet is parked). The `database-manager` ensures this logic. It is also desinged in a way to overwrite/update existing data, as the FAA data that comes through is often not entirely complete or correct. This dynmaic design ensures more recent data can correct any previous incorrect data. Additionally, anytime a jet stops pointing to a flight plan (becasue it initiated another one), the `database-manager` will remove that flight plan since it is no longer relevant.

### aircraft-metadata-scraper
The entry point in `main.py`. This code runs once a day at midnight UTC. It simply checks the FAA website to see if it has updated its excel spreadsheet of aircraft meta data. The ensures that plane types are up to date in the database, as info such as plane dimennsions are important for the web app.

# Future Recommendations
* Use a mysql 8.0 databse, or potnetially AWS Aurora.
* Database does not have many indicies to prioritize write times. This can be changed in one wants to prioritze read times.
* At times, the `message-consumer` is not powerful enough to consume all FAA SWIM messages in time and some will expire. One could orchestrate that another instance of `message-consumer` be spun up on demand. It would be recommended that a message service like Kafka be used to ensure two docker instances can be reached by a single API.
* The `testing` directly contains a micro-service that initalizes a local database for local testing purposes. There, once can expand upon it and impelment automatic testing my sending simulated messages.
* Make sure the database uses `mysql_native_password` instead of `caching_sha2_password` as the `mysql-connector-python` package does not support it.
* The `.gitignore` has temporarly commented out `.env` and `.conf` ingores, in order to share the example `.env` and `.conf` files. Make sure to undo this.
