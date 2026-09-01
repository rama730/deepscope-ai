/**
 * Cache Manager - Unified orchestration for application-wide cache clearing
 */

type ClearCallback = () => void | Promise<void>;

interface CacheRegistryEntry {
  name: string;
  clear: ClearCallback;
  priority: number; // Higher priority runs first
}

class CacheManager {
  private registry: Map<string, CacheRegistryEntry> = new Map();

  /**
   * Register a component or store's clear function
   */
  register(name: string, clear: ClearCallback, priority: number = 10) {
    this.registry.set(name, { name, clear, priority });
  }

  /**
   * Unregister a clear function
   */
  unregister(name: string) {
    this.registry.delete(name);
  }

  private clearLocalStorage() {
    // Preserve critical settings and auth to prevent forced logout
    const theme = localStorage.getItem('nb-theme');
    
    // Supabase auth keys often follow this pattern: sb-<project-id>-auth-token
    const supabaseKeys: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('-auth-token') || key === 'supabase.auth.token')) {
            supabaseKeys[key] = localStorage.getItem(key);
        }
    }
    
    localStorage.clear();
    
    if (theme) localStorage.setItem('nb-theme', theme);
    Object.entries(supabaseKeys).forEach(([key, value]) => {
        if (value) localStorage.setItem(key, value);
    });
  }

  private clearSessionStorage() {
    sessionStorage.clear();
  }

  private async clearCaches() {
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      } catch (err) {
        console.error('[CacheManager] Cache API clear failed:', err);
      }
    }
  }

  private async clearIndexedDB() {
    if (!window.indexedDB || !window.indexedDB.databases) {
        // Fallback or early exit if not supported
        return;
    }

    try {
        const dbs = await window.indexedDB.databases();
        for (const db of dbs) {
            if (db.name) {
                console.log(`[CacheManager] Deleting IndexedDB: ${db.name}`);
                window.indexedDB.deleteDatabase(db.name);
            }
        }
    } catch (err) {
        console.error('[CacheManager] IndexedDB clearing failed:', err);
    }
  }

  /**
   * Clear all registered caches
   */
  async clearAll(): Promise<void> {
    console.group('[CacheManager] Clearing all caches');
    
    const entries = Array.from(this.registry.values())
      .sort((a, b) => b.priority - a.priority);

    for (const entry of entries) {
      try {
        console.log(`[CacheManager] Clearing registered entity: ${entry.name}`);
        await Promise.resolve(entry.clear());
      } catch (error) {
        console.error(`[CacheManager] Failed to clear ${entry.name}:`, error);
      }
    }

    try {
      this.clearLocalStorage();
      this.clearSessionStorage();
      await this.clearCaches();
      await this.clearIndexedDB();
    } catch (error) {
       console.error('[CacheManager] Error clearing browser storage:', error);
    }

    console.groupEnd();
  }

  /**
   * Estimate total storage usage (approximate)
   */
  async getStorageEstimate(): Promise<{ total: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        total: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { total: 0, quota: 0 };
  }
}

// Singleton instance
export const cacheManager = new CacheManager();
