import { useState } from 'react';

// ResultTable — Step 4: Preview table
// Props:
//   contacts: Contact[]
//   Each contact: { email, in_crm, firstname, lastname, segment, segment_label, lead_status, num_deals, owner_name, deals }

const palette = {
  BLUE: '#0F4C9D',
  GRAY: '#E4E4E4',
  DARK: '#1C1F27',
  RED: '#C03930',
  WHITE: '#FFFFFF',
  BLUE_LIGHT: '#E8F0FB',
  ROW_ALT: '#FAFAFA',
  ROW_HOVER: '#F0F5FF',
  HEADER_BG: '#F8FAFF',
};

const PREVIEW_LIMIT = 25;

function SegmentBadge({ contact }) {
  if (!contact.in_crm) {
    return (
      <span
        style={{
          backgroundColor: palette.GRAY,
          color: palette.DARK,
          borderRadius: '4px',
          padding: '3px 8px',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.4px',
          whiteSpace: 'nowrap',
        }}
      >
        Non in CRM
      </span>
    );
  }

  if (contact.segment === 'DNC') {
    return (
      <span
        style={{
          backgroundColor: palette.RED,
          color: palette.WHITE,
          borderRadius: '4px',
          padding: '3px 8px',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.4px',
          whiteSpace: 'nowrap',
        }}
      >
        {contact.segment_label || 'DNC'}
      </span>
    );
  }

  // OUTREACH
  return (
    <span
      style={{
        backgroundColor: palette.BLUE_LIGHT,
        color: palette.BLUE,
        borderRadius: '4px',
        padding: '3px 8px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.4px',
        whiteSpace: 'nowrap',
      }}
    >
      {contact.segment_label || 'OUTREACH'}
    </span>
  );
}

function TableRow({ contact, index }) {
  const [hovered, setHovered] = useState(false);

  const rowBg = hovered
    ? palette.ROW_HOVER
    : index % 2 === 0
    ? palette.WHITE
    : palette.ROW_ALT;

  const cellStyle = {
    padding: '12px 16px',
    fontSize: '14px',
    color: palette.DARK,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    borderBottom: `1px solid ${palette.GRAY}`,
    verticalAlign: 'middle',
  };

  const name = [contact.firstname, contact.lastname].filter(Boolean).join(' ') || '—';

  return (
    <tr
      style={{ backgroundColor: rowBg, cursor: 'default', transition: 'background 0.1s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={cellStyle}>{name}</td>
      <td style={{ ...cellStyle, color: '#555' }}>{contact.email || '—'}</td>
      <td style={cellStyle}>
        <SegmentBadge contact={contact} />
      </td>
      <td style={cellStyle}>{contact.lead_status || '—'}</td>
      <td style={{ ...cellStyle, textAlign: 'center' }}>
        {contact.num_deals != null ? contact.num_deals : '—'}
      </td>
      <td style={cellStyle}>{contact.owner_name || '—'}</td>
    </tr>
  );
}

export default function ResultTable({ contacts = [] }) {
  // Sort: OUTREACH first, then DNC, then Non in CRM
  const [sortOrder, setSortOrder] = useState('outreach-first'); // 'outreach-first' | 'dnc-first'

  const segmentRank = (c) => {
    if (!c.in_crm) return 3;
    if (c.segment === 'OUTREACH') return sortOrder === 'outreach-first' ? 1 : 2;
    if (c.segment === 'DNC') return sortOrder === 'outreach-first' ? 2 : 1;
    return 3;
  };

  const sorted = [...contacts].sort((a, b) => segmentRank(a) - segmentRank(b));
  const preview = sorted.slice(0, PREVIEW_LIMIT);
  const total = contacts.length;
  const hasMore = total > PREVIEW_LIMIT;

  const headerCellStyle = {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 600,
    color: palette.BLUE,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    backgroundColor: palette.HEADER_BG,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    borderBottom: `1.5px solid ${palette.GRAY}`,
    whiteSpace: 'nowrap',
  };

  const toggleSort = () =>
    setSortOrder(s => (s === 'outreach-first' ? 'dnc-first' : 'outreach-first'));

  return (
    <div>
      {/* Sort toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '8px',
        }}
      >
        <button
          onClick={toggleSort}
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: palette.BLUE,
            background: 'none',
            border: `1px solid ${palette.BLUE}`,
            borderRadius: '4px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >
          Ordina: {sortOrder === 'outreach-first' ? 'OUTREACH prima' : 'DNC prima'}
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          overflowX: 'auto',
          border: `1.5px solid ${palette.GRAY}`,
          borderRadius: '10px',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >
          <thead>
            <tr>
              <th style={headerCellStyle}>Nome</th>
              <th style={headerCellStyle}>Email</th>
              <th style={headerCellStyle}>Segmento</th>
              <th style={headerCellStyle}>Lead Status</th>
              <th style={{ ...headerCellStyle, textAlign: 'center' }}># Deal</th>
              <th style={headerCellStyle}>Owner</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((contact, i) => (
              <TableRow
                key={contact.email || i}
                contact={contact}
                index={i}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: '10px',
          fontSize: '13px',
          color: palette.DARK,
          opacity: 0.7,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {hasMore ? (
          <>
            Mostrati {PREVIEW_LIMIT} di {total} —{' '}
            <span style={{ color: palette.BLUE }}>
              scarica il file Excel per vedere tutti
            </span>
          </>
        ) : (
          <>Totale: {total} contatti</>
        )}
      </div>
    </div>
  );
}
