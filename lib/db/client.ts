import { neon } from "@neondatabase/serverless";

/** Neon serverless — use in Route Handlers / Server Actions only */
export function getSql() {
  const url =
    process.env.overland_neon_token ??
    process.env.OVERLAND_NEON_TOKEN ??
    process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Missing database URL: set overland_neon_token (or OVERLAND_NEON_TOKEN / DATABASE_URL)",
    );
  }
  return neon(url);
}
