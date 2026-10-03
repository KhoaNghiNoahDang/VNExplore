import { readFileSync, writeFileSync } from 'node:fs'

/** Parse a CSV file (UTF-8, optional BOM, quoted fields with "" escapes). Adds __line for error messages. */
export function readCsv(path) {
  const text = readFileSync(path, 'utf8').replace(/^﻿/, '')
  const rows = []
  let row = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') q = false
      else field += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row) }
  const [head, ...body] = rows
  return body
    .filter((r) => r.some((x) => x.trim()))
    .map((r, i) => ({ __line: i + 2, ...Object.fromEntries(head.map((h, j) => [h.trim(), (r[j] ?? '').trim()])) }))
}

/** Write rows as CSV (UTF-8 with BOM so Excel/Sheets keep Vietnamese text). `__line` is dropped. */
export function writeCsv(path, columns, rows) {
  const cell = (v) => {
    const s = String(v ?? '')
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))]
  writeFileSync(path, '﻿' + lines.join('\n') + '\n')
}
