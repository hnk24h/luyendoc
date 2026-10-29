'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

type StrokeData = { svg: string; count: number };

function makeStrokeData(source: string): StrokeData | null {
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (parsed.querySelector('parsererror')) return null;
  const svg = parsed.documentElement;
  if (svg.tagName.toLowerCase() !== 'svg') return null;

  svg.querySelectorAll('script, foreignObject, iframe, object, embed').forEach((node) => node.remove());
  svg.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (/^on/i.test(attribute.name) || /javascript:/i.test(attribute.value)) node.removeAttribute(attribute.name);
    });
  });

  const paths = [...svg.querySelectorAll('path[id]')]
    .map((path) => ({ path, match: path.id.match(/-s(\d+)$/) }))
    .filter((item): item is { path: SVGPathElement; match: RegExpMatchArray } => item.match !== null)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));
  if (!paths.length) return null;

  const count = Math.max(...paths.map(({ match }) => Number(match[1])));
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('aria-label', 'Kanji stroke order illustration');
  return { svg: new XMLSerializer().serializeToString(svg), count };
}

function showStep(data: StrokeData, step: number) {
  const parsed = new DOMParser().parseFromString(data.svg, 'image/svg+xml');
  const svg = parsed.documentElement;
  svg.querySelectorAll('path[id]').forEach((path) => {
    const match = path.id.match(/-s(\d+)$/);
    if (!match) return;
    const index = Number(match[1]);
    path.setAttribute('visibility', index <= step ? 'visible' : 'hidden');
    path.setAttribute('stroke', index === step ? '#526e5b' : '#aeb9ac');
    path.setAttribute('stroke-width', index === step ? '4' : '3');
  });
  svg.querySelectorAll('[id]').forEach((node) => {
    const match = node.id.match(/-s(\d+)-n$/);
    if (match) node.setAttribute('visibility', Number(match[1]) <= step ? 'visible' : 'hidden');
  });
  return new XMLSerializer().serializeToString(svg);
}

export function KanjiStrokeViewer({ character }: { character: string }) {
  const [data, setData] = useState<StrokeData | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const code = character.codePointAt(0)?.toString(16);
    const controller = new AbortController();
    setData(null);
    setStep(0);
    setLoading(true);
    setUnavailable(false);
    setPlaying(false);
    if (!code) return;

    fetch(`/api/kanji-svg/${code}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('No stroke data');
        return response.text();
      })
      .then((source) => {
        const result = makeStrokeData(source);
        if (!result) throw new Error('Invalid stroke data');
        setData(result);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setUnavailable(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [character]);

  useEffect(() => {
    if (!playing || !data) return;
    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current >= data.count) {
          setPlaying(false);
          return data.count;
        }
        return current + 1;
      });
    }, 700);
    return () => window.clearInterval(timer);
  }, [playing, data]);

  const image = data ? showStep(data, step) : '';

  return (
    <div className="mt-4 rounded-xl border border-[#e6e9e0] bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#8a968c]">Thứ tự nét viết</p><p className="mt-1 text-[10px] text-[#96a096]">Nét đang tô xanh</p></div>
        {data && <span className="rounded-full bg-[#f0f1e9] px-2.5 py-1 text-[10px] tabular-nums text-[#718076]">{step}/{data.count}</span>}
      </div>
      <div className="mx-auto mt-2 grid aspect-square w-full max-w-[220px] place-items-center overflow-hidden rounded-xl bg-[#f8f8f3] p-3">
        {loading ? <LoaderCircle size={22} className="animate-spin text-[#829183]" /> : data ? <div className="h-full w-full" dangerouslySetInnerHTML={{ __html: image }} /> : <div className="px-4 text-center"><span className="jp text-5xl text-[#d4dacf]">{character}</span><p className="mt-3 text-[10px] leading-5 text-[#89958b]">{unavailable ? 'Chưa tải được dữ liệu thứ tự nét.' : 'Không có dữ liệu cho chữ này.'}</p></div>}
      </div>
      {data && <>
        <input aria-label="Chọn bước nét" type="range" min={0} max={data.count} value={step} onChange={(event) => { setPlaying(false); setStep(Number(event.target.value)); }} className="mt-3 w-full accent-[#526e5b]" />
        <div className="mt-2 flex items-center justify-center gap-2"><button aria-label="Về nét đầu" onClick={() => { setPlaying(false); setStep(0); }} className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0f1e9] text-[#718076]"><RotateCcw size={14} /></button><button aria-label="Nét trước" onClick={() => { setPlaying(false); setStep((current) => Math.max(0, current - 1)); }} className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0f1e9] text-[#718076]"><SkipBack size={14} /></button><button aria-label={playing ? 'Tạm dừng' : 'Phát thứ tự nét'} onClick={() => { if (step >= data.count) setStep(0); setPlaying(!playing); }} className="grid h-9 w-9 place-items-center rounded-xl bg-[#526e5b] text-white"><span className="sr-only">{playing ? 'Tạm dừng' : 'Phát'}</span>{playing ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}</button><button aria-label="Nét tiếp theo" onClick={() => { setPlaying(false); setStep((current) => Math.min(data.count, current + 1)); }} className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0f1e9] text-[#718076]"><SkipForward size={14} /></button></div>
      </>}
      <p className="mt-3 text-center text-[9px] text-[#a0a99f]">Stroke data: KanjiVG · CC BY-SA 3.0</p>
    </div>
  );
}
