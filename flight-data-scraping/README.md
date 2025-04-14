# To use:

### Mac/Linux
`./run.sh` to run<br />
`./run.sh -b` to run and build

### Windows
`run.bat` to run<br />
`run.bat -b` to run and build
#
# IMPORTANT
* Use the "-b" flag to build/compile (do this every time you modify the code to build a new docker image)
* The docker image this program outputs can be uploaded to a server (using Docker Hub or AWS ECR)
* Choose database connection in 'fdps.conf' file
#
# More details: 
The "flight_data_scraper" runs a docker container of a program that will proccess an online flight data stream and construct a database of NetJets flights.

The "flight_data_scraper" directory handles all data messages from the FAA's SWIM TFMS data stream. It makes use of an already existing java application called "jumpstart-latest" to accept the Java Messaging Service messages from SWIM. The program extracts an XML string from each JMS message. In the `jumpstart-latest/src/main/java/com/harris/cinnato/outputs` directory you will find the java files that direct teh XML string to an output. In that directory, we have created a file called `DatabaseOutput.java`. This file contains all of our code and logic for parsing the flight data and inputing it into our database. To input the data stream JMS connection and the database connection information into the 'jumpstart-latest' application, store that information in the `fdps.conf` file.
