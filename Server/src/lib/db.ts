import mongoose from "mongoose";

// Connection handling that works both for a long-lived server and for
// serverless invocations.
//
// The serverless case is the reason this exists. Each invocation may run in a
// fresh module scope but reuses the same warm container, and calling
// mongoose.connect() per request would open a new pool every time and exhaust
// Atlas's connection limit under any real traffic. Caching the *promise* on
// globalThis survives module re-evaluation and means concurrent cold starts
// share one connection attempt rather than racing to open several.

interface ConnectionCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// globalThis rather than a module-level variable: bundlers may evaluate the
// module more than once, and the cache has to outlive that.
const globalCache = globalThis as typeof globalThis & {
  __pitwallMongoose?: ConnectionCache;
};

const cache: ConnectionCache = (globalCache.__pitwallMongoose ??= {
  conn: null,
  promise: null,
});

export async function connectToDatabase() {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        // A serverless container handles requests one at a time, so a large
        // pool is wasted sockets against the Atlas limit.
        maxPoolSize: 10,
        // Fail fast rather than hanging a request for the default 30s when
        // the cluster is unreachable — usually an IP allowlist problem.
        serverSelectionTimeoutMS: 10_000,
      })
      .catch((error) => {
        // Clear the cached promise so the next invocation retries instead of
        // permanently reusing a rejected one.
        cache.promise = null;
        throw error;
      });
  }

  cache.conn = await cache.promise;

  return cache.conn;
}
