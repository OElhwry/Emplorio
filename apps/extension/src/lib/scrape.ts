export interface JobInfo {
  company: string;
  role: string;
  jobDescription: string;
  url: string;
}

const JD_SELECTORS = [
  '[data-automation-id="jobPostingDescription"]',
  '[data-testid="job-description"]',
  '.jobs-description__content',
  '.jobs-description-content__text',
  '#job-details',
  '[class*="job-description" i]',
  '[class*="JobDescription" i]',
  '[class*="posting-page" i]',
  '[class*="posting" i] [class*="content" i]',
  '#content',
  '#main-content',
  'article',
  'main',
];

export function scrapeJob(doc: Document): JobInfo {
  const role = guessRole(doc);
  const company = guessCompany(doc);
  const jobDescription = guessJobDescription(doc);
  return { company, role, jobDescription, url: location.href };
}

function guessRole(doc: Document): string {
  const wd = doc.querySelector('[data-automation-id="jobPostingHeader"]')?.textContent?.trim();
  if (wd) return wd;
  const li =
    doc.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim() ??
    doc.querySelector('.jobs-unified-top-card__job-title')?.textContent?.trim() ??
    doc.querySelector('.t-24.job-details-jobs-unified-top-card__job-title')?.textContent?.trim();
  if (li) return li;
  const og = doc.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content;
  if (og) return cleanTitle(og);
  const h1 = doc.querySelector('h1')?.textContent?.trim();
  if (h1) return h1;
  return doc.title.split(/[-–|]/)[0]!.trim();
}

function guessCompany(doc: Document): string {
  const li =
    doc
      .querySelector('.job-details-jobs-unified-top-card__company-name a')
      ?.textContent?.trim() ??
    doc.querySelector('.jobs-unified-top-card__company-name a')?.textContent?.trim() ??
    doc
      .querySelector('.job-details-jobs-unified-top-card__company-name')
      ?.textContent?.trim();
  if (li) return li;
  const site = doc.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content;
  if (site && !/linkedin/i.test(site)) return capitalize(site);
  const host = location.hostname;
  if (host.includes('greenhouse.io') || host.includes('lever.co') || host.includes('ashbyhq.com')) {
    const seg = location.pathname.split('/').filter(Boolean)[0];
    if (seg) return capitalize(seg);
  }
  if (host.includes('myworkdayjobs.com') || host.includes('workday.com')) {
    const tenant = host.split('.')[0];
    if (tenant) return capitalize(tenant);
  }
  const titleParts = doc.title.split(/[-–|]/);
  return titleParts[titleParts.length - 1]!.trim();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function guessJobDescription(doc: Document): string {
  for (const sel of JD_SELECTORS) {
    const el = doc.querySelector(sel);
    const text = el?.textContent?.trim();
    if (text && text.length > 200) return text.slice(0, 8000);
  }
  return doc.body.innerText.slice(0, 8000);
}

function cleanTitle(s: string): string {
  return s.replace(/\s+at\s+.*$/i, '').trim();
}
