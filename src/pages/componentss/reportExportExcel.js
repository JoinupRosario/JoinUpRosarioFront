import ExcelJS from 'exceljs';
import logoUrSvg from '../../assets/icons/logo.svg';
import { formatReporteFechaGeneracion } from './reportHeaderFormat.js';
import { rasterizeSvgUrlToPngBuffer } from './rasterizeSvgForExcel.js';

const ROJO_ARGB = 'FFC41E3A';
const BLANCO_ARGB = 'FFFFFFFF';
const TEXTO_TABLA_ARGB = 'FF374151';

function colToLetter(col) {
  let s = '';
  let c = col;
  while (c > 0) {
    const m = (c - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    c = Math.floor((c - 1) / 26);
  }
  return s;
}

function applyBannerFill(ws, r1, c1, r2, c2) {
  for (let r = r1; r <= r2; r += 1) {
    for (let c = c1; c <= c2; c += 1) {
      const cell = ws.getCell(r, c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: ROJO_ARGB },
      };
    }
  }
}

/**
 * Excel con encabezado institucional (logo UR, título y fecha sobre rojo plataforma) + filtros + tabla.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.generatedAt ISO
 * @param {string[]} opts.filterLines
 * @param {{ key: string, label: string }[]} opts.columns
 * @param {Record<string, unknown>[]} opts.rows
 * @param {string} [opts.filenameBase]
 */
export async function downloadReportExcel({ title, generatedAt, filterLines, columns, rows, filenameBase }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'JoinUp Rosario';
  const ws = wb.addWorksheet('Reporte', {
    properties: { defaultRowHeight: 18 },
    views: [{ showGridLines: true }],
  });

  const colCount = Math.max(8, Array.isArray(columns) ? columns.length : 1);
  const lastLetter = colToLetter(colCount);

  ws.getRow(1).height = 18;
  ws.getRow(2).height = 30;
  ws.getRow(3).height = 22;

  applyBannerFill(ws, 1, 1, 3, colCount);

  const pngBuf = await rasterizeSvgUrlToPngBuffer(logoUrSvg);
  if (pngBuf) {
    try {
      const imageId = wb.addImage({ buffer: pngBuf, extension: 'png' });
      ws.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 200, height: 58 },
      });
    } catch {
      /* sin logo */
    }
  }

  ws.mergeCells(`C1:${lastLetter}2`);
  const titleCell = ws.getCell('C1');
  titleCell.value = title ?? 'Reporte';
  titleCell.font = { bold: true, size: 16, color: { argb: BLANCO_ARGB } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  ws.mergeCells(`C3:${lastLetter}3`);
  const fechaCell = ws.getCell('C3');
  fechaCell.value = formatReporteFechaGeneracion(generatedAt);
  fechaCell.font = { size: 11, color: { argb: BLANCO_ARGB } };
  fechaCell.alignment = { vertical: 'middle', horizontal: 'center' };

  for (let c = 1; c <= colCount; c += 1) {
    const cell = ws.getCell(3, c);
    cell.border = {
      ...cell.border,
      bottom: { style: 'medium', color: { argb: BLANCO_ARGB } },
    };
  }

  const lines = (Array.isArray(filterLines) ? filterLines : []).filter(
    (line) => line != null && String(line).trim() !== ''
  );
  let r = 4;
  if (lines.length > 0) {
    r = 5;
    for (const line of lines) {
      ws.mergeCells(`A${r}:${lastLetter}${r}`);
      ws.getCell(`A${r}`).value = String(line);
      ws.getCell(`A${r}`).alignment = { wrapText: true, vertical: 'top' };
      r += 1;
    }
    r += 1;
  }

  if (columns?.length) {
    const headerRow = ws.getRow(r);
    columns.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = c.label ?? c.key;
      cell.font = { bold: true, color: { argb: TEXTO_TABLA_ARGB } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' },
      };
      cell.border = {
        bottom: { style: 'thin', color: { argb: ROJO_ARGB } },
      };
    });
    r += 1;

    for (const row of rows || []) {
      const excelRow = ws.getRow(r);
      columns.forEach((c, i) => {
        excelRow.getCell(i + 1).value = formatCell(row?.[c.key]);
      });
      r += 1;
    }
  } else {
    ws.mergeCells(`A${r}:${lastLetter}${r}`);
    ws.getCell(`A${r}`).value = 'Sin columnas de datos para este informe.';
    r += 1;
  }

  for (let c = 1; c <= colCount; c += 1) {
    ws.getColumn(c).width = c <= 2 ? 14 : 18;
  }

  let name;
  if (filenameBase === 'mon-daf-vinculacion') {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
    name = `reporte_monitoria_daf__VINCULACION_${stamp}.xlsx`;
  } else {
    const raw = (filenameBase || 'reporte').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80);
    name = `${raw || 'reporte'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  }
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function formatCell(v) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
