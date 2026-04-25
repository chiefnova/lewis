import { defineConfig } from "drizzle-kit";

import { databaseUrlFromConfig, resolveDatabaseConnectionConfig } from "./src/config.js";

const databaseUrl = databaseUrlFromConfig(resolveDatabaseConnectionConfig());

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
