import type { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { db, profiles } from '@emplorio/db';
import { syncProfileSchema } from '@emplorio/shared';

export async function profileRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireAuth);

  app.get('/', async (req) => {
    const rows = await db
      .select({ data: profiles.data, updatedAt: profiles.updatedAt })
      .from(profiles)
      .where(eq(profiles.userId, req.userId!))
      .limit(1);
    const row = rows[0];
    return { profile: row?.data ?? null, updatedAt: row?.updatedAt ?? null };
  });

  app.put('/', { schema: { body: syncProfileSchema } }, async (req) => {
    const { profile } = req.body as { profile: Record<string, unknown> };
    const userId = req.userId!;
    await db
      .insert(profiles)
      .values({ userId, data: profile as never })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { data: profile as never, updatedAt: sql`now()` },
      });
    return { ok: true };
  });
}
