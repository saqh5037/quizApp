/**
 * Utility functions for filename sanitization
 */

/**
 * Sanitize filename by removing accents and special characters
 * @param filename - Original filename
 * @returns Sanitized filename safe for HTTP headers
 */
export function sanitizeFilename(filename: string): string {
  // Normalize unicode characters and remove accents
  const normalized = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Replace spaces and special characters with underscores
  const sanitized = normalized
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  return sanitized || 'file'; // Fallback if everything gets stripped
}

/**
 * Sanitize filename while preserving the extension
 * @param filename - Original filename with extension
 * @returns Sanitized filename with original extension preserved
 */
export function sanitizeFilenameWithExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  
  if (lastDotIndex === -1) {
    // No extension
    return sanitizeFilename(filename);
  }
  
  const name = filename.substring(0, lastDotIndex);
  const extension = filename.substring(lastDotIndex + 1);
  
  // Sanitize name but keep original extension (just remove accents)
  const sanitizedName = sanitizeFilename(name);
  const sanitizedExt = extension.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return `${sanitizedName}.${sanitizedExt}`;
}