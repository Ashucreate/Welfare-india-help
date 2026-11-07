import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Automated job pool covering Central & Maharashtra categories
    const sampleJobs = [
      { title: 'UPSC Civil Services Examination 2027: IAS / IPS Bharti', category: 'central', link: 'https://upsc.gov.in', date: new Date().toISOString().split('T')[0] },
      { title: 'MPSC Rajyaseva Prelims Exam 2026: Maharashtra Civil Services', category: 'current', link: 'https://mpsc.gov.in', date: new Date().toISOString().split('T')[0] },
      { title: 'IBPS PO / Clerk Banking Recruitment 2026: Central Bank Vacancy', category: 'central', link: 'https://ibps.in', date: new Date().toISOString().split('T')[0] },
      { title: 'Maharashtra Police Sipahi Bharti 2026: 17,000+ Posts', category: 'current', link: 'https://mahapolice.gov.in', date: new Date().toISOString().split('T')[0] },
      { title: 'Railway RRB ALP & Technician Exam 2026', category: 'central', link: 'https://rrcb.gov.in', date: new Date().toISOString().split('T')[0] },
      { title: 'Bombay High Court Clerk & Peon Recruitment 2026', category: 'central', link: 'https://bombayhighcourt.nic.in', date: new Date().toISOString().split('T')[0] }
    ];

    let insertedCount = 0;

    for (const job of sampleJobs) {
      const { data: existing } = await supabase
        .from('jobs')
        .select('id')
        .eq('title', job.title)
        .maybeSingle();

      if (!existing) {
        await supabase.from('jobs').insert([job]);
        insertedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully synced ${insertedCount} new jobs into database!`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
