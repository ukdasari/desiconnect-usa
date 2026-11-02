// Loads .env from the API folder or the monorepo root before any module reads process.env.
// In containers and production, real environment variables take precedence and no file is needed.
import { config } from "dotenv";
import path from "node:path";

config({ path: [path.resolve(process.cwd(), ".env"), path.resolve(__dirname, "../../../.env")], quiet: true });
