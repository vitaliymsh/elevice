'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useGlobalSubscriptions } from '@/hooks/useGlobalSubscriptions';

interface GlobalSubscriptionContextType {
  broadcastInterviewChange: (payload: any) => void;
  broadcastJobChange: (payload: any) => void;
}

const GlobalSubscriptionContext = createContext<GlobalSubscriptionContextType | null>(null);

interface GlobalSubscriptionProviderProps {
  children: ReactNode;
  userId: string | null;
}

export const GlobalSubscriptionProvider = ({ 
  children, 
  userId 
}: GlobalSubscriptionProviderProps) => {
  const [interviewListeners, setInterviewListeners] = useState<Set<(payload: any) => void>>(new Set());
  const [jobListeners, setJobListeners] = useState<Set<(payload: any) => void>>(new Set());

  // Broadcast changes to all listeners
  const broadcastInterviewChange = (payload: any) => {
    interviewListeners.forEach(listener => {
      try {
        listener(payload);
      } catch (err) {
        console.error('Error in interview change listener:', err);
      }
    });
  };

  const broadcastJobChange = (payload: any) => {
    jobListeners.forEach(listener => {
      try {
        listener(payload);
      } catch (err) {
        console.error('Error in job change listener:', err);
      }
    });
  };

  // Setup global subscriptions
  useGlobalSubscriptions({
    userId,
    onInterviewChange: broadcastInterviewChange,
    onJobChange: broadcastJobChange
  });

  const contextValue: GlobalSubscriptionContextType = {
    broadcastInterviewChange,
    broadcastJobChange
  };

  return (
    <GlobalSubscriptionContext.Provider value={contextValue}>
      {children}
    </GlobalSubscriptionContext.Provider>
  );
};

// Hook to use the global subscription context
export const useGlobalSubscriptionContext = () => {
  const context = useContext(GlobalSubscriptionContext);
  if (!context) {
    throw new Error('useGlobalSubscriptionContext must be used within a GlobalSubscriptionProvider');
  }
  return context;
};