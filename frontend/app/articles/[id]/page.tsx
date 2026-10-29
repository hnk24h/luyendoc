'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Bookmark, Headphones, Volume2 } from 'lucide-react';
import { getArticle } from '@/lib/data';
import type { Article } from '@/lib/data';

type StudyTab = 'vocab' | 'grammar';

export default function Reader() {
  const params = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [showRuby, setShowRuby] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [activeSentence, setActiveSentence] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<StudyTab>('vocab');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<string[]>([]);

  useEffect(() => {
    getArticle(params.id).then(setArticle);
  }, [params.id]);

  const sentences = article?.sentences ?? [];
  const sentence = activeSentence === null ? null : sentences[activeSentence];
  const words = useMemo(() => {
    if (!sentence) return [];
    const unique = new Map<string, (typeof sentence.tokens)[number]>();
    sentence.tokens.forEach((token) => {
      if (/^[、。！？,.!?]+$/.test(token.surface)) return;
      unique.set(`${token.surface}:${token.dictionary_form}`, token);
    });
    return [...unique.values()];
  }, [sentence]);
  const selectedToken = words.find((token) => token.surface === selectedWord);

  if (!article) return <main className="p-12 text-center text-[#7d8b80]">Loading story…</main>;

  function toggleSavedWord(word: string) {
    setSavedWords((current) => current.includes(word) ? current.filter((item) => item !== word) : [...current, word]);
  }

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-sm text-[#718076]"><ArrowLeft size={16} /> Reading room</Link>
        <span className="font-semibold">ことば <span className="text-[10px] font-normal tracking-widest text-[#849087]">KOTOBA</span></span>
        <span className="w-24" />
      </header>

      <div className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-8 rounded-[1.7rem] bg-gradient-to-br from-[#dce4d7] via-[#eee5d7] to-[#e4e7dc] px-8 py-10 md:px-14">
          <p className="text-xs uppercase tracking-[.2em] text-[#718275]">{article.level} · 4 min read · {new Date(article.published_at).toLocaleDateString()}</p>
          <h1 className="jp mt-4 text-3xl leading-relaxed md:text-4xl">{article.title}</h1>
          <p className="mt-3 text-sm text-[#758378]">A short story from everyday Japan</p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-12">
          <article>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#e6e7de] pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setShowRuby(!showRuby)} className={`rounded-full px-4 py-2 text-xs ${showRuby ? 'bg-[#526e5b] text-white' : 'bg-white text-[#68776b]'}`}>{showRuby ? 'ふりがな ON' : 'ふりがな OFF'}</button>
                <button onClick={() => setShowTranslation(!showTranslation)} className={`rounded-full px-4 py-2 text-xs ${showTranslation ? 'bg-[#e1e9df] text-[#526e5b]' : 'bg-white text-[#68776b]'}`}>{showTranslation ? 'Dịch VI: bật' : 'Dịch VI: tắt'}</button>
                <button onClick={() => { const utterance = new SpeechSynthesisUtterance(article.body); utterance.lang = 'ja-JP'; speechSynthesis.speak(utterance); }} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs text-[#68776b]"><Headphones size={14} /> Listen</button>
              </div>
            </div>

            <div className="space-y-4">
              {sentences.map((item, index) => (
                <button key={index} onClick={() => { setActiveSentence(index); setSelectedWord(null); }} className={`jp block w-full rounded-2xl px-5 py-5 text-left text-xl leading-[2.15] transition ${activeSentence === index ? 'bg-[#e9eee5] ring-1 ring-[#dce5d9]' : 'hover:bg-white/70'}`}>
                  {showRuby ? <RubyText text={item.text} /> : item.text}
                  <span className="ml-3 align-middle text-xs text-[#9ca79c]">{String(index + 1).padStart(2, '0')}</span>
                  {showTranslation && <span className="mt-2 block border-t border-[#e8ebe3] pt-3 font-sans text-sm leading-6 text-[#758378]"><span className="mr-2 rounded bg-[#eef0e8] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#7a897d]">VI</span>{item.translation_vi || 'Chưa có bản dịch cho câu này.'}</span>}
                </button>
              ))}
            </div>
            <p className="mt-6 text-xs text-[#9aa39a]">Chọn một câu để xem từ vựng và ngữ pháp.</p>
          </article>

          <aside className="h-fit overflow-hidden rounded-2xl border border-[#e6e7de] bg-[#fbfaf6] lg:sticky lg:top-6">
            <div className="border-b border-[#e9eae2] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8b978c]">{sentence ? `Ghi chú · Câu ${String((activeSentence ?? 0) + 1).padStart(2, '0')}` : 'Góc học tập'}</p>
              {sentence ? <div className="mt-3 rounded-xl bg-[#f0f1e9] p-3"><p className="jp text-sm leading-6">{sentence.text}</p><p className="mt-2 border-t border-[#dfe4da] pt-2 text-xs leading-5 text-[#647469]">{sentence.translation_vi || 'Chưa có bản dịch cho câu này.'}</p></div> : <p className="jp mt-3 text-base">読んで、気づいて、覚える。</p>}
            </div>

            {!sentence ? (
              <div className="p-5"><p className="text-xs leading-6 text-[#829087]">Chọn một câu trong bài đọc để xem từ vựng và điểm ngữ pháp tương ứng.</p><div className="mt-4 rounded-xl bg-[#eef0e8] p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-[#839084]">Mẹo đọc</p><p className="mt-2 text-xs leading-5 text-[#6f7d72]">Thử đọc một lượt không có furigana, sau đó bật lên để kiểm tra cách đọc.</p></div></div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1 border-b border-[#e9eae2] p-2">
                  <button onClick={() => setActiveTab('vocab')} className={`rounded-lg px-3 py-2.5 text-xs font-medium ${activeTab === 'vocab' ? 'bg-[#526e5b] text-white' : 'text-[#77857b] hover:bg-[#f0f1e9]'}`}>Từ vựng <span className="ml-1 opacity-70">{words.length}</span></button>
                  <button onClick={() => setActiveTab('grammar')} className={`rounded-lg px-3 py-2.5 text-xs font-medium ${activeTab === 'grammar' ? 'bg-[#526e5b] text-white' : 'text-[#77857b] hover:bg-[#f0f1e9]'}`}>Ngữ pháp <span className="ml-1 opacity-70">{sentence.grammar.length}</span></button>
                </div>

                {activeTab === 'vocab' ? (
                  <div className="p-4">
                    {words.length === 0 ? <p className="py-6 text-center text-xs text-[#8b978c]">Chưa có dữ liệu từ vựng cho câu này.</p> : <div className="max-h-64 space-y-1 overflow-y-auto pr-1">{words.map((token, index) => <button key={`${token.surface}-${index}`} onClick={() => setSelectedWord(token.surface)} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${selectedWord === token.surface ? 'bg-[#e8eee5]' : 'hover:bg-white'}`}><span className="min-w-0"><span className="jp text-sm">{token.surface}</span><span className="ml-2 text-[10px] text-[#8b978c]">{token.reading}</span></span><span className="shrink-0 rounded bg-[#f0f1e9] px-2 py-1 text-[9px] text-[#879287]">{token.pos}</span></button>)}</div>}
                    {selectedToken && <div className="mt-3 rounded-xl border border-[#e2e7de] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#8a968c]">Từ điển</p><p className="jp mt-1 text-lg">{selectedToken.dictionary_form}</p><p className="mt-1 text-xs text-[#7f8c82]">Cách đọc: <span className="jp">{selectedToken.reading}</span> · {selectedToken.pos}</p></div><button aria-label="Lưu từ" onClick={() => toggleSavedWord(selectedToken.surface)} className={`rounded-lg p-2 ${savedWords.includes(selectedToken.surface) ? 'bg-[#e5eee2] text-[#526e5b]' : 'bg-[#f3f4ef] text-[#89958b]'}`}><Bookmark size={15} fill={savedWords.includes(selectedToken.surface) ? 'currentColor' : 'none'} /></button></div><p className="mt-3 border-t border-[#edf0e9] pt-3 text-xs leading-5 text-[#647469]">{selectedToken.meaning}</p><p className="mt-2 text-[10px] text-[#94a096]">{savedWords.includes(selectedToken.surface) ? 'Đã lưu vào sổ từ' : 'Nhấn biểu tượng để lưu từ'}</p></div>}
                  </div>
                ) : (
                  <div className="max-h-[27rem] space-y-3 overflow-y-auto p-4">{sentence.grammar.length ? sentence.grammar.map((point, index) => <div key={`${point.pattern}-${index}`} className="rounded-xl border border-[#e6e9e0] bg-white p-4"><div className="flex items-start gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#e9eee5] text-[10px] font-medium text-[#617a65]">{index + 1}</span><div><p className="jp text-base text-[#344239]">{point.pattern}</p><p className="mt-2 text-xs leading-6 text-[#718076]">{point.explanation}</p></div></div></div>) : <p className="py-8 text-center text-xs leading-5 text-[#8b978c]">Câu này chưa có ghi chú ngữ pháp.</p>}</div>
                )}
              </>
            )}
          </aside>
        </div>

        <div className="mt-8 flex items-center gap-2 rounded-xl border border-[#e6e7de] bg-white/60 p-4 text-xs text-[#849087]"><Volume2 size={16} /> Nhấn biểu tượng dấu trang cạnh một từ để lưu vào sổ từ.</div>
      </div>
    </main>
  );
}

function RubyText({ text }: { text: string }) {
  const pieces = text.split(/([一-龯々]+)/g);
  return <>{pieces.map((piece, index) => /[一-龯々]/.test(piece) ? <ruby key={index}>{piece}<rt className="text-[10px] text-[#849087]">{reading[piece] || '　'}</rt></ruby> : <span key={index}>{piece}</span>)}</>;
}

const reading: Record<string, string> = { '春': 'はる', '公園': 'こうえん', '桜': 'さくら', '咲': 'さ', '始': 'はじ', '日本': 'にほん', '朝': 'あさ', '食': 'た', '町': 'まち', '図書館': 'としょかん', '新': 'あたら', '駅': 'えき', '近': 'ちか', '月': 'つき', '今月': 'こんげつ', '人': 'ひと', '花': 'はな', '写真': 'しゃしん', '子': 'こ', '本': 'ほん' };
