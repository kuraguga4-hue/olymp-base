"""Проверки перед push: ссылки на Codeforces существуют, у статей есть все разделы.

Запуск: python scripts/check.py — в конце печатает GREEN или RED.
"""
import json
import pathlib
import re
import sys
import time

import requests

sys.stdout.reconfigure(encoding="utf-8")

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
CACHE = ROOT / "data" / "cf_problems.json"
API = "https://codeforces.com/api"
PLACEHOLDER = "<!-- ЗАГОТОВКА"
SECTIONS = [
    "Зачем это нужно",
    "Идея на пальцах",
    "Алгоритм",
    "Код",
    "Решаем задачу",
    "Типичные ошибки",
    "Практика",
    "Куда дальше",
]
LINK = re.compile(
    r"codeforces\.com/(?:problemset/problem/(\d+)/([A-Za-z]\d?)"
    r"|contest/(\d+)/problem/([A-Za-z]\d?))"
)

_contests = {}


def load_problems():
    """Список задач Codeforces из кэша или из API; None, если скачать не удалось."""
    if not CACHE.exists():
        try:
            data = requests.get(f"{API}/problemset.problems", timeout=30).json()
        except (requests.RequestException, ValueError) as e:
            print(f"ВНИМАНИЕ: список задач Codeforces не скачался ({e}) — ссылки не проверены")
            return None
        if data.get("status") != "OK":
            print("ВНИМАНИЕ: Codeforces API ответил ошибкой — ссылки не проверены")
            return None
        CACHE.parent.mkdir(exist_ok=True)
        CACHE.write_text(json.dumps(data["result"]["problems"], ensure_ascii=False), encoding="utf-8")
    problems = json.loads(CACHE.read_text(encoding="utf-8"))
    return {(str(p["contestId"]), p["index"]): p for p in problems if "contestId" in p}


def contest_problems(contest):
    """Задачи контеста, которых нет в общем архиве (запасной путь)."""
    if contest not in _contests:
        try:
            data = requests.get(
                f"{API}/contest.standings",
                params={"contestId": contest, "from": 1, "count": 1},
                timeout=30,
            ).json()
            problems = data["result"]["problems"] if data.get("status") == "OK" else []
        except (requests.RequestException, ValueError, KeyError):
            problems = []
        _contests[contest] = {p["index"]: p for p in problems}
        time.sleep(2)  # лимит Codeforces API — не чаще раза в 2 секунды
    return _contests[contest]


def check_links(problems):
    bad = 0
    for md in sorted(DOCS.rglob("*.md")):
        text = md.read_text(encoding="utf-8")
        for m in LINK.finditer(text):
            contest = m.group(1) or m.group(3)
            index = (m.group(2) or m.group(4)).upper()
            where = md.relative_to(ROOT).as_posix()
            if problems is None:
                continue
            p = problems.get((contest, index)) or contest_problems(contest).get(index)
            if p:
                print(f"  ок   {where}: {contest}{index} «{p['name']}», рейтинг {p.get('rating', '—')}")
            else:
                print(f"  НЕТ  {where}: {contest}{index} — НЕТ ТАКОЙ ЗАДАЧИ")
                bad += 1
    return bad


def check_sections():
    bad = 0
    for md in sorted((DOCS / "theory").glob("*.md")):
        if md.name == "index.md":
            continue
        where = md.relative_to(ROOT).as_posix()
        text = md.read_text(encoding="utf-8")
        if PLACEHOLDER in text:
            print(f"  —    {where}: заготовка, пропускаю")
            continue
        headings = [h.strip().lower() for h in re.findall(r"^#{2,3}\s+(.+)$", text, re.M)]
        pos = 0
        missing = []
        for name in SECTIONS:
            found = next((i for i in range(pos, len(headings)) if name.lower() in headings[i]), None)
            if found is None:
                missing.append(name)
            else:
                pos = found + 1
        if missing:
            print(f"  НЕТ  {where}: нет разделов или не по порядку — {', '.join(missing)}")
            bad += 1
        else:
            print(f"  ок   {where}: все 8 разделов на месте")
    return bad


def main():
    print("Ссылки на Codeforces:")
    bad = check_links(load_problems())
    print("Разделы статей:")
    bad += check_sections()
    print("GREEN" if bad == 0 else f"RED — проблем: {bad}")
    sys.exit(0 if bad == 0 else 1)


if __name__ == "__main__":
    main()
