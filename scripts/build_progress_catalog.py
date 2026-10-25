"""Собрать каталог рекомендаций из проверенного кэша CF и материалов сайта.

Запускать после обновления data/cf_problems.json, статей или подборок:
    python scripts/build_progress_catalog.py
Ничего не скачивает. Ссылки берутся только из локального списка Codeforces.
"""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
LINK = re.compile(r"codeforces\.com/(?:problemset/problem/(\d+)/([A-Za-z]\d?)|contest/(\d+)/problem/([A-Za-z]\d?))")


def main():
    source = ROOT / "data/cf_problems.json"
    problems = json.loads(source.read_text(encoding="utf-8"))
    catalog = []
    for problem in problems:
        if not isinstance(problem.get("rating"), int) or "contestId" not in problem:
            continue
        if problem.get("type") != "PROGRAMMING" or "interactive" in problem.get("tags", []):
            continue
        catalog.append({key: problem[key] for key in ("contestId", "index", "name", "rating", "tags")})
    topics = {}
    for topic in json.loads((ROOT / "docs/assets/topics.json").read_text(encoding="utf-8")):
        slug = topic["slug"]
        article = (ROOT / "docs/theory" / f"{slug}.md").read_text(encoding="utf-8")
        practice = (ROOT / "docs/practice" / f"{slug}.md").read_text(encoding="utf-8")
        keys = sorted({f"{m[1] or m[3]}/{(m[2] or m[4]).upper()}" for m in LINK.finditer(practice)})
        topics[slug] = {"ready": "<!-- ЗАГОТОВКА" not in article and "## Зачем это нужно" in article, "keys": keys}
    output = ROOT / "docs/assets/progress-catalog.json"
    output.write_text(json.dumps({"problems": catalog, "topics": topics}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Catalog: {len(catalog)} rated problems, {len(topics)} topics; {output.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
