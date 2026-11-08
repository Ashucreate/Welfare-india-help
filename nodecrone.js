import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cron from 'node-cron';

const supabaseUrl = 'https://whxfromysvmqvhghqodj.supabase.co';
const supabaseKey = 'sb_publishable_M1XBQcyPuc6T6mY2Xp8ung_-boHGSJ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runScraper() {
  console.log('Starting automated job scrape...');
  try {
    const { data } = await axios.get('https://www.indgovtjobs.in/', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const $ = cheerio.load(data);
    const jobs = [];

    $('table tr').each((_, row) => {
      const cols = $(row).find('td');
      if (cols.length >= 2) {
        const title = $(cols[1]).text().trim();
        const link = $(cols[2]).find('a').attr('href') || '#';
        if (title) {
          jobs.push({ title, link, category: 'current', date: 'Today' });
        }
      }
    });

    for (const job of jobs) {
      const { error } = await supabase.from('jobs').upsert(job, { onConflict: 'title' });
      if (error) console.error(`Error inserting ${job.title}:`, error.message);
    }

    console.log('Scraper finished. Database updated.');
  } catch (err) {
    console.log('Scrape failed:', err.message);
  }
}

cron.schedule('0 0 * * *', () => {
  console.log('Cron trigger activated.');
  runScraper();
});

console.log('Cron scheduler initialized.');
