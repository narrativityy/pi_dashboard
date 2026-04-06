import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import Header from '../components/Header';

const WS_URL = import.meta.env.PROD
  ? `ws://${window.location.host}/ws/terminal`
  : 'ws://localhost:3001/ws/terminal';

export default function Terminal() {
  const containerRef = useRef(null);

  useEffect(() => {
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'ui-monospace, Menlo, monospace',
      theme: {
        background: '#0f1117',
        foreground: '#e2e8f0',
        cursor: '#6366f1',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      // Send initial terminal size
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (e) => term.write(e.data);

    ws.onclose = () => term.write('\r\n\x1b[31mConnection closed.\x1b[0m\r\n');

    ws.onerror = () => term.write('\r\n\x1b[31mConnection error.\x1b[0m\r\n');

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    const observer = new ResizeObserver(() => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      ws.close();
      term.dispose();
    };
  }, []);

  return (
    <div className="terminal-page">
      <Header />
      <div ref={containerRef} className="terminal-container" />
    </div>
  );
}
