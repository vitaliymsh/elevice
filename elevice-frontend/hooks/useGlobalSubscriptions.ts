import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface GlobalSubscriptionsOptions {
  userId: string | null;
  onInterviewChange?: (payload: any) => void;
  onJobChange?: (payload: any) => void;
}

/**
 * Global subscription hook that maintains persistent Supabase subscriptions
 * in the layout to prevent unsubscribing when navigating between pages
 */
export const useGlobalSubscriptions = ({
  userId,
  onInterviewChange,
  onJobChange
}: GlobalSubscriptionsOptions) => {
  const interviewChannelRef = useRef<RealtimeChannel | null>(null);
  const jobChannelRef = useRef<RealtimeChannel | null>(null);

  // Setup interview subscription
  const setupInterviewSubscription = () => {
    if (!userId || interviewChannelRef.current) return;

    console.log('🌐 Setting up global interview subscription for user:', userId);

    const channel = supabase
      .channel(`global-interviews-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interviews',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🌐 Global interview change:', payload);
          if (onInterviewChange) {
            onInterviewChange(payload);
          }
        }
      )
      .subscribe((status) => {
        console.log('🌐 Global interview subscription status:', status);
      });

    interviewChannelRef.current = channel;
  };

  // Setup job subscription
  const setupJobSubscription = () => {
    if (!userId || jobChannelRef.current) return;

    console.log('🌐 Setting up global job subscription for user:', userId);

    const channel = supabase
      .channel(`global-jobs-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🌐 Global job change:', payload);
          if (onJobChange) {
            onJobChange(payload);
          }
        }
      )
      .subscribe((status) => {
        console.log('🌐 Global job subscription status:', status);
      });

    jobChannelRef.current = channel;
  };

  // Cleanup subscriptions
  const cleanupSubscriptions = () => {
    if (interviewChannelRef.current) {
      console.log('🌐 Cleaning up global interview subscription');
      supabase.removeChannel(interviewChannelRef.current);
      interviewChannelRef.current = null;
    }
    
    if (jobChannelRef.current) {
      console.log('🌐 Cleaning up global job subscription');
      supabase.removeChannel(jobChannelRef.current);
      jobChannelRef.current = null;
    }
  };

  // Setup subscriptions when userId changes
  useEffect(() => {
    if (userId) {
      setupInterviewSubscription();
      setupJobSubscription();
    } else {
      cleanupSubscriptions();
    }

    // Cleanup on unmount or userId change
    return () => {
      cleanupSubscriptions();
    };
  }, [userId]);

  return {
    cleanupSubscriptions
  };
};