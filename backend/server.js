const { env, assertEnv } = require('./config/env');
const { connectDB } = require('./config/db');
const { bootstrap } = require('./services/bootstrap');
const app = require('./app');
const { startScheduler } = require('./services/scheduler');

async function main() {
  assertEnv();
  await connectDB();
  await bootstrap();
  startScheduler();
  const host = '0.0.0.0';
  app.listen(env.port, host, () => console.log(`[server] CivicSolve AI API listening on http://${host}:${env.port}`));
}


main().catch((err) => {
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});
