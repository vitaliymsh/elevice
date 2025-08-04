import { supabase } from '@/lib/supabase';

export interface DBInterviewReport {
  id: string;
  interview_id: string;
  generated_at: string;
  completion_reason: string;
  total_questions: number;
  interview_duration_minutes: number | null;
  average_score: string;
  metric_scores: Record<string, any>;
  metric_trends: Record<string, any> | null;
  performance_summary: string;
  key_strengths: string[];
  areas_for_improvement: string[];
  improvement_recommendations: string[];
  question_types_covered: Record<string, number>;
  engagement_metrics: Record<string, any>;
  overall_assessment: string;
  confidence_score: number | null;
  hiring_recommendation: string;
  interviewer_notes: string | null;
  follow_up_areas: string[];
}

/**
 * Database service for interview reports operations
 */
export class InterviewReportsDatabaseService {
  
  /**
   * Get interview report by interview ID
   */
  static async getInterviewReport(interviewId: string): Promise<DBInterviewReport | null> {
    try {
      const { data, error } = await supabase
        .from('interview_reports')
        .select('*')
        .eq('interview_id', interviewId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - report doesn't exist
          return null;
        }
        console.error('Error fetching interview report:', error);
        throw new Error(`Failed to fetch interview report: ${error.message}`);
      }

      return data as DBInterviewReport;
    } catch (err) {
      console.error('InterviewReportsDatabaseService.getInterviewReport error:', err);
      if (err instanceof Error && err.message.includes('Failed to fetch interview report')) {
        throw err;
      }
      throw new Error('Failed to fetch interview report');
    }
  }

  /**
   * Get all interview reports for a user (by joining with interviews table)
   */
  static async getInterviewReports(userId: string): Promise<DBInterviewReport[]> {
    try {
      const { data, error } = await supabase
        .from('interview_reports')
        .select(`
          *,
          interviews!inner(user_id)
        `)
        .eq('interviews.user_id', userId)
        .order('generated_at', { ascending: false });

      if (error) {
        console.error('Error fetching interview reports:', error);
        throw new Error(`Failed to fetch interview reports: ${error.message}`);
      }

      return (data || []).map(item => {
        const { interviews, ...report } = item;
        return report as DBInterviewReport;
      });
    } catch (err) {
      console.error('InterviewReportsDatabaseService.getInterviewReports error:', err);
      if (err instanceof Error && err.message.includes('Failed to fetch interview reports')) {
        throw err;
      }
      throw new Error('Failed to fetch interview reports');
    }
  }

  /**
   * Check if interview report exists for a given interview ID
   */
  static async reportExists(interviewId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('interview_reports')
        .select('id')
        .eq('interview_id', interviewId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - report doesn't exist
          return false;
        }
        console.error('Error checking if interview report exists:', error);
        throw new Error(`Failed to check interview report existence: ${error.message}`);
      }

      return !!data;
    } catch (err) {
      console.error('InterviewReportsDatabaseService.reportExists error:', err);
      if (err instanceof Error && err.message.includes('Failed to check interview report existence')) {
        throw err;
      }
      throw new Error('Failed to check interview report existence');
    }
  }

  /**
   * Get interview reports count for a user
   */
  static async getInterviewReportsCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('interview_reports')
        .select('id', { count: 'exact' })
        .eq('interviews.user_id', userId);

      if (error) {
        console.error('Error getting interview reports count:', error);
        throw new Error(`Failed to get interview reports count: ${error.message}`);
      }

      return count || 0;
    } catch (err) {
      console.error('InterviewReportsDatabaseService.getInterviewReportsCount error:', err);
      if (err instanceof Error && err.message.includes('Failed to get interview reports count')) {
        throw err;
      }
      throw new Error('Failed to get interview reports count');
    }
  }
}