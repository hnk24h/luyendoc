import os
import re
import httpx
try:
    from sudachipy import Dictionary
    _tokenizer=Dictionary().create()
except Exception:
    _tokenizer=None
# Sample translations keep the demo useful without an external translation service.
SAMPLE_TRANSLATIONS = {
    "春になると、公園の桜が少しずつ咲き始めます。": "Khi mùa xuân đến, hoa anh đào trong công viên bắt đầu nở từng chút một.",
    "近くの人たちは、花を見ながら写真を撮っていました。": "Những người ở gần đó vừa ngắm hoa vừa chụp ảnh.",
    "日本では、朝ごはんにご飯やみそ汁を食べる人がいます。": "Ở Nhật Bản, có người ăn cơm và súp miso vào bữa sáng.",
    "最近はパンを食べる人も増えています。": "Gần đây, số người ăn bánh mì cũng đang tăng lên.",
    "駅の近くにある図書館が、今月リニューアルしました。": "Thư viện gần nhà ga đã được cải tạo trong tháng này.",
    "新しい図書館には、子どもが本を読めるスペースもあります。": "Thư viện mới cũng có không gian để trẻ em đọc sách.",
}

def translate_to_vietnamese(sentence: str) -> str:
    endpoint = os.getenv("LIBRETRANSLATE_URL")
    if endpoint:
        payload = {"q": sentence, "source": "ja", "target": "vi", "format": "text"}
        api_key = os.getenv("LIBRETRANSLATE_API_KEY")
        if api_key:
            payload["api_key"] = api_key
        try:
            response = httpx.post(endpoint.rstrip("/") + "/translate", json=payload, timeout=15)
            response.raise_for_status()
            return response.json()["translatedText"]
        except (httpx.HTTPError, KeyError, ValueError):
            pass
    return SAMPLE_TRANSLATIONS.get(sentence.strip(), "Bản dịch tiếng Việt chưa được cấu hình cho câu này.")

# Demo rule explanations; replace with a reviewed content/LLM pipeline for production.
def analyze_text(text:str):
    output=[]
    for sentence in filter(None,re.split(r'(?<=[。！？])',text)):
        tokens=[]
        if _tokenizer:
            for m in _tokenizer.tokenize(sentence):
                pos=m.part_of_speech(); tokens.append({"surface":m.surface(),"reading":m.reading_form(),"dictionary_form":m.dictionary_form(),"pos":pos[0] if pos else "その他","meaning":"辞書データ未接続"})
        else:
            for word in re.findall(r'[一-龯々ぁ-んァ-ヶー]+|[、。！？]',sentence):
                tokens.append({"surface":word,"reading":word,"dictionary_form":word,"pos":"語句","meaning":"辞書データ未接続"})
        grammar=[]
        for pattern,description in [("ています","進行中の動作や現在の状態を表します。"),("ました","過去に起きたことを表す丁寧な形です。"),("になると","ある時期・条件をきっかけにした変化を表します。"),("が","主語や新しい情報を示します。"),("は","話題を示します。"),("も","同じことが当てはまることを表します。")]:
            if pattern in sentence: grammar.append({"pattern":pattern,"explanation":description})
        output.append({"text":sentence,"translation_vi":translate_to_vietnamese(sentence),"tokens":tokens,"grammar":grammar or [{"pattern":"文の構成","explanation":"語順と助詞に注目して読んでみましょう。"}]})
    return output
