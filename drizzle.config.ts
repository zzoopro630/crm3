import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local (fallback to .env)
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  schemaFilter: ["public", "seo"],
  entities: {
    roles: false,
  },
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
