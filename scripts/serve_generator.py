"""Локальный API генератора и раздача готового site/: python scripts/serve_generator.py."""
import argparse
from collections import defaultdict, deque
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import time
from urllib.parse import unquote, urlsplit

from generator_core import GeneratorError, ROOT, TOPICS, generate, load_settings
from mentor_core import mentor, validate_payload


class Limits:
    def __init__(self):
        self.lock = threading.Lock()
        self.clients = defaultdict(deque)
        self.total = deque()
        self.active = threading.BoundedSemaphore(2)

    def allow(self, client):
        now = time.monotonic()
        with self.lock:
            for key in list(self.clients):
                queue = self.clients[key]
                while queue and queue[0] <= now-60:
                    queue.popleft()
                if not queue:
                    del self.clients[key]
            while self.total and self.total[0] <= now-3600:
                self.total.popleft()
            if len(self.clients[client]) >= 5 or len(self.total) >= 100:
                return False
            self.clients[client].append(now)
            self.total.append(now)
            return True


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "site"), **kwargs)

    def log_message(self, *_):
        pass  # не записываем введённые данные и ответы провайдера

    def origin_allowed(self):
        origin = self.headers.get("Origin")
        return origin is None or origin in load_settings().origins

    def end_headers(self):
        origin = self.headers.get("Origin")
        if origin and origin in load_settings().origins:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def json_response(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def error(self, status, code, message):
        self.json_response(status, {"error": message, "code": code})

    def do_OPTIONS(self):
        if urlsplit(self.path).path not in {"/api/generate", "/api/mentor"}:
            return self.error(404, "not_found", "Такого адреса нет.")
        if not self.origin_allowed():
            return self.error(403, "origin_denied", "Этот сайт не подключён к генератору.")
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self):
        if urlsplit(self.path).path == "/api/health":
            if not self.origin_allowed():
                return self.error(403, "origin_denied", "Этот сайт не подключён к генератору.")
            settings = load_settings()
            return self.json_response(200, {"ok": True, "configured": bool(settings.api_key),
                "topics": [{"slug": slug, "title": title} for slug, title in TOPICS.items()]})
        if urlsplit(self.path).path.startswith("/api/"):
            return self.error(404, "not_found", "Такого адреса нет.")
        return super().do_GET()

    def send_head(self):
        # SimpleHTTPRequestHandler сам нормализует путь, но дополнительно исключаем
        # dot-файлы и symlink наружу. Раздаётся только site/, никогда корень репозитория.
        parts = unquote(urlsplit(self.path).path).replace("\\", "/").split("/")
        if any(part.startswith(".") for part in parts if part):
            self.send_error(404)
            return None
        root = (ROOT / "site").resolve()
        target = Path(self.translate_path(self.path)).resolve()
        if not target.is_relative_to(root):
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def do_POST(self):
        path = urlsplit(self.path).path
        if path not in {"/api/generate", "/api/mentor"}:
            return self.error(404, "not_found", "Такого адреса нет.")
        if not self.origin_allowed():
            return self.error(403, "origin_denied", "Этот сайт не подключён к генератору.")
        if self.headers.get_content_type() != "application/json":
            return self.error(415, "invalid_content_type", "Ожидается запрос JSON.")
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            size = -1
        if not 0 < size <= (40000 if path == "/api/mentor" else 4096):
            return self.error(413, "invalid_size", "Запрос слишком большой или пустой.")
        self.connection.settimeout(10)
        try:
            payload = json.loads(self.rfile.read(size))
        except (ValueError, UnicodeError, OSError):
            return self.error(400, "invalid_json", "Не удалось прочитать запрос.")
        if path == "/api/mentor":
            try:
                validate_payload(payload)
            except GeneratorError as error:
                return self.error(error.status, error.code, str(error))
        else:
            if not isinstance(payload, dict) or not isinstance(payload.get("topic"), str) or payload["topic"] not in TOPICS:
                return self.error(400, "invalid_topic", "Выбери одну из доступных тем.")
            if set(payload) != {"topic"}:
                return self.error(400, "invalid_request", "Запрос должен содержать только выбранную тему.")
        settings = load_settings()
        if not settings.api_key:
            return self.error(503, "not_configured", "ИИ ещё не подключён: организатору нужно настроить API-ключ.")
        if not self.server.limits.active.acquire(blocking=False):
            return self.error(429, "busy", "ИИ сейчас обрабатывает другие запросы. Попробуй через минуту.")
        try:
            if not self.server.limits.allow(self.client_address[0]):
                return self.error(429, "rate_limit", "Лимит обращений к ИИ исчерпан. Попробуй позже.")
            result = mentor(payload, settings) if path == "/api/mentor" else generate(payload["topic"], settings)
            self.json_response(200, result)
        except GeneratorError as error:
            self.error(error.status, error.code, str(error))
        except Exception:
            self.error(500, "internal_error", "Не получилось получить ответ ИИ. Попробуй позже.")
        finally:
            self.server.limits.active.release()


def make_server(host="127.0.0.1", port=8002):
    server = ThreadingHTTPServer((host, port), Handler)
    server.daemon_threads = True
    server.limits = Limits()
    return server


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8002)
    args = parser.parse_args()
    server = make_server(args.host, args.port)
    print(f"Generator: http://{args.host}:{args.port}/api/health", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
