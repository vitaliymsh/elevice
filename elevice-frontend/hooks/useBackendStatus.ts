import { useState, useEffect } from "react"

export const useBackendStatus = (apiUrl: string) => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      
      try {
        const response = await fetch(apiUrl, { method: 'GET' });
        
        if (response.ok) {
          setBackendStatus('connected');
          setError(null);
        } else {
          setBackendStatus('error');
          setError('Backend is not available. Please check if the services are running.');
        }
      } catch (e) {
        setBackendStatus('error');
        setError('Network error: Could not connect to the backend. Please check your connection and that the services are running.');
      }
    };
    
    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, [apiUrl]);

  return { backendStatus, error, setError };
};
