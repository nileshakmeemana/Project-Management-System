/**
 * Single place for the site logo. Drop your 1:1 PNG at frontend/public/logo.png
 * (or change this to a full https:// URL) — it's used by the topbar, auth page,
 * invoice/payslip previews and the generated PDFs.
 */
export const LOGO_URL = '/logo.png';

/** Read an image file, downscale to max 512px, and return a PNG data-URL (for logo uploads). */
export function fileToLogoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load the image'));
      img.onload = () => {
        try {
          const max = 512;
          const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.round(img.naturalHeight * scale);
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) { reject(e as Error); }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
