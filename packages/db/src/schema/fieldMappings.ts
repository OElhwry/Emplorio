import { pgTable, uuid, text, jsonb, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import type { FieldMapping } from '@emplorio/shared';

export const fieldMappings = pgTable(
  'field_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    domain: text('domain').notNull(),
    formFingerprint: text('form_fingerprint').notNull(),
    mapping: jsonb('mapping').$type<FieldMapping>().notNull(),
    hits: integer('hits').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex('field_mappings_domain_fp_idx').on(t.domain, t.formFingerprint),
  }),
);

export type FieldMappingRow = typeof fieldMappings.$inferSelect;
