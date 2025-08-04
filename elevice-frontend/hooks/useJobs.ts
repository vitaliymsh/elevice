import { useState, useEffect, useRef } from 'react';
import { DatabaseService } from '@/services/database';
import { supabase } from '@/lib/supabase';
import type { JobDisplay, CreateJobRequest, UpdateJobRequest } from '@/types/job';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UseJobsReturn {
  jobs: JobDisplay[];
  loading: boolean;
  error: string | null;
  totalJobs: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  createJob: (jobData: CreateJobRequest) => Promise<JobDisplay | null>;
  updateJob: (jobId: string, jobData: UpdateJobRequest) => Promise<JobDisplay | null>;
  deleteJob: (jobId: string) => Promise<boolean>;
  getJobById: (jobId: string) => Promise<JobDisplay | null>;
  refreshJobs: () => Promise<void>;
  searchJobs: (query: string) => Promise<void>;
  clearError: () => void;
}

export const useJobs = (userId: string | null, useGlobalSubscription: boolean = true): UseJobsReturn => {
  const [jobs, setJobs] = useState<JobDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalJobs, setTotalJobs] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const allJobsRef = useRef<JobDisplay[]>([]);

  // Load cached jobs from localStorage on mount
  useEffect(() => {
    if (userId) {
      const cacheKey = `jobs_cache_${userId}`;
      const cachedJobs = localStorage.getItem(cacheKey);
      if (cachedJobs) {
        try {
          const parsedJobs = JSON.parse(cachedJobs);
          allJobsRef.current = parsedJobs;
          console.log('📦 Loaded cached jobs from localStorage:', parsedJobs.length, 'jobs');
        } catch (err) {
          console.warn('Failed to parse cached jobs:', err);
          localStorage.removeItem(cacheKey);
        }
      }
    }
  }, [userId]);

  // Clear error function
  const clearError = () => setError(null);

  // Fetch all jobs and cache them (only if cache is empty)
  const fetchJobs = async (forceRefresh: boolean = false) => {
    if (!userId) return;

    // If we have cached data and this isn't a forced refresh, show cached data immediately
    if (!forceRefresh && allJobsRef.current.length > 0) {
      console.log('📦 Using cached jobs data:', allJobsRef.current.length, 'jobs');
      setJobs(allJobsRef.current);
      setTotalJobs(allJobsRef.current.length);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🌐 Fetching jobs from database...');
      const jobsData = await DatabaseService.getJobs(userId);
      allJobsRef.current = jobsData;
      setJobs(jobsData);
      setTotalJobs(jobsData.length);
      
      // Cache to localStorage
      const cacheKey = `jobs_cache_${userId}`;
      localStorage.setItem(cacheKey, JSON.stringify(jobsData));
      
      console.log('✅ Jobs loaded and cached:', jobsData.length, 'jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription
  const setupRealtimeSubscription = () => {
    if (!userId || channelRef.current || useGlobalSubscription) return;

    console.log('🔄 Setting up real-time subscription for jobs, userId:', userId);

    const channel = supabase
      .channel(`jobs-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('🔄 Real-time job change:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              if (payload.new) {
                try {
                  const newJob = await DatabaseService.getJobById(payload.new.id, userId);
                  if (newJob) {
                    allJobsRef.current = [newJob, ...allJobsRef.current];
                    setJobs(prev => [newJob, ...prev]);
                    setTotalJobs(prev => prev + 1);
                    
                    // Update localStorage cache
                    const cacheKey = `jobs_cache_${userId}`;
                    localStorage.setItem(cacheKey, JSON.stringify(allJobsRef.current));
                  }
                } catch (err) {
                  console.error('Error handling job insert:', err);
                }
              }
              break;
              
            case 'UPDATE':
              if (payload.new) {
                try {
                  const updatedJob = await DatabaseService.getJobById(payload.new.id, userId);
                  if (updatedJob) {
                    allJobsRef.current = allJobsRef.current.map(job => 
                      job.id === updatedJob.id ? updatedJob : job
                    );
                    setJobs(prev => prev.map(job => 
                      job.id === updatedJob.id ? updatedJob : job
                    ));
                    
                    // Update localStorage cache
                    const cacheKey = `jobs_cache_${userId}`;
                    localStorage.setItem(cacheKey, JSON.stringify(allJobsRef.current));
                  }
                } catch (err) {
                  console.error('Error handling job update:', err);
                }
              }
              break;
              
            case 'DELETE':
              if (payload.old) {
                const deletedId = payload.old.id;
                allJobsRef.current = allJobsRef.current.filter(job => job.id !== deletedId);
                setJobs(prev => prev.filter(job => job.id !== deletedId));
                setTotalJobs(prev => prev - 1);
                
                // Update localStorage cache
                const cacheKey = `jobs_cache_${userId}`;
                localStorage.setItem(cacheKey, JSON.stringify(allJobsRef.current));
              }
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log('🔄 Jobs subscription status:', status);
      });

    channelRef.current = channel;
  };

  // Clean up subscription
  const cleanupSubscription = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  // Refresh jobs (manual trigger) - force refresh from database
  const refreshJobs = async () => {
    await fetchJobs(true);
  };

  // Create a new job
  const createJob = async (jobData: CreateJobRequest): Promise<JobDisplay | null> => {
    if (!userId) {
      setError('User ID is required');
      return null;
    }

    setError(null);
    try {
      const newJob = await DatabaseService.createJob(jobData, userId);
      setJobs(prev => [newJob, ...prev]);
      setTotalJobs(prev => prev + 1);
      return newJob;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
      return null;
    }
  };

  // Update an existing job
  const updateJob = async (jobId: string, jobData: UpdateJobRequest): Promise<JobDisplay | null> => {
    if (!userId) {
      setError('User ID is required');
      return null;
    }

    setError(null);
    try {
      const updatedJob = await DatabaseService.updateJob(jobId, jobData, userId);
      setJobs(prev => prev.map(job => job.id === jobId ? updatedJob : job));
      return updatedJob;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update job');
      return null;
    }
  };

  // Delete a job
  const deleteJob = async (jobId: string): Promise<boolean> => {
    if (!userId) {
      setError('User ID is required');
      return false;
    }

    setError(null);
    try {
      const success = await DatabaseService.deleteJob(jobId, userId);
      if (success) {
        setJobs(prev => prev.filter(job => job.id !== jobId));
        setTotalJobs(prev => prev - 1);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
      return false;
    }
  };

  // Get job by ID
  const getJobById = async (jobId: string): Promise<JobDisplay | null> => {
    if (!userId) {
      setError('User ID is required');
      return null;
    }

    setError(null);
    try {
      return await DatabaseService.getJobById(jobId, userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job');
      return null;
    }
  };

  // Search jobs - using cached data for instant results
  const searchJobs = async (query: string) => {
    if (!userId) return;

    setSearchQuery(query);

    try {
      if (query.trim() === '') {
        // If search query is empty, show all cached jobs
        setJobs(allJobsRef.current);
      } else {
        // Use cached data for instant search results
        const filteredJobs = allJobsRef.current.filter(job => 
          job.title.toLowerCase().includes(query.toLowerCase()) ||
          job.position.toLowerCase().includes(query.toLowerCase()) ||
          (job.description && job.description.toLowerCase().includes(query.toLowerCase()))
        );
        setJobs(filteredJobs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search jobs');
    }
  };

  // Fetch jobs and setup real-time subscription on mount and when userId changes
  useEffect(() => {
    if (userId) {
      fetchJobs();
      if (!useGlobalSubscription) {
        setupRealtimeSubscription();
      }
    } else {
      cleanupSubscription();
    }

    // Cleanup on unmount or userId change
    return () => {
      cleanupSubscription();
    };
  }, [userId, useGlobalSubscription]);

  return {
    jobs,
    loading,
    error,
    totalJobs,
    searchQuery,
    setSearchQuery,
    createJob,
    updateJob,
    deleteJob,
    getJobById,
    refreshJobs,
    searchJobs,
    clearError,
  };
};
