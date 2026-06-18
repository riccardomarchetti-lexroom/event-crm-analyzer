import { useEffect, useRef } from 'react';

// ProgressLog — Step 3: Analysis in progress
// Props:
//   progress: { current: number, total: number }
//   logs: string[]

const palette = {
  BLUE: '#0F4C9D',
  GRAY: '#E4E4E4',
  DARK: '#1C1F27',
};

const styles = {
  container: {
    backgroundColor: palette.DARK,
    borderRadius: '10px',
    padding: '20px',
    maxHeight: '300px',
    overflowY: 'auto',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '12px',
    color: palette.GRAY,
  },
  progressWrapper: {
    marginBottom: '16px',
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
    fontSize: '11px',
    color: palette.GRAY,
    letterSpacing: '0.4px',
  },
  progressTrack: {
    backgroundColor: palette.GRAY,
    height: '6px',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: (pct) => ({
    backgroundColor: palette.BLUE,
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
