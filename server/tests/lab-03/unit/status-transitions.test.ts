import { describe, it, expect } from 'vitest';
import { TicketStatus } from '@prisma/client';
import {
  STATUS_TRANSITION_MATRIX,
  TICKET_STATUSES,
  getPermittedTransitions,
  canTransition,
} from '../../../src/utils/statusTransitions.js';

/**
 * status-transitions.test.ts — UNIT-02 (BR-12, AC-6.2)
 *
 * Verifies the Ticket Status Transition Matrix logic in isolation:
 *   - every permitted transition for each status
 *   - rejection of illegal jumps (including terminal CANCELLED)
 *   - "same status" (no-op) transitions are rejected
 */

describe('UNIT-02: Ticket Status Transition Matrix (BR-12, AC-6.2)', () => {
  it('defines exactly the 8 permitted statuses (BR-10)', () => {
    expect(TICKET_STATUSES).toEqual([
      'NEW',
      'OPEN',
      'IN_PROGRESS',
      'WAITING_FOR_REQUESTER',
      'RESOLVED',
      'CLOSED',
      'REOPENED',
      'CANCELLED',
    ]);
  });

  it('exposes the documented permitted transitions for every status', () => {
    expect(STATUS_TRANSITION_MATRIX.NEW).toEqual(['OPEN', 'CANCELLED']);
    expect(STATUS_TRANSITION_MATRIX.OPEN).toEqual(['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED']);
    expect(STATUS_TRANSITION_MATRIX.IN_PROGRESS).toEqual(['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED']);
    expect(STATUS_TRANSITION_MATRIX.WAITING_FOR_REQUESTER).toEqual(['IN_PROGRESS', 'RESOLVED', 'CANCELLED']);
    expect(STATUS_TRANSITION_MATRIX.RESOLVED).toEqual(['CLOSED', 'REOPENED']);
    expect(STATUS_TRANSITION_MATRIX.CLOSED).toEqual(['REOPENED']);
    expect(STATUS_TRANSITION_MATRIX.REOPENED).toEqual(['IN_PROGRESS', 'RESOLVED', 'CANCELLED']);
    expect(STATUS_TRANSITION_MATRIX.CANCELLED).toEqual([]);
  });

  it('allows each valid transition flagged in the matrix', () => {
    const allowed: Array<[TicketStatus, TicketStatus]> = [
      ['NEW', 'OPEN'],
      ['NEW', 'CANCELLED'],
      ['OPEN', 'IN_PROGRESS'],
      ['OPEN', 'WAITING_FOR_REQUESTER'],
      ['OPEN', 'CANCELLED'],
      ['IN_PROGRESS', 'WAITING_FOR_REQUESTER'],
      ['IN_PROGRESS', 'RESOLVED'],
      ['IN_PROGRESS', 'CANCELLED'],
      ['WAITING_FOR_REQUESTER', 'IN_PROGRESS'],
      ['WAITING_FOR_REQUESTER', 'RESOLVED'],
      ['WAITING_FOR_REQUESTER', 'CANCELLED'],
      ['RESOLVED', 'CLOSED'],
      ['RESOLVED', 'REOPENED'],
      ['CLOSED', 'REOPENED'],
      ['REOPENED', 'IN_PROGRESS'],
      ['REOPENED', 'RESOLVED'],
      ['REOPENED', 'CANCELLED'],
    ];

    for (const [from, to] of allowed) {
      expect(canTransition(from, to), `${from} -> ${to} should be allowed`).toBe(true);
      expect(getPermittedTransitions(from)).toContain(to);
    }
  });

  it('rejects incompatible status jumps (e.g. NEW -> CLOSED)', () => {
    expect(canTransition('NEW', 'CLOSED')).toBe(false);
    expect(canTransition('NEW', 'RESOLVED')).toBe(false);
    expect(canTransition('OPEN', 'RESOLVED')).toBe(false);
    expect(canTransition('OPEN', 'REOPENED')).toBe(false);
    expect(canTransition('IN_PROGRESS', 'CLOSED')).toBe(false);
    expect(canTransition('WAITING_FOR_REQUESTER', 'CLOSED')).toBe(false);
    expect(canTransition('REOPENED', 'CLOSED')).toBe(false);
  });

  it('rejects self-transitions and reverse jumps (single-direction workflow)', () => {
    expect(canTransition('NEW', 'NEW')).toBe(false);
    expect(canTransition('IN_PROGRESS', 'OPEN')).toBe(false);
    expect(canTransition('OPEN', 'NEW')).toBe(false);
    expect(canTransition('RESOLVED', 'IN_PROGRESS')).toBe(false);
  });

  it('treats CANCELLED as a terminal state', () => {
    expect(getPermittedTransitions('CANCELLED')).toEqual([]);
    for (const next of TICKET_STATUSES) {
      expect(canTransition('CANCELLED', next)).toBe(false);
    }
  });
});