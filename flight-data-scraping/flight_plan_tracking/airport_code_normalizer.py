import mysql.connector
from dotenv import load_dotenv
import os

class Airport_code_normalizer():
    """ Convert any 3 letter codes (IATA) to 4 letter codes (ICAO) by
        referencing the airport data stored in the database
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

    def IATA_codes_to_ICAO_codes(self, flight_plan):
        if flight_plan.get('status') == "CANCELED":
            return flight_plan
        
        if self.connection is None:
            self.connection = self.connect_to_db()

        # If the airport code is 3 letters, check if there is a 4 letter code in the database    
        sql = "SELECT ident FROM airport_data WHERE iata_code = %s;"

        if flight_plan.get('dep_arpt') and len(flight_plan['dep_arpt']) == 3:
            
            params = [flight_plan['dep_arpt']]

            try:
                cursor = self.connection.cursor()
                cursor.execute(sql, tuple(params))

                icao_code = cursor.fetchone()

                cursor.close()

                if icao_code:
                    flight_plan['dep_arpt'] = icao_code[0]
            except Exception as e:
                print("Error grabbing airport data from database:", e)

        if flight_plan.get('arr_arpt') and len(flight_plan['arr_arpt']) == 3:
            
            params = [flight_plan['arr_arpt']]

            try:
                cursor = self.connection.cursor()
                cursor.execute(sql, tuple(params))

                icao_code = cursor.fetchone()

                cursor.close()

                if icao_code:
                    flight_plan['arr_arpt'] = icao_code[0]
            except Exception as e:
                print("Error grabbing airport data from database:", e)

        # Send the modified flight plan back to the flight plan tracker
        return flight_plan