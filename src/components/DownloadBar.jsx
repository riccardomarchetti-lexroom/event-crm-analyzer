import { useState } from 'react';

// DownloadBar — Step 4: Standalone download buttons bar
// Props:
//   onDownloadOutreach: () => void
//   onDownloadDnc: () => void
//   outreachCount: number
//   dncCount: number

const palette = {
  BLUE: '#0F4C9D',
  RED: '#C03930',
  WHITE: '#FFFFFF',
};

function PrimaryButton({ children, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? '#0a3a7a' : palette.BLUE,
        color: palette.WHITE,
        border: 'none',
        borderRadius: '6px',
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        transition: 'background-color 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? '#fdf0ef' : palette.WHITE,
        color: palette.RED,
        border: `1.5px solid ${palette.RED}`,
        borderRadius: '6px',
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        transition: 'background-color 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

export default function DownloadBar({
  onDownloadOutreach,
  onDownloadDnc,
  outreachCount = 0,
  dncCount = 0,
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <PrimaryButton onClick={onDownloadOutreach}>
        ⬇ Scarica OUTREACH ({outreachCount} contatti)
      </PrimaryButton>

      <SecondaryButton onClick={onDownloadDnc}>
        ⬇ Scarica DNC ({dncCount} contatti)
      </SecondaryButton>
    </div>
  );
}
