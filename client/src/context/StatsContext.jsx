import { createContext, useContext, useEffect, useRef, useState } from 'react';

const StatsContext = createContext(null);

export function StatsProvider({ children }) {
  const [stats, setStats] = useState(null);
  const [wsStatus, setWsStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected'
  const reconnectTimer = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    function connect() {
      setWsStatus('connecting');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = import.meta.env.DEV ? 'localhost:3001' : window.location.host;
      const ws = new WebSocket(`${protocol}//${host}/ws/stats`);
      wsRef.current = ws;

      ws.onopen = () => setWsStatus('connected');
      ws.onmessage = (e) => {
        try { setStats(JSON.parse(e.data)); } catch {}
      };
      ws.onerror = () => setWsStatus('disconnected');
      ws.onclose = () => {
        setWsStatus('disconnected');
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  return (
    <StatsContext.Provider value={{ stats, wsStatus }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  return useContext(StatsContext);
}
