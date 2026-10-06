/**
 * CSV export.
 *
 * Reports are built in the browser from data already on screen — no extra
 * query, nothing unbounded. Values are quoted and semicolon-separated so Excel
 * in an Italian locale opens the file without an import wizard.
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return ''
    const text = String(value)
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }

  return [headers.map(escape).join(';'), ...rows.map((row) => row.map(escape).join(';'))].join(
    '\r\n',
  )
}

export function downloadCsv(filename: string, content: string): void {
  // The BOM makes Excel read the file as UTF-8 instead of the system codepage.
  const blob = new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
