/**
 * Convierte un SVG (URL de Vite) a PNG en buffer para ExcelJS (no admite SVG nativo).
 * @param {string} svgImportUrl
 * @returns {Promise<ArrayBuffer|null>}
 */
export async function rasterizeSvgUrlToPngBuffer(svgImportUrl) {
  if (!svgImportUrl || typeof svgImportUrl !== 'string') return null;
  const res = await fetch(svgImportUrl);
  if (!res.ok) return null;
  const svgText = await res.text();
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('svg'));
      img.src = objectUrl;
    });
    const w = Math.min(360, (img.naturalWidth || 286) * 2);
    const h = Math.min(140, (img.naturalHeight || 110) * 2);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.filter = 'brightness(0) invert(1)';
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
    const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
    if (!pngBlob) return null;
    return pngBlob.arrayBuffer();
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
