/**
 * React Query hooks for Settings
 * Provides caching, deduplication, and optimistic updates
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  getSecurityData,
  getPrivacySettings,
  updatePrivacySettings,
  changePassword,
  settingsKeys,
} from "@/lib/services/settingsService";
import type {
  NotificationPreferences,
  SecurityData,
  PasswordChangeRequest,
} from "@/lib/types/settingsTypes";

// ============================================
// Notification Preferences
// ============================================

export function useNotificationPreferences() {
  return useQuery({
    queryKey: settingsKeys.notifications(),
    queryFn: getNotificationPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNotificationPreferences,
    onMutate: async (newPreferences) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: settingsKeys.notifications() });

      // Snapshot the previous value
      const previousPreferences = queryClient.getQueryData<NotificationPreferences>(
        settingsKeys.notifications()
      );

      // Optimistically update
      queryClient.setQueryData<NotificationPreferences>(
        settingsKeys.notifications(),
        (old) => ({ ...old, ...newPreferences })
      );

      return { previousPreferences };
    },
    onError: (_err, _newPrefs, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(
          settingsKeys.notifications(),
          context.previousPreferences
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: settingsKeys.notifications() });
    },
  });
}

// ============================================
// Security Data
// ============================================

export function useSecurityData() {
  return useQuery<SecurityData>({
    queryKey: settingsKeys.security(),
    queryFn: getSecurityData,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================
// Privacy Settings
// ============================================

export function usePrivacySettings() {
  return useQuery({
    queryKey: settingsKeys.privacy(),
    queryFn: getPrivacySettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePrivacySettings,
    onMutate: async (newIsPrivate) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.privacy() });

      const previousSettings = queryClient.getQueryData<{ isPrivate: boolean }>(
        settingsKeys.privacy()
      );

      queryClient.setQueryData(settingsKeys.privacy(), { isPrivate: newIsPrivate });

      return { previousSettings };
    },
    onError: (_err, _newVal, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(settingsKeys.privacy(), context.previousSettings);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.privacy() });
    },
  });
}

// ============================================
// Password Change
// ============================================

export function useChangePassword() {
  return useMutation({
    mutationFn: (request: PasswordChangeRequest) => changePassword(request),
  });
}

// ============================================
// Prefetch Utilities
// ============================================

export function usePrefetchSettings() {
  const queryClient = useQueryClient();

  return {
    prefetchNotifications: () => {
      queryClient.prefetchQuery({
        queryKey: settingsKeys.notifications(),
        queryFn: getNotificationPreferences,
        staleTime: 5 * 60 * 1000,
      });
    },
    prefetchSecurity: () => {
      queryClient.prefetchQuery({
        queryKey: settingsKeys.security(),
        queryFn: getSecurityData,
        staleTime: 2 * 60 * 1000,
      });
    },
    prefetchPrivacy: () => {
      queryClient.prefetchQuery({
        queryKey: settingsKeys.privacy(),
        queryFn: getPrivacySettings,
        staleTime: 5 * 60 * 1000,
      });
    },
  };
}
