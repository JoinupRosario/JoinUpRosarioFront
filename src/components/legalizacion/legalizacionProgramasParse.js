/** Lista de etiquetas de programa a partir de una fila del listado (API). */
export function parseProgramasFromRow(row) {
  if (Array.isArray(row?.programas) && row.programas.length) {
    return row.programas
      .map((p) =>
        typeof p === 'string'
          ? p.trim()
          : String(p?.name || p?.code || p?.label || '').trim()
      )
      .filter(Boolean);
  }
  const raw = row?.programa;
  if (raw == null || raw === '') return [];
  const s = String(raw).trim();
  if (s === '—') return [];
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}
