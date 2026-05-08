import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export const CLOUDINARY_FOLDERS = {
  avatar:        "chof-khdemti/avatars",
  cover:         "chof-khdemti/covers",
  post_image:    "chof-khdemti/posts/images",
  post_video:    "chof-khdemti/posts/videos",
  voice_message: "chof-khdemti/messages/voice",
  msg_image:     "chof-khdemti/messages/images",
  msg_video:     "chof-khdemti/messages/videos",
  msg_document:  "chof-khdemti/messages/documents",
  msg_audio:     "chof-khdemti/messages/audio",
} as const;

export const CLOUDINARY_RESOURCE_TYPES: Record<keyof typeof CLOUDINARY_FOLDERS, string> = {
  avatar:        "image",
  cover:         "image",
  post_image:    "image",
  post_video:    "video",
  voice_message: "video",
  msg_image:     "image",
  msg_video:     "video",
  msg_document:  "raw",
  msg_audio:     "video",
};

export type UploadPreset = keyof typeof CLOUDINARY_FOLDERS;
