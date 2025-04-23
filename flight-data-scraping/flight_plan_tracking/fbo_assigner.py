import mysql.connector
from dotenv import load_dotenv
import os

class Fbo_assigner():
    """ This is technically mock data. NetJets has internal data that assigns each aircraft to an FBO.
        This service is a place holder until that data is incorporated.
        For now, this service will assign an aircraft to the highest priority FBO with open space.
    """
    def __init__(self):
        self.connect_to_db()

    def connect_to_db(self):
        # Get the databse conneciton info from the .env file that was mounted to this docker image
        load_dotenv()

        self.connection = None

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

    def assign_fbo(self, flight_plan):
        if flight_plan.get('status') == "CANCELED":
            return flight_plan
        
        if self.connection is None:
            self.connection = self.connect_to_db()

        # Check if the flight plan has an FBO assigned already
        sql = "SELECT fbo_id FROM flight_plans WHERE flightRef = %s;"
        params = [flight_plan.get('flight_ref')]

        try:
            cursor = self.connection.cursor()
            cursor.execute(sql, tuple(params))

            fbo_assignment = cursor.fetchone()

            cursor.close()

            # If the flight plan has no FBO assigned, then assign it to one
            if fbo_assignment is None:
                # Get only the FBOs with open space and order it by the stored priority
                sql = "SELECT id FROM airport_parking WHERE Airport_Code = %s AND (SELECT COUNT(*) FROM netjets_fleet JOIN flight_plans ON netjets_fleet.flightRef = flight_plans.flightRef WHERE flight_plans.fbo_id = airport_parking.id) < Total_Space ORDER BY Priority LIMIT 1;"
                params = [flight_plan['arr_arpt']]

                try:
                    cursor = self.connection.cursor()
                    cursor.execute(sql, tuple(params))

                    fbo_assignment = cursor.fetchone()

                    cursor.close()
                except Exception as e:
                    print("Error grabbing parking data from database:", e)

                if fbo_assignment:
                    # Assign the flight plan to this FBO, if an available one was found
                    flight_plan['fbo_id'] = fbo_assignment[0]

        except Exception as e:
            print("Error grabbing parking data from database:", e)

        # Send the modified flight plan back to the flight plan tracker
        return flight_plan