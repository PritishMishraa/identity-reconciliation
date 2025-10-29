import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono'
import { prettyJSON } from 'hono/pretty-json'
import { logger } from 'hono/logger'

import { contacts } from './db/schema';

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.use(prettyJSON())
app.use(logger())

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const result = await db.select().from(contacts).all();
  return c.json({ message: `Total contacts in the database: ${result.length}`});
})

export default app
