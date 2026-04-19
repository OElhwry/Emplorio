import { pgTable, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';
import type { Profile } from '@emplorio/shared';
import { users } from './users.js';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  data: jsonb('data').$type<Profile>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ProfileRow = typeof profiles.$inferSelect;
