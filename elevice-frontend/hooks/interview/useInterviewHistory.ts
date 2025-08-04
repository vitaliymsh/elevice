import { useState, useEffect, useRef } from "react";
import { DatabaseService } from "@/services/database";
import { supabase } from "@/lib/supabase";
import type { EvaluationResponse } from "@/types/interview";
import type { RealtimeChannel } from '@supabase/supabase-js';

interface InterviewHistoryItem {
  interview_id: string;
  interview_type: string;
  created_at: string;
  last_updated_at: string;
  final_evaluation: EvaluationResponse | null;
  status: string;
  turns_count: number;
  job_id: string | null;
}

export const useInterviewHistory = (userId: string | null, useGlobalSubscription: boolean = true) => {
  const [interviews, setInterviews] = useState<InterviewHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const allInterviewsRef = useRef<InterviewHistoryItem[]>([]);

  // Load cached interviews from localStorage on mount
  useEffect(() => {
    if (userId) {
      const cacheKey = `interviews_cache_${userId}`;
      const cachedInterviews = localStorage.getItem(cacheKey);
      if (cachedInterviews) {
        try {
          const parsedInterviews = JSON.parse(cachedInterviews);
          allInterviewsRef.current = parsedInterviews;
          console.log('📦 Loaded cached interviews from localStorage:', parsedInterviews.length, 'interviews');
        } catch (err) {
          console.warn('Failed to parse cached interviews:', err);
          localStorage.removeItem(cacheKey);
        }
      }
    }
  }, [userId]);

  const loadInterviewHistory = async (forceRefresh: boolean = false) => {
    if (!userId) {
      setInterviews([]);
      setIsLoading(false);
      return;
    }

    // If we have cached data and this isn't a forced refresh, show cached data immediately
    if (!forceRefresh && allInterviewsRef.current.length > 0) {
      console.log('📦 Using cached interviews data:', allInterviewsRef.current.length, 'interviews');
      setInterviews(allInterviewsRef.current);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('🌐 Fetching interviews from database...');

      // Get all interviews for this user
      const interviewsData = await DatabaseService.getInterviewsWithParameters(userId);

      // Transform to the expected format and get turn counts
      const formattedInterviews: InterviewHistoryItem[] = await Promise.all(
        interviewsData.map(async (interview) => {
          try {
            const turns = await DatabaseService.getInterviewTurns(interview.interview_id);
            return {
              interview_id: interview.interview_id,
              interview_type: interview.interview_type,
              created_at: interview.created_at,
              last_updated_at: interview.last_updated_at,
              final_evaluation: interview.final_evaluation,
              status: interview.status,
              job_id: interview.job_id || null,
              turns_count: turns.length,
            };
          } catch (err) {
            // If we can't get turns, still include the interview with 0 turns
            console.warn(`Failed to get turns for interview ${interview.interview_id}:`, err);
            return {
              interview_id: interview.interview_id,
              interview_type: interview.interview_type,
              created_at: interview.created_at,
              last_updated_at: interview.last_updated_at,
              final_evaluation: interview.final_evaluation,
              status: interview.status,
              job_id: interview.job_id || null,
              turns_count: 0,
            };
          }
        })
      );

      allInterviewsRef.current = formattedInterviews;
      setInterviews(formattedInterviews);
      
      // Cache to localStorage
      const cacheKey = `interviews_cache_${userId}`;
      localStorage.setItem(cacheKey, JSON.stringify(formattedInterviews));
      
      console.log('✅ Interviews loaded and cached:', formattedInterviews.length, 'interviews');
    } catch (err) {
      console.error('Error fetching interview history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch interview history');
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription for interviews
  const setupRealtimeSubscription = () => {
    if (!userId || channelRef.current || useGlobalSubscription) return;

    console.log('🔄 Setting up real-time subscription for interviews, userId:', userId);

    const channel = supabase
      .channel(`interview-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interviews',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('🔄 Real-time interview change:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              if (payload.new) {
                try {
                  const newInterview = await DatabaseService.getInterview(payload.new.interview_id);
                  if (newInterview) {
                    const turns = await DatabaseService.getInterviewTurns(newInterview.interview_id);
                    const formattedInterview: InterviewHistoryItem = {
                      interview_id: newInterview.interview_id,
                      interview_type: newInterview.interview_type,
                      created_at: newInterview.created_at,
                      last_updated_at: newInterview.last_updated_at,
                      final_evaluation: newInterview.final_evaluation,
                      status: newInterview.status,
                      job_id: newInterview.job_id || null,
                      turns_count: turns.length,
                    };
                    
                    allInterviewsRef.current = [formattedInterview, ...allInterviewsRef.current];
                    setInterviews(prev => [formattedInterview, ...prev]);
                    
                    // Update localStorage cache
                    const cacheKey = `interviews_cache_${userId}`;
                    localStorage.setItem(cacheKey, JSON.stringify(allInterviewsRef.current));
                  }
                } catch (err) {
                  console.error('Error handling interview insert:', err);
                }
              }
              break;
              
            case 'UPDATE':
              if (payload.new) {
                try {
                  const updatedInterview = await DatabaseService.getInterview(payload.new.interview_id);
                  if (updatedInterview) {
                    const turns = await DatabaseService.getInterviewTurns(updatedInterview.interview_id);
                    const formattedInterview: InterviewHistoryItem = {
                      interview_id: updatedInterview.interview_id,
                      interview_type: updatedInterview.interview_type,
                      created_at: updatedInterview.created_at,
                      last_updated_at: updatedInterview.last_updated_at,
                      final_evaluation: updatedInterview.final_evaluation,
                      status: updatedInterview.status,
                      job_id: updatedInterview.job_id || null,
                      turns_count: turns.length,
                    };
                    
                    allInterviewsRef.current = allInterviewsRef.current.map(interview => 
                      interview.interview_id === formattedInterview.interview_id ? formattedInterview : interview
                    );
                    setInterviews(prev => prev.map(interview => 
                      interview.interview_id === formattedInterview.interview_id ? formattedInterview : interview
                    ));
                    
                    // Update localStorage cache
                    const cacheKey = `interviews_cache_${userId}`;
                    localStorage.setItem(cacheKey, JSON.stringify(allInterviewsRef.current));
                  }
                } catch (err) {
                  console.error('Error handling interview update:', err);
                }
              }
              break;
              
            case 'DELETE':
              if (payload.old) {
                const deletedId = payload.old.interview_id;
                allInterviewsRef.current = allInterviewsRef.current.filter(interview => interview.interview_id !== deletedId);
                setInterviews(prev => prev.filter(interview => interview.interview_id !== deletedId));
                
                // Update localStorage cache
                const cacheKey = `interviews_cache_${userId}`;
                localStorage.setItem(cacheKey, JSON.stringify(allInterviewsRef.current));
              }
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log('🔄 Interviews subscription status:', status);
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

  const getInterviewDetail = async (interviewId: string) => {
    if (!userId) {
      throw new Error("User not authenticated");
    }

    try {
      // Get interview details with user verification
      const interview = await DatabaseService.getInterview(interviewId);
      
      if (!interview || interview.user_id !== userId) {
        throw new Error("Interview not found or access denied");
      }

      // Get turns for this interview
      const turns = await DatabaseService.getInterviewTurns(interviewId);

      return {
        interview,
        turns: turns || []
      };
    } catch (err) {
      console.error('Error fetching interview detail:', err);
      throw err;
    }
  };

  const deleteInterview = async (interviewId: string) => {
    if (!userId) {
      throw new Error("User not authenticated");
    }

    try {
      // Delete interview and turns using DatabaseService (includes auth verification)
      await DatabaseService.deleteInterview(interviewId, userId);

      // Refresh the interviews list
      await loadInterviewHistory();
    } catch (err) {
      console.error('Error deleting interview:', err);
      throw err;
    }
  };

  const getInterviewStats = () => {
    const completed = interviews.filter(i => i.status === 'completed').length;
    const inProgress = interviews.filter(i => i.status === 'in_progress').length;
    const totalTurns = interviews.reduce((sum, i) => sum + i.turns_count, 0);
    
    return {
      total: interviews.length,
      completed,
      inProgress,
      totalTurns
    };
  };

  // Load interviews and setup real-time subscription when userId changes
  useEffect(() => {
    if (userId) {
      loadInterviewHistory();
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
    interviews,
    isLoading,
    error,
    refreshHistory: () => loadInterviewHistory(true),
    getInterviewDetail,
    deleteInterview,
    getInterviewStats
  };
};
