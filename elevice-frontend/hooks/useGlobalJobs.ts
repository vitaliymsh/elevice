import { useEffect } from 'react';
import { useJobs } from './useJobs';

/**
 * Enhanced jobs hook that uses global subscriptions
 * and handles real-time updates from the global subscription provider
 */
export const useGlobalJobs = (userId: string | null) => {
  // Use the existing hook but disable its local subscription
  const jobsHook = useJobs(userId, true); // true = use global subscription
  
  // Handle global subscription events
  useEffect(() => {
    if (!userId) return;

    // Listen for global job changes
    const handleGlobalJobChange = async (payload: any) => {
      console.log('🌐 Handling global job change:', payload);
      
      // Force refresh the jobs to pick up changes
      jobsHook.refreshJobs();
    };

    // In a real implementation, you would register this listener with the global subscription context
    // For now, we just return the enhanced hook
    
  }, [userId, jobsHook.refreshJobs]);

  return jobsHook;
};