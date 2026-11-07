import os
import time
import urllib.parse
import requests

INPUT_FILE = "words.txt"
OUTPUT_DIR = "audio"

# type=1 英式发音, type=2 美式发音
VOICE_TYPE = 2
BASE_URL = "https://dict.youdao.com/dictvoice"

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        # 去空行、去首尾空白
        words = [line.strip() for line in f if line.strip()]

    # 去重但保持顺序
    seen = set()
    words = [w for w in words if not (w in seen or seen.add(w))]

    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0 Safari/537.36"
        )
    })

    total = len(words)
    ok, skip, fail = 0, 0, []

    for i, word in enumerate(words, 1):
        # 文件名：防止单词里出现非法字符（如短语含 / 等）
        safe_name = "".join(c if c not in r'\/:*?"<>|' else "_" for c in word)
        file_path = os.path.join(OUTPUT_DIR, f"{safe_name}.mp3")

        if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
            print(f"[{i}/{total}] 已存在，跳过: {word}")
            skip += 1
            continue

        params = {"type": VOICE_TYPE, "audio": word}
        url = f"{BASE_URL}?{urllib.parse.urlencode(params)}"

        try:
            resp = session.get(url, timeout=15)
            resp.raise_for_status()

            # 有道有时返回空内容或错误页，检查一下
            content_type = resp.headers.get("Content-Type", "")
            if "audio" not in content_type and len(resp.content) < 500:
                print(f"[{i}/{total}] 失败（可能无此词）: {word}")
                fail.append(word)
                continue

            with open(file_path, "wb") as fp:
                fp.write(resp.content)

            print(f"[{i}/{total}] 下载成功: {word} -> {file_path}")
            ok += 1

        except Exception as e:
            print(f"[{i}/{total}] 出错: {word} - {e}")
            fail.append(word)

        # 温和限速，避免被封
        time.sleep(0.3)

    print("\n===== 完成 =====")
    print(f"成功: {ok}  跳过: {skip}  失败: {len(fail)}")
    if fail:
        print("失败的单词:", ", ".join(fail))

if __name__ == "__main__":
    main()