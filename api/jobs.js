import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://whxfromysvmqvhghqodj.supabase.co',
  'sb_publishable_M1XBQcyPuc6T6mY2Xp8ung_-boHGSJ'
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

    // Supabase columns mapping to frontend format
    const formattedJobs = (jobs || []).map(item => ({
      t: item.title || item.t,         // Supabase 'title' -> Frontend 't'
      c: item.category || item.c || 'current', // Supabase 'category' -> Frontend 'c'
      date: item.date || item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Today',
      src: item.src || 'Govt Portal',
      v: item.v || 'जाहिरातीत पहा',
      g: item.g || '',
      u: item.u || '#'
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
