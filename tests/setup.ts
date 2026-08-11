import { config } from 'dotenv'

// Test credentials live in .env.test, which is gitignored. It holds the service
// role key, so it must never be committed and never loaded by the frontend.
config({ path: '.env.test' })
