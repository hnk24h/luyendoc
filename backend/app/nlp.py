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

VIETNAMESE_MEANINGS = {
    "春": "mùa xuân", "公園": "công viên", "桜": "hoa anh đào", "咲く": "nở", "咲き始める": "bắt đầu nở", "始める": "bắt đầu",
    "なる": "trở nên", "人": "người", "たち": "nhóm; những người", "近い": "gần", "近く": "gần; khu vực gần đó", "花": "hoa",
    "見る": "nhìn; ngắm", "見ながら": "vừa ngắm vừa…", "ながら": "vừa… vừa…", "写真": "ảnh; bức ảnh", "撮る": "chụp", "撮っている": "đang chụp",
    "日本": "Nhật Bản", "朝": "buổi sáng", "朝ごはん": "bữa sáng", "朝ご飯": "bữa sáng", "ご飯": "cơm", "飯": "cơm", "みそ汁": "súp miso",
    "食べる": "ăn", "最近": "gần đây", "パン": "bánh mì", "増える": "tăng lên", "少しずつ": "từng chút một", "町": "thị trấn; khu phố",
    "図書館": "thư viện", "駅": "nhà ga", "近く": "gần; khu vực gần đó", "今月": "tháng này", "新しい": "mới", "リニューアル": "cải tạo; đổi mới",
    "子ども": "trẻ em", "子供": "trẻ em", "本": "sách", "読む": "đọc", "読める": "có thể đọc", "スペース": "không gian",
    "ある": "có; tồn tại", "いる": "có; ở; đang", "する": "làm", "ます": "đuôi lịch sự", "ました": "đuôi lịch sự ở quá khứ",
    "は": "trợ từ nêu chủ đề", "が": "trợ từ đánh dấu chủ thể", "も": "cũng", "に": "trợ từ chỉ thời điểm / đích đến",
    "を": "trợ từ đánh dấu đối tượng", "で": "ở; tại; bằng", "と": "và; với; khi", "の": "của", "から": "từ", "や": "và (liệt kê ví dụ)",
    "て": "nối các hành động", "です": "là; thì", "こと": "việc; điều", "今回": "lần này", "読むこと": "việc đọc",
}

def vocabulary_meaning(token: dict) -> str:
    return VIETNAMESE_MEANINGS.get(token.get("dictionary_form", ""), VIETNAMESE_MEANINGS.get(token.get("surface", ""), "Chưa có nghĩa tiếng Việt."))


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


GRAMMAR_REFERENCE = {
    "ています": {"structure": "Vて形 + います", "usage": "Diễn tả hành động đang diễn ra hoặc trạng thái còn tiếp tục.", "examples": [{"ja": "近くの人たちは写真を撮っています。", "vi": "Những người ở gần đó đang chụp ảnh."}]},
    "ていました": {"structure": "Vて形 + いました", "usage": "Diễn tả một hành động đang diễn ra hoặc trạng thái trong một thời điểm quá khứ.", "examples": [{"ja": "写真を撮っていました。", "vi": "Đang chụp ảnh (vào lúc đó)."}]},
    "ました": {"structure": "Vます bỏ ます + ました", "usage": "Diễn tả hành động đã xảy ra trong quá khứ ở thể lịch sự.", "examples": [{"ja": "図書館が新しくなりました。", "vi": "Thư viện đã trở nên mới hơn."}]},
    "になると": {"structure": "N / な-adj + になると", "usage": "Diễn tả sự thay đổi hoặc điều thường xảy ra khi một thời điểm hay điều kiện bắt đầu.", "examples": [{"ja": "春になると、桜が咲きます。", "vi": "Khi mùa xuân đến, hoa anh đào nở."}]},
    "が": {"structure": "N + が + vị ngữ", "usage": "Đánh dấu chủ thể hoặc thông tin mới được giới thiệu trong câu.", "examples": [{"ja": "公園の桜が咲き始めます。", "vi": "Hoa anh đào trong công viên bắt đầu nở."}]},
    "は": {"structure": "N + は + phần nhận xét", "usage": "Đánh dấu chủ đề mà người nói muốn đưa ra nhận xét.", "examples": [{"ja": "日本では、ご飯を食べます。", "vi": "Ở Nhật Bản, người ta ăn cơm."}]},
    "も": {"structure": "N + も", "usage": "Đánh dấu sự bổ sung với nghĩa “cũng”, cho biết điều này tương tự hoặc thêm vào điều đã nói.", "examples": [{"ja": "パンを食べる人も増えています。", "vi": "Số người ăn bánh mì cũng đang tăng lên."}]},
    "始める": {"structure": "Vます bỏ ます + 始める", "usage": "Đặt sau thân động từ để diễn tả một hành động bắt đầu.", "examples": [{"ja": "桜が咲き始めます。", "vi": "Hoa anh đào bắt đầu nở."}]},
    "文の構成": {"structure": "Chủ đề / chủ thể + thông tin chính", "usage": "Quan sát trợ từ và vị trí động từ để nhận biết quan hệ giữa các thành phần trong câu.", "examples": [{"ja": "日本では、朝ごはんを食べます。", "vi": "Ở Nhật Bản, người ta ăn sáng."}]},
}

def grammar_details(pattern: str) -> dict:
    return GRAMMAR_REFERENCE.get(pattern, {
        "structure": pattern,
        "usage": "Quan sát cách mẫu này kết nối với từ đứng trước và sau trong câu.",
        "examples": [],
    })

# Demo rule explanations; replace with a reviewed content/LLM pipeline for production.
def analyze_text(text:str):
    output=[]
    for sentence in filter(None,re.split(r'(?<=[。！？])',text)):
        tokens=[]
        if _tokenizer:
            for m in _tokenizer.tokenize(sentence):
                pos=m.part_of_speech(); tokens.append({"surface":m.surface(),"reading":m.reading_form(),"dictionary_form":m.dictionary_form(),"pos":pos[0] if pos else "その他","meaning":""})
        else:
            for word in re.findall(r'[一-龯々ぁ-んァ-ヶー]+|[、。！？]',sentence):
                tokens.append({"surface":word,"reading":word,"dictionary_form":word,"pos":"語句","meaning":""})
        grammar=[]
        patterns = [
            ("ていました", "過去のある時点で進行していた動作や状態を表します。", "ていました"),
            ("ています", "進行中の動作や現在の状態を表します。", "ています"),
            ("ました", "過去に起きたことを表す丁寧な形です。", "ました"),
            ("になると", "ある時期・条件をきっかけにした変化を表します。", "になると"),
            ("始める", "動作の開始を表します。", "始め"),
            ("が", "主語や新しい情報を示します。", "が"),
            ("は", "話題を示します。", "は"),
            ("も", "同じことが当てはまることを表します。", "も"),
        ]
        for pattern, description, needle in patterns:
            if needle in sentence and not (pattern == "ました" and "ていました" in sentence):
                grammar.append({"pattern":pattern,"explanation":description,**grammar_details(pattern)})
        output.append({"text":sentence,"translation_vi":translate_to_vietnamese(sentence),"tokens":tokens,"grammar":grammar or [{"pattern":"文の構成","explanation":"語順と助詞に注目して読んでみましょう。",**grammar_details("文の構成")}]})
    return output
