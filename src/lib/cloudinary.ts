import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export const CLOUDINARY_FOLDERS = {
  avatar: "chof-khdemti/avatars",
  cover: "chof-khdemti/covers",
  post_image: "chof-khdemti/posts/images",
  post_video: "chof-khdemti/posts/videos",
  voice_message: "chof-khdemti/messages/voice",
} as const;

export type UploadPreset = keyof typeof CLOUDINARY_FOLDERS;
