const { canTransition, canSubmitResolution, isTerminal } = require('../utils/statusMachine');
const { STATUS: S } = require('../utils/constants');

describe('status machine', () => {
  test('authorities can never mark a complaint citizen-confirmed', () => {
    Object.values(S).forEach((from) => expect(canTransition(from, S.RESOLVED_CITIZEN_CONFIRMED, 'authority')).toBe(false));
  });

  test('authorities cannot jump to AWAITING_CITIZEN_CONFIRMATION via the status endpoint', () => {
    Object.values(S).forEach((from) => expect(canTransition(from, S.AWAITING_CITIZEN_CONFIRMATION, 'authority')).toBe(false));
  });

  test('citizen may only confirm or reject while awaiting confirmation', () => {
    expect(canTransition(S.AWAITING_CITIZEN_CONFIRMATION, S.RESOLVED_CITIZEN_CONFIRMED, 'citizen')).toBe(true);
    expect(canTransition(S.AWAITING_CITIZEN_CONFIRMATION, S.REOPENED, 'citizen')).toBe(true);
    expect(canTransition(S.IN_PROGRESS, S.RESOLVED_CITIZEN_CONFIRMED, 'citizen')).toBe(false);
    expect(canTransition(S.SUBMITTED, S.REOPENED, 'citizen')).toBe(false);
  });

  test('only the system can close an unconfirmed complaint', () => {
    expect(canTransition(S.AWAITING_CITIZEN_CONFIRMATION, S.CLOSED_UNCONFIRMED, 'system')).toBe(true);
    expect(canTransition(S.AWAITING_CITIZEN_CONFIRMATION, S.CLOSED_UNCONFIRMED, 'citizen')).toBe(false);
    expect(canTransition(S.AWAITING_CITIZEN_CONFIRMATION, S.CLOSED_UNCONFIRMED, 'authority')).toBe(false);
    expect(canTransition(S.IN_PROGRESS, S.CLOSED_UNCONFIRMED, 'system')).toBe(false);
  });

  test('normal investigation path is allowed', () => {
    expect(canTransition(S.SUBMITTED, S.UNDER_REVIEW, 'authority')).toBe(true);
    expect(canTransition(S.UNDER_REVIEW, S.ASSIGNED, 'authority')).toBe(true);
    expect(canTransition(S.ASSIGNED, S.IN_PROGRESS, 'authority')).toBe(true);
    expect(canTransition(S.IN_PROGRESS, S.ESCALATED, 'authority')).toBe(true);
    expect(canTransition(S.REOPENED, S.IN_PROGRESS, 'authority')).toBe(true);
  });

  test('terminal states cannot be changed by anyone', () => {
    [S.RESOLVED_CITIZEN_CONFIRMED, S.CLOSED_UNCONFIRMED].forEach((from) => {
      expect(isTerminal(from)).toBe(true);
      ['authority', 'citizen', 'system'].forEach((actor) => Object.values(S).forEach((to) => expect(canTransition(from, to, actor)).toBe(false)));
      expect(canSubmitResolution(from)).toBe(false);
    });
  });

  test('resolution proof cannot be submitted while already awaiting confirmation', () => {
    expect(canSubmitResolution(S.AWAITING_CITIZEN_CONFIRMATION)).toBe(false);
    expect(canSubmitResolution(S.IN_PROGRESS)).toBe(true);
    expect(canSubmitResolution(S.REOPENED)).toBe(true);
  });

  test('unknown actor is denied', () => {
    expect(canTransition(S.SUBMITTED, S.UNDER_REVIEW, 'hacker')).toBe(false);
    expect(canTransition(S.SUBMITTED, S.UNDER_REVIEW, 'resolutionSubmission')).toBe(false);
  });
});
