type LoaderParams = { src: string; width: number; quality?: number };

/**
 * Serves images directly from Cloudinary's CDN instead of proxying through /_next/image.
 * Only transforms /image/upload/ URLs — video URLs and non-Cloudinary URLs are returned as-is.
 */
export default function cloudinaryLoader({ src, width, quality = 80 }: LoaderParams): string {
  const marker = "/image/upload/";
  const idx = src.indexOf(marker);
  if (idx === -1) return src;
  const prefix = src.slice(0, idx + marker.length);
  const rest = src.slice(idx + marker.length);
  return `${prefix}f_auto,q_${quality},w_${width}/${rest}`;
}
