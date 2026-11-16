import { Hono } from 'hono'
import { handle } from 'hono/vercel'

import { zValidator } from "@hono/zod-validator";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";

import accounts from "./accounts";
import categories from "./categories";

const app = new Hono().basePath('/api')

app.get('/hello', 
  clerkMiddleware(),
  (c) => {
    const auth = getAuth(c);

  return c.json({
    message: 'Hello Next.js!',
  })
})

const routes = app
  .route("/accounts", accounts)
  .route("/categories", categories);
   

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)

export type AppType = typeof routes;
