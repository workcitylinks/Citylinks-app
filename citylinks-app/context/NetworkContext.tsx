import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/apiClient';

interface NetworkContextType {
  isConnected: boolean;
  isChecking: boolean;
  checkConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isChecking: false,
  checkConnection: async () => true,
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // Ping backend or lightweight internet endpoint
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      // 1. Try pinging local backend health/marketplace endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await apiClient.get('/marketplace/popular?limit=1', {
        signal: controller.signal,
      }).catch(async (backendErr) => {
        // 2. If backend is unreachable, fallback ping to high-availability endpoint
        const internetController = new AbortController();
        const fallbackTimeout = setTimeout(() => internetController.abort(), 3500);
        return fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          signal: internetController.signal,
        }).finally(() => clearTimeout(fallbackTimeout));
      });

      clearTimeout(timeoutId);

      const online = Boolean(res);
      setIsConnected(online);
      return online;
    } catch {
      setIsConnected(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Continuously check connectivity in background every 5 seconds
  useEffect(() => {
    // Initial check
    checkConnection();

    const interval = setInterval(() => {
      checkConnection();
    }, 5000);

    return () => clearInterval(interval);
  }, [checkConnection]);

  return (
    <NetworkContext.Provider value={{ isConnected, isChecking, checkConnection }}>
      {children}
    </NetworkContext.Provider>
  );
};
