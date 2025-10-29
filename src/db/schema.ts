import { sqliteTable, text, integer, AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const contacts = sqliteTable('contacts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    phoneNumber: text('phone_number'),
    email: text('email'),
    linkedId: integer('linked_id').references((): AnySQLiteColumn => contacts.id),
    linkPrecedence: text('link_precedence', { enum: ['primary', 'secondary'] }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});