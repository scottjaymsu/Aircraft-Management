import mysql.connector
import json
import time
from dotenv import load_dotenv
import os

# Connect to the database

# Get the databse conneciton info from the .env file that was mounted to this docker image
load_dotenv()

# Establish MySQL connection
try:
    connection = mysql.connector.connect(
        host=os.getenv('DB_HOST'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME')
    )

    cursor = connection.cursor()

except mysql.connector.Error as e:
    print("Error connecting to MySQL:", e)


time.sleep(20)

try:
    cursor.execute("SELECT * FROM flight_plans;")

    results = cursor.fetchall()
    for row in results:
        print(row)

except mysql.connector.Error as e:
    print(f"Error executing query: {e}")


cursor.close()
connection.close()