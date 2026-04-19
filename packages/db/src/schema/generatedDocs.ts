import { pgTable, uuid, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { applications } from './applications.js';

export const generatedDocKindValues = ['cover_letter', 'tailored_cv'] as const;

export const generatedDocs = pgTable(
  'generated_docs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: generatedDocKindValues }).notNull(),
    content: text('content').notNull(),
    pdfUrl: text('pdf_url'),
    model: text('model').notNull(),
    tokensIn: integer('tokens_in').notNull().default(0),
    tokensOut: integer('tokens_out').notNull().default(0),
    cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
    cacheWriteTokens: integer('cache_write_tokens').notNull().default(0),
    cacheHit: boolean('cache_hit').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    appIdx: index('generated_docs_application_idx').on(t.applicationId),
  }),
);

export type GeneratedDoc = typeof generatedDocs.$inferSelect;
