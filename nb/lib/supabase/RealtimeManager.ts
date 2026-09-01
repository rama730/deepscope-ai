/**
 * RealtimeManager - Centralized real-time subscription management
 * 
 * Solves the "mismatch between server and client bindings for postgres changes"
 * error by ensuring consistent channel keys and single bindings per unique
 * (table, event, filter) combination.
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from './client';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionConfig {
  table: string;
  schema?: string;
  event?: PostgresEvent;
  filter?: string;
}

interface ChannelEntry {
  channel: RealtimeChannel;
  refCount: number;
  callbacks: Set<(payload: RealtimePostgresChangesPayload<any>) => void>;
}

/**
 * Generates a deterministic, unique channel key based on subscription config.
 * This ensures the same binding always uses the same channel.
 */
function generateChannelKey(config: SubscriptionConfig): string {
  const { table, schema = 'public', event = '*', filter } = config;
  // Normalize filter to prevent subtle mismatches
  const normalizedFilter = filter?.trim() || 'none';
  return `realtime:${schema}:${table}:${event}:${normalizedFilter}`;
}

class RealtimeManagerSingleton {
  private channels: Map<string, ChannelEntry> = new Map();
  private static instance: RealtimeManagerSingleton | null = null;

  private constructor() {}

  static getInstance(): RealtimeManagerSingleton {
    if (!RealtimeManagerSingleton.instance) {
      RealtimeManagerSingleton.instance = new RealtimeManagerSingleton();
    }
    return RealtimeManagerSingleton.instance;
  }

  /**
   * Subscribe to postgres changes with automatic channel reuse.
   * Returns an unsubscribe function.
   */
  subscribe<T extends Record<string, any>>(
    config: SubscriptionConfig,
    callback: (payload: RealtimePostgresChangesPayload<T>) => void
  ): () => void {
    const channelKey = generateChannelKey(config);
    const existing = this.channels.get(channelKey);

    if (existing) {
      // Reuse existing channel, just add callback
      existing.callbacks.add(callback as any);
      existing.refCount++;
      
      return () => this.unsubscribe(channelKey, callback as any);
    }

    // Create new channel
    const supabase = createSupabaseBrowserClient();
    const { table, schema = 'public', event = '*', filter } = config;

    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
          filter,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          // Dispatch to all registered callbacks
          const entry = this.channels.get(channelKey);
          if (entry) {
            entry.callbacks.forEach(cb => {
              try {
                cb(payload);
              } catch (err) {
                console.error('[RealtimeManager] Callback error:', err);
              }
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(`[RealtimeManager] Channel error for ${channelKey}`);
        }
      });

    const callbacks = new Set<(payload: RealtimePostgresChangesPayload<any>) => void>();
    callbacks.add(callback as any);

    this.channels.set(channelKey, {
      channel,
      refCount: 1,
      callbacks,
    });

    return () => this.unsubscribe(channelKey, callback as any);
  }

  private unsubscribe(
    channelKey: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): void {
    const entry = this.channels.get(channelKey);
    if (!entry) return;

    entry.callbacks.delete(callback);
    entry.refCount--;

    // Clean up channel when no more subscribers
    if (entry.refCount <= 0) {
      const supabase = createSupabaseBrowserClient();
      supabase.removeChannel(entry.channel);
      this.channels.delete(channelKey);
    }
  }

  /**
   * Get active channel count (for debugging).
   */
  getActiveChannelCount(): number {
    return this.channels.size;
  }

  /**
   * Get total subscription count (sum of all refCounts).
   */
  getTotalSubscriptionCount(): number {
    let total = 0;
    for (const [_key, entry] of this.channels) {
      total += entry.refCount;
    }
    return total;
  }

  /**
   * Force cleanup all channels (for testing/hot reload).
   */
  cleanup(): void {
    const supabase = createSupabaseBrowserClient();
    for (const [_key, entry] of this.channels) {
      supabase.removeChannel(entry.channel);
    }
    this.channels.clear();
  }
}

// Export singleton instance
export const RealtimeManager = RealtimeManagerSingleton.getInstance();

// Export utility for channel key generation (for consistency elsewhere)
export { generateChannelKey };

// Export types
export type { SubscriptionConfig, PostgresEvent };
