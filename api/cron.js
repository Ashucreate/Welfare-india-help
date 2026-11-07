import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// High-reliability official and aggregated feeds for Central & Maharashtra jobs
const RSS_SOURCES = [
  { url: 'https://www.freejobalert.com/feed/', defaultCat: 'central' },
  { url: 'https://majhinaukri.in/feed/', defaultCat: 'current' },
  { url: 'https://sarkarinaukri.com/feed/', defaultCat: 'central' }
];

function classifyJob(title) {
  const t = title.toLowerCase();
  
  // Maharashtra State Specific Jobs
  if (t.includes('mpsc') || t.includes('police') || t.includes('maharashtra') || t.includes('zp') || t.includes('arogya') || t.includes('talathi')) {
    return 'current';
  }
  // Central & Banking Jobs
  if (t.includes('ssc') || t.includes('upsc') || t.includes('railway') || t.includes('rrb') || t.includes('ibps') || t.includes('sbi') || t.includes('bank') || t.includes('court') || t.includes('clerk') || t.includes('peon')) {
    return 'central';
  }
  return 'current';
}

function parseXML(xmlText) {
  const items = [];
  const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/gi) || [];
  
  for (const itemXml of itemMatches) {
    const titleMatch = itemXml.match(/<title>(.*?)<\/title>/i);
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i);
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);

    if (titleMatch && linkMatch) {
      let title = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim();
      let link = linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim();
      let pubDate = pubDateMatch ? pubDateMatch[1] : new Date().toISOString();

      items.push({ title, link, pubDate });
    }
  }
  return items;
}

export default async function handler(req, res) {
  try {
    let allInserted = 0;

    for (const source of RSS_SOURCES) {
      const response = await fetch(source.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      
      if (!response.ok) continue;

      const xmlText = await response.text();
      const rawItems = parseXML(xmlText);

      for (const item of rawItems.slice(0, 15)) {
        const category = classifyJob(item.title);
        
        // Avoid duplicate insertion based on link/title
        const { data: existing } = await supabase
          .from('jobs')
          .select('id')
          .eq('title', item.title)
          .maybeSingle();

        if (!existing) {
          await supabase.from('jobs').insert([
            {
              title: item.title,
              category: category,
              link: item.link,
              date: new Date(item.pubDate).toISOString().split('T')[0]
            }
          ]);
          allInserted++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Ingested ${allInserted} new jobs successfully.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
    }
      
