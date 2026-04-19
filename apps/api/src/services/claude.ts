import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env.js';

export const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export const MODEL = env.ANTHROPIC_MODEL;

export interface CoverLetterArgs {
  profileBlock: string;
  jobDescription: string;
  company: string;
  role: string;
  tone: string;
}

export async function* streamCoverLetter(args: CoverLetterArgs) {
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: 'You write tailored cover letters grounded only in the provided profile. Never invent experience.',
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
