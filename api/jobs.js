import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://whxfromysvmqvhghqodj.supabase.co',
  'sb_publishable_M1XBQcyPuc6T6mY2Xp8ung_-boHGSJV'
)


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    let { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

            const formattedJobs = (jobs || []).map(item => ({
      category: item.category || item.c || item.type || 'current',
      date: item.date || item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Today',
      title: item.title || item.job_title || item.t || item.name || 'Govt Recruitment',
      link: item.link || item.apply_link || item.url || item.u || '#'
    }));
    
    

    return res.status(200).json({
      success: true,
      items: formattedJobs
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      items: []
    });
  }
}
