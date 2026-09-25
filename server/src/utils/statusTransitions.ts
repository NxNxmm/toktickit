import { TicketStatus } from '@prisma/client';

/**
 * Ticket Status Transition Matrix (docs/lab-03/specification.md §6, BR-12, AC-6.2).
 *
 * Maps every permitted status to the statuses it may transition into. A status
 * not present as a key's value (e.g. CANCELLED -> []) is a terminal state.
 */
export const TICKET_STATUSES: TicketStatus[] = [
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'CANCELLED',
];

export const STATUS_TRANSITION_MATRIX: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['OPEN', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  CANCELLED: [],
};

export function getPermittedTransitions(status: TicketStatus): TicketStatus[] {
  return STATUS_TRANSITION_MATRIX[status] ?? [];
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return getPermittedTransitions(from).includes(to);
}