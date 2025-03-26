import requests
import json
from dotenv import load_dotenv
import os
import xmltodict


from flightDataProcessor import FlightDataProcessor

if __name__ == "__main__":

    # Get the api url used to grab flight messages for each NetJets flight from the .env file that was mounted to this docker image
    load_dotenv()
    API_URL = os.getenv('JMS_API')

    flightDataProcessor = FlightDataProcessor()

    while True:
        # Get the next JMS message
        response = requests.get(API_URL)
        message = response.json()['message']
        
        if message:
            # The message is XML
            # Convert it all to json
            message_json = xmltodict.parse(message)
            print("JSON:")
            print(message_json)
            print("ENd JSON")

            # Sends the message to be parsed and then update the database appropiately
            flightDataProcessor.process_message(message_json.get('fdm:fltdMessage'))
