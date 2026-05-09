import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url      = searchParams.get('url');
  const filename = searchParams.get('filename') ?? 'download';
  const forceDownload = searchParams.get('download') === '1';

  if (!url) {
    return new NextResponse('Missing url', { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  // Security: only proxy Cloudinary URLs to prevent SSRF
  if (!parsedUrl.hostname.endsWith('.cloudinary.com')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, { cache: 'no-store' });
  } catch {
    return new NextResponse('Fetch failed', { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse('Upstream error', { status: upstream.status });
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  const encoded = encodeURIComponent(filename);
  const disposition = forceDownload
    ? `attachment; filename*=UTF-8''${encoded}`
    : `inline; filename*=UTF-8''${encoded}`;

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type':        contentType,
      'Content-Disposition': disposition,
      'Cache-Control':       'private, max-age=3600',
    },
  });
}
