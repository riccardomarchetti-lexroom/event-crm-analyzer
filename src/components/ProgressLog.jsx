import { useEffect, useRef } from 'react';

// ProgressLog — Step 3: Analysis in progress
// Props:
//   progress: { current: number, total: number }
//   logs: string[]

const styles = {
  container: {
    backgroundColor: '#1C1F27',
    borderRadius: '10px',
    padding: '20px',
    maxHeight: '300px',
    overflowY: 'auto',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '12px',
    color: '#E4E4E4',
  },
  progressWrapper: {
    marginBottom: '16px',
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
    fontSize: '11px',
    color: '#E4E4E4',
    letterSpacing: '0.4px',
  },
  progressTrack: {
    backgroundColor: '#E4E4E4',
    height: '6px',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: (pct) => ({
    backgroundColor: '#0F4C9D',
    height: '100%',
    borderRadius: '3px',
    width: `${pct}%`,
    transition: 'width 0.3s ease',
  }),
  logLine: {
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};

export default function ProgressLog({ progress = { current: 0, total: 0 }, logs = [] }) {
  const bottomRef = useRef(null);

  // Scroll to the latest log line whenever logs update
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const pct = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div style={styles.container}>
      {/* Progress bar */}
      <div style={styles.progressWrapper}>
        <div style={styles.progressLabel}>
          <span>Analisi in corso…</span>
          <span>{progress.current} / {progress.total} ({pct}%)</span>
        </div>
        <div style={styles.progressTrack}>
          <div style={styles.progressFill(pct)} />
        </div>
      </div>

      {/* Log lines */}
      {logs.map((line, i) => (
        <div key={i} style={styles.logLine}>
          &gt; {line}
        </div>
      ))}

      {/* Invisible anchor — scrolled into view on update */}
      <div ref={bottomRef} />
    </div>
  );
}
