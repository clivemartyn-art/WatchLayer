import type { State } from '../rules/types.js';
/** Presentation only: persisted statuses and their semantics remain unchanged. */
export const CUSTOMER_STATUS_LABELS:Record<State,string>={
  PASS:'Detected / Confirmed',WARNING:'Review recommended',POTENTIAL_ISSUE:'Potential issue / Action recommended',UNKNOWN:'Could not confirm',NOT_APPLICABLE:'Not applicable',
};
