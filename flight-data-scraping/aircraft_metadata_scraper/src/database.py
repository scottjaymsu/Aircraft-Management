import mysql.connector
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()

def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"))

def get_engine():
    engine = create_engine(f'mysql+mysqlconnector://{os.getenv("DB_USER")}:{os.getenv("DB_PASSWORD")}@{os.getenv("DB_HOST")}/{os.getenv("DB_NAME")}')
    return engine

#Return the date for the last update to the aircraft data in our database
def get_last_updated(type):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT date FROM last_updated WHERE type = %s;", (type,))
    row = cursor.fetchone()
    return row[0]

#Use panda datafframe to insert directly into the table (it will make a new table)
def insert_aircraft_data(df):
    engine = get_engine()
    df.to_sql('aircraft_data', engine, if_exists='replace', index=False)
    
#Update the date in the last_updated table so that it will be reflected as changed
def update_date(date):
    conn = get_connection()
    cursor = conn.cursor()
    print(date)
    cursor.execute("UPDATE last_updated SET date=%s WHERE type='AircraftData';", (date,))
    conn.commit()
    conn.close()