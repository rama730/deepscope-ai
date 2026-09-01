/**
 * Types for real-time database changes
 */

import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface RealtimeInsertPayload<T> {
  eventType: "INSERT";
  new: T;
  old: null;
}

export interface RealtimeUpdatePayload<T> {
  eventType: "UPDATE";
  new: T;
  old: T;
}

export interface RealtimeDeletePayload<T> {
  eventType: "DELETE";
  new: null;
  old: T;
}

export type RealtimePayload<T> = 
  | RealtimeInsertPayload<T>
  | RealtimeUpdatePayload<T>
  | RealtimeDeletePayload<T>;

export interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}
