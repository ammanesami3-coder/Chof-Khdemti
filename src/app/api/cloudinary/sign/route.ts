import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cloudinary, CLOUDINARY_FOLDERS, type UploadPreset } from "@/lib/cloudinary";
import { z } from "zod";

const bodySchema = z.object({
  preset: z.enum(["avatar", "cover"]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
  }

  const preset = parsed.data.preset as UploadPreset;
  const folder = CLOUDINARY_FOLDERS[preset];
  const timestamp = Math.round(Date.now() / 1000);

  const paramsToSign = { folder, timestamp };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return NextResponse.json({
    signature,
    timestamp,
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    folder,
  });
}
