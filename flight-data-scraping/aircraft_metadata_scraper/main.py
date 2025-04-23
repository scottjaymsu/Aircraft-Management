import schedule
import time

from scraper import scrape_aircraft_data

def job():
    scrape_aircraft_data()

def main():
    # Schedule job once per day
    schedule.every().day.at("00:00").do(job)

    while True:
        # Check every minute
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    main()