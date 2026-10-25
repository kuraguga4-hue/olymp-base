"""Собрать каталог рекомендаций из проверенного кэша CF и материалов сайта.

Запускать после обновления data/cf_problems.json, статей или подборок:
    python scripts/build_progress_catalog.py
Ничего не скачивает. Обычные задачи — из кэша CF, Gym — из таблицы команды.
"""
import csv
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
LINK = re.compile(r"codeforces\.com/(?:problemset/problem/(\d+)/([A-Za-z0-9]+)|(?:contest|gym)/(\d+)/problem/([A-Za-z0-9]+))")


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
    known = {(p["contestId"], p["index"]) for p in catalog}
    with (ROOT / "data/problems.csv").open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            gym = re.fullmatch(r"https://codeforces\.com/gym/(\d+)/problem/([A-Za-z0-9]+)", row["Ссылка"].strip())
            rating = row["Сложность"].strip()
            if not gym or not rating.isdigit() or (int(gym[1]), gym[2]) in known:
                continue
            catalog.append({"contestId": int(gym[1]), "index": gym[2].upper(), "name": row["Название"],
                            "rating": int(rating), "tags": [], "gym": True, "estimated": True})
            known.add((int(gym[1]), gym[2].upper()))
    topics = {}
    for topic in json.loads((ROOT / "docs/assets/topics.json").read_text(encoding="utf-8")):
        slug = topic["slug"]
        article = (ROOT / "docs/theory" / f"{slug}.md").read_text(encoding="utf-8")
        practice = (ROOT / "docs/practice" / f"{slug}.md").read_text(encoding="utf-8")
        keys = sorted({f"{m[1] or m[3]}/{(m[2] or m[4]).upper()}" for m in LINK.finditer(practice)})
        topics[slug] = {"ready": "<!-- ЗАГОТОВКА" not in article and "## Зачем это нужно" in article, "keys": keys}
    output = ROOT / "docs/assets/progress-catalog.json"
    output.write_text(json.dumps({"problems": catalog, "topics": topics}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Catalog: {len(catalog)} problems with rating/estimate, {len(topics)} topics; {output.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
