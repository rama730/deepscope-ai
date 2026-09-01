"use client";

import { useEffect, useState, useCallback } from "react";

export interface NetworkQuality {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface UseOfflineStatusReturn {
  isOffline: boolean;
  networkQuality: NetworkQuality | null;
  isSlowConnection: boolean;
}

/**
 * Hook to detect offline status and network quality
 * 
 * Monitors online/offline events and network connection quality
 * Provides information about connection speed and type
 * 
 * @returns Object with offline status, network quality, and slow connection flag
 * @example
 * ```tsx
 * const { isOffline, networkQuality, isSlowConnection } = useOfflineStatus();
 * ```
 */
export function useOfflineStatus(): UseOfflineStatusReturn {
  const [isOffline, setIsOffline] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality | null>(null);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  const updateNetworkQuality = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      // Network Information API (experimental but widely supported)
      interface NetworkConnection {
        effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
      }
      
      const nav = navigator as Navigator & {
        connection?: NetworkConnection;
        mozConnection?: NetworkConnection;
        webkitConnection?: NetworkConnection;
      };
      
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      
      if (connection) {
        const quality: NetworkQuality = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
        };
        
        setNetworkQuality(quality);
        
        // Determine if connection is slow (2g or slow-2g, or downlink < 1.5 Mbps)
        const slow = quality.effectiveType === '2g' || 
                    quality.effectiveType === 'slow-2g' ||
                    (quality.downlink !== undefined && quality.downlink < 1.5);
        setIsSlowConnection(slow);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check initial status
    setIsOffline(!navigator.onLine);
    updateNetworkQuality();

    const handleOnline = () => {
      setIsOffline(false);
      updateNetworkQuality();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setNetworkQuality(null);
      setIsSlowConnection(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for connection changes
    if ('connection' in navigator) {
      interface NetworkConnection {
        effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
        addEventListener?: (event: string, handler: () => void) => void;
        removeEventListener?: (event: string, handler: () => void) => void;
      }
      
      const nav = navigator as Navigator & {
        connection?: NetworkConnection;
        mozConnection?: NetworkConnection;
        webkitConnection?: NetworkConnection;
      };
      
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      if (connection && connection.addEventListener) {
        connection.addEventListener('change', updateNetworkQuality);
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if ('connection' in navigator) {
        interface NetworkConnection {
          removeEventListener?: (event: string, handler: () => void) => void;
        }
        
        const nav = navigator as Navigator & {
          connection?: NetworkConnection;
          mozConnection?: NetworkConnection;
          webkitConnection?: NetworkConnection;
        };
        
        const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
        if (connection && connection.removeEventListener) {
          connection.removeEventListener('change', updateNetworkQuality);
        }
      }
    };
  }, [updateNetworkQuality]);

  return { isOffline, networkQuality, isSlowConnection };
}
