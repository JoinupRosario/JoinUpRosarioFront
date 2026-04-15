const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Texto tipo referencia institucional: "Fecha: 14 de abril de 2026 10:11 a. m."
 * @param {string|undefined|null} iso
 */
export function formatReporteFechaGeneracion(iso) {
  if (iso == null || String(iso).trim() === '') return 'Fecha: —';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Fecha: —';
  const day = d.getDate();
  const month = MESES[d.getMonth()];
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `Fecha: ${day} de ${month} de ${year} ${time}`;
}
