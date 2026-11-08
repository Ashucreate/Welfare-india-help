import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client

SUPABASE_URL = 'https://whxfromysvmqvhghqodj.supabase.co'
SUPABASE_KEY = 'sb_publishable_M1XBQcyPuc6T6mY2Xp8ung_-boHGSJ'
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def scrape_and_update():
    url = "https://www.indgovtjobs.in/" 
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        jobs = []
        for row in soup.select('table tr'):
            cols = row.find_all('td')
            if len(cols) >= 2:
                title = cols[1].text.strip()
                link = cols[2].find('a')['href'] if cols[2].find('a') else '#'
                
                jobs.append({
                    'title': title,
                    'link': link,
                    'category': 'current',
                    'date': 'Today'
                })

        for job in jobs:
            supabase.table('jobs').upsert(job, on_conflict='title').execute()
        print("Database successfully updated with latest jobs.")
    except Exception as e:
        print(f"Error during scraping: {e}")

if __name__ == "__main__":
    scrape_and_update()
