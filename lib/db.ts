import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

// Attach to global to survive hot reloads in dev
declare global {
  var _mongooseConn: typeof mongoose | null;
  var _mongoosePromise: Promise<typeof mongoose> | null;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (global._mongooseConn) return global._mongooseConn;

  if (!global._mongoosePromise) {
    global._mongoosePromise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        // Mongoose defaults to 100 sockets per process. That is sized for one
        // long-lived server, not for serverless: every warm function instance
        // holds its own pool, so a modest traffic spike multiplies 100 by the
        // instance count and walks into Atlas's connection ceiling (500 on the
        // free/shared tiers) — which fails as timeouts, not as an obvious
        // "too many connections". A single request here never issues more than
        // a handful of concurrent queries, so 10 is generous.
        maxPoolSize: 10,
        // Keeps a couple of sockets warm so a request that arrives on an idle
        // instance doesn't pay the TCP + TLS handshake before its first query.
        minPoolSize: 1,
        // Default is 30s. A page that cannot reach the database should fail to
        // error.tsx quickly rather than hold the request open until the
        // platform's own timeout kills it with nothing rendered.
        serverSelectionTimeoutMS: 5000,
      })
      .catch((error) => {
        // Never cache a failed attempt. The cache lives on `global` so it
        // survives hot reloads — which means a rejected promise would be
        // replayed to every later caller, reporting the original error long
        // after the cause (paused cluster, dropped wifi) was fixed. Clearing it
        // lets the next call genuinely retry.
        global._mongoosePromise = null;
        throw error;
      });
  }

  global._mongooseConn = await global._mongoosePromise;
  return global._mongooseConn;
}
