import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  answerQuestionsSchema,
  followUpSchema,
  generateCoverLetterSchema,
  generateTailoredCvSchema,
  parseCvSchema,
  parsedCvSchema,
} from '@emplorio/shared';
import { env } from '../env.js';
import {
  answerQuestions,
  draftFollowUp,
  streamCoverLetter,
  profileToBlock,
  parseCvWithClaude,
} from '../services/claude.js';

function authorize(req: FastifyRequest, reply: FastifyReply): boolean {
  if (req.userId) return true;
  if (env.EMPLORIO_API_KEY) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (token === env.EMPLORIO_API_KEY) return true;
  }
  reply.code(401).send({ error: 'unauthorized' });
  return false;
}

/**
 * Resolves which Anthropic key to use for this request.
 * - If user supplied X-Anthropic-Key header → use it.
 * - Else if requester is the owner (or auth disabled) → server key.
 * - Else → 402 Payment Required, prompting them to add their key.
 */
function resolveAiKey(req: FastifyRequest, reply: FastifyReply): string | null | false {
  const supplied = (req.headers['x-anthropic-key'] as string | undefined)?.trim();
  if (supplied && supplied.length >= 10) return supplied;

  const isOwner =
    !!env.OWNER_EMAIL && !!req.userEmail && req.userEmail.toLowerCase() === env.OWNER_EMAIL.toLowerCase();
  const isApiKeyAuth = !req.userId; // shared API key path (no userId)
  if (isOwner || isApiKeyAuth) return null; // null = use server default

  reply.code(402).send({
    error: 'no_api_key',
    message: 'Add your Anthropic API key in Settings to use AI features.',
  });
  return false;
}

export async function generateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (req, reply) => {
    authorize(req, reply);
  });

  app.post(
    '/cover-letter',
    { schema: { body: generateCoverLetterSchema } },
    async (req, reply) => {
      const aiKey = resolveAiKey(req, reply);
      if (aiKey === false) return;
      const { profile, jobDescription, company, role, tone } = req.body as any;

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      try {
        for await (const delta of streamCoverLetter({
          profileBlock: profileToBlock(profile),
          jobDescription,
          company,
          role,
          tone,
          apiKey: aiKey ?? undefined,
        })) {
          reply.raw.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
        reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      } catch (err) {
        reply.raw.write(
          `data: ${JSON.stringify({ error: (err as Error).message })}\n\n`,
        );
      } finally {
        reply.raw.end();
      }
    },
  );

  app.post('/tailored-cv', { schema: { body: generateTailoredCvSchema } }, async () => {
    return { jobId: 'todo' };
  });

  app.post(
    '/answer-questions',
    { schema: { body: answerQuestionsSchema } },
    async (req, reply) => {
      const aiKey = resolveAiKey(req, reply);
      if (aiKey === false) return;
      const { profile, jobDescription, company, role, questions } = req.body as {
        profile: Record<string, unknown>;
        jobDescription: string;
        company: string;
        role: string;
        questions: string[];
      };
      const answers = await answerQuestions({
        profileBlock: profileToBlock(profile),
        jobDescription,
        company,
        role,
        questions,
        apiKey: aiKey ?? undefined,
      });
      return { answers };
    },
  );

  app.post(
    '/follow-up',
    { schema: { body: followUpSchema } },
    async (req, reply) => {
      const aiKey = resolveAiKey(req, reply);
      if (aiKey === false) return;
      const { profile, company, role, daysSinceApplied, notes } = req.body as {
        profile: Record<string, unknown>;
        company: string;
        role: string;
        daysSinceApplied: number;
        notes?: string;
      };
      return await draftFollowUp({
        profileBlock: profileToBlock(profile),
        company,
        role,
        daysSinceApplied,
        notes,
        apiKey: aiKey ?? undefined,
      });
    },
  );

  app.post(
    '/parse-cv',
    { schema: { body: parseCvSchema } },
    async (req, reply) => {
      const aiKey = resolveAiKey(req, reply);
      if (aiKey === false) return;
      const { cvText } = req.body as { cvText: string };
      const raw = await parseCvWithClaude(cvText, aiKey ?? undefined);
      return parsedCvSchema.parse(raw);
    },
  );
}
