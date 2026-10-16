/**
 * Pure metric calculations for the public transparency dashboard.
 *
 * Definitions (all computed over complaints created inside the reporting period):
 *  - attempted:  complaints with at least one submitted resolution attempt.
 *  - eligible:   attempted complaints whose latest attempt is no longer waiting on the citizen
 *                (status is not AWAITING_CITIZEN_CONFIRMATION). Outcome is known or the case is back in progress.
 *  - confirmationRate = RESOLVED_CITIZEN_CONFIRMED / eligible * 100
 *  - reopenRate       = complaints with >=1 citizen-rejected attempt / attempted * 100
 *  - unconfirmedRate  = CLOSED_UNCONFIRMED / eligible * 100
 */
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);

function computeRates({ attempted = 0, eligible = 0, confirmed = 0, rejectedAtLeastOnce = 0, closedUnconfirmed = 0 }) {
  return {
    confirmationRate: {
      value: pct(confirmed, eligible),
      numerator: confirmed,
      denominator: eligible,
      definition: 'Complaints resolved with citizen confirmation ÷ eligible complaints (those with a resolution attempt that is no longer awaiting the citizen) × 100.',
    },
    reopenRate: {
      value: pct(rejectedAtLeastOnce, attempted),
      numerator: rejectedAtLeastOnce,
      denominator: attempted,
      definition: 'Complaints where a citizen rejected a resolution attempt ÷ complaints with at least one submitted resolution attempt × 100.',
    },
    unconfirmedClosureRate: {
      value: pct(closedUnconfirmed, eligible),
      numerator: closedUnconfirmed,
      denominator: eligible,
      definition: 'Complaints closed because the citizen did not respond within the deadline ÷ eligible complaints × 100. These are NOT counted as confirmed resolutions.',
    },
  };
}

module.exports = { pct, computeRates };
