import { useState } from 'react';

// Summary — Step 4: Results summary
// Props:
//   contacts: Contact[]
//   onDownloadOutreach: () => void
//   onDownloadDnc: () => void

const palette = {
  BLUE: '#0F4C9D',
  GRAY: '#E4E4E4',
  DARK: '#1C1F27',
  RED: '#C03930',
  WHITE: '#FFFFFF',
  BLUE_LIGHT: '#F0F5FF',
};

function StatCard({ label, number, subtitle }) {
  return (
    <div
      style={{
        background: palette.WHITE,
        border: `1.5px solid ${palette.GRAY}`,
        borderRadius: '10px',
        padding: '24px',
        boxShadow: '0 1px 4px rgba(15,76,157,0.08)',
        flex: '1 1 0',
        minWidth: '0',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: palette.BLUE,
          marginBottom: '8px',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '32px',
          fontWeight: 700,
          color: palette.DARK,
          lineHeight: 1.1,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {number}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: '14px',
            fontWeight: 400,
            color: palette.DARK,
            marginTop: '6px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

function BigDownloadCard({ label, count, buttonText, onDownload, isPrimary }) {
  const [hovered, setHovered] = useState(false);

  const btnBase = {
    display: 'inline-block',
    marginTop: '16px',
    borderRadius: '6px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    transition: 'opacity 0.15s ease',
  };

  const btnStyle = isPrimary
    ? {
        ...btnBase,
        backgroundColor: hovered ? '#0a3a7a' : palette.BLUE,
        color: palette.WHITE,
      }
    : {
        ...btnBase,
        backgroundColor: hovered ? '#fdf0ef' : palette.WHITE,
        color: palette.RED,
        border: `1.5px solid ${palette.RED}`,
      };

  return (
    <div
      style={{
        background: palette.WHITE,
        border: `1.5px solid ${palette.GRAY}`,
        borderRadius: '10px',
        padding: '32px 24px',
        boxShadow: '0 1px 4px rgba(15,76,157,0.08)',
        flex: '1 1 0',
        minWidth: '0',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: isPrimary ? palette.BLUE : palette.RED,
          marginBottom: '8px',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '48px',
          fontWeight: 700,
          color: palette.DARK,
          lineHeight: 1.1,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {count}
      </div>
      <div
        style={{
          fontSize: '13px',
          color: palette.DARK,
          opacity: 0.6,
          marginTop: '4px',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        contatti
      </div>
      <button
        style={btnStyle}
        onClick={onDownload}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {buttonText}
      </button>
    </div>
  );
}

export default function Summary({ contacts = [], onDownloadOutreach, onDownloadDnc }) {
  // Derive all stats from the contacts array
  const stats = {
    total: contacts.length,
    inCrm: contacts.filter(c => c.in_crm).length,
    dealActive: contacts.filter(c => c.segment === 'DNC').length,
    closedLost: contacts.filter(c => c.segment_label === 'Closed Lost').length,
    noDeal: contacts.filter(
      c => c.in_crm && (c.num_deals === 0 || c.num_deals === null || c.num_deals === undefined)
    ).length,
    notInCrm: contacts.filter(c => !c.in_crm).length,
    outreachCount: contacts.filter(c => c.segment === 'OUTREACH').length,
    dncCount: contacts.filter(c => c.segment === 'DNC').length,
  };

  const rowStyle = {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  };

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Row 1: TOTALE | IN CRM | DEAL ATTIVO */}
      <div style={rowStyle}>
        <StatCard label="Totale" number={stats.total} subtitle="contatti all'evento" />
        <StatCard label="In CRM" number={stats.inCrm} subtitle="già presenti su HubSpot" />
        <StatCard label="Deal Attivo" number={stats.dealActive} subtitle="con deal in corso" />
      </div>

      {/* Row 2: CLOSED LOST | NO DEAL | NON IN CRM */}
      <div style={rowStyle}>
        <StatCard label="Closed Lost" number={stats.closedLost} subtitle="deal chiuso perso" />
        <StatCard label="No Deal" number={stats.noDeal} subtitle="in CRM, nessun deal" />
        <StatCard label="Non in CRM" number={stats.notInCrm} subtitle="nuovi contatti" />
      </div>

      {/* Row 3: big download cards */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <BigDownloadCard
          label="Outreach"
          count={stats.outreachCount}
          buttonText="⬇ Scarica OUTREACH"
          onDownload={onDownloadOutreach}
          isPrimary={true}
        />
        <BigDownloadCard
          label="Do Not Contact"
          count={stats.dncCount}
          buttonText="⬇ Scarica DNC"
          onDownload={onDownloadDnc}
          isPrimary={false}
        />
      </div>
    </div>
  );
}
