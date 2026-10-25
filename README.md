# Олимпиадная база

Открытая база для подготовки к олимпиадам по программированию: статьи (Теория), подборки задач (Практика) и страница прогресса по хендлу Codeforces.

Каждая статья начинается с задачи, которую тема делает простой, написана понятно для школьника и проверена олимпиадником.

## Запуск

Windows:

```
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m mkdocs serve
```

macOS и Linux:

```
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m mkdocs serve
```

Сайт откроется на http://127.0.0.1:8000.

## Как добавить статью или задачу

1. Сделай форк репозитория и отдельную ветку.
2. Статья — `docs/theory/<тема>.md` строго по стандарту `docs/STYLE.md`; подборка задач — `docs/practice/<тема>.md`.
3. Запусти `python scripts/check.py` — должно быть GREEN: ссылки на Codeforces сверяются с официальным API.
4. Открой pull request. Статью проверяет олимпиадник и ставит подпись «Проверил».

## Лицензия

MIT — см. `LICENSE`.
