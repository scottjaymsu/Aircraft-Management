import mysql.connector
from dotenv import load_dotenv
import os
import requests
import time

from insert_into_flight_plans_table import insert_into_flight_plans_table
from update_fleet_table import update_fleet_table
from remove_from_flight_plans_table import remove_from_flight_plans_table

if __name__ == "__main__":

    # Maintain a connection to the database
    while True:
        # Get the databse conneciton info from the .env file that was mounted to this docker image
        load_dotenv()

        # The api for grabbing flight plan objects, as prcoessed by the flight_plan_tracking microservice
        API_URL = os.getenv('FLIGHT_PLANS_API')

        DEBUG = os.getenv('DEBUG')
        # If debug is True, then use debugpy to connect this container to a local debugger 
        if DEBUG == "True":
            import debugpy
            debugpy.listen(("0.0.0.0", 5679))  # Listen on all interfaces at port 5679
            print("Waiting for debugger to attach...")
            debugpy.wait_for_client()  # Wait until the debugger is connected
            print("Debugger is attached.")

        # Establish MySQL connection
        try:
            connection = mysql.connector.connect(
                host=os.getenv('DB_HOST'),
                user=os.getenv('DB_USER'),
                password=os.getenv('DB_PASSWORD'),
                database=os.getenv('DB_NAME')
            )

        except mysql.connector.Error as e:
            print("Error connecting to MySQL:", e)

        while connection:
            # Pull flight plan dictionaries from the api endpoint
            try:
                flight_plan = dict()
                response = requests.get(API_URL)
                flight_plan = response.json()['flight_plan']

            except requests.exceptions.RequestException as e:
                print("Error requesting from flight plans API:", e)
                break

            if flight_plan:
                status = flight_plan.get('status')

                # If the status is anything other than "CANCELLED", then insert the flight plan into the database
                if status != "CANCELED":
                    insert_into_flight_plans_table(connection, flight_plan)

                    # If the status is "FLYING", then make the fleet table point to this flight plan as the most "recent" flight plan (the flight plan that was most recently acitve)
                    if status == "FLYING":
                        update_fleet_table(connection, flight_plan.get('acid'), flight_plan.get('flight_ref'), flight_plan.get('model'))
                else:
                    # The flight plan was cancelled, so we need to remove it from the flight plans
                    remove_from_flight_plans_table(connection, flight_plan.get('flight_ref'))

            # Sleep for a short period to avoid overwhelming the API
            time.sleep(0.2)






   