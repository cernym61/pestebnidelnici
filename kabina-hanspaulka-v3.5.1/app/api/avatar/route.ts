import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get('url');
    if (!raw) return new NextResponse(null, { status: 404 });

    const decoded = decodeURIComponent(raw);
    const marker = '/storage/v1/object/public/player-avatars/';
    const idx = decoded.indexOf(marker);
    if (idx === -1) {
      return NextResponse.redirect(decoded);
    }

    const after = decoded.slice(idx + marker.length).split('?')[0];
    const path = decodeURIComponent(after);
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.storage.from('player-avatars').download(path);
    if (error || !data) return new NextResponse(null, { status: 404 });

    return new NextResponse(await data.arrayBuffer(), {
      headers: {
        'Content-Type': data.type || 'image/jpeg',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
