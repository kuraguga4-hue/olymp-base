"""Проверенные схемы задач и короткий сюжет от AITUNNEL. Код модели не исполняется."""
from collections import deque
from dataclasses import dataclass, field
import json
import os
from pathlib import Path
import random
import secrets

import requests

ROOT = Path(__file__).resolve().parent.parent
MOD = 1_000_000_007
TOPICS = {
    "binary-search": "Бинарный поиск",
    "prefix-sums": "Префиксные суммы",
    "two-pointers": "Два указателя",
    "greedy": "Жадные алгоритмы",
    "dp-intro": "Динамическое программирование",
    "shortest-paths": "Кратчайшие пути",
}
DEFAULT_ORIGINS = ",".join(f"http://{host}:{port}" for host in ("127.0.0.1", "localhost") for port in (8000, 8001, 8002))


class GeneratorError(Exception):
    def __init__(self, code, message, status=503):
        super().__init__(message)
        self.code = code
        self.status = status


@dataclass
class Settings:
    api_key: str = field(default="", repr=False)
    model: str = "gpt-4.1-mini"
    base_url: str = "https://api.aitunnel.ru/v1"
    origins: tuple = tuple(DEFAULT_ORIGINS.split(","))


def load_settings(env_file=None):
    """Ключ перечитывается после настройки без перезапуска сервера."""
    values = {}
    path = Path(env_file) if env_file is not None else ROOT / ".env"
    if path.exists():
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, value = line.split("=", 1)
            name = name.strip().removeprefix("export ")
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            if name.startswith("GEN_"):
                values[name] = value
    def setting(name, default):
        return os.environ.get(name, values.get(name, default)).strip()
    return Settings(
        api_key=setting("GEN_API_KEY", ""),
        model=setting("GEN_MODEL", "gpt-4.1-mini"),
        base_url=setting("GEN_BASE_URL", "https://api.aitunnel.ru/v1").rstrip("/"),
        origins=tuple(x.strip().rstrip("/") for x in setting("GEN_ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",") if x.strip()),
    )


def solve(topic, data):
    """Эталонные ответы только для наших шести фиксированных форматов."""
    words = data.split()
    if topic == "binary-search":
        n, target = map(int, words[:2])
        times = list(map(int, words[2:]))
        assert len(times) == n
        low, high = 0, min(times) * target
        while low < high:
            middle = (low + high) // 2
            if sum(middle // t for t in times) >= target:
                high = middle
            else:
                low = middle + 1
        return f"{low}\n"
    if topic == "prefix-sums":
        n, q = map(int, words[:2])
        values = list(map(int, words[2:2+n]))
        queries = list(map(int, words[2+n:]))
        assert len(queries) == 2*q
        prefix = [0]
        for value in values:
            prefix.append(prefix[-1] + value)
        return "\n".join(str(prefix[queries[i+1]] - prefix[queries[i]-1]) for i in range(0, 2*q, 2)) + "\n"
    if topic == "two-pointers":
        n, limit = map(int, words[:2])
        values = list(map(int, words[2:]))
        assert len(values) == n
        left = total = best = 0
        for right, value in enumerate(values):
            total += value
            while left <= right and total > limit:
                total -= values[left]
                left += 1
            best = max(best, right-left+1)
        return f"{best}\n"
    if topic == "greedy":
        count = int(words[0])
        numbers = list(map(int, words[1:]))
        assert len(numbers) == count*2
        intervals = sorted(zip(numbers[::2], numbers[1::2]), key=lambda p: p[1])
        last, answer = -1, 0
        for start, end in intervals:
            if start >= last:
                answer += 1
                last = end
        return f"{answer}\n"
    if topic == "dp-intro":
        n = int(words[0])
        previous, current = 1, 1
        for _ in range(2, n+1):
            previous, current = current, (previous+current) % MOD
        return f"{current}\n"
    if topic == "shortest-paths":
        rows, columns = map(int, words[:2])
        grid = words[2:]
        assert len(grid) == rows and all(len(row) == columns for row in grid)
        queue = deque([(0, 0, 0)])
        visited = {(0, 0)}
        while queue:
            r, c, distance = queue.popleft()
            if (r, c) == (rows-1, columns-1):
                return f"{distance}\n"
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nr, nc = r+dr, c+dc
                if 0 <= nr < rows and 0 <= nc < columns and grid[nr][nc] == "." and (nr, nc) not in visited:
                    visited.add((nr, nc))
                    queue.append((nr, nc, distance+1))
        return "-1\n"
    raise GeneratorError("invalid_topic", "Выбери одну из доступных тем.", 400)


SCHEMES = {
    "binary-search": {
        "statement": "Есть n независимых станков. Станок i выпускает одно изделие за tᵢ секунд, затем сразу начинает следующее. Все станки запускаются одновременно в момент 0. Найди минимальное целое время, за которое они вместе изготовят не меньше m изделий.",
        "input_format": "Первая строка: n и m. Вторая строка: n целых чисел t₁, …, tₙ.",
        "output_format": "Одно целое число — минимальное время в секундах.",
        "constraints": "1 ≤ n ≤ 10⁵; 1 ≤ m ≤ 10⁹; 1 ≤ tᵢ ≤ 10⁹. Ответ может быть больше 32-битного целого.",
        "hint": "Если известно время T, каждый станок успеет изготовить ⌊T/tᵢ⌋ изделий. Как меняется суммарное число изделий при увеличении T?",
    },
    "prefix-sums": {
        "statement": "Дан неизменный массив из n целых чисел. Для каждого из q запросов l, r найди сумму элементов с l-го по r-й включительно. Нумерация начинается с 1.",
        "input_format": "Первая строка: n и q. Вторая: n чисел массива. Следующие q строк: по два числа l и r.",
        "output_format": "Для каждого запроса выведи сумму на отдельной строке, сохраняя порядок запросов.",
        "constraints": "1 ≤ n, q ≤ 10⁵; −10⁹ ≤ aᵢ ≤ 10⁹; 1 ≤ l ≤ r ≤ n. Для суммы нужен 64-битный тип.",
        "hint": "Сохрани суммы от начала массива. Сумму какого префикса надо вычесть из суммы до позиции r?",
    },
    "two-pointers": {
        "statement": "Дан массив из n положительных целых чисел и число S. Найди максимальную длину непрерывного отрезка, сумма которого не превосходит S. Если ни один непустой отрезок не подходит, выведи 0.",
        "input_format": "Первая строка: n и S. Вторая строка: n чисел массива.",
        "output_format": "Одно число — максимальная длина подходящего отрезка.",
        "constraints": "1 ≤ n ≤ 2·10⁵; 1 ≤ S ≤ 10¹⁸; 1 ≤ aᵢ ≤ 10⁹.",
        "hint": "Все числа положительны. Если после добавления нового элемента сумма стала слишком большой, в какую сторону нужно двигать левую границу?",
    },
    "greedy": {
        "statement": "Есть n заявок на одну комнату. Заявка i занимает полуинтервал [lᵢ, rᵢ): время начала входит, время окончания не входит. Выбери максимальное число заявок без пересечений. Если одна заявка заканчивается ровно в момент начала другой, принять обе можно.",
        "input_format": "Первая строка: n. Следующие n строк: lᵢ и rᵢ.",
        "output_format": "Одно число — максимальное количество принятых заявок.",
        "constraints": "1 ≤ n ≤ 2·10⁵; 0 ≤ lᵢ < rᵢ ≤ 10⁹.",
        "hint": "Выбирая первую заявку, постарайся оставить как можно больше времени для остальных. Какое время окончания для этого выгоднее?",
    },
    "dp-intro": {
        "statement": "Лестница имеет n ступеней. Ты начинаешь перед первой ступенью и за один ход поднимаешься на одну или две ступени. Посчитай, сколько различных последовательностей ходов приводят ровно на ступень n. Выведи остаток ответа при делении на 1 000 000 007.",
        "input_format": "Одно целое число n — количество ступеней.",
        "output_format": "Число последовательностей ходов по модулю 1 000 000 007.",
        "constraints": "1 ≤ n ≤ 10⁶.",
        "hint": "Перед последним ходом ты был либо на ступени n−1, либо на ступени n−2. Сколько способов приводит в каждое из этих мест?",
    },
    "shortest-paths": {
        "statement": "Дана прямоугольная карта: точка . означает свободную клетку, # — стену. Начало — верхняя левая клетка, цель — нижняя правая; обе свободны. За один ход можно перейти в соседнюю по стороне свободную клетку. Найди минимальное число ходов до цели, а если пути нет — выведи −1.",
        "input_format": "Первая строка: n и m — число строк и столбцов. Затем n строк по m символов . или # без пробелов.",
        "output_format": "Минимальное число ходов или −1, если цель недостижима.",
        "constraints": "1 ≤ n, m ≤ 1000; клетка (1,1) и клетка (n,m) свободны. Если они совпадают, ответ 0.",
        "hint": "Все ходы имеют одинаковую длину. Обходи клетки слоями: сначала расстояние 0, затем 1, затем 2 — какую структуру данных для этого используют?",
    },
}


def random_input(topic, rng):
    if topic == "binary-search":
        n, target = rng.randint(2, 6), rng.randint(5, 50)
        return f"{n} {target}\n" + " ".join(str(rng.randint(1, 15)) for _ in range(n)) + "\n"
    if topic == "prefix-sums":
        n, q = rng.randint(3, 9), rng.randint(2, 5)
        result = [f"{n} {q}", " ".join(str(rng.randint(-12, 20)) for _ in range(n))]
        for _ in range(q):
            left = rng.randint(1, n)
            result.append(f"{left} {rng.randint(left, n)}")
        return "\n".join(result) + "\n"
    if topic == "two-pointers":
        n, limit = rng.randint(4, 10), rng.randint(3, 30)
        return f"{n} {limit}\n" + " ".join(str(rng.randint(1, 12)) for _ in range(n)) + "\n"
    if topic == "greedy":
        n = rng.randint(4, 9)
        result = [str(n)]
        for _ in range(n):
            start = rng.randint(0, 15)
            result.append(f"{start} {start+rng.randint(1, 8)}")
        return "\n".join(result) + "\n"
    if topic == "dp-intro":
        return f"{rng.randint(3, 35)}\n"
    n, m = rng.randint(3, 6), rng.randint(3, 7)
    grid = [["#" if rng.random() < .28 else "." for _ in range(m)] for _ in range(n)]
    grid[0][0] = grid[-1][-1] = "."
    return f"{n} {m}\n" + "\n".join("".join(row) for row in grid) + "\n"


EDGE_INPUTS = {
    "binary-search": ["1 1\n7\n", "2 5\n1 1\n", "1 1000000000\n1000000000\n"],
    "prefix-sums": ["1 2\n-9\n1 1\n1 1\n", "3 3\n1000000000 1000000000 1000000000\n1 3\n2 2\n2 3\n"],
    "two-pointers": ["3 1\n2 3 4\n", "4 100\n1 2 3 4\n", "1 7\n7\n"],
    "greedy": ["3\n0 1\n1 2\n2 3\n", "3\n0 10\n0 10\n0 10\n", "1\n0 1\n"],
    "dp-intro": ["1\n", "2\n", "50\n", "1000\n"],
    "shortest-paths": ["1 1\n.\n", "2 2\n.#\n#.\n", "1 4\n....\n"],
}


def ai_story(topic, settings, transport=None):
    if not settings.api_key:
        raise GeneratorError("not_configured", "Генератор ещё не подключён: организатору нужно настроить API-ключ.")
    if not settings.base_url.startswith("https://"):
        raise GeneratorError("not_configured", "Адрес API должен использовать HTTPS.")
    transport = transport or requests.post
    prompt = (
        "Ты придумываешь короткую литературную обложку учебной задачи. Ответ — JSON с двумя строками: "
        '"title" (до 80 символов) и "story" (1–2 предложения, до 500 символов). Пиши по-русски. '
        "Сюжет простой и современный: техника, логистика, расписание, учёт. Без фэнтези, тайн, сокровищ и пышных эпитетов. "
        "Только вымышленный сюжет: не добавляй чисел, формальных правил, целей, ограничений, "
        "алгоритмов или ответов. Не меняй математическую задачу. Не упоминай Codeforces или реальные соревнования. "
        "Математическое условие будет показано отдельно и имеет приоритет. "
        f"Тема: {TOPICS[topic]}. Основа: {SCHEMES[topic]['statement']}"
    )
    try:
        response = transport(
            settings.base_url + "/chat/completions",
            headers={"Authorization": "Bearer " + settings.api_key, "Content-Type": "application/json"},
            json={"model": settings.model, "messages": [{"role": "system", "content": prompt},
                  {"role": "user", "content": "Придумай новый сюжет. Вариант: " + secrets.token_hex(5)}],
                  "temperature": .9, "max_tokens": 500, "response_format": {"type": "json_object"}},
            timeout=(8, 45),
        )
        if response.status_code in (401, 403):
            raise GeneratorError("provider_auth", "API не принял ключ. Организатору нужно проверить настройки генератора.")
        if response.status_code in (402, 429):
            raise GeneratorError("provider_limit", "Провайдер временно ограничил генерацию. Попробуй позже.")
        if response.status_code >= 400:
            raise GeneratorError("provider_error", "Сервис генерации сейчас недоступен. Попробуй ещё раз позже.")
        content = response.json()["choices"][0]["message"]["content"]
        if not isinstance(content, str) or len(content) > 5000:
            raise ValueError("invalid content")
        payload = json.loads(content)
        if not isinstance(payload, dict):
            raise ValueError("invalid JSON")
        title, story = payload.get("title"), payload.get("story")
        if not isinstance(title, str) or not 1 <= len(title.strip()) <= 100:
            raise ValueError("invalid title")
        if not isinstance(story, str) or not 1 <= len(story.strip()) <= 600:
            raise ValueError("invalid story")
        if any(ch.isdigit() for ch in story):
            raise ValueError("numbers in story")
        return title.strip(), story.strip()
    except requests.Timeout:
        raise GeneratorError("provider_timeout", "ИИ не успел ответить. Попробуй ещё раз.") from None
    except requests.RequestException:
        raise GeneratorError("provider_error", "Не удалось связаться с сервисом генерации. Попробуй позже.") from None
    except (ValueError, KeyError, IndexError, TypeError):
        raise GeneratorError("invalid_response", "ИИ вернул неподходящий ответ. Попробуй сгенерировать ещё раз.") from None


def generate(topic, settings, transport=None, seed=None):
    if not isinstance(topic, str) or topic not in TOPICS:
        raise GeneratorError("invalid_topic", "Выбери одну из доступных тем.", 400)
    title, story = ai_story(topic, settings, transport)
    rng = random.Random(seed if seed is not None else secrets.randbits(128))
    inputs = [random_input(topic, rng) for _ in range(5)]
    case = lambda data: {"input": data, "output": solve(topic, data)}
    return {
        "id": secrets.token_hex(8), "topic": topic, "title": title, "story": story,
        **SCHEMES[topic], "examples": [case(data) for data in inputs[:2]],
        "tests": [case(data) for data in inputs[2:] + EDGE_INPUTS[topic]],
        "source": "ai-template",
    }
