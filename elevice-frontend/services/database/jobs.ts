import { supabase } from '@/lib/supabase';
import type { 
  CreateJobRequest, 
  UpdateJobRequest, 
  JobDisplay, 
  JobPosition 
} from '@/types/job';
import type { DBJob } from '@/types/database-types';

// Helper functions for data conversion
const convertJobToDisplay = (job: DBJob): JobDisplay => {
  return {
    id: job.id,
    title: job.name,
    position: (job.position as JobPosition) || 'software-engineer',
    description: job.description,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    isActive: true
  };
};

/**
 * Database service for job-related operations
 * Handles CRUD operations for jobs table
 */
export class JobsDatabaseService {
  
  /**
   * Get all jobs for a user
   */
  static async getJobs(userId: string): Promise<JobDisplay[]> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs:', error);
        throw new Error(`Failed to fetch jobs: ${error.message}`);
      }

      return data?.map(convertJobToDisplay) || [];
    } catch (err) {
      console.error('Get jobs failed:', err);
      throw err;
    }
  }

  /**
   * Get a specific job by ID
   */
  static async getJobById(jobId: string, userId: string): Promise<JobDisplay | null> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Job not found
        }
        console.error('Error fetching job:', error);
        throw new Error(`Failed to fetch job: ${error.message}`);
      }

      return data ? convertJobToDisplay(data) : null;
    } catch (err) {
      console.error('Get job by ID failed:', err);
      throw err;
    }
  }

  /**
   * Create a new job
   */
  static async createJob(jobData: CreateJobRequest, userId: string): Promise<JobDisplay> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('jobs')
        .insert([
          {
            name: jobData.name,
            position: jobData.position,
            description: jobData.description,
            user_id: userId,
            created_at: now,
            updated_at: now,
          },
        ])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating job:', error);
        throw new Error(`Failed to create job: ${error.message}`);
      }

      return convertJobToDisplay(data);
    } catch (err) {
      console.error('Create job failed:', err);
      throw err;
    }
  }

  /**
   * Update an existing job
   */
  static async updateJob(jobId: string, jobData: UpdateJobRequest, userId: string): Promise<JobDisplay> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .update({
          name: jobData.name,
          position: jobData.position,
          description: jobData.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating job:', error);
        throw new Error(`Failed to update job: ${error.message}`);
      }

      return convertJobToDisplay(data);
    } catch (err) {
      console.error('Update job failed:', err);
      throw err;
    }
  }

  /**
   * Delete a job
   */
  static async deleteJob(jobId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting job:', error);
        throw new Error(`Failed to delete job: ${error.message}`);
      }

      return true;
    } catch (err) {
      console.error('Delete job failed:', err);
      throw err;
    }
  }

  /**
   * Search jobs with query
   */
  static async searchJobs(query: string, userId: string): Promise<JobDisplay[]> {
    try {
      const cleanQuery = query.trim();
      if (!cleanQuery) {
        return this.getJobs(userId);
      }

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', userId)
        .or(`name.ilike.%${cleanQuery}%,position.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching jobs:', error);
        throw new Error(`Failed to search jobs: ${error.message}`);
      }

      return data?.map(convertJobToDisplay) || [];
    } catch (err) {
      console.error('Search jobs failed:', err);
      throw err;
    }
  }

  /**
   * Get total count of jobs for a user
   */
  static async getJobsCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting jobs count:', error);
        throw new Error(`Failed to get jobs count: ${error.message}`);
      }

      return count || 0;
    } catch (err) {
      console.error('Get jobs count failed:', err);
      throw err;
    }
  }
}
