
import logging
import mysql.connector
from datetime import datetime, timezone
import json
from dotenv import load_dotenv
import os


class FlightDataProcessor:
    class Status:
        SCHEDULED = "SCHEDULED"
        FLYING = "FLYING"
        ARRIVED = "ARRIVED"
        MAINTENANCE = "MAINTENANCE"
        CANCELED = "CANCELED"

    def __init__(self):
        pass
        

    def process_message(self, flight_info):
        """
        Processes a single flight's data dump (provided as a dictionary) and reutrn a flight_plan dictionary.
        The data comes from FAA's SWIM system's TFMS R14 Flight Data stream
        """

        # Store all relevelant flight plan info in a dictionary
        flight_plan = dict()

        flight_plan["flight_ref"] = flight_info.get("@flightRef")
        flight_plan["acid"] = flight_info.get("@acid")
        flight_plan["arr_arpt"] = flight_info.get("@arrArpt")
        flight_plan["dep_arpt"] = flight_info.get("@depArpt")



        # Each message type has it own xml structure, so it needs to be parsed uniquely
        # And the context of each message type affects what data will be updated in the database
        msg_type = flight_info.get("@msgType")

        if msg_type == "flightPlanInformation":
            # Message only comes before take off

            flight_plan["status"] = self.Status.SCHEDULED

            # Find the etd and eta
            flight_plan_info = flight_info.get("flightPlanInformation")
            if flight_plan_info:
                flight_plan["eta"] = self.ncsm_route_data_eta(flight_plan_info)
                flight_plan["etd"] = self.ncsm_route_data_etd(flight_plan_info)

                #  Sometimes flightPlan data won't contain arriving airport in the top level tag, so find it nested down in the qualifiedAircraftId object
                if flight_plan.get("arr_arpt") is None:
                    flight_plan["arr_arpt"] = self.qualified_aircraft_id_airport(flight_plan_info)

                # Grab the aircraft model
                flight_plan["model"]= self.flight_aircraft_specs_model(flight_plan_info)

            return flight_plan

        elif msg_type == "flightPlanAmendmentInformation":
            # Messages can come at anytime, including after landing, so status is undefined

            # Find etd and eta 
            flight_plan_amendment_info = flight_info.get("flightPlanAmendmentInformation")
            if flight_plan_amendment_info:
                flight_plan["eta"] = self.ncsm_route_data_eta(flight_plan_amendment_info)
                flight_plan["etd"] = self.ncsm_route_data_etd(flight_plan_amendment_info)

                # Sometimes flightPlan data won't contain arriving airport in the top level tag, so find it nested down in the qualifiedAircraftId object
                if flight_plan.get("arr_arpt") is None:
                    flight_plan["arr_arpt"] = self.qualified_aircraft_id_airport(flight_plan_amendment_info)

                # Sometimes this message will cancel a flight plan if a diversion happens
                diversion_cancel_data = flight_plan_amendment_info.get("ncsmDiversionCancelData")
                if diversion_cancel_data:
                    canceled_flight_reference_object = diversion_cancel_data.get("canceledFlightReference")
                    if canceled_flight_reference_object:
                        cancel_flight_ref = canceled_flight_reference_object.get("#text")

                        flight_plan["flight_ref"] = cancel_flight_ref
                        flight_plan["status"] = self.Status.CANCELED

            return flight_plan

        elif msg_type == "arrivalInformation":
            # Messages indicate that a plan has landed
            # However, it is worth noting that sometimes this message will send an eta marked 'ESTIMATED' if the FAA simply thinks the plane should
            # have landed by now and hasn't gotten the actual confirmation yet. But was unsure of what to do with this information. For now, jsut assume the
            # arrival information is always legit. If the plane is somehow still in the air, then the database will overwrite the arrival information with an active FLYING flight plan.
            
            flight_plan["status"] = self.Status.ARRIVED

            # eta is sent in two places, so check both just to be sure
            arrival_info = flight_info.get("arrivalInformation")
            if arrival_info:
                ncsm_flight_time_data = arrival_info.get("ncsmFlightTimeData")
                if ncsm_flight_time_data:
                    eta_object = ncsm_flight_time_data.get("nxcm:eta")
                    if eta_object:
                        flight_plan["eta"] = self.get_eta(eta_object)
                if flight_plan.get("eta") is None:
                    time_of_arrival_object = arrival_info.get("timeOfArrival")
                    if time_of_arrival_object:
                        flight_plan["eta"] = self.convert_zulu_to_mysql_datetime(time_of_arrival_object.get("#text"))

            return flight_plan

        elif msg_type == "departureInformation":
            # Message indicates that a flight has taken off and is currently flying now

            flight_plan["status"] = self.Status.FLYING

            # Find etd and eta
            departure_info = flight_info.get("departureInformation")
            if departure_info:
                ncsm_flight_time_data = departure_info.get("ncsmFlightTimeData")
                if ncsm_flight_time_data:
                    flight_plan["eta"] = self.get_eta(ncsm_flight_time_data.get("eta"))
                time_of_departure = departure_info.get("timeOfDeparture")
                if time_of_departure:
                    flight_plan["etd"] = self.convert_zulu_to_mysql_datetime(time_of_departure.get("#text"))

                # Grab the aircraft model
                flight_plan["model"] = self.flight_aircraft_specs_model(departure_info)

            return flight_plan

        elif msg_type == "flightPlanCancellation":
            # This message is complicated and the FAA documentation is not super clear. It could mean that the flight plan (aka the route the aircraft takes)
            # is cancelled and will be replaced, or it could mean that the flight itself is cancelled and the aircraft no longer intends to fly.
            # Either way, just cancel this flight plan and let the next message update with the new flight plan.

            flight_plan["status"] = self.Status.CANCELED

            return flight_plan

        elif msg_type == "trackInformation":
            # Message only comes through for planes that are actively flying

            flight_plan["status"] = self.Status.FLYING

            # Grab the most recent eta
            track_info = flight_info.get("trackInformation")
            if track_info:
                flight_plan["eta"] = self.ncsm_route_data_eta(track_info)

                # Sometimes flightPlan data won't contain arriving airport in the top level tag, so find it nested down in the qualifiedAircraftId object
                if flight_plan.get("arr_arpt") is None:
                    flight_plan["arr_arpt"] = self.qualified_aircraft_id_airport(track_info)

            return flight_plan

        elif msg_type == "boundaryCrossingUpdate":
            # No relevant info to process.
            pass

        elif msg_type == "oceanicReport":
            # Is like 'trackInformation' but for oceanic flights (as far as I can tell)

            flight_plan["status"] = self.Status.FLYING

            # Grab the most recent eta
            oceanic_report = flight_info.get("oceanicReport")
            if oceanic_report:
                flight_plan["eta"] = self.ncsm_route_data_eta(oceanic_report)

            return flight_plan

        elif msg_type == "FlightCreate":
            # Message can come before take off or while the aircraft is currently flying, so determine the status based off the etd time

            # Find the etd, eta, and aricraft model
            ncsm_flight_create = flight_info.get("ncsmFlightCreate")
            if ncsm_flight_create:
                airline_data = ncsm_flight_create.get("airlineData")
                if airline_data:
                    flight_plan["eta"] = self.get_eta(airline_data.get("eta"))
                    flight_plan["etd"] = self.get_etd(airline_data.get("etd"))
                    flight_plan["model"] = self.flight_status_and_spec_model(airline_data)

                # Determine the status based on the etd time
                if self.is_before_current_time(flight_plan.get("etd")):
                    flight_plan["status"] = self.Status.FLYING
                else:
                    flight_plan["status"] = self.Status.SCHEDULED

            return flight_plan

        elif msg_type == "FlightModify":
            # Message can at anytime, including after landing, so use the etd and eta time to determine the status

            # Find the etd, eta, and aricraft model
            ncsm_flight_modify = flight_info.get("ncsmFlightModify")
            if ncsm_flight_modify:
                airline_data = ncsm_flight_modify.get("airlineData")
                if airline_data:
                    flight_plan["eta"] = self.get_eta(airline_data.get("eta"))
                    flight_plan["etd"] = self.get_etd(airline_data.get("etd"))
                    flight_plan["model"] = self.flight_status_and_spec_model(airline_data)

                # If there is an etd, then determine the status based on the etd and eta time
                # If no etd, or the aircraft has already arrived, then leave the status undefined (so that the status will just stay the same on the database)
                if flight_plan.get("etd"):
                    if not self.is_before_current_time(flight_plan.get("etd")):
                        flight_plan["status"] = self.Status.SCHEDULED
                    else:
                        if not self.is_before_current_time(flight_plan.get("eta")):
                            flight_plan["status"] = self.Status.FLYING

            return flight_plan

        elif msg_type == "FlightScheduleActivate":
            # Message only comes through before take off

            flight_plan["status"] = self.Status.SCHEDULED

            # Find the etd and eta
            ncsm_flight_schedule_activate = flight_info.get("ncsmFlightScheduleActivate")
            if ncsm_flight_schedule_activate:
                flight_plan["eta"] = self.ncsm_route_data_eta(ncsm_flight_schedule_activate)
                flight_plan["etd"] = self.ncsm_route_data_etd(ncsm_flight_schedule_activate)

            return flight_plan

        elif msg_type == "FlightRoute":
            # Message comes before take off

            flight_plan["status"] = self.Status.SCHEDULED

            # Find the etd and eta
            ncsm_flight_route = flight_info.get("ncsmFlightRoute")
            if ncsm_flight_route:
                flight_plan["eta"] = self.ncsm_route_data_eta(ncsm_flight_route)
                flight_plan["etd"] = self.ncsm_route_data_etd(ncsm_flight_route)

            return flight_plan

        elif msg_type == "FlightSectors":
            # No relevant info
            pass

        elif msg_type == "FlightTimes":
            # Messgae comes through before or shortly after ESTIMATED time of departure time to notify of takeoff delay (i.e. it still hasn't taken off yet)

            flight_plan["status"] = self.Status.SCHEDULED

            # Find the etd and eta
            ncsm_flight_times = flight_info.get("ncsmFlightTimes")
            if ncsm_flight_times:
                flight_plan["eta"] = self.get_eta(ncsm_flight_times.get("eta"))
                flight_plan["etd"] = self.get_etd(ncsm_flight_times.get("etd"))

            return flight_plan                
                # self.insert_into_flight_plans_table(flight_ref, acid, dep_arpt, arr_arpt, etd, eta, self.Status.SCHEDULED)

        else:
            print(f"Unknown message type: " + str(flight_info))


    # --- Helper Functions ---

    def get_eta(self, eta_object):
        if eta_object is not None:
            eta_zulu = eta_object.get("@timeValue")
            return self.convert_zulu_to_mysql_datetime(eta_zulu)
        return None

    def get_etd(self, etd_object):
        if etd_object is not None:
            etd_zulu = etd_object.get("@timeValue")
            return self.convert_zulu_to_mysql_datetime(etd_zulu)
        return None

    def ncsm_route_data_eta(self, flight_data_message):
        ncsm_route_data = flight_data_message.get("ncsmRouteData")
        if ncsm_route_data:
            return self.get_eta(ncsm_route_data.get("eta"))
        
        # Sometimes the message contains "nxcm:ncsmTrackData" instead
        ncsm_track_data = flight_data_message.get("ncsmTrackData")
        if ncsm_track_data:
            return self.get_eta(ncsm_track_data.get("eta"))
        return None

    def ncsm_route_data_etd(self, flight_data_message):
        ncsm_route_data = flight_data_message.get("ncsmRouteData")
        if ncsm_route_data:
            return self.get_etd(ncsm_route_data.get("etd"))
        
        ncsm_track_data = flight_data_message.get("ncsmTrackData")
        if ncsm_track_data:
            return self.get_etd(ncsm_track_data.get("etd"))
        return None

    def qualified_aircraft_id_airport(self, flight_data_message):
        qualified_aircraft_id = flight_data_message.get("qualifiedAircraftId")
        if qualified_aircraft_id:
            arrival_point = qualified_aircraft_id.get("arrivalPoint")
            if arrival_point:
                return arrival_point.get("airport")
        return None

    def flight_status_and_spec_model(self, flight_data_message):
        flight_status_and_spec = flight_data_message.get("flightStatusAndSpec")
        if flight_status_and_spec:
            model = flight_status_and_spec.get("aircraftModel")
            if model:
                return model
            
            return flight_status_and_spec.get("aircraftSpecification")
        return None

    def flight_aircraft_specs_model(self, flight_data_message):
        return flight_data_message.get("flightAircraftSpecs")

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
            print("Error converting zulu time")
            return None

    @staticmethod
    def is_before_current_time(datetime_str):
        """
        Returns True if the given MySQL DATETIME string time is before the current UTC time.
        """
        if datetime_str is None:
            return False
        try:
            dt = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")
            dt = dt.replace(tzinfo=timezone.utc)
            return dt < datetime.now(timezone.utc)
        except Exception as e:
            print("Error comparing times")
            return False