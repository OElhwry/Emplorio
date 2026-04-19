import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const applicationStatusValues = [
  'draft',
  'applied',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
] as const;

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    company: text('company').notNull(),
    role: text('role').notNull(),
    jobUrl: text('job_url').notNull(),
    jdSnapshot: text('jd_snapshot').notNull(),
    status: text('status', { enum: applicationStatusValues }).notNull().default('draft'),
    notes: text('notes'),
    source: text('source'),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('applications_user_idx').on(t.userId),
    statusIdx: index('applications_status_idx').on(t.status),
  }),
);

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
