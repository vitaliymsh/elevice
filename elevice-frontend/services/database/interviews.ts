import { supabase } from '@/lib/supabase';
import type { 
  InterviewType,
  ExpertiseLevel,
  InterviewerPersona
} from '@/types/interview';
import type { 
  DBInterview,
  DBInterviewParameters,
  DBInterviewWithParameters
} from '@/types/database-types';

/**
 * Database service for interview-related operations
 * Handles CRUD operations for interviews table and related functionality
 */
export class InterviewsDatabaseService {

  /**
   * Create a new interview session
   */
  static async createInterview(interviewData: {
    userId: string;
    jobId?: string;
    interviewType: InterviewType;
    customJobDescription?: string;
    expertiseLevel: ExpertiseLevel;
    interviewerPersona: InterviewerPersona;
    maxQuestions?: number;
    isAutoAnswering: boolean;
  }): Promise<DBInterview> {
    console.log("💾 InterviewsDatabaseService: Creating interview...");
    console.log("💾 Interview data:", interviewData);

    try {
      const now = new Date().toISOString();

      // Step 1: Create the basic interview record
      console.log("💾 Step 1: Creating basic interview record...");
      const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .insert([
          {
            user_id: interviewData.userId,
            job_id: interviewData.jobId || null,
            status: 'started',
            created_at: now,
          },
        ])
        .select('*')
        .single();

      if (interviewError) {
        console.error('❌ Error creating interview:', interviewError);
        throw new Error(`Failed to create interview: ${interviewError.message}`);
      }

      console.log("✅ Basic interview record created:", interview);

      // Check if status was set correctly, if not, force update it
      if (interview.status !== 'started') {
        console.log("⚠️ Status not set correctly, forcing update to 'started'...");
        const { data: updatedInterview, error: updateError } = await supabase
          .from('interviews')
          .update({ status: 'started' })
          .eq('interview_id', interview.interview_id)
          .select('*')
          .single();

        if (updateError) {
          console.error('❌ Error updating interview status:', updateError);
          throw new Error(`Failed to update interview status: ${updateError.message}`);
        }

        console.log("✅ Status updated to 'started':", updatedInterview);
        interview.status = updatedInterview.status;
      }

      // Step 2: Create the interview parameters
      console.log("💾 Step 2: Creating interview parameters...");
      const parametersData = {
        id: interview.interview_id,
        parameters: {
          interview_type: interviewData.interviewType,
          custom_job_description: interviewData.customJobDescription || null,
          expertise_level: interviewData.expertiseLevel,
          interviewer_persona: interviewData.interviewerPersona,
          max_questions: interviewData.maxQuestions || null,
          is_auto_answering: interviewData.isAutoAnswering,
        },
      };
      
      console.log("💾 Parameters data:", parametersData);

      const { error: parametersError } = await supabase
        .from('interview_parameters')
        .insert([parametersData]);

      if (parametersError) {
        console.error('❌ Error creating interview parameters:', parametersError);
        // If parameters creation fails, clean up the interview
        await supabase
          .from('interviews')
          .delete()
          .eq('interview_id', interview.interview_id);
        
        throw new Error(`Failed to create interview parameters: ${parametersError.message}`);
      }

      console.log("✅ Interview parameters created successfully");
      console.log("✅ InterviewsDatabaseService: Interview creation completed");

      return interview;
    } catch (err) {
      console.error('❌ Create interview failed:', err);
      throw err;
    }
  }

  /**
   * Get interview parameters by ID
   */
  static async getInterviewParameters(interviewId: string): Promise<DBInterviewParameters | null> {
    try {
      const { data, error } = await supabase
        .from('interview_parameters')
        .select('*')
        .eq('id', interviewId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Parameters not found
        }
        console.error('Error fetching interview parameters:', error);
        throw new Error(`Failed to fetch interview parameters: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error('Get interview parameters failed:', err);
      throw err;
    }
  }

  /**
   * Get interview with parameters by ID
   */
  static async getInterview(interviewId: string): Promise<DBInterviewWithParameters | null> {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          interview_parameters (
            parameters
          )
        `)
        .eq('interview_id', interviewId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Interview not found
        }
        console.error('Error fetching interview:', error);
        throw new Error(`Failed to fetch interview: ${error.message}`);
      }

      

      // Transform the data with parameters from JSON or defaults
      const params = data.interview_parameters?.parameters || {};

      console.log("✅ Interview params fetched successfully:", params);

      const interview: DBInterviewWithParameters = {
        interview_id: data.interview_id,
        user_id: data.user_id,
        status: data.status,
        created_at: data.created_at,
        job_id: data.job_id,
        // Get these from interview_parameters JSON or use defaults
        interview_type: params.interview_type || 'general',
        custom_job_description: params.custom_job_description,
        expertise_level: params.expertise_level || 'foundational',
        interviewer_persona: params.interviewer_persona || 'friendly',
        max_questions: params.max_questions,
        is_auto_answering: params.is_auto_answering ?? true,
        // For backward compatibility
        final_evaluation: null,
        last_updated_at: data.created_at, // Use created_at as fallback
      };

      return interview;
    } catch (err) {
      console.error('Get interview failed:', err);
      throw err;
    }
  }

  /**
   * Update interview status
   */
  static async updateInterviewStatus(
    interviewId: string, 
    status: 'in_progress' | 'completed' | 'abandoned'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('interviews')
        .update({
          status,
        })
        .eq('interview_id', interviewId);

      if (error) {
        console.error('Error updating interview status:', error);
        throw new Error(`Failed to update interview status: ${error.message}`);
      }
    } catch (err) {
      console.error('Update interview status failed:', err);
      throw err;
    }
  }

  /**
   * Get all interviews for a user
   */
  static async getInterviews(userId: string): Promise<DBInterview[]> {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching interviews:', error);
        throw new Error(`Failed to fetch interviews: ${error.message}`);
      }

      return data || [];
    } catch (err) {
      console.error('Get interviews failed:', err);
      throw err;
    }
  }

  /**
   * Get interview history for a user with pagination
   */
  static async getInterviewHistory(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<DBInterview[]> {
    try {
      let query = supabase
        .from('interviews')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (limit !== undefined) {
        query = query.limit(limit);
      }

      if (offset !== undefined) {
        query = query.range(offset, offset + (limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching interview history:', error);
        throw new Error(`Failed to fetch interview history: ${error.message}`);
      }

      return data || [];
    } catch (err) {
      console.error('Get interview history failed:', err);
      throw err;
    }
  }

  /**
   * Delete an interview
   */
  static async deleteInterview(interviewId: string): Promise<boolean> {
    try {
      // First delete interview parameters
      await supabase
        .from('interview_parameters')
        .delete()
        .eq('id', interviewId);

      // Then delete the interview itself
      const { error } = await supabase
        .from('interviews')
        .delete()
        .eq('interview_id', interviewId);

      if (error) {
        console.error('Error deleting interview:', error);
        throw new Error(`Failed to delete interview: ${error.message}`);
      }

      return true;
    } catch (err) {
      console.error('Delete interview failed:', err);
      throw err;
    }
  }

  /**
   * Get interviews count for a user
   */
  static async getInterviewsCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('interviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting interviews count:', error);
        throw new Error(`Failed to get interviews count: ${error.message}`);
      }

      return count || 0;
    } catch (err) {
      console.error('Get interviews count failed:', err);
      throw err;
    }
  }

  /**
   * Get completed interviews count for a user
   */
  static async getCompletedInterviewsCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('interviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (error) {
        console.error('Error getting completed interviews count:', error);
        throw new Error(`Failed to get completed interviews count: ${error.message}`);
      }

      return count || 0;
    } catch (err) {
      console.error('Get completed interviews count failed:', err);
      throw err;
    }
  }

  /**
   * Get interviews by job ID
   */
  static async getInterviewsByJobId(jobId: string, userId: string): Promise<DBInterview[]> {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('job_id', jobId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching interviews by job ID:', error);
        throw new Error(`Failed to fetch interviews by job ID: ${error.message}`);
      }

      return data || [];
    } catch (err) {
      console.error('Get interviews by job ID failed:', err);
      throw err;
    }
  }
}
