// Single shared database module. DATABASE_URL stays server-side only.
import { neon } from "@neondatabase/serverless";

let client = null;
function getClient() {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  client = neon(url);
  return client;
}

// `db` is an object so tests can swap the two functions without a database.
export const db = {
  // Parameterised query -> array of row objects. Always use $1, $2 ... placeholders.
  query: (text, params = []) => getClient()(text, params),
  // Atomic multi-statement transaction. build(t) returns an array of t(text, params).
  transaction: (build) => getClient().transaction((t) => build(t)),
};

export const q = (text, params) => db.query(text, params);
export const tx = (build) => db.transaction(build);
