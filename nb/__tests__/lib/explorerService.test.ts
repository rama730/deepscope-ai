/**
 * Unit tests for ExplorerService
 * 
 * This demonstrates the testing pattern for service layer functions
 */

import { ExplorerService } from '@/lib/services/explorerService';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExplorerFeedPost } from '@/types/rpc';

// Mock Supabase client
const createMockSupabaseClient = (): Partial<SupabaseClient> => {
  return {
    rpc: jest.fn(),
  };
};

describe('ExplorerService', () => {
  let mockSupabase: Partial<SupabaseClient>;
  let rpcMock: jest.Mock;

  beforeEach(() => {
    rpcMock = jest.fn();
    mockSupabase = createMockSupabaseClient();
    mockSupabase.rpc = rpcMock;
  });

  describe('getFeed', () => {
    it('should return empty array when RPC returns error', async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await ExplorerService.getFeed(
        mockSupabase as SupabaseClient,
        'user-123',
        undefined,
        20
      );

      expect(result).toEqual([]);
      expect(rpcMock).toHaveBeenCalledWith('get_explorer_feed', {
        p_user_id: 'user-123',
        p_limit: 20,
        p_tag: null,
        p_tab: 'for-you',
      });
    });

    it('should return empty array when RPC returns null data', async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await ExplorerService.getFeed(
        mockSupabase as SupabaseClient,
        { userId: null, limit: 20 }
      );

      expect(result).toEqual([]);
    });

    it('should transform RPC response to enriched posts', async () => {
      const mockPost: ExplorerFeedPost = {
        id: 'post-123',
        content: 'Test post',
        created_at: '2024-01-01T00:00:00Z',
        user_id: 'user-123',
        likes_count: 10,
        comments_count: 5,
        reposts_count: 2,
        bookmarks_count: 1,
        views_count: 100,
        post_type: 'standard',
        author_username: 'testuser',
        author_full_name: 'Test User',
        author_avatar_url: 'https://example.com/avatar.jpg',
        project_id: 'project-123',
        project_title: 'Test Project',
        project_slug: 'test-project',
        project_status: 'open',
        project_type: 'web',
      };

      rpcMock.mockResolvedValue({
        data: [mockPost],
        error: null,
      });

      const result = await ExplorerService.getFeed(
        mockSupabase as SupabaseClient,
        'user-123',
        undefined,
        20
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'post-123',
        content: 'Test post',
        profiles: {
          username: 'testuser',
          full_name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        project: {
          id: 'project-123',
          title: 'Test Project',
          slug: 'test-project',
          status: 'open',
          project_type: 'web',
        },
      });
    });

    it('should handle posts without projects', async () => {
      const mockPost: ExplorerFeedPost = {
        id: 'post-123',
        content: 'Test post',
        created_at: '2024-01-01T00:00:00Z',
        user_id: 'user-123',
        likes_count: 0,
        comments_count: 0,
        reposts_count: 0,
        bookmarks_count: 0,
        views_count: 0,
        post_type: 'standard',
        author_username: 'testuser',
        author_full_name: 'Test User',
      };

      rpcMock.mockResolvedValue({
        data: [mockPost],
        error: null,
      });

      const result = await ExplorerService.getFeed(
        mockSupabase as SupabaseClient,
        'user-123',
        undefined,
        20
      );

      expect(result[0].project).toBeNull();
    });

    it('should handle posts with parent posts', async () => {
      const mockPost: ExplorerFeedPost = {
        id: 'post-123',
        content: 'Reply post',
        created_at: '2024-01-01T00:00:00Z',
        user_id: 'user-123',
        likes_count: 0,
        comments_count: 0,
        reposts_count: 0,
        bookmarks_count: 0,
        views_count: 0,
        post_type: 'standard',
        author_username: 'testuser',
        author_full_name: 'Test User',
        parent_post_id: 'parent-123',
        parent_author_username: 'parentuser',
        parent_author_full_name: 'Parent User',
      };

      rpcMock.mockResolvedValue({
        data: [mockPost],
        error: null,
      });

      const result = await ExplorerService.getFeed(
        mockSupabase as SupabaseClient,
        'user-123',
        undefined,
        20
      );

      expect(result[0].parent_post).not.toBeNull();
      expect(result[0].parent_post?.profiles.username).toBe('parentuser');
      expect(result[0].is_reply).toBe(true);
    });

    it('should handle tag filtering', async () => {
      rpcMock.mockResolvedValue({
        data: [],
        error: null,
      });

      await ExplorerService.getFeed(
        mockSupabase as SupabaseClient,
        { userId: 'user-123', tag: 'typescript', limit: 20 }
      );

      expect(rpcMock).toHaveBeenCalledWith('get_explorer_feed', {
        p_user_id: 'user-123',
        p_limit: 20,
        p_tag: 'typescript',
        p_tab: 'for-you',
      });
    });
  });
});

