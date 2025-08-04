import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '@/services/database';

export const useUserSession = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeUserSession();
  }, []);

  const initializeUserSession = async () => {
    try {
      // Check for existing user ID in localStorage
      const existingUserId = localStorage.getItem('user_id');
      
      if (existingUserId) {
        console.log('Found existing user ID:', existingUserId);
        
        // 📍 AUTH: Verify user exists in database and update last_active
        try {
          const existingSession = await DatabaseService.getUserSession(existingUserId);
          
          if (!existingSession) {
            // User doesn't exist in DB, create them
            await DatabaseService.createUserSession(existingUserId);
          } else {
            // Update last_active timestamp
            await DatabaseService.updateUserLastActive(existingUserId);
          }
        } catch (error) {
          console.error('Error checking user session:', error);
          // Continue with existing user ID even if DB check fails
        }

        setUserId(existingUserId);
      } else {
        // Generate new UUID for anonymous user
        const newUserId = uuidv4();
        console.log('Generated new user ID:', newUserId);
        
        // Create user session in database
        await createUserSession(newUserId);
        
        // Store in localStorage
        localStorage.setItem('user_id', newUserId);
        setUserId(newUserId);
      }
    } catch (err) {
      console.error('Error initializing user session:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize user session');
      
      // Fallback: use localStorage-only mode
      const fallbackUserId = localStorage.getItem('user_id') || uuidv4();
      if (!localStorage.getItem('user_id')) {
        localStorage.setItem('user_id', fallbackUserId);
      }
      setUserId(fallbackUserId);
    } finally {
      setIsInitialized(true);
    }
  };

  const createUserSession = async (userId: string) => {
    try {
      await DatabaseService.createUserSession(userId);
    } catch (error) {
      console.error('Error creating user session:', error);
      throw error;
    }
  };

  const clearUserSession = async () => {
    if (userId) {
      // Optionally delete from database (or just mark as inactive)
      // Note: We'll just remove from localStorage for now
      // DatabaseService could add a deleteUserSession method if needed
    }

    localStorage.removeItem('user_id');
    const newUserId = uuidv4();
    await createUserSession(newUserId);
    localStorage.setItem('user_id', newUserId);
    setUserId(newUserId);
  };

  const updateLastActive = async () => {
    if (!userId) return;

    try {
      await DatabaseService.updateUserLastActive(userId);
    } catch (err) {
      console.error('Error updating last active:', err);
    }
  };

  return {
    userId,
    isInitialized,
    error,
    clearUserSession,
    updateLastActive,
  };
};
