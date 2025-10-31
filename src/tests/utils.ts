/// <reference types="vite/client" />

// Import migration files directly using Vite's glob import
// This works in the Cloudflare Workers test environment
const migrationModules = import.meta.glob('/drizzle/migrations/*.sql', {
    query: '?raw',
    import: 'default',
    eager: true
}) as Record<string, string>;

/**
 * Applies all SQL migrations from the drizzle/migrations directory to a D1 database.
 * This ensures tests use the exact same schema as production, keeping them in sync.
 * 
 * Uses Vite's glob import to load migration files at build time, ensuring they're
 * available in the Cloudflare Workers test environment.
 * 
 * @param db - The D1Database instance to apply migrations to
 */
export async function applyMigrations(db: D1Database): Promise<void> {
    // Get migration files sorted by filename (they have numeric prefixes)
    const sortedMigrations = Object.entries(migrationModules).sort((a, b) =>
        a[0].localeCompare(b[0])
    );

    for (const [filepath, sql] of sortedMigrations) {
        // Split by statement separator (Drizzle uses `--> statement-breakpoint`)
        const statements = sql
            .split('--> statement-breakpoint')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--')); // Remove empty and comment-only statements

        // Execute each statement
        for (const statement of statements) {
            try {
                await db.prepare(statement).run();
            } catch (error) {
                const filename = filepath.split('/').pop();
                console.error(`Failed to execute migration from ${filename}:`, statement);
                throw error;
            }
        }
    }
}

