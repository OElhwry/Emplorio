import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db, applications } from '@emplorio/db';
import { createApplicationSchema, syncApplicationsSchema } from '@emplorio/shared';

const idParam = z.object({ id: z.string().uuid() });

function toIsoOrNull(v: string | null | undefined): string | null {
  if (!v) return null;
  return v;
}

function rowToDto(r: typeof applications.$inferSelect) {
  return {
    id: r.id,
    company: r.company,
    role: r.role,
    jobUrl: r.jobUrl,
    jdSnapshot: r.jdSnapshot ?? '',
    status: r.status,
    notes: r.notes ?? undefined,
    source: r.source ?? undefined,
    savedAt: r.savedAt ? r.savedAt.toISOString() : null,
    appliedAt: r.appliedAt ? r.appliedAt.toISOString() : null,
    interviewDate: r.interviewDate ? r.interviewDate.toISOString() : null,
    followUpSentAt: r.followUpSentAt ? r.followUpSentAt.toISOString() : null,
    updatedAt: r.updatedAt.toISOString(),
  };
}

function dateOrNull(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function applicationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireAuth);

  app.get('/', async (req) => {
    const rows = await db
      .select()
      .from(applications)
      .where(eq(applications.userId, req.userId!))
      .orderBy(desc(applications.updatedAt));
    return { items: rows.map(rowToDto) };
  });

  app.put('/sync', { schema: { body: syncApplicationsSchema } }, async (req) => {
    const { applications: list } = req.body as { applications: Array<z.infer<typeof createApplicationSchema>> };
    const userId = req.userId!;
    if (list.length === 0) return { ok: true, count: 0 };

    const values = list.map((a) => ({
      userId,
      company: a.company,
      role: a.role,
      jobUrl: a.jobUrl,
      jdSnapshot: a.jdSnapshot ?? '',
      status: a.status,
      notes: a.notes ?? null,
      source: a.source ?? null,
      savedAt: dateOrNull(toIsoOrNull(a.savedAt)),
      appliedAt: dateOrNull(toIsoOrNull(a.appliedAt)),
      interviewDate: dateOrNull(toIsoOrNull(a.interviewDate)),
      followUpSentAt: dateOrNull(toIsoOrNull(a.followUpSentAt)),
    }));

    await db
      .insert(applications)
      .values(values)
      .onConflictDoUpdate({
        target: [applications.userId, applications.jobUrl],
        set: {
          company: sql`excluded.company`,
          role: sql`excluded.role`,
          status: sql`excluded.status`,
          notes: sql`excluded.notes`,
          source: sql`excluded.source`,
          savedAt: sql`excluded.saved_at`,
          appliedAt: sql`excluded.applied_at`,
          interviewDate: sql`excluded.interview_date`,
          followUpSentAt: sql`excluded.follow_up_sent_at`,
          updatedAt: sql`now()`,
        },
      });
    return { ok: true, count: values.length };
  });

  app.post('/', { schema: { body: createApplicationSchema } }, async (req, reply) => {
    const a = req.body as z.infer<typeof createApplicationSchema>;
    const userId = req.userId!;
    const inserted = await db
      .insert(applications)
      .values({
        userId,
        company: a.company,
        role: a.role,
        jobUrl: a.jobUrl,
        jdSnapshot: a.jdSnapshot ?? '',
        status: a.status,
        notes: a.notes ?? null,
        source: a.source ?? null,
        savedAt: dateOrNull(toIsoOrNull(a.savedAt)),
        appliedAt: dateOrNull(toIsoOrNull(a.appliedAt)),
        interviewDate: dateOrNull(toIsoOrNull(a.interviewDate)),
        followUpSentAt: dateOrNull(toIsoOrNull(a.followUpSentAt)),
      })
      .onConflictDoUpdate({
        target: [applications.userId, applications.jobUrl],
        set: {
          company: a.company,
          role: a.role,
          status: a.status,
          notes: a.notes ?? null,
          source: a.source ?? null,
          savedAt: dateOrNull(toIsoOrNull(a.savedAt)),
          appliedAt: dateOrNull(toIsoOrNull(a.appliedAt)),
          interviewDate: dateOrNull(toIsoOrNull(a.interviewDate)),
          followUpSentAt: dateOrNull(toIsoOrNull(a.followUpSentAt)),
          updatedAt: sql`now()`,
        },
      })
      .returning();
    reply.code(201).send(rowToDto(inserted[0]!));
  });

  app.delete('/:id', { schema: { params: idParam } }, async (req) => {
    const { id } = req.params as { id: string };
    await db
      .delete(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, req.userId!)));
    return { ok: true };
  });
}
