const sourceRoot = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/';

export async function GET(_request: Request, { params }: { params: { hex: string } }) {
  const hex = params.hex.toLowerCase();
  if (!/^[0-9a-f]{4,6}$/.test(hex)) return new Response('Invalid character code', { status: 400 });

  try {
    const upstream = await fetch(`${sourceRoot}${hex.padStart(5, '0')}.svg`, { next: { revalidate: 86400 } });
    if (!upstream.ok) return new Response('Stroke data not found', { status: 404 });
    const svg = await upstream.text();
    if (!svg.includes('<svg')) return new Response('Invalid SVG data', { status: 502 });
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Stroke data is temporarily unavailable', { status: 502 });
  }
}
