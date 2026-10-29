'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Bookmark, Headphones, Volume2 } from 'lucide-react';
import { getArticle } from '@/lib/data';
import { KanjiStrokeViewer } from '@/components/kanji-stroke-viewer';
import type { Article } from '@/lib/data';

type StudyTab = 'vocab' | 'grammar';
type Token = NonNullable<Article['sentences']>[number]['tokens'][number];
type GrammarPoint = NonNullable<Article['sentences']>[number]['grammar'][number];

export default function Reader() {
  const params = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [showRuby, setShowRuby] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [activeSentence, setActiveSentence] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<StudyTab>('vocab');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedGrammar, setSelectedGrammar] = useState<GrammarPoint | null>(null);
  const [selectedKanji, setSelectedKanji] = useState('');
  const [savedWords, setSavedWords] = useState<string[]>([]);

  useEffect(() => {
    getArticle(params.id).then(setArticle);
  }, [params.id]);

  const sentences = article?.sentences ?? [];
  const sentence = activeSentence === null ? null : sentences[activeSentence];
  const words = useMemo(() => {
    if (!sentence) return [];
    const unique = new Map<string, Token>();
    sentence.tokens.forEach((token) => {
      if (/^[、。！？,.!?]+$/.test(token.surface)) return;
      unique.set(`${token.surface}:${token.dictionary_form}`, token);
    });
    return [...unique.values()];
  }, [sentence]);
  const kanji = selectedToken ? [...new Set(Array.from(selectedToken.dictionary_form).filter((char) => /\p{Script=Han}/u.test(char)))] : [];
  const kanjiInfo = selectedKanji ? kanjiDetails[selectedKanji] : undefined;

  if (!article) return <main className="grid min-h-dvh place-items-center text-sm text-[#7d8b80]">Loading story…</main>;

  function chooseSentence(index: number) {
    setActiveSentence(index);
    setActiveTab('vocab');
    setSelectedToken(null);
    setSelectedGrammar(null);
    setSelectedKanji('');
  }

  function chooseWord(token: Token) {
    setActiveTab('vocab');
    setSelectedGrammar(null);
    setSelectedToken(token);
    const chars = Array.from(token.dictionary_form).filter((char) => /\p{Script=Han}/u.test(char));
    setSelectedKanji(chars[0] ?? '');
  }

  function toggleSavedWord(word: string) {
    setSavedWords((current) => current.includes(word) ? current.filter((item) => item !== word) : [...current, word]);
  }

  return (
    <main className="min-h-dvh bg-[#f6f5ef] text-[#25332e]">
      <header className="flex h-14 items-center justify-between border-b border-[#e5e6dc] bg-[#fbfaf6] px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm text-[#718076]"><ArrowLeft size={16} /> Thư viện</Link>
        <span className="font-semibold">ことば <span className="ml-1 text-[10px] font-normal tracking-widest text-[#849087]">KOTOBA READER</span></span>
        <div className="w-20" />
      </header>

      <div className="grid min-h-[calc(100dvh-56px)] lg:h-[calc(100dvh-56px)] lg:min-h-0 lg:grid-cols-[minmax(0,3fr)_minmax(190px,1fr)_minmax(190px,1fr)]">
        <section className="flex min-h-[65dvh] min-w-0 flex-col border-b border-[#e5e6dc] lg:min-h-0 lg:border-b-0 lg:border-r" aria-label="Bài đọc">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e6dc] px-5 py-4 sm:px-8">
            <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.17em] text-[#849187]">{article.level} · 4 phút · {new Date(article.published_at).toLocaleDateString('vi-VN')}</p><h1 className="jp mt-1 truncate text-xl sm:text-2xl">{article.title}</h1></div>
            <div className="flex shrink-0 items-center gap-2"><button onClick={() => setShowRuby(!showRuby)} className={`rounded-full px-3 py-2 text-[11px] ${showRuby ? 'bg-[#526e5b] text-white' : 'bg-white text-[#68776b]'}`}>{showRuby ? 'ふりがな ON' : 'ふりがな OFF'}</button><button onClick={() => setShowTranslation(!showTranslation)} className={`rounded-full px-3 py-2 text-[11px] ${showTranslation ? 'bg-[#e1e9df] text-[#526e5b]' : 'bg-white text-[#68776b]'}`}>{showTranslation ? 'VI bật' : 'VI tắt'}</button><button aria-label="Nghe bài đọc" onClick={() => { const utterance = new SpeechSynthesisUtterance(article.body); utterance.lang = 'ja-JP'; speechSynthesis.speak(utterance); }} className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#68776b]"><Headphones size={14} /></button></div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
            <div className="mx-auto max-w-4xl space-y-3">
              {sentences.map((item, index) => <button key={index} onClick={() => chooseSentence(index)} className={`jp block w-full rounded-2xl px-4 py-4 text-left text-lg leading-[2.2] transition sm:px-6 sm:text-[21px] ${activeSentence === index ? 'bg-[#e9eee5] ring-1 ring-[#dce5d9]' : 'hover:bg-white/70'}`}>
                {showRuby ? <RubyText text={item.text} /> : item.text}<span className="ml-3 align-middle text-[10px] text-[#9ca79c]">{String(index + 1).padStart(2, '0')}</span>
                {showTranslation && <span className="mt-2 block border-t border-[#e8ebe3] pt-3 font-sans text-sm leading-6 text-[#758378]"><span className="mr-2 rounded bg-[#eef0e8] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#7a897d]">VI</span>{item.translation_vi || 'Chưa có bản dịch cho câu này.'}</span>}
              </button>)}
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-[#e5e6dc] px-5 py-3 text-[11px] text-[#849087] sm:px-8"><Volume2 size={14} /> Chọn câu để xem từ vựng và ngữ pháp.</div>
        </section>

        <section className="flex min-h-[420px] min-w-0 flex-col border-b border-[#e5e6dc] bg-[#f9f8f3] lg:min-h-0 lg:border-b-0 lg:border-r" aria-label="Từ vựng và ngữ pháp">
          <div className="border-b border-[#e5e6dc] px-4 py-4"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#849187]">Khu vực học</p>{sentence ? <p className="jp mt-2 line-clamp-2 text-sm leading-6">{sentence.text}</p> : <p className="mt-2 text-xs text-[#99a39a]">Chọn một câu trong bài đọc</p>}</div>
          <div className="grid grid-cols-2 gap-1 border-b border-[#e5e6dc] p-2"><button onClick={() => setActiveTab('vocab')} className={`rounded-lg px-2 py-3 text-xs font-medium ${activeTab === 'vocab' ? 'bg-[#526e5b] text-white' : 'text-[#77857b] hover:bg-white'}`}>Từ vựng <span className="ml-1 opacity-70">{words.length}</span></button><button onClick={() => setActiveTab('grammar')} className={`rounded-lg px-2 py-3 text-xs font-medium ${activeTab === 'grammar' ? 'bg-[#526e5b] text-white' : 'text-[#77857b] hover:bg-white'}`}>Ngữ pháp <span className="ml-1 opacity-70">{sentence?.grammar.length ?? 0}</span></button></div>
          {!sentence ? <div className="p-5 text-xs leading-6 text-[#929c92]">Các mục học tập sẽ hiện theo câu bạn chọn.</div> : activeTab === 'vocab' ? <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3"><p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[.12em] text-[#99a39a]">Từ · cách đọc · nghĩa tiếng Việt</p>{words.length ? <div className="space-y-1">{words.map((token, index) => <button key={`${token.surface}-${index}`} onClick={() => chooseWord(token)} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left transition ${selectedToken?.surface === token.surface ? 'bg-[#e5ece2] ring-1 ring-[#dce5d9]' : 'hover:bg-white'}`}><span className="min-w-0 flex-1"><span className="jp text-sm">{token.surface}</span><span className="ml-1.5 block truncate text-[10px] text-[#8b978c]">{token.reading}</span></span><span className="flex max-w-[55%] min-w-0 flex-col items-end gap-1"><span title={token.meaning} className="line-clamp-2 text-right text-[11px] font-medium leading-4 text-[#526e5b]">{token.meaning || 'Chưa có trong từ điển mẫu.'}</span><span className="shrink-0 rounded bg-[#f0f1e9] px-2 py-1 text-[9px] text-[#879287]">{token.pos}</span></span></button>)}</div> : <p className="p-3 text-xs text-[#929c92]">Câu này chưa có dữ liệu từ vựng.</p>}</div> : <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">{sentence.grammar.length ? sentence.grammar.map((point, index) => <button key={`${point.pattern}-${index}`} onClick={() => { setSelectedGrammar(point); setSelectedToken(null); setSelectedKanji(''); }} className={`w-full rounded-xl border p-3 text-left transition ${selectedGrammar?.pattern === point.pattern ? 'border-[#cbd9c9] bg-[#e9eee5]' : 'border-[#e6e9e0] bg-white hover:bg-[#f5f6f1]'}`}><div className="flex items-start gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e9eee5] text-[9px] font-medium text-[#617a65]">{index + 1}</span><div><p className="jp text-sm text-[#344239]">{point.pattern}</p><p className="mt-2 text-[11px] leading-5 text-[#718076]">{point.explanation}</p></div></div></button>) : <p className="p-3 text-xs text-[#929c92]">Câu này chưa có ghi chú ngữ pháp.</p>}</div>}
        </section>

        <section className="flex min-h-[360px] min-w-0 flex-col bg-[#fbfaf6] lg:min-h-0" aria-label={activeTab === 'grammar' ? 'Chi tiết ngữ pháp' : 'Thông tin Kanji'}>
          <div className="border-b border-[#e5e6dc] px-4 py-4"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#849187]">{activeTab === 'grammar' ? 'Mẫu ngữ pháp' : 'Kanji của từ'}</p><p className="mt-2 text-xs text-[#929c92]">{activeTab === 'grammar' ? 'Chọn một mẫu để xem cấu trúc và ví dụ' : 'Chọn một từ vựng để xem cách viết'}</p></div>
          {activeTab === 'grammar' ? selectedGrammar ? <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5"><div className="rounded-2xl bg-[#f0f1e9] p-5"><p className="text-[9px] font-semibold uppercase tracking-[.17em] text-[#849087]">Mẫu được chọn</p><h2 className="jp mt-2 text-3xl text-[#344239]">{selectedGrammar.pattern}</h2><p className="mt-3 text-sm leading-6 text-[#647469]">{selectedGrammar.explanation}</p></div><div className="mt-4 rounded-xl border border-[#e6e9e0] bg-white p-4"><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#8a968c]">Cấu trúc</p><p className="jp mt-2 text-base leading-7 text-[#344239]">{selectedGrammar.structure || selectedGrammar.pattern}</p></div><div className="mt-3 rounded-xl border border-[#e6e9e0] bg-white p-4"><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#8a968c]">Cách dùng</p><p className="mt-2 text-xs leading-6 text-[#718076]">{selectedGrammar.usage || selectedGrammar.explanation}</p></div><div className="mt-4"><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#8a968c]">Mẫu câu ví dụ</p>{selectedGrammar.examples?.length ? selectedGrammar.examples.map((example, index) => <div key={`${example.ja}-${index}`} className="mt-2 rounded-xl border border-[#e6e9e0] bg-white p-4"><p className="jp text-base leading-8 text-[#344239]"><RubyText text={example.ja} /></p><p className="mt-2 border-t border-[#edf0e9] pt-2 text-xs leading-5 text-[#718076]">{example.vi}</p></div>) : <p className="mt-2 rounded-xl bg-white p-4 text-xs leading-5 text-[#89958b]">Chưa có câu ví dụ cho mẫu này.</p>}</div></div> : <div className="grid flex-1 place-items-center p-6 text-center"><div><span className="jp text-4xl text-[#d4dacf]">文型</span><p className="mt-3 text-xs leading-5 text-[#929c92]">Chọn một mẫu ngữ pháp ở cột giữa để xem cấu trúc, cách dùng và ví dụ.</p></div></div> : !selectedToken ? <div className="grid flex-1 place-items-center p-6 text-center"><div><span className="jp text-5xl text-[#d4dacf]">漢字</span><p className="mt-4 text-xs leading-5 text-[#929c92]">Thông tin chữ Kanji liên quan sẽ hiện tại đây.</p></div></div> : kanji.length === 0 ? <div className="p-5"><div className="rounded-xl bg-[#f0f1e9] p-4"><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#8a968c]">Từ đã chọn</p><p className="jp mt-2 text-3xl">{selectedToken.dictionary_form}</p><p className="mt-2 text-xs text-[#718076]">Cách đọc: <span className="jp">{selectedToken.reading}</span></p><p className="mt-3 border-t border-[#dfe4da] pt-3 text-xs leading-5 text-[#647469]">Từ này không có Kanji.</p></div></div> : <>
            <div className="flex gap-1 overflow-x-auto border-b border-[#e5e6dc] p-2">{kanji.map((char, index) => <button key={`${char}-${index}`} onClick={() => setSelectedKanji(char)} className={`grid h-10 min-w-10 place-items-center rounded-lg px-3 text-lg ${selectedKanji === char ? 'bg-[#526e5b] text-white' : 'bg-[#f0f1e9] text-[#68776b] hover:bg-[#e7ebe2]'}`} aria-label={`Xem chữ ${char}`}>{char}</button>)}</div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5"><div className="rounded-2xl bg-[#f0f1e9] px-4 py-6 text-center"><p className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#849087]">Kanji · {kanji.indexOf(selectedKanji) + 1}/{kanji.length}</p><p className="jp mt-3 text-7xl leading-none text-[#344239]">{selectedKanji}</p><p className="jp mt-3 text-sm text-[#718076]">{kanjiInfo?.reading || selectedToken.reading}</p></div>
              <KanjiStrokeViewer character={selectedKanji} />
              <div className="mt-4"><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#8a968c]">Từ liên quan</p><p className="jp mt-1 text-xl">{selectedToken.dictionary_form}</p><p className="mt-1 text-[11px] text-[#7f8c82]">{selectedToken.pos} · {selectedToken.reading}</p><p className="mt-3 text-xs leading-5 text-[#647469]">{selectedToken.meaning}</p></div>
              <div className="mt-4 rounded-xl border border-[#e6e9e0] bg-white p-3"><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#8a968c]">Thông tin chữ</p><p className="mt-2 text-xs leading-5 text-[#718076]">{kanjiInfo?.meaning || 'Tra cứu chữ Kanji trong từ đang học.'}</p>{kanjiInfo?.strokes && <p className="mt-2 text-[10px] text-[#929c92]">Số nét: {kanjiInfo.strokes}</p>}</div>
              <button onClick={() => toggleSavedWord(selectedToken.surface)} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs ${savedWords.includes(selectedToken.surface) ? 'bg-[#e5ece2] text-[#526e5b]' : 'bg-[#526e5b] text-white hover:bg-[#425d4b]'}`}><Bookmark size={14} fill={savedWords.includes(selectedToken.surface) ? 'currentColor' : 'none'} />{savedWords.includes(selectedToken.surface) ? 'Đã lưu từ này' : 'Lưu từ vào sổ'}</button>
            </div>
          </>}
        </section>
      </div>
    </main>
  );
}

function RubyText({ text }: { text: string }) {
  const pieces = text.split(/([一-龯々]+)/g);
  return <>{pieces.map((piece, index) => /[一-龯々]/.test(piece) ? <ruby key={index}>{piece}<rt className="text-[10px] text-[#849087]">{reading[piece] || '　'}</rt></ruby> : <span key={index}>{piece}</span>)}</>;
}

const reading: Record<string, string> = { '春': 'はる', '公園': 'こうえん', '桜': 'さくら', '咲': 'さ', '始': 'はじ', '日本': 'にほん', '朝': 'あさ', '食': 'た', '町': 'まち', '図書館': 'としょかん', '新': 'あたら', '駅': 'えき', '近': 'ちか', '月': 'つき', '今月': 'こんげつ', '人': 'ひと', '花': 'はな', '写真': 'しゃしん', '撮': 'と', '飯': 'はん', '子': 'こ', '本': 'ほん' };

const kanjiDetails: Record<string, { reading: string; meaning: string; strokes: number }> = {
  '春': { reading: 'しゅん・はる', meaning: 'Mùa xuân', strokes: 9 },
  '桜': { reading: 'おう・さくら', meaning: 'Hoa anh đào', strokes: 10 },
  '咲': { reading: 'さく', meaning: 'Nở (hoa)', strokes: 9 },
  '始': { reading: 'し・はじめる', meaning: 'Bắt đầu', strokes: 8 },
  '公': { reading: 'こう・おおやけ', meaning: 'Công cộng', strokes: 4 },
  '園': { reading: 'えん・その', meaning: 'Khu vườn, công viên', strokes: 13 },
  '日': { reading: 'にち・ひ', meaning: 'Ngày, mặt trời', strokes: 4 },
  '本': { reading: 'ほん・もと', meaning: 'Sách, gốc', strokes: 5 },
  '朝': { reading: 'ちょう・あさ', meaning: 'Buổi sáng', strokes: 12 },
  '食': { reading: 'しょく・たべる', meaning: 'Ăn, thức ăn', strokes: 9 },
  '町': { reading: 'ちょう・まち', meaning: 'Thị trấn, khu phố', strokes: 7 },
  '図': { reading: 'ず・と', meaning: 'Bản vẽ, sơ đồ', strokes: 7 },
  '書': { reading: 'しょ・かく', meaning: 'Viết, sách', strokes: 10 },
  '館': { reading: 'かん・やかた', meaning: 'Tòa nhà, hội quán', strokes: 16 },
  '新': { reading: 'しん・あたらしい', meaning: 'Mới', strokes: 13 },
  '駅': { reading: 'えき', meaning: 'Nhà ga', strokes: 14 },
  '近': { reading: 'きん・ちかい', meaning: 'Gần', strokes: 7 },
  '月': { reading: 'げつ・つき', meaning: 'Tháng, mặt trăng', strokes: 4 },
  '人': { reading: 'じん・ひと', meaning: 'Người', strokes: 2 },
  '花': { reading: 'か・はな', meaning: 'Hoa', strokes: 7 },
  '写': { reading: 'しゃ・うつす', meaning: 'Chụp, sao chép', strokes: 5 },
  '真': { reading: 'しん・ま', meaning: 'Thật, chính xác', strokes: 10 },
  '子': { reading: 'し・こ', meaning: 'Trẻ em, con', strokes: 3 },
};
