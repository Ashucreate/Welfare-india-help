// Vercel Serverless Function: /api/jobs
// Server par apne aap bharti / admit card / result / yojana / scholarship ke updates jama karta hai.
// Vercel CDN isse 30 min cache karta hai => site apne aap taaza rehti hai, koi cron/manual kaam nahi.

const DAYS = "when:14d";
const FEEDS = [
  ["current", "महाराष्ट्र भरती 2026 जाहिरात"],
  ["mega", "महाराष्ट्र पोलीस भरती OR महाभरती 2026"],
  ["central", "SSC OR RRB OR UPSC OR IBPS recruitment 2026 notification"],
  ["admit", "admit card OR hall ticket OR प्रवेशपत्र 2026"],
  ["result", "result OR निकाल 2026 MPSC OR board OR police"],
  ["schemes", "महाराष्ट्र शासन योजना 2026"],
  ["scholarship", "scholarship OR शिष्यवृत्ती 2026 MahaDBT"],
];

async function get(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 7000);
  try {
    const r = await fetch(url, {
      signal: c.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WelfareIndiaHelp/1.0)",
      },
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

const dec = (s) =>
  String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

const tag = (x, n) => {
  const m = x.match(
    new RegExp("<" + n + "[^>]*>([\\s\\S]*?)</" + n + ">", "i")
  );
  return m ? dec(m[1]) : "";
};

// Headline madhe "319 पदे / 3047 जागा / 14000 posts" asel tar vacancy number kaadhto
function vacancy(title) {
  const m = title.match(
    /(\d[\d,]*)\s*\+?\s*(पदे|पदांच्या|पदांसाठी|पद|जागा|जागांसाठी|posts?|vacanc(?:y|ies))/i
  );
  return m ? m[1] + (/[a-z]/i.test(m[2]) ? " Posts" : " पदे") : "";
}

function catFrom(t) {
  t = t.toLowerCase();
  if (/admit|hall ticket|प्रवेशपत्र|हॉल/.test(t)) return "admit";
  if (/result|निकाल/.test(t)) return "result";
  if (/scholar|शिष्यवृत्ती/.test(t)) return "scholarship";
  if (/yojana|scheme|योजना/.test(t)) return "schemes";
  if (/mega|महाभरती/.test(t)) return "mega";
  if (/ssc|rrb|railway|upsc|ibps|bank/.test(t)) return "central";
  return "current";
}

function parseRss(xml, cat, wp) {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  return items
    .slice(0, wp ? 20 : 8)
    .map((x) => {
      const source = tag(x, "source");
      let title = tag(x, "title");
      if (source && title.endsWith(" - " + source))
        title = title.slice(0, -(source.length + 3));
      const html = tag(x, "content:encoded") || tag(x, "description");
      const pdf =
        (html.match(/href=["'](https?:\/\/[^"']+?\.pdf(?:[?#][^"']*)?)["']/i) ||
          [])[1] || "";
      const d = new Date(tag(x, "pubDate"));
      return {
        t: title,
        u: tag(x, "link"),
        date: isNaN(d) ? new Date().toISOString() : d.toISOString(),
        src: source || (wp ? "WordPress" : "Live Feed"),
        c: cat || catFrom(title),
        v: vacancy(title),
        g: pdf,
        wp: wp ? 1 : 0,
      };
    })
    .filter((i) => i.t && /^https?:\/\//.test(i.u));
}

async function handler(req, res) {
  const jobs = FEEDS.map(([c, q]) => ({ url: gnews(q), c, wp: false }));
  if (process.env.WP_FEED_URL)
    jobs.push({ url: process.env.WP_FEED_URL, c: null, wp: true });

  const results = await Promise.allSettled(
    jobs.map(async (j) => parseRss(await get(j.url), j.c, j.wp))
  );
  let items = [];
  results.forEach((r) => {
    if (r.status === "fulfilled") items = items.concat(r.value);
  });

  const seen = new Set();
  items = items
    .sort((a, b) => b.wp - a.wp || new Date(b.date) - new Date(a.date))
    .filter((i) => {
      const k = i.t.toLowerCase().replace(/\W+/g, "").slice(0, 60);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 60);

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=1800, stale-while-revalidate=86400"
  );
  res
    .status(200)
    .send(
      JSON.stringify({
        updated: new Date().toISOString(),
        count: items.length,
        items,
      })
    );
}

module.exports = handler;
module.exports.parseRss = parseRss;
module.exports.vacancy = vacancy;
