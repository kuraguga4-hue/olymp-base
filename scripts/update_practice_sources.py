"""Подписи источников в существующих подборках, без изменения задач и подсказок.

python scripts/update_practice_sources.py --refresh  # названия из официальных источников
python scripts/update_practice_sources.py            # обновить подписи из сохранённых данных
python scripts/update_practice_sources.py --check    # проверить без записи и без сети
"""
import argparse
import html
import json
import pathlib
import re
import sys

import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
PRACTICE = ROOT / "docs" / "practice"
CACHE = ROOT / "data" / "practice_sources.json"
CF_API = "https://codeforces.com/api/contest.list?gym=false"
ATCODER_DIFFICULTY = {
    "source": "https://kenkoooo.com/atcoder/resources/problem-models.json",
    "formula": "max(800, min(3500, round((0.75 * difficulty + 750) / 100) * 100))",
    "method_commit": "b96dcb6",
    "official_cf_rating": False,
}
LINK = re.compile(r"\[[^\]]+\]\((https://(?:codeforces\.com|atcoder\.jp)/[^)]+)\)")
SOURCE = re.compile(r'<br><span class="ob-note ob-source">.*?</span>')


def problem_source(url):
    cf = re.fullmatch(
        r"https://codeforces\.com/(?:problemset/problem/(\d+)/([A-Za-z]\d?)|contest/(\d+)/problem/([A-Za-z]\d?))/?",
        url,
    )
    if cf:
        return "cf:" + (cf[1] or cf[3]), (cf[2] or cf[4]).upper()
    atcoder = re.fullmatch(r"https://atcoder\.jp/contests/([a-z0-9_-]+)/tasks/\1_([a-z0-9]+)", url)
    if atcoder:
        return "atcoder:" + atcoder[1], atcoder[2].upper()
    raise ValueError(f"Неизвестный формат ссылки: {url}")


def table_links(text):
    for line in text.splitlines():
        if line.startswith("|"):
            yield from LINK.finditer(line)


def refresh(pages):
    keys = {problem_source(m[1])[0] for text in pages.values() for m in table_links(text)}
    response = requests.get(CF_API, timeout=30)
    response.raise_for_status()
    payload = response.json()
    if payload.get("status") != "OK":
        raise ValueError("Codeforces не вернул список соревнований")
    contests = {f"cf:{c['id']}": c for c in payload["result"]}
    sources = {}
    for key in sorted(keys):
        if key.startswith("cf:"):
            contest = contests[key]  # без догадок, если в официальном списке нет такого ID
            sources[key] = {"name": contest["name"], "url": f"https://codeforces.com/contest/{contest['id']}"}
        else:
            slug = key.split(":", 1)[1]
            url = f"https://atcoder.jp/contests/{slug}"
            response = requests.get(url + "/tasks?lang=en", timeout=30)
            response.raise_for_status()
            title = re.search(r"<title>Tasks - (.*?)</title>", response.text, re.S)
            if not title:
                raise ValueError(f"Не найдено официальное название: {url}")
            sources[key] = {"name": html.unescape(title[1].strip()), "url": url}
    return {"codeforces_source": CF_API, "contests": sources, "atcoder_difficulty": ATCODER_DIFFICULTY}


def annotate(text, sources):
    lines = []
    for line in text.splitlines():
        if not line.startswith("|"):
            lines.append(line)
            continue
        line = SOURCE.sub("", line)
        matches = list(LINK.finditer(line))
        if not matches:
            lines.append(line)
            continue
        if len(matches) != 1:
            raise ValueError("В строке таблицы должна быть одна ссылка на задачу")
        match = matches[0]
        key, index = problem_source(match[1])
        contest = sources[key]
        caption = (
            '<br><span class="ob-note ob-source">'
            f'<a href="{html.escape(contest["url"], quote=True)}">{html.escape(contest["name"]).replace("|", "&#124;")}</a>'
            f" · задача {index}</span>"
        )
        line = line[:match.end()] + caption + line[match.end():]
        # AtCoder не публикует рейтинг задач по шкале CF. Числа в CSV — приближённый пересчёт.
        if key.startswith("atcoder:"):
            cells = line.split("|")
            cells[3] = " ≈ " + cells[3].strip().lstrip("≈").strip() + " "
            line = "|".join(cells)
        lines.append(line)
    return "\n".join(lines) + "\n"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="Обновить названия по официальным источникам")
    parser.add_argument("--check", action="store_true", help="Проверить без записи и без сети")
    args = parser.parse_args()
    if args.check and args.refresh:
        parser.error("--check и --refresh несовместимы")
    pages = {p: p.read_text(encoding="utf-8") for p in sorted(PRACTICE.glob("*.md"))}
    data = refresh(pages) if args.refresh else json.loads(CACHE.read_text(encoding="utf-8"))
    updated = {p: annotate(text, data["contests"]) for p, text in pages.items()}
    changed = [p for p in pages if pages[p] != updated[p]]
    if args.check:
        for path in changed:
            print(f"НЕТ подписи или подпись устарела: {path.relative_to(ROOT)}")
        print(f"{'RED' if changed else 'GREEN'}: источники {sum(1 for text in pages.values() for _ in table_links(text))} задач")
        return int(bool(changed))
    if args.refresh:
        CACHE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for path in changed:
        path.write_text(updated[path], encoding="utf-8")
    print(f"Обновлено подборок: {len(changed)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
