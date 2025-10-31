import { sqliteTable, text, integer, index, AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const contacts = sqliteTable(
    'contacts',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        phoneNumber: text('phone_number'),
        email: text('email'),
        linkedId: integer('linked_id').references((): AnySQLiteColumn => contacts.id),
        linkPrecedence: text('link_precedence', { enum: ['primary', 'secondary'] })
            .notNull()
            .default('primary'),
        createdAt: integer('created_at', { mode: 'timestamp' })
            .notNull()
            .default(sql`CURRENT_TIMESTAMP`),
        updatedAt: integer('updated_at', { mode: 'timestamp' })
            .notNull()
            .default(sql`CURRENT_TIMESTAMP`),
        deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    },
    (table) => [
        // Critical indexes for query performance
        index('email_idx').on(table.email),
        index('phone_idx').on(table.phoneNumber),
        index('linked_id_idx').on(table.linkedId),
        // Composite index for common query pattern
        index('email_phone_idx').on(table.email, table.phoneNumber),
        // Index for filtering out deleted records
        index('deleted_at_idx').on(table.deletedAt),
    ]
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;