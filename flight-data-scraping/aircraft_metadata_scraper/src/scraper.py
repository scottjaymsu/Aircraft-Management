import requests
from bs4 import BeautifulSoup
from datetime import datetime
from src.database import get_last_updated, insert_aircraft_data, update_date
from io import BytesIO
import pandas as pd

#Scrapes the faa website data to determine if the database has had recent updates not in our database
def scrape_aircraft_data():
    url = f'https://www.faa.gov/airports/engineering/aircraft_char_database'

    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    date = soup.find('div', class_='mb-4 py-4')

    date_text = date.text.strip()
    split_str = date_text.split("Last updated:")
    date_str = split_str[1].strip()
    website_date = datetime.strptime(date_str, '%A, %B %d, %Y').date()

    last_update = get_last_updated('AircraftData')
    last_update_date = datetime.strptime(last_update, '%Y-%m-%d').date()

    #There is new data to add! Utilizing pandas to make a dataframe so it's easy to upload to our database
    if website_date > last_update_date:
        xls_url = f'{url}/aircraft_data'
        response = requests.get(xls_url)
        file_content = BytesIO(response.content)
        df = pd.read_excel(file_content)
        insert_aircraft_data(df)
        update_date(website_date)
