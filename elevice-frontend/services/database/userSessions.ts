import { supabase } from '@/lib/supabase';
import type { DBUserSession } from '@/types/database-types';

/**
 * Database service for user session-related operations
 * Handles CRUD operations for user_sessions table
 */
export class UserSessionsDatabaseService {

  /**
   * Get user session by user ID
   */
  static async getUserSession(userId: string): Promise<DBUserSession | null> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Session not found
        }
        console.error('Error fetching user session:', error);
        throw new Error(`Failed to fetch user session: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error('Get user session failed:', err);
      throw err;
    }
  }

  /**
   * Create a new user session
   */
  static async createUserSession(userId: string): Promise<DBUserSession> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_sessions')
        .insert([
          {
            user_id: userId,
            created_at: now,
            last_active: now,
          },
        ])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating user session:', error);
        throw new Error(`Failed to create user session: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error('Create user session failed:', err);
      throw err;
    }
  }

  /**
   * Update user last active timestamp
   */
  static async updateUserLastActive(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({
          last_active: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user last active:', error);
        // Don't throw error for this operation, it's not critical
      }
    } catch (err) {
      console.error('Update user last active failed:', err);
      // Don't throw error for this operation, it's not critical
    }
  }

  /**
   * Get all user sessions for a user (for analytics/history)
   */
  static async getUserSessions(userId: string): Promise<DBUserSession[]> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user sessions:', error);
        throw new Error(`Failed to fetch user sessions: ${error.message}`);
      }

      return data || [];
    } catch (err) {
      console.error('Get user sessions failed:', err);
      throw err;
    }
  }

  /**
   * Delete a user session
   */
  static async deleteUserSession(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting user session:', error);
        throw new Error(`Failed to delete user session: ${error.message}`);
      }

      return true;
    } catch (err) {
      console.error('Delete user session failed:', err);
      throw err;
    }
  }

  /**
   * Get user sessions count for analytics
   */
  static async getUserSessionsCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting user sessions count:', error);
        throw new Error(`Failed to get user sessions count: ${error.message}`);
      }

      return count || 0;
    } catch (err) {
      console.error('Get user sessions count failed:', err);
      throw err;
    }
  }

  /**
   * Clean up old user sessions (older than specified days)
   */
  static async cleanupOldSessions(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffISO = cutoffDate.toISOString();

      const { data, error } = await supabase
        .from('user_sessions')
        .delete()
        .lt('last_active', cutoffISO)
        .select('user_id');

      if (error) {
        console.error('Error cleaning up old sessions:', error);
        throw new Error(`Failed to cleanup old sessions: ${error.message}`);
      }

      return data?.length || 0;
    } catch (err) {
      console.error('Cleanup old sessions failed:', err);
      throw err;
    }
  }
}
