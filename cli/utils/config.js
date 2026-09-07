import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });
// Also try the backend .env for shared keys
dotenv.config({ path: resolve(__dirname, '../../backend/.env') });

export const config = {
  anthropicKey:   process.env.ANTHROPIC_API_KEY   || '',
  etherscanKey:   process.env.ETHERSCAN_API_KEY   || 'YourApiKeyToken',
  coingeckoKey:   process.env.COINGECKO_API_KEY   || '',
  newsApiKey:     process.env.NEWS_API_KEY         || '',
  aiModel:        process.env.AI_MODEL             || 'claude-sonnet-4-6',
  dbPath:         resolve(__dirname, '..', process.env.MIA_DB_PATH || 'mia.db'),
  casesDir:       resolve(__dirname, '../..', process.env.MIA_CASES_DIR || 'cases'),
};

export function requireKey(key, name) {
  if (!config[key]) throw new Error(`Missing ${name} — add it to cli/.env`);
}
