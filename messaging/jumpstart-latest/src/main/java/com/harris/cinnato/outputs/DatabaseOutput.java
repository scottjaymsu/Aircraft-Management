package com.harris.cinnato.outputs;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.text.SimpleDateFormat;
import java.util.TimeZone;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.XML;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.text.ParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import com.typesafe.config.Config;

//Code extended from L3Harris Swim Jumpstart Database Output Class (https://github.com/L3Harris/swim-jumpstart/blob/master/src/main/java/com/l3harris/swim/outputs/database/PostgresOutput.java)
public class DatabaseOutput extends Output {
    private static final Logger logger = LoggerFactory.getLogger(DatabaseOutput.class);

    private Connection connection;

    public DatabaseOutput(Config config) {
        super(config);
        // Pulls database connection info from messaging/fdps.conf
        Config mysqlConfig = config.getConfig("mysql");
        String uri = mysqlConfig.getString("uri");
        String user = mysqlConfig.getString("user");
        String password = mysqlConfig.getString("password");
        
        //No longer tryiing to create the database if it doesn't exist, I don't think thaat's necessary anymore
        try {
           Class.forName("com.mysql.cj.jdbc.Driver");
           this.connection = DriverManager.getConnection(uri, user, password);
           logger.info("Successfully connected to database");
        } catch (Exception e) {
           logger.error("Failed to connect to database", e);
           System.exit(-1);
        }
  
     }



    /*
     * Helper function that pulls the ETA from a "nxcm:eta" object
     * Input: JSONObject for the "nxcm:eta" object"
     * Output: ETA as a string, or null
     */
    private String get_ETA(JSONObject etaObject) {
        if (etaObject != null) {
            // ETA
            return etaObject.optString("timeValue", null);
        }
        return null;
    }

    /*
     * Helper function that pulls the ETD from a "nxcm:etd" object
     * Input: JSONObject for the "nxcm:etd" object"
     * Output: ETA as a string, or null
     */
    private String get_ETD(JSONObject etdObject) {
        if (etdObject != null) {
            // ETD
            return etdObject.optString("timeValue", null);
        }
        return null;
    }


    /*
     * Helper function that parses flightDataMessage object to find the ETA
     * Input: JSONObject for the flightDataMessage object
     * Output: ETA as a string, or null if not found
     */
    private String ncsmRouteData_ETA(JSONObject flightDataMessage) {
        JSONObject ncsmRouteData = flightDataMessage.optJSONObject("nxcm:ncsmRouteData");
        if (ncsmRouteData != null) {
            // Extracts ETA string, if it exists
            return get_ETA(ncsmRouteData.optJSONObject("nxcm:eta"));
        }

        // Sometimes an flightDataMessage object will contain a "nxcm:ncsmTrackData" object instead of a "nxcm:ncsmRouteData" object
        JSONObject ncsmTrackData = flightDataMessage.optJSONObject("nxcm:ncsmTrackData");
        if (ncsmTrackData != null) {
            // Extracts ETA string, if it exists
            return get_ETA(ncsmTrackData.optJSONObject("nxcm:eta"));
        }

        return null;
    }

    /*
     * Helper function that parses flightDataMessage object to find the ETD
     * Input: JSONObject for the flightDataMessage object
     * Output: ETD as a string, or null if not found
     */
    private String ncsmRouteData_ETD(JSONObject flightDataMessage) {
        JSONObject ncsmRouteData = flightDataMessage.optJSONObject("nxcm:ncsmRouteData");
        if (ncsmRouteData != null) {
            // Extracts ETD string, if it exists
            return get_ETD(ncsmRouteData.optJSONObject("nxcm:etd"));
        }

        // Sometimes an flightDataMessage object will contain a "nxcm:ncsmTrackData" object instead of a "nxcm:ncsmRouteData" object
        JSONObject ncsmTrackData = flightDataMessage.optJSONObject("nxcm:ncsmTrackData");
        if (ncsmTrackData != null) {
            // Extracts ETD string, if it exists
            return get_ETD(ncsmTrackData.optJSONObject("nxcm:etd"));
        }

        return null;
    }

    /*
     * Helper function that parses qualifiedAircraftId object to find the arriving airport
     * Input: JSONObject for the data message object
     * Output: Airport as a string, or null
     */
    private String qualifiedAircraftId_Airport(JSONObject flightDataMessage) {
        JSONObject qualifiedAircraftId = flightDataMessage.optJSONObject("nxcm:qualifiedAircraftId");
        if (qualifiedAircraftId != null) {
            JSONObject arrivalPoint = qualifiedAircraftId.optJSONObject("nxce:arrivalPoint");
            if (arrivalPoint != null) {
                JSONObject airport_internal = arrivalPoint.optJSONObject("nxce:airport");
                if (airport_internal != null) {
                    // The arrival airport
                    return airport_internal.optString("content", null);
                }
            }
        }
        return null;
    }

    /*
     * Helper function that converts a Zulu time string to a MySQL DATETIME string
     * Input: Zulu time string
     * Output: MySQL DATETIME string
     */
    private static String convertZuluToMySQLDateTime(String zuluTime) {
        if (zuluTime == null) {
            return null;
        }

        // Define the input format (Zulu time)
        SimpleDateFormat zuluFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");
        zuluFormat.setTimeZone(TimeZone.getTimeZone("UTC"));

        // Define the output format (MySQL DATETIME)
        SimpleDateFormat mysqlFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

        try {
            // Parse the Zulu time string to a Date object
            Date date = zuluFormat.parse(zuluTime);

            // Format the Date object to MySQL DATETIME format
            return mysqlFormat.format(date);
        } catch (ParseException e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * Helper function that determines if the input time is before the current time
     * Input: Time string in Zulu format
     * Output: True if the input time is before the current time, false otherwise
     */
    private static boolean isBeforeCurrentTime(String zuluTime) {
        if (zuluTime == null) {
            // If no ETD, assume departure time is in the future
            return false;
        }

        // Define the input format (Zulu time)
        SimpleDateFormat zuluFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");
        zuluFormat.setTimeZone(TimeZone.getTimeZone("UTC"));

        try {
            // Parse the Zulu time string to a Date object
            Date date = zuluFormat.parse(zuluTime);

            // Get the current time
            Date currentTime = new Date();

            // Compare the input time to the current time
            return date.before(currentTime);
        } catch (ParseException e) {
            e.printStackTrace();
            return false;
        }
    }


    /*
     * Sifts through a single flight's data dump to find relevant information
     * and inserts it into the database
     * Input: JSONObject for the flightInfo of a single flight (was originally an XML test message)
     * Output: None
     */
    public void InsertFlightData(JSONObject flightInfo) {
        //
        // This data is present as attributes at the top level
        //
        String flightRef = flightInfo.optString("flightRef", null);
        String acid = flightInfo.optString("acid", null);
        String arrArpt = flightInfo.optString("arrArpt", null);
        String depArpt = flightInfo.optString("depArpt", null);


        //
        // Every xml flight message contains a flight data message tag
        // It can be one of 16 different types (i.e. some update postition data, some create a new flight, etc.)
        // Documentation is found  at "https://nsrr.faa.gov" for "TFMData R15" data service 
        //
        // Update: that documentation is incredibly flawed and wrong
        // To find where this data comes from, subsribe to FAA's SWIM's subscription to Traffic Flow Managemnet Service (TFMS) R14 Flight Data
        // The subscription page on the SWIM website includes a nice "Messages" tab that neatly shows the most recent message
        // This way you can view how the XML data stream is actually structured
        // The documentation gets the general idea right, but the specific of the schema are often wrong
        //

        // Parse each flight data message type
        String msgType = flightInfo.optString("msgType", null);

        // "Zulu" time, formed like "YYYY-MM-DDTHH:MM:SSZ"
        String eta = null;
        String etd = null;

        // "ACTUAL" or "ESTIMATED". ETA will be ACTUAL when it lands (i.e. in a "arrivalInformation" message). However, sometimes a "arrivalInformation"
        // message will be ESTIMATED if that plane hasn't physically triggered landing signals but the plane should have landed by now accoridng to the schedule.
        // Not sure if this information will be useful or not
        String etaType = null;

        // Find ETA and ETD data, then insert it into the database
        switch (msgType) {
            case "flightPlanInformation":
                JSONObject flightPlanInformation = flightInfo.optJSONObject("fdm:flightPlanInformation");
                if (flightPlanInformation != null) {
                    // Search nested objects for ETA (usually found in ncsmRouteData object)
                    eta = ncsmRouteData_ETA(flightPlanInformation);

                    // Search nested objects for ETD (usually found in ncsmRouteData object)
                    etd = ncsmRouteData_ETD(flightPlanInformation);

                    // Sometimes flightPlan data won't contain arriving airport in the top level tag, so find it nested down in the qualifiedAircraftId object
                    if (arrArpt == null) {
                        arrArpt = qualifiedAircraftId_Airport(flightPlanInformation);
                    }

                    // Insert the data into the database
                    // Message can come through only before takeoff
                    InsertIntoDatabase(flightRef, acid, depArpt, arrArpt, etd, eta, false, null);
                }
            break;

            case "flightPlanAmendmentInformation":
                JSONObject flightPlanAmendmentInformation = flightInfo.optJSONObject("fdm:flightPlanAmendmentInformation");
                if (flightPlanAmendmentInformation != null) {
                    // Search nested objects for ETA (usually found in ncsmRouteData object)
                    eta = ncsmRouteData_ETA(flightPlanAmendmentInformation);

                    // Search nested objects for ETD (usually found in ncsmRouteData object)
                    etd = ncsmRouteData_ETD(flightPlanAmendmentInformation);

                    // Sometimes flightPlan data won't contain arriving airport in the top level tag, so find it nested down in the qualifiedAircraftId object
                    if (arrArpt == null) {
                        arrArpt = qualifiedAircraftId_Airport(flightPlanAmendmentInformation);
                    }

                    // Insert the data into the database
                    // Message can come through before takeoff, and after landing sometimes
                    InsertIntoDatabase(flightRef, acid, depArpt, arrArpt, etd, eta, null, null);
                }
                break;

            case "arrivalInformation":
                // Plane has landed
                JSONObject arrivalInformation = flightInfo.optJSONObject("fdm:arrivalInformation");

                if (arrivalInformation != null) {
                    // This is the preferred way to get the Time of Arrival, but the documentation lists it as 'optional' so it might not always be present
                    JSONObject ncsmFlightTimeData = arrivalInformation.optJSONObject("nxcm:ncsmFlightTimeData");
                    if (ncsmFlightTimeData != null) {
                        JSONObject etaObject = ncsmFlightTimeData.optJSONObject("nxcm:eta");
                        if (etaObject != null) {
                            etaType = etaObject.optString("etaType", null);
                            if (etaType == "ACTUAL") {
                                // ToA = the actual ETA. If it's not ACTUAL, then use next method
                                eta = etaObject.optString("timeValue", null);
                            }
                        }
                    }
                }

                if (eta == null) {
                    // If the ToA wasn't found the first method, this one is always present
                    JSONObject timeOfArrivalObject = arrivalInformation.optJSONObject("nxcm:timeOfArrival");
                    if (timeOfArrivalObject != null) {
                        // ToA
                        eta = timeOfArrivalObject.optString("content", null);
                    }
                }
                
                // Insert the data into the database
                // Message only comes through after landing (although the landing time might be estimated sometimes)
                InsertIntoDatabase(flightRef, acid, depArpt, arrArpt, etd, eta, true, true);
                
                break;

            case "beaconCodeInformation":
                // No ETA info
                break;

            case "departureInformation":
                // Plane has taken off

                // Get the ETA
                JSONObject departureInformation = flightInfo.optJSONObject("fdm:departureInformation");
                if (departureInformation != null) {
                    JSONObject ncsmFlightTimeData = departureInformation.optJSONObject("nxcm:ncsmFlightTimeData");
                    if (ncsmFlightTimeData != null) {
                        // Extracts ETA string, if it exists
                        eta = get_ETA(ncsmFlightTimeData.optJSONObject("nxcm:eta"));
                    }
                }

                // Get ETD
                JSONObject timeOfDeparture = departureInformation.optJSONObject("nxcm:timeOfDeparture");
                if (timeOfDeparture != null) {
                    etd = timeOfDeparture.optString("content", null);
                }

                // Insert the data into the database
                // Message only comes through after takeoff
                InsertIntoDatabase(flightRef, acid, depArpt, arrArpt, etd, eta, true, false);

                break;

            case "flightPlanCancellation":
                JSONObject flightPlanCancellation = flightInfo.optJSONObject("fdm:flightPlanCancellation");
                if (flightPlanCancellation != null) {

                    // This message is used to either cancel a flight altogether or simply just cancel it's flight plan (i.e. cancel and reupload its route)
                    // So just remove the flight plan from the database
                    // If the plane is in the air or still plans of flying, it will be repopulated back into the database by any other message the confirms its existence
                    if (flightRef != null && acid != null) {
                        String sql = "DELETE FROM flight_plans WHERE flightRef = ?;";
            
                        try (PreparedStatement pstmt = connection.prepareStatement(sql)) {
            
                            pstmt.setString(1, flightRef);
            
                            pstmt.executeUpdate();
            
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                }
                break;

            case "trackInformation":
                JSONObject trackInformation = flightInfo.optJSONObject("fdm:trackInformation");
                if (trackInformation != null) {
                    // Search nested objects for ETA (usually found in ncsmRouteData object)
                    eta = ncsmRouteData_ETA(trackInformation);

                    // Sometimes flightPlan data won't contain arriving airport in the top level tag, so find it nested down in the qualifiedAircraftId object
                    if (arrArpt == null) {
                        arrArpt = qualifiedAircraftId_Airport(trackInformation);
                    }
                }

                // Insert the data into the database
                // Message only comes through for planes in the air
                InsertIntoDatabase(flightRef, acid, depArpt, arrArpt, etd, eta, true, false);

                break;

            case "boundaryCrossingUpdate":
                // No ETA info
                break;

            case "oceanicReport":
                JSONObject oceanicReport = flightInfo.optJSONObject("fdm:oceanicReport");
                if (oceanicReport != null) {
                    // Search nested objects for ETA (usually found in ncsmRouteData object)
                    eta = ncsmRouteData_ETA(oceanicReport);
                }

                // Insert the data into the database
                // Message only comes through for planes in the air
                InsertIntoDatabase(flightRef, acid, depArpt, arrArpt, etd, eta, true, false);

                break;

            case "FlightCreate":
                JSONObject ncsmFlightCreate = flightInfo.optJSONObject("fdm:ncsmFlightCreate");
                if (ncsmFlightCreate != null) {
                    JSONObject airlineData = ncsmFlightCreate.optJSONObject("nxcm:airlineData");
                    if (airlineData != null) {
                        // Extracts ETA string, if it exists
                        eta = get_ETA(airlineData.optJSONObject("nxcm:eta"));

                        // Extracts ETD string, if it exists
                        etd = get_ETD(airlineData.optJSONObject("nxcm:etd"));
                    }
                }

                // Insert the data into the database
                // Message is supposed to come through before takeoff, but sometimes it might come after
                // So, manually check the ETD time to see if it has taken off yet
                InsertIntoDatabase(flightRef, acid, depArpt, arrArpt, etd, eta, isBeforeCurrentTime(etd), false);

                break;

            case "FlightModify":
                JSONObject ncsmFlightModify = flightInfo.optJSONObject("fdm:ncsmFlightModify");
                if (ncsmFlightModify != null) {
                    JSONObject airlineData = ncsmFlightModify.optJSONObject("nxcm:airlineData");
                    if (airlineData != null) {
                        // Extracts ETA string, if it exists
                        eta = get_ETA(airlineData.optJSONObject("nxcm:eta"));

                        // Extracts ETD string, if it exists
                        etd = get_ETD(airlineData.optJSONObject("nxcm:etd"));
                    }
                }

                // Insert the data into the database
                // Message can come thorugh at any time, even after landing
                // So, manually check the ETD time to see if it has taken off yet
                InsertIntoDatabase(flightRef, acid, depArpt, arrArpt, etd, eta, isBeforeCurrentTime(etd), null);
                
                break;

            case "FlightScheduleActivate":
                System.out.println(flightInfo.toString(4));
                JSONObject ncsmFlightScheduleActivate = flightInfo.optJSONObject("fdm:ncsmFlightScheduleActivate");
                if (ncsmFlightScheduleActivate != null) {
                    // Search nested objects for ETA (usually found in ncsmRouteData object)
                    eta = ncsmRouteData_ETA(ncsmFlightScheduleActivate);

                    // Search nested objects for ETD (usually found in ncsmRouteData object)
                    etd = ncsmRouteData_ETD(ncsmFlightScheduleActivate);
                }

                // Insert the data into the database
                // Message comes through 24 hrs before takeoff
                InsertIntoDatabase(flightRef, acid, depArpt, arrArpt, etd, eta, false, false);

                break;

            case "FlightRoute":
                JSONObject ncsmFlightRoute = flightInfo.optJSONObject("fdm:ncsmFlightRoute");
                if (ncsmFlightRoute != null) {
                    // Search nested objects for ETA (usually found in ncsmRouteData object)
                    eta = ncsmRouteData_ETA(ncsmFlightRoute);

                    // Search nested objects for ETD (usually found in ncsmRouteData object)
                    etd = ncsmRouteData_ETD(ncsmFlightRoute);
                }

                // Insert the data into the database
                // Messgae comes through before takeoff
                InsertIntoDatabase(flightRef, acid, depArpt, arrArpt, etd, eta, false, false);

                break;

            case "FlightSectors":
                // No ETA info
                break;

            case "FlightTimes":
                JSONObject ncsmFlightTimes = flightInfo.optJSONObject("fdm:ncsmFlightTimes");
                if (ncsmFlightTimes != null) {
                    // Extracts ETA string, if it exists
                    eta = get_ETA(ncsmFlightTimes.optJSONObject("nxcm:eta")); 

                    // Extracts ETD string, if it exists
                    etd = get_ETD(ncsmFlightTimes.optJSONObject("nxcm:etd")); 
                }

                // Insert the data into the database
                // Messgae comes through before or shortly after etd time to notify of takeoff delay
                InsertIntoDatabase(flightRef, acid, depArpt, arrArpt, etd, eta, false, false);

                break;

            default:
                System.out.println("!!!Err-unknown-msg: FlightRef=" + flightRef + ", Acid=" + acid + ", Airport=" + arrArpt + ", MsgType=" + msgType);
                break;
        }
    }



    /*
     * Helper function that inserts data into the database
     * Input: Each element of the entery
     */
    private void InsertIntoDatabase(String flightRef, String acid, String depArpt, String arrArpt, String etd, String eta, Boolean departed, Boolean arrived) {
        if (flightRef != null && acid != null) {
            // Build sql statement dynamically so only the fields that are present are updated
            StringBuilder sql = new StringBuilder("INSERT INTO flight_plans (flightRef");
            StringBuilder values = new StringBuilder(" VALUES (?"); 
            StringBuilder updates = new StringBuilder(" ON DUPLICATE KEY UPDATE ");
            
            List<Object> params = new ArrayList<>();
            params.add(flightRef);

            // Dynamically add non-null columns
            sql.append(", acid");
            values.append(", ?");
            updates.append("acid = VALUES(acid), ");
            params.add(acid);

            if (depArpt != null) {
                sql.append(", departing_airport");
                values.append(", ?");
                updates.append("departing_airport = VALUES(departing_airport), ");
                params.add(depArpt);
            }
            if (arrArpt != null) {
                sql.append(", arrival_airport");
                values.append(", ?");
                updates.append("arrival_airport = VALUES(arrival_airport), ");
                params.add(arrArpt);
            }
            if (etd != null) {
                sql.append(", etd");
                values.append(", ?");
                updates.append("etd = VALUES(etd), ");
                params.add(convertZuluToMySQLDateTime(etd));
            }
            if (eta != null) {
                sql.append(", eta");
                values.append(", ?");
                updates.append("eta = VALUES(eta), ");
                params.add(convertZuluToMySQLDateTime(eta));
            }
            if (departed != null) {
                sql.append(", departed");
                values.append(", ?");
                updates.append("departed = VALUES(departed), ");
                params.add(departed);
            }
            if (arrived != null) {
                sql.append(", arrived");
                values.append(", ?");
                updates.append("arrived = VALUES(arrived), ");
                params.add(arrived);
            }

            // Close the SQL parts
            sql.append(")").append(values).append(")");
            
            // Remove the last comma and space from updates
            if (updates.length() > 30) { // Only append if there's an update part
                updates.setLength(updates.length() - 2);
                sql.append(updates);
            }

            try (PreparedStatement stmt = connection.prepareStatement(sql.toString())) {
                // Bind parameters
                for (int i = 0; i < params.size(); i++) {
                    stmt.setObject(i + 1, params.get(i));
                }

                stmt.executeUpdate();
                
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }


    /*
     * Main function for grabbing the messages and parsing them. 
     */
    @Override
    public void output(String message, String header) {
        // Program recieves about 4 JMS  messages a second
        // Each JMS message contains a giant XML 
        //Conversion to JSON from XML because iit's much easier to parse this way
        JSONObject xmlJSONObj = XML.toJSONObject(message);

        try {
            // The root of the xml message dump
            JSONObject root = xmlJSONObj.getJSONObject("ds:tfmDataService");

            // The object holding all messages
            JSONObject fltdOutput = root.getJSONObject("fltdOutput");

            // "fltdMessage" is the object the represents data for a single flight
            // There is almost always a bunch of "fltdMessage"s per an xml dump, so need to handle that case
            if (fltdOutput.has("fdm:fltdMessage")) {
                // Getting all of the single flight messages 
                Object fltdMessageObj = fltdOutput.get("fdm:fltdMessage");

                if (fltdMessageObj instanceof JSONArray) {
                    // Multiple flight messages
                    JSONArray messages = (JSONArray) fltdMessageObj;
                    
                    // Loop through all of the messages
                    for (int i = 0; i < messages.length(); i++) {
                        // A single flight message
                        JSONObject single_message = messages.getJSONObject(i);

                        // !
                        // If this flight's Air Craft ID ends with "QS", then it is a NetJets flight
                        if (single_message.getString("acid").endsWith("QS")) {
                            InsertFlightData(single_message);
                        }
                    }
                } else if (fltdMessageObj instanceof JSONObject) {
                    // Single flight message
                    JSONObject single_message = (JSONObject) fltdMessageObj;
                    if (single_message.getString("acid").endsWith("QS")) {
                        InsertFlightData(single_message);
                    }
                }
            }
        }
        catch (Exception e) {
            logger.error("Error processing message.", e);
            logger.error(message);
        }

    }
    
}
