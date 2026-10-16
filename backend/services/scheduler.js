const cron = require('node-cron');
const { closeExpiredConfirmations } = require('./complaintService');

/**
 * Runs the confirmation-timeout job every 10 minutes and once at startup (catches anything that expired
 * while the server was down). The job is idempotent and uses atomic status guards.
 */
function startScheduler() {
  const run = async () => {
    try {
      const n = await closeExpiredConfirmations();
      if (n) console.log(`[scheduler] closed ${n} complaint(s) as unconfirmed`);
    } catch (e) {
      console.error('[scheduler] timeout job failed', e.message);
    }
  };
  run();
  return cron.schedule('*/10 * * * *', run);
}

module.exports = { startScheduler };
