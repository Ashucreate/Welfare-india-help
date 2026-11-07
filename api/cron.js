export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      success: false, 
      error: 'SUPABASE_URL or SUPABASE_ANON_KEY environment variable is missing on Vercel.' 
    });
  }

  // Jobs feed targeting all Central & Maharashtra vacancies (Clerk, Peon, Court, Police, Banking, MPSC, UPSC, etc.)
  const jobsToSync = [
    { 
      title: 'UPSC Civil Services Examination 2027: IAS / IPS Officer Recruitment', 
      category: 'central', 
      link: 'https://upsc.gov.in', 
      date: new Date().toISOString().split('T')[0] 
    },
    { 
      title: 'MPSC Rajyaseva Prelims Exam 2026: Maharashtra Civil Services', 
      category: 'current', 
      link: 'https://mpsc.gov.in', 
      date: new Date().toISOString().split('T')[0] 
    },
    { 
      title: 'IBPS PO & Clerk Recruitment 2026: Banking Vacancies', 
      category: 'central', 
      link: 'https://ibps.in', 
      date: new Date().toISOString().split('T')[0] 
    },
    { 
      title: 'Bombay High Court & District Courts: Clerk & Peon Bharti 2026', 
      category: 'current', 
      link: 'https://bombayhighcourt.nic.in', 
      date: new Date().toISOString().split('T')[0] 
    },
    { 
      title: 'Maharashtra Police Sipahi Bharti 2026: 17,000+ Posts', 
      category: 'current', 
      link: 'https://mahapolice.gov.in', 
      date: new Date().toISOString().split('T')[0] 
    },
    { 
      title: 'Railway RRB ALP & Group D Recruitment 2026', 
      category: 'central', 
      link: 'https://rrcb.gov.in', 
      date: new Date().toISOString().split('T')[0] 
    }
  ];

  try {
    let addedCount = 0;

    for (const job of jobsToSync) {
      // 1. Check if job already exists in database
      const checkRes = await fetch(`${supabaseUrl}/rest/v1/jobs?title=eq.${encodeURIComponent(job.title)}&select=id`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      const existingData = await checkRes.json();

      // 2. Insert only if duplicate doesn't exist
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
          addedCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Ingestion successful! Added ${addedCount} new jobs to Supabase.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
