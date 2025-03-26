
import logging
import mysql.connector
from datetime import datetime
import json
from dotenv import load_dotenv
import os

# Configure logging
logging.basicConfig(level=logging.INFO)

class FlightDataProcessor:
    class Status:
        SCHEDULED = "SCHEDULED"
        FLYING = "FLYING"
        ARRIVED = "ARRIVED"
        MAINTENANCE = "MAINTENANCE"

    def __init__(self):
        # Connect to the database

        # Get the databse conneciton info from the .env file that was mounted to this docker image
        load_dotenv()

        # Establish MySQL connection
        try:
            self.connection = mysql.connector.connect(
                host=os.getenv('DB_HOST'),
                user=os.getenv('DB_USER'),
                password=os.getenv('DB_PASSWORD'),
                database=os.getenv('DB_NAME')
            )

        except mysql.connector.Error as e:
            print("Error connecting to MySQL:", e)


    # --- Helper Functions for Parsing JSON Flight Data ---

    def get_eta(self, eta_object):
        if eta_object is not None:
            return eta_object.get("@timeValue")
        return None

    def get_etd(self, etd_object):
        if etd_object is not None:
            return etd_object.get("@timeValue")
        return None

    def ncsm_route_data_eta(self, flight_data_message):
        ncsm_route_data = flight_data_message.get("nxcm:ncsmRouteData")
        if ncsm_route_data:
            return self.get_eta(ncsm_route_data.get("nxcm:eta"))
        
        # Sometimes the message contains "nxcm:ncsmTrackData" instead
        ncsm_track_data = flight_data_message.get("nxcm:ncsmTrackData")
        if ncsm_track_data:
            return self.get_eta(ncsm_track_data.get("nxcm:eta"))
        return None

    def ncsm_route_data_etd(self, flight_data_message):
        ncsm_route_data = flight_data_message.get("nxcm:ncsmRouteData")
        if ncsm_route_data:
            return self.get_etd(ncsm_route_data.get("nxcm:etd"))
        
        ncsm_track_data = flight_data_message.get("nxcm:ncsmTrackData")
        if ncsm_track_data:
            return self.get_etd(ncsm_track_data.get("nxcm:etd"))
        return None

    def qualified_aircraft_id_airport(self, flight_data_message):
        qualified_aircraft_id = flight_data_message.get("nxcm:qualifiedAircraftId")
        if qualified_aircraft_id:
            arrival_point = qualified_aircraft_id.get("nxce:arrivalPoint")
            if arrival_point:
                return arrival_point.get("nxce:airport")
        return None

    def flight_status_and_spec_model(self, flight_data_message):
        flight_status_and_spec = flight_data_message.get("nxcm:flightStatusAndSpec")
        if flight_status_and_spec:
            model = flight_status_and_spec.get("nxcm:aircraftModel")
            if model:
                return model
            
            return flight_status_and_spec.get("nxcm:aircraftSpecification")
        return None

    def flight_aircraft_specs_model(self, flight_data_message):
        return flight_data_message.get("nxcm:flightAircraftSpecs")

    @staticmethod
    def convert_zulu_to_mysql_datetime(zulu_time):
        """
        Converts a Zulu (UTC) time string in the format 'YYYY-MM-DDTHH:MM:SSZ'
        to a MySQL DATETIME string 'YYYY-MM-DD HH:MM:SS'.
        """
        if zulu_time is None:
            return None
        try:
            dt = datetime.strptime(zulu_time, "%Y-%m-%dT%H:%M:%SZ")
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception as e:
            logging.error("Error converting zulu time", exc_info=True)
            return None

    @staticmethod
    def is_before_current_time(zulu_time):
        """
        Returns True if the given Zulu time is before the current UTC time.
        """
        if zulu_time is None:
            return False
        try:
            dt = datetime.strptime(zulu_time, "%Y-%m-%dT%H:%M:%SZ")
            return dt < datetime.now(datetime.timezone.utc)
        except Exception as e:
            logging.error("Error comparing times", exc_info=True)
            return False

    # --- Main Flight Data Processing Method ---

    def process_message(self, flight_info):
        """
        Processes a single flight's data dump (provided as a dictionary)
        and inserts/updates the database accordingly.
        """

        flight_ref = flight_info.get("@flightRef")
        acid = flight_info.get("@acid")
        arr_arpt = flight_info.get("@arrArpt")
        dep_arpt = flight_info.get("@depArpt")
        msg_type = flight_info.get("@msgType")
        eta = None
        etd = None
        eta_type = None
        model = None

        if msg_type == "flightPlanInformation":
            flight_plan_info = flight_info.get("fdm:flightPlanInformation")
            if flight_plan_info:
                eta = self.ncsm_route_data_eta(flight_plan_info)
                etd = self.ncsm_route_data_etd(flight_plan_info)
                if arr_arpt is None:
                    arr_arpt = self.qualified_aircraft_id_airport(flight_plan_info)
                model = self.flight_aircraft_specs_model(flight_plan_info)

                self.insert_into_flight_plans_table(flight_ref, acid, dep_arpt, arr_arpt, etd, eta, self.Status.SCHEDULED)

        elif msg_type == "flightPlanAmendmentInformation":
            flight_plan_amendment_info = flight_info.get("fdm:flightPlanAmendmentInformation")
            if flight_plan_amendment_info:
                eta = self.ncsm_route_data_eta(flight_plan_amendment_info)
                etd = self.ncsm_route_data_etd(flight_plan_amendment_info)
                if arr_arpt is None:
                    arr_arpt = self.qualified_aircraft_id_airport(flight_plan_amendment_info)
                diversion_cancel_data = flight_plan_amendment_info.get("ncsmDiversionCancelData")
                if diversion_cancel_data:
                    canceled_flight_reference_object = diversion_cancel_data.get("canceledFlightReference")
                    if canceled_flight_reference_object:
                        cancel_flight_ref = canceled_flight_reference_object.get("#text")
                        try:
                            sql = "DELETE FROM flight_plans WHERE flightRef = %s"
                            cursor = self.connection.cursor()
                            cursor.execute(sql, (cancel_flight_ref,))
                            self.connection.commit()
                            cursor.close()
                        except Exception as e:
                            logging.error("Error deleting flight plan", exc_info=True)
                else:
                    self.insert_into_flight_plans_table(flight_ref, acid, dep_arpt, arr_arpt, etd, eta, None)

        elif msg_type == "arrivalInformation":
            arrival_info = flight_info.get("fdm:arrivalInformation")
            if arrival_info:
                ncsm_flight_time_data = arrival_info.get("nxcm:ncsmFlightTimeData")
                if ncsm_flight_time_data:
                    eta_object = ncsm_flight_time_data.get("nxcm:eta")
                    if eta_object:
                        eta_type = eta_object.get("@etaType")
                        if eta_type == "ACTUAL":
                            eta = eta_object.get("@timeValue")
                if eta is None:
                    time_of_arrival_object = arrival_info.get("nxcm:timeOfArrival")
                    if time_of_arrival_object:
                        eta = time_of_arrival_object.get("#text")

                self.insert_into_flight_plans_table(flight_ref, acid, dep_arpt, arr_arpt, etd, eta, self.Status.ARRIVED)
                self.update_fleet_table(flight_ref, acid, model)

                # Assign a plane to a FBO, if applicable
                sql_fbo = ("SELECT id FROM airport_parking WHERE Airport_Code = %s AND "
                           "(SELECT COUNT(*) FROM parked_at WHERE fbo_id = airport_parking.id) < Total_Space "
                           "ORDER BY Priority")
                fbo_id = -1
                try:
                    cursor = self.connection.cursor()
                    cursor.execute(sql_fbo, (arr_arpt,))
                    result = cursor.fetchone()
                    if result:
                        fbo_id = result[0]
                    cursor.close()
                except Exception as e:
                    logging.error("Error fetching FBO", exc_info=True)

                if fbo_id != -1:
                    sql_fbo2 = ("INSERT INTO parked_at VALUES(%s, %s) "
                                "ON DUPLICATE KEY UPDATE fbo_id = VALUES(fbo_id)")
                    try:
                        cursor = self.connection.cursor()
                        cursor.execute(sql_fbo2, (acid, fbo_id))
                        self.connection.commit()
                        cursor.close()
                    except Exception as e:
                        logging.error("Error inserting into parked_at", exc_info=True)

        elif msg_type == "departureInformation":
            departure_info = flight_info.get("fdm:departureInformation")
            if departure_info:
                ncsm_flight_time_data = departure_info.get("nxcm:ncsmFlightTimeData")
                if ncsm_flight_time_data:
                    eta = self.get_eta(ncsm_flight_time_data.get("nxcm:eta"))
                time_of_departure = departure_info.get("nxcm:timeOfDeparture")
                if time_of_departure:
                    etd = time_of_departure.get("#text")
                model = self.flight_aircraft_specs_model(departure_info)

                self.insert_into_flight_plans_table(flight_ref, acid, dep_arpt, arr_arpt, etd, eta, self.Status.FLYING)
                self.update_fleet_table(flight_ref, acid, model)

                sql = "DELETE FROM parked_at WHERE acid = %s"
                try:
                    cursor = self.connection.cursor()
                    cursor.execute(sql, (acid,))
                    self.connection.commit()
                    cursor.close()
                except Exception as e:
                    logging.error("Error deleting from parked_at", exc_info=True)

        elif msg_type == "flightPlanCancellation":
            flight_plan_cancellation = flight_info.get("fdm:flightPlanCancellation")
            if flight_plan_cancellation:
                if flight_ref and acid:
                    sql = "DELETE FROM flight_plans WHERE flightRef = %s"
                    try:
                        cursor = self.connection.cursor()
                        cursor.execute(sql, (flight_ref,))
                        self.connection.commit()
                        cursor.close()
                    except Exception as e:
                        logging.error("Error deleting flight plan (cancellation)", exc_info=True)

        elif msg_type == "trackInformation":
            track_info = flight_info.get("fdm:trackInformation")
            if track_info:
                eta = self.ncsm_route_data_eta(track_info)
                if arr_arpt is None:
                    arr_arpt = self.qualified_aircraft_id_airport(track_info)

                self.insert_into_flight_plans_table(flight_ref, acid, dep_arpt, arr_arpt, etd, eta, self.Status.FLYING)
                self.update_fleet_table(flight_ref, acid, model)

                sql = "DELETE FROM parked_at WHERE acid = %s"
                try:
                    cursor = self.connection.cursor()
                    cursor.execute(sql, (acid,))
                    self.connection.commit()
                    cursor.close()
                except Exception as e:
                    logging.error("Error deleting from parked_at in trackInformation", exc_info=True)

        elif msg_type == "boundaryCrossingUpdate":
            # No ETA info to process.
            pass

        elif msg_type == "oceanicReport":
            oceanic_report = flight_info.get("fdm:oceanicReport")
            if oceanic_report:
                eta = self.ncsm_route_data_eta(oceanic_report)

                self.insert_into_flight_plans_table(flight_ref, acid, dep_arpt, arr_arpt, etd, eta, self.Status.FLYING)
                self.update_fleet_table(flight_ref, acid, model)

        elif msg_type == "FlightCreate":
            ncsm_flight_create = flight_info.get("fdm:ncsmFlightCreate")
            if ncsm_flight_create:
                airline_data = ncsm_flight_create.get("nxcm:airlineData")
                if airline_data:
                    eta = self.get_eta(airline_data.get("nxcm:eta"))
                    etd = self.get_etd(airline_data.get("nxcm:etd"))
                    model = self.flight_status_and_spec_model(airline_data)
                status = self.Status.FLYING if self.is_before_current_time(etd) else self.Status.SCHEDULED

                self.insert_into_flight_plans_table(flight_ref, acid, dep_arpt, arr_arpt, etd, eta, status)

        elif msg_type == "FlightModify":
            ncsm_flight_modify = flight_info.get("fdm:ncsmFlightModify")
            if ncsm_flight_modify:
                airline_data = ncsm_flight_modify.get("nxcm:airlineData")
                if airline_data:
                    eta = self.get_eta(airline_data.get("nxcm:eta"))
                    etd = self.get_etd(airline_data.get("nxcm:etd"))
                    model = self.flight_status_and_spec_model(airline_data)
                status = None
                if etd:
                    if not self.is_before_current_time(etd):
                        status = self.Status.SCHEDULED
                    else:
                        if not self.is_before_current_time(eta):
                            status = self.Status.FLYING

                            self.update_fleet_table(flight_ref, acid, model)

                self.insert_into_flight_plans_table(flight_ref, acid, dep_arpt, arr_arpt, etd, eta, status)

        elif msg_type == "FlightScheduleActivate":
            ncsm_flight_schedule_activate = flight_info.get("fdm:ncsmFlightScheduleActivate")
            if ncsm_flight_schedule_activate:
                eta = self.ncsm_route_data_eta(ncsm_flight_schedule_activate)
                etd = self.ncsm_route_data_etd(ncsm_flight_schedule_activate)

                self.insert_into_flight_plans_table(flight_ref, acid, dep_arpt, arr_arpt, etd, eta, self.Status.SCHEDULED)

        elif msg_type == "FlightRoute":
            ncsm_flight_route = flight_info.get("fdm:ncsmFlightRoute")
            if ncsm_flight_route:
                eta = self.ncsm_route_data_eta(ncsm_flight_route)
                etd = self.ncsm_route_data_etd(ncsm_flight_route)

                self.insert_into_flight_plans_table(flight_ref, acid, dep_arpt, arr_arpt, etd, eta, self.Status.SCHEDULED)

        elif msg_type == "FlightSectors":
            # No ETA info
            pass

        elif msg_type == "FlightTimes":
            ncsm_flight_times = flight_info.get("fdm:ncsmFlightTimes")
            if ncsm_flight_times:
                eta = self.get_eta(ncsm_flight_times.get("nxcm:eta"))
                etd = self.get_etd(ncsm_flight_times.get("nxcm:etd"))
                
                self.insert_into_flight_plans_table(flight_ref, acid, dep_arpt, arr_arpt, etd, eta, self.Status.SCHEDULED)

        else:
            logging.error(f"Unknown message type: " + str(flight_info))


    def insert_into_flight_plans_table(self, flight_ref, acid, dep_arpt, arr_arpt, etd, eta, status):
            """
            Inserts flight plan data into the flight_plans table. Builds the SQL dynamically so that only
            non-None fields are included.
            """
            if flight_ref is None or acid is None:
                return

            # Start building the query parts
            sql = "INSERT INTO flight_plans (flightRef"
            values = " VALUES (%s"
            updates = " ON DUPLICATE KEY UPDATE "
            params = [flight_ref]

            # Always include acid
            sql += ", acid"
            values += ", %s"
            updates += "acid = VALUES(acid), "
            params.append(acid)

            if dep_arpt is not None:
                sql += ", departing_airport"
                values += ", %s"
                updates += "departing_airport = VALUES(departing_airport), "
                params.append(dep_arpt)

            if arr_arpt is not None:
                sql += ", arrival_airport"
                values += ", %s"
                updates += "arrival_airport = VALUES(arrival_airport), "
                params.append(arr_arpt)

            if etd is not None:
                sql += ", etd"
                values += ", %s"
                updates += "etd = VALUES(etd), "
                params.append(self.convert_zulu_to_mysql_datetime(etd))

            if eta is not None:
                sql += ", eta"
                values += ", %s"
                updates += "eta = VALUES(eta), "
                params.append(self.convert_zulu_to_mysql_datetime(eta))

            if status is not None:
                sql += ", status"
                values += ", %s"
                updates += "status = VALUES(status), "
                params.append(status)

            # Close the column and values parts
            sql += ")" + values + ")"

            # Append the update clause if any extra fields were added.
            # Remove the trailing comma and space from the updates clause.
            if updates.strip() != "ON DUPLICATE KEY UPDATE":
                updates = updates.rstrip(", ")
                sql += updates

            try:
                cursor = self.connection.cursor()
                cursor.execute(sql, tuple(params))
                self.connection.commit()
                cursor.close()
            except Exception as e:
                print("Error inserting into flight_plans:", e)

    def update_fleet_table(self, flight_ref, acid, model):
        """
        Updates (or inserts) a record in the netjets_fleet table, linking a plane (acid) with its active flight plan.
        If the model is available, it is updated; otherwise, only the flightRef is updated.
        """
        if flight_ref is None or acid is None:
            return

        try:
            cursor = self.connection.cursor()
            if model is not None:
                sql = ("INSERT INTO netjets_fleet (acid, plane_type, flightRef) VALUES (%s, %s, %s) "
                    "ON DUPLICATE KEY UPDATE acid = VALUES(acid), plane_type = VALUES(plane_type), flightRef = VALUES(flightRef)")
                params = (acid, model, flight_ref)
            else:
                sql = ("INSERT INTO netjets_fleet (acid, flightRef) VALUES (%s, %s) "
                    "ON DUPLICATE KEY UPDATE acid = VALUES(acid), flightRef = VALUES(flightRef)")
                params = (acid, flight_ref)

            cursor.execute(sql, params)
            self.connection.commit()
            cursor.close()
        except Exception as e:
            print("Error updating netjets_fleet:", e)