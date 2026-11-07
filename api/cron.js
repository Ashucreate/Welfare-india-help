export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      success: false, 
      error: 'SUPABASE_URL ya SUPABASE_ANON_KEY Vercel par missing hai.' 
    });
  }

  // Live RSS feeds covering Central India & Maharashtra Govt Vacancies
  const RSS_FEEDS = [
    'https://www.freejobalert.com/feed/',
    'https://majhinaukri.in/feed/',
    'https://sarkarinaukri.com/feed/'
  ];

  function classifyCategory(title) {
    const t = title.toLowerCase();
    // Maharashtra State Jobs
    if (t.includes('mpsc') || t.includes('police') || t.includes('maharashtra') || t.includes('zp') || t.includes('arogya') || t.includes('talathi') || t.includes('shasan')) {
      return 'current';
    }
    // Central & All Dept Jobs (Clerk, Peon, Court, Bank, Railway, SSC, UPSC)
    return 'central';
  }

  function extractItemsFromXML(xmlText) {
    const items = [];
    const itemRegex = /<item>[\s\S]*?<\/item>/gi;
    const matches = xmlText.match(itemRegex) || [];

    for (const itemXml of matches) {
      const titleMatch = itemXml.match(/<title>(.*?)<\/title>/i);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i);
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);

      if (titleMatch && linkMatch) {
        let title = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim();
        let link = linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim();
        let pubDate = pubDateMatch ? pubDateMatch[1] : new Date().toISOString();

        // Standardize clean title
        title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

        items.push({
          title: title,
          link: link,
          category: classifyCategory(title),
          date: new Date(pubDate).toISOString().split('T')[0]
        });
      }
    }
    return items;
  }

  try {
    let totalInserted = 0;

    for (const feedUrl of RSS_FEEDS) {
      try {
        const response = await fetch(feedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        
        if (!response.ok) continue;

        const xmlText = await response.text();
        const rawJobs = extractItemsFromXML(xmlText);

        // Process top 15 latest jobs per feed
        for (const job of rawJobs.slice(0, 15)) {
          // Check if already present in database
          const checkRes = await fetch(`${supabaseUrl}/rest/v1/jobs?title=eq.${encodeURIComponent(job.title)}&select=id`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });

          const existingData = await checkRes.json();

          // Insert if not duplicate
          if (Array.isArray(existingData) && existingData.length === 0) {
            const insertRes = await fetch(`${supabaseUrl}/rest/v1/jobs`, {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(job)
            });

            if (insertRes.ok) {
              totalInserted++;
            }
          }
        }
      } catch (feedError) {
        console.error('Feed error:', feedError);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Live Sync Successful! Added ${totalInserted} new department jobs to database.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
