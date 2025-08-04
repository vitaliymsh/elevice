import { supabase } from '@/lib/supabase';
import type { DBInterviewTurn } from '@/types/database-types';

/**
 * Database service for interview turn-related operations
 * Handles CRUD operations for interview_turns table
 */
export class InterviewTurnsDatabaseService {

  /**
   * Get all interview turns for an interview
   */
  static async getInterviewTurns(interviewId: string): Promise<DBInterviewTurn[]> {
    try {
      const { data, error } = await supabase
        .from('interview_turns')
        .select('*')
        .eq('interview_id', interviewId)
        .order('turn_index', { ascending: true });

      if (error) {
        console.error('Error fetching interview turns:', error);
        throw new Error(`Failed to fetch interview turns: ${error.message}`);
      }

      return data || [];
    } catch (err) {
      console.error('Get interview turns failed:', err);
      throw err;
    }
  }

  /**
   * Delete an interview turn
   */
  static async deleteInterviewTurn(turnId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('interview_turns')
        .delete()
        .eq('turn_id', turnId);

      if (error) {
        console.error('Error deleting interview turn:', error);
        throw new Error(`Failed to delete interview turn: ${error.message}`);
      }

      return true;
    } catch (err) {
      console.error('Delete interview turn failed:', err);
      throw err;
    }
  }

  /**
   * Delete all turns for an interview
   */
  static async deleteInterviewTurns(interviewId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('interview_turns')
        .delete()
        .eq('interview_id', interviewId);

      if (error) {
        console.error('Error deleting interview turns:', error);
        throw new Error(`Failed to delete interview turns: ${error.message}`);
      }

      return true;
    } catch (err) {
      console.error('Delete interview turns failed:', err);
      throw err;
    }
  }

  /**
   * Get the latest turn for an interview
   */
  static async getLatestTurn(interviewId: string): Promise<DBInterviewTurn | null> {
    try {
      const { data, error } = await supabase
        .from('interview_turns')
        .select('*')
        .eq('interview_id', interviewId)
        .order('turn_index', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No turns found
        }
        console.error('Error fetching latest turn:', error);
        throw new Error(`Failed to fetch latest turn: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error('Get latest turn failed:', err);
      throw err;
    }
  }

  /**
   * Get turn count for an interview
   */
  static async getTurnCount(interviewId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('interview_turns')
        .select('*', { count: 'exact', head: true })
        .eq('interview_id', interviewId);

      if (error) {
        console.error('Error getting turn count:', error);
        throw new Error(`Failed to get turn count: ${error.message}`);
      }

      return count || 0;
    } catch (err) {
      console.error('Get turn count failed:', err);
      throw err;
    }
  }
}
