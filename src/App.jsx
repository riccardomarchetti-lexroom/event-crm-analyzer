import React, { useState } from 'react';
import * as XLSX from 'xlsx';

import Uploader from './components/Uploader.jsx';
import ProgressLog from './components/ProgressLog.jsx';
import Summary from './components/Summary.jsx';
import ResultTable from './components/ResultTable.jsx';
import DownloadBar from './components/DownloadBar.jsx';

// ─── Segmentation ─────────────────────────────────────────────────────────────

const ACTIVE_STAGES = new Set([
  'closedwon',
  '883061702',       // [LIVE] — cliente attivo abbonato
  '883061707',       // Trial in corso
  'appointmentscheduled', // New — demo schedulata
  '1285033187',      // [RENEWAL] done — rinnovo fatto
  'qualifiedtobuy',
  'presentationscheduled',
  'decisionmakerboughtin',
  'contractsent',
]);

const STAGE_LABELS = {
  'closedwon':       'Closed Won',
  'closedlost':      'Closed Lost',
  '883061702':       '[LIVE]',
  '883061707':       'Trial',
  'appointmentscheduled': 'New – Demo',
  '1285033187':      '[RENEWAL] done',
  '1698921674':      '[UPSELL] Closed Lost',
  "qualifiedtobuy":          "Qualified to Buy",
  "presentationscheduled":   "Presentazione Schedulata",
  "decisionmakerboughtin":   "Decision Maker – Convinzione",
};

function segment(contact) {
  const deals = contact.deals || [];
  const hasActiveDeal = deals.some(d => ACTIVE_STAGES.has(d.stage));
  if (!contact.in_crm) return 'OUTREACH';
  if (hasActiveDeal) return 'DNC';
  return 'OUTREACH';
}

function getSegmentLabel(contact) {
  const deals = contact.deals || [];
  const hasActiveDeal = deals.some(d => ACTIVE_STAGES.has(d.stage));

  if (!contact.in_crm) return 'Non in CRM';
  if (hasActiveDeal) {
    const isClient = deals.some(d => d.stage === 'closedwon' || d.stage === '883061702');
    return isClient ? 'Cliente Attivo' : 'In Trattativa';
  }
  // In CRM but no active deal
  if (!deals.length) {
    const status = contact.lead_status || '';
    if (status === 'Contacted') return 'In Lavorazione';
    if (status === 'Lost') return 'Lost – Ricontattare';
    if (status === 'Disqualified') return 'Disqualified';
    return 'Nuovo Lead';
  }
  // Has deals but all inactive
  const hasRenewalChurned = deals.some(d => d.stage === '1698921674');
  const hasClosedLost = deals.some(d => d.stage === 'closedlost');
  if (hasRenewalChurned && !hasActiveDeal) return 'Ex Cliente – Re-engage';
  if (hasClosedLost) return 'Closed Lost';
  return 'Nuovo Lead';
}

function computeSegment(contact) {
  return {
    segment: segment(contact),
    segment_label: getSegmentLabel(contact),
  };
}

// ─── Excel generation ─────────────────────────────────────────────────────────

function generateExcel(contacts, eventName, eventDate, filename) {
  const safeName = eventName.replace(/[^a-zA-Z0-9]/g, '_');

  const rows = contacts.map(c => {
    const dealNote = (c.deals || [])
      .map(d => {
        const label = STAGE_LABELS[d.stage] || d.stage;
        const amount = d.amount ? `€${Number(d.amount).toLocaleString('it-IT')}` : '';
        return [label, amount].filter(Boolean).join(' ');
      })
      .join(' + ');

    const hsLink = c.hs_id
      ? `https://app.hubspot.com/contacts/143214577/record/0-1/${c.hs_id}`
      : '';

    return [
      c.firstname || '',          // A: First Name
      c.lastname || '',           // B: Last Name
      c.email || '',              // C: Email
      '',                         // D: Phone Number (empty)
      eventName,                  // E: Event Name
      eventDate || '',            // F: Event Date
      false,                      // G: Stand (boolean FALSE)
      false,                      // H: Promo (boolean FALSE)
      c.segment_label || c.segment, // I: Segmento
      c.in_crm ? 'Sì' : 'No',    // J: In HubSpot?
      c.hs_id || '',              // K: HubSpot ID
      c.lead_status || '',        // L: Lead Status
      c.num_deals ?? '',          // M: # Deal
      dealNote,                   // N: Deal Note
      c.owner_name || '',         // O: Owner
      c.channel || '',            // P: Channel
      c.num_contacts ?? '',       // Q: # Contatti
      c.last_call || '',          // R: Ultima Chiamata
      c.last_modified || '',      // S: Last Modified
      hsLink,                     // T: Link HubSpot
    ];
  });

  const headers = [
    'First Name', 'Last Name', 'Email', 'Phone Number', 'Event Name', 'Event Date', 'Stand', 'Promo',
    'Segmento', 'In HubSpot?', 'HubSpot ID', 'Lead Status', '# Deal', 'Deal Note',
    'Owner', 'Channel', '# Contatti', 'Ultima Chiamata', 'Last Modified', 'Link HubSpot',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contatti');
  XLSX.writeFile(wb, `${safeName}_${filename}.xlsx`);
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep]         = useState('upload');   // 'upload' | 'analyzing' | 'results'
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [logs, setLogs]         = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 1 });
  const [contacts, setContacts] = useState([]);
  const [error, setError]       = useState(null);

  // ── Analysis ──────────────────────────────────────────────────────────────

  async function runAnalysis(emails, names) {
    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(emails.length / BATCH_SIZE);

    const logLines = [`▶ Analisi avviata — ${emails.length} email, ${totalBatches} batch`];
    setLogs([...logLines]);
    setProgress({ current: 0, total: totalBatches });

    let simulatedBatch = 0;
    const progressInterval = setInterval(() => {
      simulatedBatch++;
      if (simulatedBatch < totalBatches) {
        logLines.push(`✓ Batch ${simulatedBatch}/${totalBatches} completato`);
        setLogs([...logLines]);
        setProgress({ current: simulatedBatch, total: totalBatches });
      } else {
        clearInterval(progressInterval);
      }
    }, 400);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, names }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API error ${response.status}: ${err}`);
      }

      const data = await response.json();

      logLines.push(`✓ Batch ${totalBatches}/${totalBatches} completato`);
      logLines.push(`✅ Analisi completata — ${data.contacts.length} trovati, ${data.not_found.length} non nel CRM`);
      setLogs([...logLines]);
      setProgress({ current: totalBatches, total: totalBatches });

      const segmented = data.contacts.map(c => ({
        ...c,
        ...computeSegment(c),
      }));
      const allContacts = [
        ...segmented,
        ...data.not_found.map(email => ({
          email,
          in_crm: false,
          segment: 'OUTREACH',
          segment_label: 'Non in CRM',
        })),
      ];

      await new Promise(r => setTimeout(r, 600)); // brief pause so user sees final log before results appear

      setContacts(allContacts);
      setStep('results');

    } catch (err) {
      clearInterval(progressInterval);
      logLines.push(`❌ Errore: ${err.message}`);
      setLogs([...logLines]);
      setError(err.message);
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleStart({ emails, names, eventName: evName, eventDate: evDate }) {
    setEventName(evName);
    setEventDate(evDate);
    setStep('analyzing');
    runAnalysis(emails, names);
  }

  function handleDownloadOutreach() {
    const outreach = contacts.filter(c => c.segment === 'OUTREACH');
    generateExcel(outreach, eventName, eventDate, 'OUTREACH');
  }

  function handleDownloadDnc() {
    const dnc = contacts.filter(c => c.segment === 'DNC');
    generateExcel(dnc, eventName, eventDate, 'DO_NOT_CONTACT');
  }

  function handleReset() {
    setStep('upload');
    setEventName('');
    setEventDate('');
    setLogs([]);
    setProgress({ current: 0, total: 1 });
    setContacts([]);
    setError(null);
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const outreach = contacts.filter(c => c.segment === 'OUTREACH');
  const dnc      = contacts.filter(c => c.segment === 'DNC');

  // ── Styles ────────────────────────────────────────────────────────────────

  const headerStyle = {
    background: '#0F4C9D',
    width: '100%',
    padding: '16px 24px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  };

  const mainStyle = {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '32px 24px',
    width: '100%',
    boxSizing: 'border-box',
  };

  const resetBtnStyle = {
    background: 'transparent',
    color: '#0F4C9D',
    border: '1.5px solid #0F4C9D',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    marginTop: '24px',
  };

  const errorBoxStyle = {
    background: '#FFF0F0',
    border: '1.5px solid #C03930',
    borderRadius: '8px',
    padding: '12px 16px',
    marginTop: '16px',
    fontSize: '14px',
    color: '#C03930',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#E4E4E4' }}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: 600, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", lineHeight: 1.2 }}>
          Event CRM Analyzer
        </span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", marginTop: '2px' }}>
          Lexroom BizOps
        </span>
      </div>

      {/* Main content */}
      <div style={mainStyle}>

        {/* Upload step — Uploader handles its own full-page layout internally */}
        {step === 'upload' && (
          <Uploader onStart={handleStart} />
        )}

        {/* Analyzing step */}
        {step === 'analyzing' && (
          <>
            <ProgressLog logs={logs} progress={progress} />
            {error && (
              <div style={errorBoxStyle}>
                <strong>Errore:</strong> {error}
                <br />
                <button style={{ ...resetBtnStyle, marginTop: '12px' }} onClick={handleReset}>
                  Riprova
                </button>
              </div>
            )}
          </>
        )}

        {/* Results step */}
        {step === 'results' && (
          <>
            <Summary
              contacts={contacts}
              onDownloadOutreach={handleDownloadOutreach}
              onDownloadDnc={handleDownloadDnc}
            />

            <div style={{ marginTop: '24px' }}>
              <ResultTable contacts={contacts} />
            </div>

            <div style={{ marginTop: '24px' }}>
              <DownloadBar
                onDownloadOutreach={handleDownloadOutreach}
                onDownloadDnc={handleDownloadDnc}
                outreachCount={outreach.length}
                dncCount={dnc.length}
              />
            </div>

            <button style={resetBtnStyle} onClick={handleReset}>
              ← Analizza un altro file
            </button>
          </>
        )}

      </div>
    </div>
  );
}
