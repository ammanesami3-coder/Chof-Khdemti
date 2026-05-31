import { z } from "zod";

/**
 * Pure (no SDK import) validator that a URL is a Cloudinary *delivery* URL
 * belonging to OUR cloud only. Used to stop users from persisting arbitrary
 * external URLs as message/profile media — which would otherwise enable
 * tracking-pixel leaks, mixed-content, and SSRF bait when the URL is later
 * fetched/proxied.
 *
 * The app delivers exclusively from `res.cloudinary.com/<cloud_name>/...`
 * (see api/cloudinary/view + api/proxy-file), so we pin to exactly that.
 */
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export function isOurCloudinaryUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.hostname !== "res.cloudinary.com") return false;
  // Path must live under our cloud: /<cloud_name>/...
  return !!CLOUD_NAME && url.pathname.startsWith(`/${CLOUD_NAME}/`);
}

/** Zod schema for a media URL restricted to our Cloudinary cloud. */
export const cloudinaryUrlSchema = z
  .string()
  .url()
  .refine(isOurCloudinaryUrl, { message: "رابط الوسائط غير صالح" });
