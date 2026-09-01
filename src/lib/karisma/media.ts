/** Arte, foto de peça e comprovante: só raster/PDF. SVG vira script no navegador. */
const IMAGE_DATA = /^data:image\/(jpeg|jpg|png|webp);base64,/i;
const PDF_DATA = /^data:application\/pdf;base64,/i;
const IMAGE_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const RECEIPT_MIME = new Set([...IMAGE_MIME, "application/pdf"]);

export function isSafeImageDataUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lower = trimmed.slice(0, 40).toLowerCase();
  if (lower.includes("svg") || lower.includes("xml")) return false;
  return IMAGE_DATA.test(trimmed);
}

export function isSafeReceiptDataUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (isSafeImageDataUrl(trimmed)) return true;
  return PDF_DATA.test(trimmed);
}

export function isAllowedImageMime(mime: string): boolean {
  return IMAGE_MIME.has(mime.toLowerCase());
}

export function isAllowedReceiptMime(mime: string): boolean {
  return RECEIPT_MIME.has(mime.toLowerCase());
}

export function isSafeCatalogImage(path: string): boolean {
  return /^\/uniforms\/[A-Za-z0-9._-]+$/.test(path);
}

/** Foto da peça: arquivo da loja ou upload JPG/PNG/WebP. */
export function isSafePieceImage(value: string): boolean {
  return isSafeCatalogImage(value) || isSafeImageDataUrl(value);
}
