import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── Cloudinary proxy route ────────────────────────────────────────────────────
//
// GET /api/cloudinary/view?url=<encoded-cloudinary-url>
//   → Content-Disposition: inline  (PDF preview in iframe)
//
// GET /api/cloudinary/view?url=<encoded-cloudinary-url>&filename=<encoded-name>
//   → Content-Disposition: attachment  (download with correct filename)
//
// Security:
//   • Requires an authenticated session — this is not a public proxy.
//   • Only serves PUBLIC delivery URLs from OUR cloud. The previous
//     restricted-asset signing fallback was removed: it let any caller fetch
//     access-controlled Cloudinary assets by handing the route a public_id,
//     effectively bypassing Cloudinary's own access control.
//
// Strategy:
//   1. Strip upload-signature and fetch the clean public URL.
//   2. Read as ArrayBuffer (avoids ReadableStream issues in serverless).
//   3. Set RFC 5987–encoded Content-Disposition for correct filename in browser.

/** RFC 5987 percent-encoding — stricter than encodeURIComponent (also escapes * ' () ) */
function rfc5987Encode(str: string): string {
  return encodeURIComponent(str).replace(
    /[*'()]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export async function GET(request: NextRequest) {
  // ── Require an authenticated session ──────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const rawUrl    = searchParams.get("url");
  const filename  = searchParams.get("filename") ?? null;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!cloudName || !rawUrl) {
    return new NextResponse("Missing parameters", { status: 400 });
  }
  if (!rawUrl.startsWith(`https://res.cloudinary.com/${cloudName}/`)) {
    return new NextResponse("Invalid Cloudinary URL", { status: 400 });
  }

  // ── Step 1: fetch clean public URL ────────────────────────────────────────
  const cleanUrl = rawUrl.replace(/\/s--[^/]+--\//, "/");

  const upstreamRes = await fetch(cleanUrl, { cache: "no-store" }).catch(
    () => null,
  );

  // ── Step 2: check upstream is OK ─────────────────────────────────────────
  if (!upstreamRes || !upstreamRes.ok) {
    const status = upstreamRes?.status ?? 502;
    console.error("[cloudinary/view] Upstream failed", {
      status,
      url: cleanUrl,
    });
    return new NextResponse(`Upstream error: ${status}`, { status });
  }

  // ── Step 3: read as ArrayBuffer (reliable in serverless / edge) ───────────
  let buffer: ArrayBuffer;
  try {
    buffer = await upstreamRes.arrayBuffer();
  } catch (err) {
    console.error("[cloudinary/view] Failed to read upstream body:", err);
    return new NextResponse("Failed to read upstream body", { status: 502 });
  }

  // ── Step 4: build response headers ───────────────────────────────────────
  const contentType =
    upstreamRes.headers.get("content-type") ?? "application/octet-stream";

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Length", String(buffer.byteLength));
  headers.set("Cache-Control", "private, max-age=3600");

  if (filename) {
    // RFC 5987 encoded filename — fully supports Arabic & special characters
    const encoded  = rfc5987Encode(filename);
    // ASCII-safe fallback for browsers that don't support filename*
    const asciiFallback = filename.replace(/[^\w\-.]/g, "_");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`,
    );
  } else {
    // No filename → serve inline (PDF in iframe, etc.)
    headers.set("Content-Disposition", "inline");
  }

  return new NextResponse(buffer, { status: 200, headers });
}
