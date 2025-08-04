'use client';

import { ReactNode } from 'react';
import { useUserSession } from '@/hooks/useUserSession';
import { GlobalSubscriptionProvider } from './GlobalSubscriptionProvider';

interface GlobalLayoutWrapperProps {
  children: ReactNode;
}

export const GlobalLayoutWrapper = ({ children }: GlobalLayoutWrapperProps) => {
  const { userId, isInitialized } = useUserSession();

  // Show children immediately while user session initializes
  // The subscriptions will activate once userId is available
  return (
    <GlobalSubscriptionProvider userId={userId}>
      {children}
    </GlobalSubscriptionProvider>
  );
};