import requests
from dotenv import load_dotenv
import os
import xmltodict
import threading
import time


from flightDataProcessor import FlightDataProcessor
import flight_plans_api
from fbo_assigner import Fbo_assigner

if __name__ == "__main__":

    # Get the api url used to grab flight messages for each NetJets flight from the .env file that was mounted to this docker image
    load_dotenv()
    API_URL = os.getenv('JMS_API')
    DEBUG = os.getenv('DEBUG')

    # If debug is True, then use debugpy to connect this container to a local debugger 
    if DEBUG == "True":
        import debugpy
        debugpy.listen(("0.0.0.0", 5678))  # Listen on all interfaces at port 5678
        print("Waiting for debugger to attach...")
        debugpy.wait_for_client()  # Wait until the debugger is connected
        print("Debugger is attached.")

    # Object that processes the flight data message into a flight plan dictionary based on the context of the message
    flightDataProcessor = FlightDataProcessor()

    # Object that assigns flight plans to mock FBOs as a placeholder until the real FBO assignment data is incorporated
    fboAssigner = Fbo_assigner()

    # Start Flask app in a separate thread so it can run concurrently with the while loop below
    flask_thread = threading.Thread(target=flight_plans_api.run_app, daemon=True)
    flask_thread.start()

    while True:
        # Get the next JMS message
        try:
            response = requests.get(API_URL, timeout=1)
            message = response.json()['message']

        except requests.exceptions.RequestException as e:
            print("Error requesting from JMS API:", e)
        
        if message:
            # The message is XML
            # Convert it all to json
            message_json = xmltodict.parse(message)

            # Parses the message and returns a flight_plan dictionary
            flight_plan = flightDataProcessor.process_message(message_json.get('fltdMessage'))

            if flight_plan is not None:
                # Assign the flight plan a mock FBO (this function is a placeholder until the real FBO assignment data is incorporated)
                flight_plan = fboAssigner.assign_fbo(flight_plan)

                # Expose the objects to an api endpoint so it can be used by a database managing microservice
                flight_plans_api.add_flight_plan(flight_plan)
        
        # Sleep for a short period to avoid overwhelming the API
        time.sleep(0.2)

