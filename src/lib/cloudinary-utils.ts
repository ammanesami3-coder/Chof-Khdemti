// Client-safe Cloudinary URL utilities — no cloudinary SDK import

/**
 * Strips the upload-signature segment (s--XXX--) that Cloudinary may embed in
 * secure_url for signed-upload presets.  For "upload"-type (public) assets the
 * delivery URL works without it, and mixing a stale signature with transformations
 * like fl_attachment causes HTTP 400.
 */
function stripSignature(cloudinaryUrl: string): string {
  return cloudinaryUrl.replace(/\/s--[^/]+--\//, '/');
}

/**
 * Returns a clean Cloudinary delivery URL for inline preview (iframe, img, video).
 * Strips any upload signature that would block the browser from loading the file.
 */
export function getPreviewUrl(cloudinaryUrl: string): string {
  return stripSignature(cloudinaryUrl);
}

/**
 * Returns a download URL by injecting fl_attachment into the Cloudinary delivery
 * path. Strips any existing upload signature first (signed URL + fl_attachment
 * transformation = HTTP 400). Sanitises the filename to URL-safe characters.
 *
 * Example:
 *   in:  https://res.cloudinary.com/X/raw/upload/s--ABC--/v1/folder/file.pdf
 *   out: https://res.cloudinary.com/X/raw/upload/fl_attachment:file.pdf/v1/folder/file.pdf
 */
export function getDownloadUrl(cloudinaryUrl: string, fileName: string): string {
  const clean = stripSignature(cloudinaryUrl);
  // Only word chars, dots, hyphens — avoids Cloudinary transformation parse errors
  const safeFileName = fileName.replace(/[^\w\-.]/g, '_');
  return clean.replace('/upload/', `/upload/fl_attachment:${safeFileName}/`);
}

/** Returns a short human-readable type label (PDF, DOCX, XLSX …) */
export function getFileTypeLabel(mimeType?: string, fileName?: string): string {
  const name = fileName?.toLowerCase() ?? '';
  if (mimeType?.includes('pdf')  || name.endsWith('.pdf'))  return 'PDF';
  if (mimeType?.includes('wordprocessingml.document') || name.endsWith('.docx')) return 'DOCX';
  if (mimeType?.includes('msword')    || name.endsWith('.doc'))   return 'DOC';
  if (mimeType?.includes('spreadsheetml.sheet') || name.endsWith('.xlsx')) return 'XLSX';
  if (mimeType?.includes('ms-excel')  || name.endsWith('.xls'))  return 'XLS';
  if (mimeType?.includes('presentationml.presentation') || name.endsWith('.pptx')) return 'PPTX';
  if (mimeType?.includes('ms-powerpoint') || name.endsWith('.ppt')) return 'PPT';
  if (mimeType?.includes('csv')  || name.endsWith('.csv')) return 'CSV';
  if (mimeType?.includes('plain') || name.endsWith('.txt')) return 'TXT';
  const ext = fileName?.split('.').pop()?.toUpperCase();
  return ext ?? 'ملف';
}

/**
 * Returns a URL to our server-side proxy that generates a Cloudinary SIGNED
 * delivery URL with fl_attachment — the only approach that reliably works for
 * raw resource types (PDF, DOCX, XLSX, etc.).
 * Direct fl_attachment on unsigned raw URLs returns HTTP 400.
 */
export function getProxyDownloadUrl(cloudinaryUrl: string, fileName: string): string {
  return `/api/cloudinary/view?url=${encodeURIComponent(cloudinaryUrl)}&filename=${encodeURIComponent(fileName)}`;
}

/** Returns true for DOCX/XLS/PPT MIME types supported by Office Online Viewer */
export function isOfficeMime(mimeType?: string): boolean {
  if (!mimeType) return false;
  return (
    mimeType.includes('wordprocessingml') ||
    mimeType.includes('msword') ||
    mimeType.includes('spreadsheetml') ||
    mimeType.includes('ms-excel') ||
    mimeType.includes('presentationml') ||
    mimeType.includes('ms-powerpoint')
  );
}
