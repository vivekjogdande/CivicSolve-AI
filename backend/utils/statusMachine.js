const { STATUS } = require('./constants');

/**
 * Allowed status transitions per actor.
 *  - authority: officers/senior officers/admin working a case
 *  - citizen:   the reporter (account holder or anonymous token holder)
 *  - system:    background jobs
 *
 * Authorities can NEVER move a complaint to RESOLVED_CITIZEN_CONFIRMED.
 * AWAITING_CITIZEN_CONFIRMATION can only be reached through the resolution-proof
 * submission flow (see complaintService.submitResolution), never through the plain status endpoint.
 */
const S = STATUS;

const TRANSITIONS = {
  authority: {
    [S.SUBMITTED]: [S.UNDER_REVIEW, S.ASSIGNED, S.ESCALATED],
    [S.UNDER_REVIEW]: [S.ASSIGNED, S.IN_PROGRESS, S.ESCALATED],
    [S.ASSIGNED]: [S.UNDER_REVIEW, S.IN_PROGRESS, S.ESCALATED],
    [S.IN_PROGRESS]: [S.ESCALATED],
    [S.REOPENED]: [S.ASSIGNED, S.IN_PROGRESS, S.ESCALATED],
    [S.ESCALATED]: [S.ASSIGNED, S.IN_PROGRESS],
  },
  citizen: {
    [S.AWAITING_CITIZEN_CONFIRMATION]: [S.RESOLVED_CITIZEN_CONFIRMED, S.REOPENED],
  },
  system: {
    [S.AWAITING_CITIZEN_CONFIRMATION]: [S.CLOSED_UNCONFIRMED],
  },
  // Used only by submitResolution(): states from which proof may be submitted
  resolutionSubmission: [S.IN_PROGRESS, S.ASSIGNED, S.REOPENED, S.ESCALATED, S.UNDER_REVIEW],
};

function canTransition(from, to, actor) {
  const table = TRANSITIONS[actor];
  if (!table || Array.isArray(table)) return false;
  return (table[from] || []).includes(to);
}

function canSubmitResolution(from) {
  return TRANSITIONS.resolutionSubmission.includes(from);
}

const TERMINAL = [S.RESOLVED_CITIZEN_CONFIRMED, S.CLOSED_UNCONFIRMED];
const isTerminal = (s) => TERMINAL.includes(s);

module.exports = { TRANSITIONS, canTransition, canSubmitResolution, isTerminal };
