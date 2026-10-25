"""Страница «Все задачи» (docs/practice/all.md) из общей таблицы data/problems.csv.

Запуск: python scripts/build_all_problems.py — после любых изменений таблицы.
Фильтр по теме — docs/js/all-problems.js.
"""
import collections
import csv
import html
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSV = ROOT / "data" / "problems.csv"
PAGE = ROOT / "docs" / "practice" / "all.md"
ORDER = [
    "бинарный поиск", "префиксные суммы", "жадные алгоритмы", "динамическое программирование", "DFS",
    "кратчайшие пути", "сортировки", "бинарные подъёмы", "поиск LCA", "дерево отрезков", "декартово дерево",
    "sparse table", "теория чисел", "комбинаторика", "реализация", "хеши", "строковые алгоритмы",
    "неточные алгоритмы", "центроиды", "HLD", "FFT", "оптимизации ДП", "битмаски", "перебор",
    "разделяй и властвуй", "конструктив", "два указателя", "корневая оптимизация", "решето Эратосфена",
    "задача о рюкзаке", "сжатие координат", "сортировка событий (сканлайн)", "геометрия", "DSU", "свёртки",
]
# тема таблицы → вкладка «Практики», где есть подборка с подсказками
TAB = {"сортировки": "sorting", "бинарный поиск": "binary-search", "префиксные суммы": "prefix-sums",
       "два указателя": "two-pointers", "жадные алгоритмы": "greedy", "динамическое программирование": "dp-intro",
       "DFS": "dfs", "кратчайшие пути": "shortest-paths", "DSU": "dsu", "строковые алгоритмы": "strings",
       "хеши": "strings", "теория чисел": "number-theory", "решето Эратосфена": "number-theory",
       "корневая оптимизация": "sqrt-decomposition", "дерево отрезков": "segment-tree",
       "декартово дерево": "treap", "FFT": "fft", "свёртки": "fft"}


def source(url):
    if "/gym/" in url:
        return "Олимпиада (Codeforces Gym)"
    return "Codeforces" if "codeforces.com" in url else "AtCoder" if "atcoder.jp" in url else "—"


def main():
    rows = list(csv.DictReader(CSV.open(encoding="utf-8-sig", newline="")))
    rank = {t: i for i, t in enumerate(ORDER)}

    def diff(r):
        return int(r["Сложность"]) if r["Сложность"].strip().isdigit() else 9999

    rows.sort(key=lambda r: (rank.get(r["Основная тема"], len(ORDER)), r["Основная тема"], diff(r), r["Задача"]))
    counts = collections.Counter(r["Основная тема"] for r in rows)
    topics = sorted(counts, key=lambda t: (rank.get(t, len(ORDER)), t))
    esc = html.escape
    out = [
        "# Все задачи",
        "",
        f'<p class="ob-lead">Весь архив практики: {len(rows)} задач с Codeforces, AtCoder и олимпиад. '
        "Выбери тему — останутся только её задачи. Подсказки по задачам — на вкладках тем.</p>",
        "",
        '<form class="ob-form" onsubmit="return false">',
        '<label for="ob-all-topic">Тема</label>',
        '<select id="ob-all-topic" class="ob-input">',
        f'<option value="">Все темы ({len(rows)})</option>',
        *[f'<option value="{esc(t)}">{esc(t)} ({counts[t]})</option>' for t in topics],
        "</select>",
        f'<span class="ob-note" id="ob-all-count">Показано: {len(rows)}</span>',
        "</form>",
        "",
        '<table id="ob-all-problems">',
        "<thead><tr><th>№</th><th>Задача</th><th>Источник</th><th>Сложность</th><th>Основная тема</th><th>Ещё темы</th></tr></thead>",
        "<tbody>",
    ]
    for n, r in enumerate(rows, 1):
        url, main_topic = r["Ссылка"], r["Основная тема"]
        gym = "/gym/" in url
        title = esc(r["Название"]) if gym else f'{esc(r["Задача"])} · {esc(r["Название"])}'
        estimated = "codeforces.com/problemset" not in url and "codeforces.com/contest" not in url
        level = (f"≈ {r['Сложность']}" if estimated else r["Сложность"]) if r["Сложность"].strip() else "—"
        topic_cell = (f'<a href="../{TAB[main_topic]}/">{esc(main_topic)}</a>' if main_topic in TAB else esc(main_topic))
        extra = ", ".join(t.strip() for t in r["Доп. темы"].split(";") if t.strip()) or "—"
        out.append(f'<tr data-topic="{esc(main_topic)}"><td>{n}</td><td><a href="{esc(url)}">{title}</a></td>'
                   f"<td>{source(url)}</td><td>{level}</td><td>{topic_cell}</td><td>{esc(extra)}</td></tr>")
    out += ["</tbody>", "</table>", ""]
    PAGE.write_text("\n".join(out), encoding="utf-8")
    print(f"{PAGE.relative_to(ROOT).as_posix()}: {len(rows)} задач, тем в фильтре: {len(topics)}")


if __name__ == "__main__":
    main()
