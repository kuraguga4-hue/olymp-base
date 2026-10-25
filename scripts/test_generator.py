"""Проверка схем против независимого перебора, контракта AI и локального HTTP."""
import itertools
import json
import math
import os
from pathlib import Path
import random
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from generator_core import EDGE_INPUTS, GeneratorError, Settings, TOPICS, generate, load_settings, random_input, solve
from serve_generator import Limits, make_server


class Reply:
    status_code = 200

    def json(self):
        return {"choices": [{"message": {"content": json.dumps({"title": "Архив экспедиции", "story": "Команда готовит оборудование для новой экспедиции."}, ensure_ascii=False)}}]}


def reference(topic, data):
    words = data.split()
    if topic == "binary-search":
        n, wanted = map(int, words[:2])
        times = list(map(int, words[2:]))
        return next(t for t in range(min(times)*wanted+1) if sum(t//x for x in times) >= wanted)
    if topic == "prefix-sums":
        n, q = map(int, words[:2])
        values = list(map(int, words[2:2+n]))
        query = list(map(int, words[2+n:]))
        return [sum(values[query[i]-1:query[i+1]]) for i in range(0, q*2, 2)]
    if topic == "two-pointers":
        n, limit = map(int, words[:2])
        values = list(map(int, words[2:]))
        return max([0] + [j-i for i in range(n) for j in range(i+1, n+1) if sum(values[i:j]) <= limit])
    if topic == "greedy":
        n = int(words[0])
        nums = list(map(int, words[1:]))
        pairs = list(zip(nums[::2], nums[1::2]))
        best = 0
        for mask in range(1 << n):
            chosen = sorted(pairs[i] for i in range(n) if mask & (1 << i))
            if all(chosen[i-1][1] <= chosen[i][0] for i in range(1, len(chosen))):
                best = max(best, len(chosen))
        return best
    if topic == "dp-intro":
        n = int(words[0])
        return sum(math.comb(n-twos, twos) for twos in range(n//2+1)) % 1_000_000_007
    n, m = map(int, words[:2])
    grid = words[2:]
    distance = {(r, c): n*m+1 for r in range(n) for c in range(m) if grid[r][c] == "."}
    distance[0, 0] = 0
    # Bellman-Ford на сетке, независимо от очереди в BFS.
    for _ in range(n*m):
        changed = False
        for (r, c), value in list(distance.items()):
            for neighbour in ((r-1, c), (r+1, c), (r, c-1), (r, c+1)):
                if neighbour in distance and distance[neighbour] > value+1:
                    distance[neighbour] = value+1
                    changed = True
        if not changed:
            break
    value = distance[n-1, m-1]
    return value if value <= n*m else -1


class CoreTests(unittest.TestCase):
    def test_random_cases_against_brute_force(self):
        for topic in TOPICS:
            for seed in range(80):
                with self.subTest(topic=topic, seed=seed):
                    data = random_input(topic, random.Random(seed))
                    expected = reference(topic, data)
                    result = list(map(int, solve(topic, data).split()))
                    self.assertEqual(result, expected if isinstance(expected, list) else [expected])

    def test_boundary_answers(self):
        expected = {
            "binary-search": ["7\n", "3\n", "1000000000000000000\n"],
            "prefix-sums": ["-9\n-9\n", "3000000000\n1000000000\n2000000000\n"],
            "two-pointers": ["0\n", "4\n", "1\n"],
            "greedy": ["3\n", "1\n", "1\n"],
            "dp-intro": ["1\n", "2\n", "365010934\n", "107579939\n"],
            "shortest-paths": ["0\n", "-1\n", "3\n"],
        }
        for topic in TOPICS:
            self.assertEqual([solve(topic, data) for data in EDGE_INPUTS[topic]], expected[topic], topic)

    def test_successful_contract(self):
        for topic in TOPICS:
            with self.subTest(topic=topic):
                result = generate(topic, Settings(api_key="test-secret"), lambda *args, **kwargs: Reply(), seed=42)
                self.assertEqual(result["topic"], topic)
                self.assertEqual(result["source"], "ai-template")
                self.assertEqual(len(result["examples"]), 2)
                self.assertGreaterEqual(len(result["tests"]), 5)
                for key in ("title", "story", "statement", "input_format", "output_format", "constraints", "hint"):
                    self.assertIsInstance(result[key], str)
                    self.assertTrue(result[key])
                self.assertNotIn("test-secret", json.dumps(result))
                for case in result["examples"] + result["tests"]:
                    self.assertEqual(case["output"], solve(topic, case["input"]))

    def test_no_key_does_not_call_provider(self):
        with self.assertRaises(GeneratorError) as caught:
            generate("dp-intro", Settings(), lambda *args, **kwargs: self.fail("provider called"))
        self.assertEqual(caught.exception.code, "not_configured")

    def test_invalid_topic_does_not_call_provider(self):
        for topic in ("unknown", [], None):
            with self.assertRaises(GeneratorError) as caught:
                generate(topic, Settings(api_key="x"), lambda *args, **kwargs: self.fail("provider called"))
            self.assertEqual(caught.exception.status, 400)

    def test_invalid_model_answer_is_rejected(self):
        class BadReply(Reply):
            def json(self):
                return {"choices": [{"message": {"content": '{"title":"X","story":"3 rules"}'}}]}
        with self.assertRaises(GeneratorError) as caught:
            generate("greedy", Settings(api_key="x"), lambda *args, **kwargs: BadReply())
        self.assertEqual(caught.exception.code, "invalid_response")

    def test_auth_failure_does_not_expose_provider_body(self):
        class BadReply(Reply):
            status_code = 401
            def json(self):
                raise AssertionError("Do not read or expose upstream auth errors")
        with self.assertRaises(GeneratorError) as caught:
            generate("greedy", Settings(api_key="never-expose"), lambda *args, **kwargs: BadReply())
        self.assertEqual(caught.exception.code, "provider_auth")
        self.assertNotIn("never-expose", str(caught.exception))

    def test_env_reload_and_precedence(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {}, clear=True):
            path = Path(folder) / ".env"
            path.write_text('GEN_API_KEY="first"\nGEN_MODEL=test\n', encoding="utf-8")
            self.assertEqual(load_settings(path).api_key, "first")
            path.write_text('GEN_API_KEY=second\n', encoding="utf-8")
            self.assertEqual(load_settings(path).api_key, "second")
            with patch.dict(os.environ, {"GEN_API_KEY": "third"}):
                self.assertEqual(load_settings(path).api_key, "third")

    def test_rate_limits(self):
        limits = Limits()
        for _ in range(5):
            self.assertTrue(limits.allow("client"))
        self.assertFalse(limits.allow("client"))
        for i in range(95):
            self.assertTrue(limits.allow(str(i)))
        self.assertFalse(limits.allow("another"))


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = make_server(port=0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, path, body=None, method=None, origin=None, content_type="application/json"):
        headers = {"Content-Type": content_type}
        if origin:
            headers["Origin"] = origin
        request = Request(self.base+path, data=body, headers=headers, method=method)
        try:
            response = urlopen(request, timeout=5)
        except HTTPError as error:
            response = error
        with response:
            return response.status, response.headers, response.read()

    def test_health_does_not_reveal_key(self):
        with patch("serve_generator.load_settings", return_value=Settings(api_key="never-expose")):
            status, headers, data = self.request("/api/health", origin="http://127.0.0.1:8001")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Access-Control-Allow-Origin"], "http://127.0.0.1:8001")
        self.assertTrue(json.loads(data)["configured"])
        self.assertNotIn(b"never-expose", data)

    def test_disallowed_origin(self):
        status, headers, _ = self.request("/api/generate", b'{"topic":"greedy"}', origin="https://evil.invalid")
        self.assertEqual(status, 403)
        self.assertIsNone(headers.get("Access-Control-Allow-Origin"))

    def test_preflight(self):
        status, headers, _ = self.request("/api/generate", method="OPTIONS", origin="http://localhost:8001")
        self.assertEqual(status, 204)
        self.assertIn("POST", headers["Access-Control-Allow-Methods"])

    def test_input_validation(self):
        self.assertEqual(self.request("/api/generate", b"x"*4097)[0], 413)
        self.assertEqual(self.request("/api/generate", b"bad")[0], 400)
        self.assertEqual(self.request("/api/generate", b'{}')[0], 400)
        self.assertEqual(self.request("/api/generate", b'{"topic":"greedy","prompt":"x"}')[0], 400)
        self.assertEqual(self.request("/api/generate", b'{}', content_type="text/plain")[0], 415)

    def test_no_key_response(self):
        with patch("serve_generator.load_settings", return_value=Settings()):
            status, _, data = self.request("/api/generate", b'{"topic":"greedy"}')
        self.assertEqual(status, 503)
        self.assertEqual(json.loads(data)["code"], "not_configured")

    def test_full_http_contract(self):
        result = generate("prefix-sums", Settings(api_key="x"), lambda *args, **kwargs: Reply(), seed=2)
        with patch("serve_generator.load_settings", return_value=Settings(api_key="x")), patch("serve_generator.generate", return_value=result):
            status, _, data = self.request("/api/generate", b'{"topic":"prefix-sums"}')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data), result)

    def test_no_path_traversal_or_hidden_files(self):
        for path in ("/.env", "/../.env", "/%2e%2e/.env", "/%2e%2e/AGENTS.md", "/%5c..%5c.env"):
            self.assertEqual(self.request(path)[0], 404, path)


if __name__ == "__main__":
    unittest.main(verbosity=2)
