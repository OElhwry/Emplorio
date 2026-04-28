import Anthropic from '@anthropic-ai/sdk';
import type { Profile } from '@emplorio/shared';
import { env } from '../env.js';

const defaultClient = env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  : null;

export function getClient(apiKey?: string): Anthropic {
  if (apiKey) return new Anthropic({ apiKey });
  if (defaultClient) return defaultClient;
  throw new Error('no Anthropic API key available');
}

export const MODEL = env.ANTHROPIC_MODEL;

export function profileToBlock(profile: Partial<Profile>): string {
  const lines: string[] = [];
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  if (name) lines.push(`Name: ${name}`);
  if (profile.email) lines.push(`Email: ${profile.email}`);
  if (profile.phone) lines.push(`Phone: ${profile.phone}`);
  if (profile.linkedinUrl) lines.push(`LinkedIn: ${profile.linkedinUrl}`);
  if (profile.githubUrl) lines.push(`GitHub: ${profile.githubUrl}`);
  if (profile.currentTitle) lines.push(`Current title: ${profile.currentTitle}`);
  if (profile.currentCompany) lines.push(`Current company: ${profile.currentCompany}`);
  if (profile.yearsExperience != null) lines.push(`Years experience: ${profile.yearsExperience}`);
  if (profile.skills?.length) lines.push(`Skills: ${profile.skills.join(', ')}`);
  if (profile.workHistory?.length) {
    lines.push('\nWork history:');
    for (const w of profile.workHistory) {
      lines.push(`- ${w.title} at ${w.company} (${w.startDate} – ${w.endDate ?? 'present'})`);
      for (const b of w.bullets ?? []) lines.push(`  • ${b}`);
    }
  }
  if (profile.education?.length) {
    lines.push('\nEducation:');
    for (const e of profile.education) {
      lines.push(`- ${e.degree ?? ''} ${e.fieldOfStudy ?? ''} — ${e.institution}`.trim());
    }
  }
  if (profile.baseCvText) lines.push(`\nBase CV:\n${profile.baseCvText}`);
  return lines.join('\n');
}

export interface CoverLetterArgs {
  profileBlock: string;
  jobDescription: string;
  company: string;
  role: string;
  tone: string;
  apiKey?: string;
}

export async function* streamCoverLetter(args: CoverLetterArgs) {
  const stream = getClient(args.apiKey).messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: [
          'You are an elite career coach who writes cover letters that routinely advance candidates to interviews. Every letter sounds like a specific, thoughtful human wrote it about their own genuine experience. You never invent credentials or experience not found in the profile.',
          '',
          'Writing rules, every one strictly enforced with no exceptions:',
          '- Never use em dashes, en dashes, or double hyphens. If you feel the urge to use one, rewrite the sentence.',
          '- Never use hyphens to connect phrases or clauses. Use a comma, a period, or restructure.',
          '- Spell standard compound adjectives as two separate words (for example "full stack" not "full-stack", "data driven" not "data-driven").',
          '- Open with a compelling first sentence that references something specific about the role or company. Never open with "I am writing to" or any variation of it.',
          '- Ground every claim in a concrete detail from the profile. Outcomes, numbers, and specifics beat vague assertions.',
          '- Make a clear case for why this person fits this specific role at this specific company. Generic letters fail.',
          '- Write with natural rhythm. Mix short and longer sentences. Sound like a confident professional speaking to a peer, not filling out a form.',
          '- Ban all buzzwords: "passionate", "thrilled", "dynamic", "synergy", "innovative", "hard worker", "team player", "I am writing to express my interest".',
          '- Close with quiet confidence. No groveling, no excessive enthusiasm.',
          '- 3 to 4 tight paragraphs, under 400 words.',
        ].join('\n'),
      },
      {
        type: 'text',
        text: args.profileBlock,
        cache_control: { type: 'ephemeral' as const },
      },
    ] as Anthropic.TextBlockParam[],
    messages: [
      {
        role: 'user',
        content: `Write a ${args.tone} cover letter for ${args.role} at ${args.company}.\n\nJob description:\n${args.jobDescription}`,
      },
    ],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }

  return await stream.finalMessage();
}

export interface AnswerQuestionsArgs {
  profileBlock: string;
  jobDescription: string;
  company: string;
  role: string;
  questions: string[];
  apiKey?: string;
}

export async function answerQuestions(args: AnswerQuestionsArgs): Promise<string[]> {
  const numbered = args.questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
  const jobContext = [
    args.company && `Company: ${args.company}`,
    args.role && `Role: ${args.role}`,
    args.jobDescription && `Job description:\n${args.jobDescription}`,
  ]
    .filter(Boolean)
    .join('\n\n');
  const res = await getClient(args.apiKey).messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: [
          'You answer job application questions exactly as a thoughtful, experienced candidate would write them. You speak entirely in their voice, grounded in the profile provided. You never invent experience.',
          '',
          'Writing rules, every one strictly enforced with no exceptions:',
          '- Never use em dashes, en dashes, or double hyphens. Rewrite any sentence that would need one.',
          '- Never use hyphens to join phrases or clauses. Use a comma or split into two sentences.',
          '- Spell compound adjectives as two separate words (for example "well rounded" not "well-rounded").',
          '- Write in natural first person. Sound like a real person reflecting on their own experience, not a resume bot.',
          '- Be specific and concrete. Tie every answer to real details, roles, or outcomes from the profile.',
          '- Be concise but impactful. 2 to 4 sentences unless the question clearly calls for more. Never pad.',
          '- Directly answer what was asked, then support it with one concrete example or detail from the profile.',
          '- Ban all buzzwords: "passionate", "team player", "go-getter", "detail-oriented", "results-driven", "hard worker".',
          '- Match the register of the question. A casual question gets a conversational answer. A formal question gets a measured one.',
          '',
          'Output ONLY a single JSON object. No prose, no markdown fences.',
        ].join('\n'),
      },
      {
        type: 'text',
        text: args.profileBlock,
        cache_control: { type: 'ephemeral' as const },
      },
    ] as Anthropic.TextBlockParam[],
    messages: [
      {
        role: 'user',
        content: `${jobContext}\n\nAnswer each question. Return JSON of shape {"answers": string[]} with one entry per question in the same order.\n\nQuestions:\n${numbered}`,
      },
    ],
  });
  const block = res.content[0];
  const text = block?.type === 'text' ? block.text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Model did not return JSON');
  const parsed = JSON.parse(match[0]) as { answers?: unknown };
  if (!Array.isArray(parsed.answers)) throw new Error('Missing answers array');
  return parsed.answers.map((a) => String(a ?? ''));
}

export interface FollowUpArgs {
  profileBlock: string;
  company: string;
  role: string;
  daysSinceApplied: number;
  notes?: string;
  apiKey?: string;
}

export async function draftFollowUp(args: FollowUpArgs): Promise<{ subject: string; body: string }> {
  const res = await getClient(args.apiKey).messages.create({
    model: MODEL,
    max_tokens: 600,
    system: [
      {
        type: 'text',
        text: [
          'You draft short, polite follow-up emails for job applications.',
          'Style rules — strictly enforced:',
          '- Do NOT use em dashes (—), en dashes (–), or double hyphens (--).',
          '- Avoid clichés ("just circling back", "touching base", "reaching out", "passionate").',
          '- 4-6 sentences max. Warm, direct, no padding.',
          '- Subject line under 60 chars, no emoji.',
          'Output ONLY a single JSON object — no prose, no markdown fences.',
        ].join('\n'),
      },
      {
        type: 'text',
        text: args.profileBlock,
        cache_control: { type: 'ephemeral' as const },
      },
    ] as Anthropic.TextBlockParam[],
    messages: [
      {
        role: 'user',
        content: `Draft a follow-up email for a ${args.role} application at ${args.company} sent ${args.daysSinceApplied} days ago. ${
          args.notes ? `Context: ${args.notes}\n` : ''
        }Return JSON of shape {"subject": string, "body": string}. The body should reference the role and company, briefly restate one relevant strength from the profile, and politely ask about next steps.`,
      },
    ],
  });
  const block = res.content[0];
  const text = block?.type === 'text' ? block.text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Model did not return JSON');
  const parsed = JSON.parse(match[0]) as { subject?: unknown; body?: unknown };
  return {
    subject: String(parsed.subject ?? ''),
    body: String(parsed.body ?? ''),
  };
}

export async function parseCvWithClaude(cvText: string, apiKey?: string): Promise<unknown> {
  const res = await getClient(apiKey).messages.create({
    model: MODEL,
    max_tokens: 4096,
    system:
      'You extract structured data from CVs. Output ONLY a single JSON object — no prose, no markdown fences.',
    messages: [
      {
        role: 'user',
        content: `Extract this CV into JSON matching exactly this shape:

{
  "websites": string[],            // any URLs in the CV (LinkedIn, GitHub, portfolio, personal site)
  "workHistory": [
    {
      "company": string,
      "title": string,
      "startDate": string,         // "YYYY-MM" or "YYYY"
      "endDate": string | null,    // null if current
      "current": boolean,
      "location": string,          // optional, "" if unknown
      "bullets": string[]          // achievement / responsibility bullets, verbatim from CV
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string,            // "" if unknown
      "fieldOfStudy": string,      // "" if unknown
      "startDate": string,
      "endDate": string,
      "gpa": string
    }
  ],
  "skills": string[]               // technical / professional skills, deduplicated, no soft-skills filler
}

Rules:
- Return ONLY the JSON object. No prefix, no suffix, no \`\`\` fences.
- If a field is unknown, use "" for strings, [] for arrays, null where allowed.
- Order workHistory and education most-recent-first.

CV:
${cvText}`,
      },
    ],
  });
  const block = res.content[0];
  const text = block?.type === 'text' ? block.text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Model did not return JSON');
  return JSON.parse(match[0]);
}
