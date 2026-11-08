import time
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
import schedule

# Tumhara Supabase Connection
SUPABASE_URL = "https://whxfromysvmqvhghqodj.supabase.co"
SUPABASE_KEY = "sb_publishable_M1XBQcyPuc6T6mY2Xp8ung_-boHGSJ"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def run_scraper():
    print("Starting automated job scrape...")
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get('https://www.indgovtjobs.in/', headers=headers)
        
        soup = BeautifulSoup(response.text, 'html.parser')
        jobs = []

        for row in soup.select('table tr'):
            cols = row.find_all('td')
            if len(cols) >= 2:
                title = cols[1].text.strip()
                link_tag = cols[2].find('a')
                link = link_tag['href'] if link_tag and 'href' in link_tag.attrs else '#'
                if title:
                    jobs.append({'title': title, 'link': link, 'category': 'current', 'date': 'Today'})

        for job in jobs:
            # Supabase database mein save karna
            supabase.table('jobs').upsert(job, on_conflict='title').execute()
            
        print("Scraper finished. Database updated.")
    except Exception as err:
        print(f"Scrape failed: {err}")

# Rozana ke liye schedule set karna (jaise raat ke 12 baje)
schedule.every().day.at("00:00").do(run_scraper)

print("Python cron scheduler initialized.")

while True:
    schedule.run_pending()
    time.sleep(1)
