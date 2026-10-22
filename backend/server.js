const { env, assertEnv } = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');
const { startScheduler } = require('./services/scheduler');

async function main() {
  assertEnv();
  await connectDB();
  startScheduler();
  app.listen(env.port, () => console.log(`[server] CivicSolve AI API listening on http://localhost:${env.port}`));
}

main().catch((err) => {
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});
