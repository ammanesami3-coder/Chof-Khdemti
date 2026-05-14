import { type NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";

// ── Cloudinary proxy route ────────────────────────────────────────────────────
//
// GET /api/cloudinary/view?url=<encoded-cloudinary-url>
//   → Content-Disposition: inline  (PDF preview in iframe)
//
// GET /api/cloudinary/view?url=<encoded-cloudinary-url>&filename=<encoded-name>
//   → Content-Disposition: attachment  (download with correct filename)
//
// Strategy:
//   1. Strip upload-signature and try the clean public URL.
//   2. If Cloudinary returns 401/403 (restricted delivery), fall back to a
//      Cloudinary SDK-signed delivery URL — works for any access-control setting.
//   3. Read as ArrayBuffer (avoids ReadableStream issues in serverless).
//   4. Set RFC 5987–encoded Content-Disposition for correct filename in browser.

const VALID_RESOURCE_TYPES = ["raw", "image", "video"] as const;
type ResourceType = (typeof VALID_RESOURCE_TYPES)[number];

/** RFC 5987 percent-encoding — stricter than encodeURIComponent (also escapes * ' () ) */
function rfc5987Encode(str: string): string {
  return encodeURIComponent(str).replace(
    /[*'()]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** Parse resource_type and clean public_id from a Cloudinary delivery URL */
function parseCloudinaryUrl(rawUrl: string, cloudName: string) {
  let resourceType: ResourceType = "raw";
  for (const rt of VALID_RESOURCE_TYPES) {
    if (rawUrl.includes(`/${rt}/upload/`)) {
      resourceType = rt;
      break;
    }
  }

  const prefix    = `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/`;
  let   remainder = rawUrl.slice(prefix.length);

  // Remove upload-signature segment (s--XXX--/)
  remainder = remainder.replace(/^s--[^/]+--\//, "");
  // Remove version segment (v<digits>/)
  remainder = remainder.replace(/^v\d+\//, "");

  // Raw resources: public_id INCLUDES the file extension (e.g. folder/file.pdf)
  // Image/video:   public_id does NOT include the extension
  const publicId =
    resourceType === "raw"
      ? remainder
      : remainder.replace(/\.[^/.]+$/, "");

  return { resourceType, publicId };
}

export async function GET(request: NextRequest) {
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

  // ── Step 1: try clean public URL ──────────────────────────────────────────
  const cleanUrl = rawUrl.replace(/\/s--[^/]+--\//, "/");

  let upstreamRes = await fetch(cleanUrl, { cache: "no-store" }).catch(
    () => null,
  );

  // ── Step 2: 401/403 → fall back to Cloudinary signed delivery URL ─────────
  if (!upstreamRes || upstreamRes.status === 401 || upstreamRes.status === 403) {
    try {
      const { resourceType, publicId } = parseCloudinaryUrl(rawUrl, cloudName);

      if (!publicId) {
        return new NextResponse("Could not parse public_id", { status: 400 });
      }

      const signedUrl = cloudinary.url(publicId, {
        resource_type: resourceType,
        type:          "upload",
        sign_url:      true,
        secure:        true,
      });

      upstreamRes = await fetch(signedUrl, { cache: "no-store" }).catch(
        () => null,
      );
    } catch (err) {
      console.error("[cloudinary/view] Signed URL generation failed:", err);
    }
  }

  // ── Step 3: check upstream is OK ─────────────────────────────────────────
  if (!upstreamRes || !upstreamRes.ok) {
    const status = upstreamRes?.status ?? 502;
    console.error("[cloudinary/view] Upstream failed", {
      status,
      url: cleanUrl,
    });
    return new NextResponse(`Upstream error: ${status}`, { status });
  }

  // ── Step 4: read as ArrayBuffer (reliable in serverless / edge) ───────────
  let buffer: ArrayBuffer;
  try {
    buffer = await upstreamRes.arrayBuffer();
  } catch (err) {
    console.error("[cloudinary/view] Failed to read upstream body:", err);
    return new NextResponse("Failed to read upstream body", { status: 502 });
  }

  // ── Step 5: build response headers ───────────────────────────────────────
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
