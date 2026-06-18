import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  BLUE:  '#0F4C9D',
  GRAY:  '#E4E4E4',
  DARK:  '#1C1F27',
  RED:   '#C03930',
  WHITE: '#FFFFFF',
  LIGHT_BLUE: '#F0F5FF',
  FONT:  "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
}

const S = {
  // Layout shells
  page: {
    minHeight: '100vh',
    background: C.GRAY,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    fontFamily: C.FONT,
  },
  card: {
    background: C.WHITE,
    border: `1.5px solid ${C.GRAY}`,
    borderRadius: '10px',
    padding: '32px',
    boxShadow: '0 1px 4px rgba(15,76,157,0.08)',
    width: '100%',
    maxWidth: '560px',
  },

  // Typography
  h1: {
    fontSize: '24px',
    fontWeight: 700,
    color: C.DARK,
    letterSpacing: '-0.5px',
    margin: '0 0 6px 0',
  },
  h2: {
    fontSize: '18px',
    fontWeight: 600,
    color: C.DARK,
    margin: 0,
  },
  body: {
    fontSize: '14px',
    fontWeight: 400,
    color: C.DARK,
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: C.BLUE,
    display: 'block',
    marginBottom: '6px',
  },

  // Drag-drop zone
  dropZone: (isDragging) => ({
    border: `2px dashed ${C.BLUE}`,
    borderRadius: '12px',
    background: isDragging ? '#D8E8FF' : C.LIGHT_BLUE,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '48px 24px',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    userSelect: 'none',
    minHeight: '220px',
  }),
  dropIcon: {
    fontSize: '40px',
    lineHeight: 1,
    marginBottom: '8px',
  },
  dropSubtext: {
    fontSize: '14px',
    fontWeight: 400,
    color: C.BLUE,
  },

  // Inputs
  input: {
    border: `1.5px solid ${C.GRAY}`,
    borderRadius: '6px',
    padding: '9px 12px',
    fontSize: '14px',
    background: C.WHITE,
    color: C.DARK,
    outlineColor: C.BLUE,
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: C.FONT,
  },
  select: {
    border: `1.5px solid ${C.GRAY}`,
    borderRadius: '6px',
    padding: '9px 12px',
    fontSize: '14px',
    background: C.WHITE,
    color: C.DARK,
    outlineColor: C.BLUE,
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: C.FONT,
    cursor: 'pointer',
  },

  // Buttons
  btnPrimary: (disabled) => ({
    background: disabled ? '#8BADD6' : C.BLUE,
    color: C.WHITE,
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s ease',
    fontFamily: C.FONT,
  }),
  btnSecondary: {
    background: 'transparent',
    color: C.BLUE,
    borderRadius: '6px',
    padding: '9px 16px',
    fontSize: '14px',
    fontWeight: 600,
    border: `1.5px solid ${C.BLUE}`,
    cursor: 'pointer',
    fontFamily: C.FONT,
  },

  // Misc
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '20px',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  errorText: {
    fontSize: '12px',
    color: C.RED,
    marginTop: '4px',
  },
  previewBox: {
    background: C.LIGHT_BLUE,
    border: `1.5px solid ${C.BLUE}`,
    borderRadius: '6px',
    padding: '10px 14px',
    marginTop: '8px',
    fontSize: '13px',
    color: C.DARK,
  },
  divider: {
    height: '1px',
    background: C.GRAY,
    margin: '24px 0',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  stepBadge: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: C.BLUE,
    background: C.LIGHT_BLUE,
    padding: '3px 10px',
    borderRadius: '100px',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function autoMatch(headers, regex) {
  const found = headers.find(h => regex.test(h))
  return found || ''
}

function extractEmails(rows, emailCol) {
  if (!emailCol) return []
  const raw = rows
    .map(row => String(row[emailCol] ?? '').trim().toLowerCase())
    .filter(e => e.includes('@'))
  return [...new Set(raw)]
}

function extractNames(rows, emailCol, nameCol) {
  if (!nameCol || !emailCol) return {}
  const map = {}
  for (const row of rows) {
    const email = String(row[emailCol] ?? '').trim().toLowerCase()
    const name  = String(row[nameCol]  ?? '').trim()
    if (email.includes('@') && name) {
      map[email] = name
    }
  }
  return map
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Uploader({ onStart }) {
  // Step 1: upload state
  const [step, setStep]             = useState(1) // 1 = upload, 2 = config
  const [isDragging, setIsDragging] = useState(false)
  const [parseError, setParseError] = useState('')

  // Parsed workbook data
  const [sheetNames, setSheetNames] = useState([])     // all sheet names in workbook
  const [selectedSheet, setSelectedSheet] = useState('')
  const [headers, setHeaders]   = useState([])          // column names
  const [rows, setRows]         = useState([])          // array of row objects

  // Step 2: config state
  const [eventName, setEventName]   = useState('')
  const [eventDate, setEventDate]   = useState('')
  const [emailCol, setEmailCol]     = useState('')
  const [nameCol, setNameCol]       = useState('')

  const fileInputRef = useRef(null)

  // ── Parse workbook & extract sheet ──────────────────────────────────────────

  const parseSheet = useCallback((workbook, sheetName) => {
    const ws = workbook.Sheets[sheetName]
    // header: 1 → returns array of arrays; first row = headers
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

    if (!data || data.length === 0) {
      setParseError('Il foglio selezionato è vuoto.')
      return
    }

    const rawHeaders = data[0].map(h => String(h).trim())
    const dataRows   = data.slice(1).map(row => {
      const obj = {}
      rawHeaders.forEach((h, i) => { obj[h] = row[i] ?? '' })
      return obj
    })

    setHeaders(rawHeaders)
    setRows(dataRows)

    // Auto-select columns
    setEmailCol(autoMatch(rawHeaders, /email|mail/i))
    setNameCol(autoMatch(rawHeaders, /nome|name|cognome/i))

    setStep(2)
  }, [])

  const handleWorkbook = useCallback((workbook) => {
    const names = workbook.SheetNames
    setSheetNames(names)
    const first = names[0] || ''
    setSelectedSheet(first)
    parseSheet(workbook, first)
  }, [parseSheet])

  // Keep workbook in a ref so we can re-parse on sheet change without re-reading the file
  const workbookRef = useRef(null)

  // ── File reading ─────────────────────────────────────────────────────────────

  const readFile = useCallback((file) => {
    setParseError('')
    const allowed = ['.xlsx', '.xls', '.csv']
    const ext     = '.' + file.name.split('.').pop().toLowerCase()
    if (!allowed.includes(ext)) {
      setParseError(`Formato non supportato: ${ext}. Usa .xlsx, .xls o .csv.`)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data     = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        workbookRef.current = workbook
        handleWorkbook(workbook)
      } catch {
        setParseError('Impossibile leggere il file. Assicurati che non sia corrotto.')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [handleWorkbook])

  // ── Drag & drop handlers ─────────────────────────────────────────────────────

  const onDragOver  = useCallback((e) => { e.preventDefault(); setIsDragging(true)  }, [])
  const onDragLeave = useCallback(()  => { setIsDragging(false) }, [])
  const onDrop      = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) readFile(file)
  }, [readFile])

  const onFileChange = useCallback((e) => {
    const file = e.target.files[0]
    if (file) readFile(file)
    // Reset so same file can be re-selected
    e.target.value = ''
  }, [readFile])

  // ── Sheet selector ────────────────────────────────────────────────────────────

  const handleSheetSelect = useCallback((e) => {
    const name = e.target.value
    setSelectedSheet(name)
    if (workbookRef.current) {
      parseSheet(workbookRef.current, name)
    }
  }, [parseSheet])

  // ── Submit ────────────────────────────────────────────────────────────────────

  const canSubmit = eventName.trim() !== '' && emailCol !== ''

  const handleStart = useCallback(() => {
    if (!canSubmit) return
    const emails = extractEmails(rows, emailCol)
    const names  = extractNames(rows, emailCol, nameCol)
    onStart({
      emails,
      names,
      eventName: eventName.trim(),
      eventDate,
    })
  }, [canSubmit, rows, emailCol, nameCol, eventName, eventDate, onStart])

  // ── Email preview ─────────────────────────────────────────────────────────────

  const emailPreview = emailCol
    ? rows
        .map(r => String(r[emailCol] ?? '').trim().toLowerCase())
        .filter(e => e.includes('@'))
        .slice(0, 3)
    : []

  // ── Render: Step 1 ────────────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={S.headerRow}>
            <div>
              <h1 style={S.h1}>Event CRM Analyzer</h1>
              <p style={{ ...S.body, color: '#6B7280', margin: 0 }}>
                Carica la lista partecipanti per iniziare
              </p>
            </div>
            <span style={S.stepBadge}>Step 1 di 2</span>
          </div>

          {/* Drag-drop zone */}
          <div
            style={S.dropZone(isDragging)}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label="Carica file Excel o CSV"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
          >
            <span style={S.dropIcon}>📂</span>
            <span style={S.h2}>Trascina qui il tuo file</span>
            <span style={S.dropSubtext}>.xlsx · .xls · .csv</span>
            <span style={{ ...S.body, color: '#6B7280', marginTop: '4px' }}>
              oppure clicca per sfogliare
            </span>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />

          {/* Error */}
          {parseError && (
            <p style={{ ...S.errorText, marginTop: '12px' }}>{parseError}</p>
          )}
        </div>
      </div>
    )
  }

  // ── Render: Step 2 ────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.headerRow}>
          <div>
            <h1 style={S.h1}>Configura l'analisi</h1>
            <p style={{ ...S.body, color: '#6B7280', margin: 0 }}>
              {rows.length} righe caricate
            </p>
          </div>
          <span style={S.stepBadge}>Step 2 di 2</span>
        </div>

        {/* Sheet selector — only shown if workbook has >1 sheet */}
        {sheetNames.length > 1 && (
          <div style={S.fieldGroup}>
            <label style={S.label}>Foglio</label>
            <select
              style={S.select}
              value={selectedSheet}
              onChange={handleSheetSelect}
            >
              {sheetNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Event name + date row */}
        <div style={S.row}>
          <div style={{ ...S.fieldGroup, flex: 1 }}>
            <label style={S.label}>Nome evento *</label>
            <input
              style={S.input}
              type="text"
              placeholder="es. Evento Milano 2026"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ ...S.fieldGroup, flex: '0 0 160px' }}>
            <label style={S.label}>Data evento</label>
            <input
              style={S.input}
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
            />
          </div>
        </div>

        <div style={S.divider} />

        {/* Column mapping */}
        <div style={S.fieldGroup}>
          <label style={S.label}>Colonna Email *</label>
          <select
            style={S.select}
            value={emailCol}
            onChange={e => setEmailCol(e.target.value)}
          >
            <option value="">— seleziona colonna —</option>
            {headers.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>

          {/* Preview: first 3 values from email column */}
          {emailPreview.length > 0 && (
            <div style={S.previewBox}>
              <span style={{ ...S.label, display: 'inline', fontSize: '10px' }}>
                Anteprima:
              </span>{' '}
              {emailPreview.join(' · ')}
            </div>
          )}
          {emailCol && emailPreview.length === 0 && (
            <p style={S.errorText}>Nessun indirizzo email trovato in questa colonna.</p>
          )}
        </div>

        <div style={S.fieldGroup}>
          <label style={S.label}>Colonna Nome <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '11px', color: '#6B7280' }}>(opzionale)</span></label>
          <select
            style={S.select}
            value={nameCol}
            onChange={e => setNameCol(e.target.value)}
          >
            <option value="">— nessuna —</option>
            {headers.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
          <button
            style={S.btnPrimary(!canSubmit)}
            disabled={!canSubmit}
            onClick={handleStart}
          >
            Avvia analisi →
          </button>
          <button
            style={S.btnSecondary}
            onClick={() => {
              setStep(1)
              setParseError('')
              setHeaders([])
              setRows([])
              setSheetNames([])
              setEmailCol('')
              setNameCol('')
              setEventName('')
              setEventDate('')
            }}
          >
            ← Cambia file
          </button>
        </div>

        {!canSubmit && (
          <p style={{ ...S.errorText, marginTop: '8px' }}>
            {!eventName.trim() && !emailCol
              ? 'Inserisci il nome evento e seleziona la colonna email per continuare.'
              : !eventName.trim()
                ? 'Il nome evento è obbligatorio.'
                : 'Seleziona la colonna email per continuare.'}
          </p>
        )}
      </div>
    </div>
  )
}
