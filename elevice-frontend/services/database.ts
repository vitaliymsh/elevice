import { supabase } from '@/lib/supabase';
import { 
  JobsDatabaseService
} from './database/jobs';
import { 
  InterviewsDatabaseService
} from './database/interviews';
import { 
  UserSessionsDatabaseService
} from './database/userSessions';
import { 
  InterviewTurnsDatabaseService
} from './database/interviewTurns';
import { 
  InterviewReportsDatabaseService
} from './database/interviewReports';
import type { DBInterviewReport } from './database/interviewReports';
import type { 
  CreateJobRequest, 
  UpdateJobRequest, 
  JobDisplay 
} from '@/types/job';
import type { 
  InterviewType, 
  ExpertiseLevel, 
  InterviewerPersona 
} from '@/types/interview';
import type {
  DBInterview,
  DBInterviewParameters,
  DBInterviewWithParameters,
  DBInterviewTurn,
  DBUserSession
} from '@/types/database-types';

/**
 * Main Database Service - Orchestrates focused database services
 * This service provides a unified interface while delegating to specialized services
 */
export class DatabaseService {
  
  // ===== JOB OPERATIONS (Delegated to JobsDatabaseService) =====
  
  static async getJobs(userId: string): Promise<JobDisplay[]> {
    return JobsDatabaseService.getJobs(userId);
  }

  static async getJobById(jobId: string, userId: string): Promise<JobDisplay | null> {
    return JobsDatabaseService.getJobById(jobId, userId);
  }

  static async createJob(jobData: CreateJobRequest, userId: string): Promise<JobDisplay> {
    return JobsDatabaseService.createJob(jobData, userId);
  }

  static async updateJob(jobId: string, jobData: UpdateJobRequest, userId: string): Promise<JobDisplay> {
    return JobsDatabaseService.updateJob(jobId, jobData, userId);
  }

  static async deleteJob(jobId: string, userId: string): Promise<boolean> {
    return JobsDatabaseService.deleteJob(jobId, userId);
  }

  static async searchJobs(query: string, userId: string): Promise<JobDisplay[]> {
    return JobsDatabaseService.searchJobs(query, userId);
  }

  static async getJobsCount(userId: string): Promise<number> {
    return JobsDatabaseService.getJobsCount(userId);
  }

  // ===== INTERVIEW OPERATIONS (Delegated to InterviewsDatabaseService) =====

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
    const interview = await InterviewsDatabaseService.createInterview(interviewData);
    
    // Invalidate interview cache after creating new interview
    const { invalidateInterviewCache } = await import('@/utils/cache');
    invalidateInterviewCache(interviewData.userId);
    
    return interview;
  }

  static async getInterviewParameters(interviewId: string): Promise<DBInterviewParameters | null> {
    return InterviewsDatabaseService.getInterviewParameters(interviewId);
  }

  static async getInterview(interviewId: string): Promise<DBInterviewWithParameters | null> {
    return InterviewsDatabaseService.getInterview(interviewId);
  }

  static async updateInterviewStatus(
    interviewId: string, 
    status: 'in_progress' | 'completed' | 'abandoned'
  ): Promise<void> {
    // Get interview to find userId for cache invalidation
    const interview = await InterviewsDatabaseService.getInterview(interviewId);
    
    await InterviewsDatabaseService.updateInterviewStatus(interviewId, status);
    
    // Invalidate interview cache after status update
    if (interview?.user_id) {
      const { invalidateInterviewCache } = await import('@/utils/cache');
      invalidateInterviewCache(interview.user_id);
    }
  }

  static async completeInterview(interviewId: string, finalEvaluation?: any): Promise<void> {
    // Mark the interview as completed (this now handles cache invalidation automatically)
    await this.updateInterviewStatus(interviewId, 'completed');
    
    // Note: If you need to store final evaluation, you might need to add that functionality
    // to the InterviewsDatabaseService or create a separate evaluation storage system
    if (finalEvaluation) {
      console.log('Final evaluation received but not stored:', finalEvaluation);
      // TODO: Add evaluation storage if needed
    }
  }

  static async getInterviews(userId: string): Promise<DBInterview[]> {
    return InterviewsDatabaseService.getInterviews(userId);
  }

  static async getInterviewsWithParameters(userId: string): Promise<DBInterviewWithParameters[]> {
    const interviews = await InterviewsDatabaseService.getInterviews(userId);
    const interviewsWithParams = await Promise.all(
      interviews.map(async (interview) => {
        const fullInterview = await InterviewsDatabaseService.getInterview(interview.interview_id);
        return fullInterview!; // We know it exists since we just got it
      })
    );
    return interviewsWithParams;
  }

  static async getInterviewHistory(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<DBInterview[]> {
    return InterviewsDatabaseService.getInterviewHistory(userId, limit, offset);
  }

  static async deleteInterview(interviewId: string, userId: string): Promise<boolean> {
    // Use the enhanced delete from InterviewsDatabaseService but add user validation
    const interview = await InterviewsDatabaseService.getInterview(interviewId);
    if (!interview || interview.user_id !== userId) {
      throw new Error('Interview not found or access denied');
    }
    
    // Delete interview turns first
    await InterviewTurnsDatabaseService.deleteInterviewTurns(interviewId);
    
    // Then delete the interview
    const result = await InterviewsDatabaseService.deleteInterview(interviewId);
    
    // Invalidate interview cache after deleting interview
    const { invalidateInterviewCache } = await import('@/utils/cache');
    invalidateInterviewCache(userId);
    
    return result;
  }

  static async getInterviewsCount(userId: string): Promise<number> {
    return InterviewsDatabaseService.getInterviewsCount(userId);
  }

  static async getCompletedInterviewsCount(userId: string): Promise<number> {
    return InterviewsDatabaseService.getCompletedInterviewsCount(userId);
  }

  static async getInterviewsByJobId(jobId: string, userId: string): Promise<DBInterview[]> {
    return InterviewsDatabaseService.getInterviewsByJobId(jobId, userId);
  }

  // ===== INTERVIEW TURN OPERATIONS (Delegated to InterviewTurnsDatabaseService) =====

  static async getInterviewTurns(interviewId: string): Promise<DBInterviewTurn[]> {
    return InterviewTurnsDatabaseService.getInterviewTurns(interviewId);
  }

  static async deleteInterviewTurns(interviewId: string): Promise<boolean> {
    return InterviewTurnsDatabaseService.deleteInterviewTurns(interviewId);
  }

  // ===== INTERVIEW REPORT OPERATIONS (Delegated to InterviewReportsDatabaseService) =====

  static async getInterviewReport(interviewId: string): Promise<DBInterviewReport | null> {
    return InterviewReportsDatabaseService.getInterviewReport(interviewId);
  }

  static async getInterviewReports(userId: string): Promise<DBInterviewReport[]> {
    return InterviewReportsDatabaseService.getInterviewReports(userId);
  }

  static async reportExists(interviewId: string): Promise<boolean> {
    return InterviewReportsDatabaseService.reportExists(interviewId);
  }

  static async getInterviewReportsCount(userId: string): Promise<number> {
    return InterviewReportsDatabaseService.getInterviewReportsCount(userId);
  }

  // ===== USER SESSION OPERATIONS (Delegated to UserSessionsDatabaseService) =====

  static async getUserSession(userId: string): Promise<DBUserSession | null> {
    return UserSessionsDatabaseService.getUserSession(userId);
  }

  static async createUserSession(userId: string): Promise<DBUserSession> {
    return UserSessionsDatabaseService.createUserSession(userId);
  }

  static async updateUserLastActive(userId: string): Promise<void> {
    return UserSessionsDatabaseService.updateUserLastActive(userId);
  }

  static async getUserSessions(userId: string): Promise<DBUserSession[]> {
    return UserSessionsDatabaseService.getUserSessions(userId);
  }

  // ===== UTILITY OPERATIONS =====

  static async healthCheck(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('jobs')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Database health check failed:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Database health check error:', err);
      return false;
    }
  }
}
