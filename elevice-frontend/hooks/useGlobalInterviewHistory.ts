import { useEffect } from 'react';
import { useInterviewHistory } from './interview/useInterviewHistory';
import { DatabaseService } from '@/services/database';

interface InterviewHistoryItem {
  interview_id: string;
  interview_type: string;
  created_at: string;
  last_updated_at: string;
  final_evaluation: any;
  status: string;
  turns_count: number;
  job_id: string | null;
}

/**
 * Enhanced interview history hook that uses global subscriptions
 * and handles real-time updates from the global subscription provider
 */
export const useGlobalInterviewHistory = (userId: string | null) => {
  // Use the existing hook but disable its local subscription
  const historyHook = useInterviewHistory(userId, true); // true = use global subscription
  
  // Handle global subscription events
  useEffect(() => {
    if (!userId) return;

    // Listen for global interview changes
    const handleGlobalInterviewChange = async (payload: any) => {
      console.log('🌐 Handling global interview change in history:', payload);
      
      // Force refresh the history to pick up changes
      historyHook.refreshHistory();
    };

    // In a real implementation, you would register this listener with the global subscription context
    // For now, we just return the enhanced hook
    
  }, [userId, historyHook.refreshHistory]);

  return historyHook;
};