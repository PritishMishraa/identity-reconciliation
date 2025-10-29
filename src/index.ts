import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono'
import { prettyJSON } from 'hono/pretty-json'
import { logger } from 'hono/logger'
import { zValidator } from '@hono/zod-validator'

import { contacts } from '@/db/schema';
import { identifyRequestZodSchema, identifyResponseZodSchema } from '@/zod/identify';
import { reconcilation } from '@/queries/reconciliation';

const app = new Hono<{ Bindings: CloudflareBindings }>({
  strict: false
})

app.use(prettyJSON())
app.use(logger())

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const result = await db.select().from(contacts).all();
  return c.json({ "total_contacts": result });
})

app.post('/identify', zValidator('json', identifyRequestZodSchema), async (c) => {
  const { email, phoneNumber } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const response = await reconcilation({ db, email, phoneNumber });

  const validatedResponse = identifyResponseZodSchema.parse(response);

  return c.json(validatedResponse, 200);
})

export default app
