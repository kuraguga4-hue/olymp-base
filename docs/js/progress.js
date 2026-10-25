// «Статистика»: хендл Codeforces → решённые задачи по темам базы и что решать дальше.
// Страница — docs/me.md с пустым <div id="cf-progress">, всё остальное строит этот файл;
// оформление — компоненты .ob-* из docs/stylesheets/extra.css.
// Данные Codeforces попадают на страницу только как текст: узлы создаются через
// createElement, строки — через append, innerHTML не используется.
(() => {
  const script = document.currentScript || document.querySelector('script[src*="js/progress.js"]');
  const SITE = new URL("../", script.src); // корень сайта: файл лежит в docs/js/
  const API = "https://codeforces.com/api/";
  const API_GAP_MS = 2000; // лимит Codeforces API — не чаще раза в 2 секунды
  const TIMEOUT_MS = 20000; // ждём ответа сервера
  const BODY_TIMEOUT_MS = 60000; // user.status у активных участников — мегабайты
  const SITE_TIMEOUT_MS = 10000; // topics.json и страницы подборок
  const TAB = Math.random().toString(36).slice(2); // метка вкладки: две вкладки не займут один слот
  const HANDLE_KEY = "olymp-base:cf-handle";
  const LEARNED_KEY = "olymp-base:learned:"; // прежние отметки «Изучена»: читаем только для переноса в звёзды
  const STARS_KEY = "olymp-base:stars:"; // самооценка тем 1–5 ★, отдельно для каждого хендла
  const LAST_CALL_KEY = "olymp-base:cf-last-call";
  const HANDLE = /^[A-Za-z0-9_.-]{1,24}$/;
  const CF_PROBLEM_PATH = /^\/(?:problemset\/problem\/(\d+)\/([A-Za-z0-9]+)|(?:contest|gym)\/(\d+)\/problem\/([A-Za-z0-9]+))\/?$/;

  // звание Codeforces → по-русски и модификатор цвета .ob-rank--*
  const RANKS = new Map([
    ["newbie", ["новичок", "newbie"]],
    ["pupil", ["ученик", "pupil"]],
    ["specialist", ["специалист", "specialist"]],
    ["expert", ["эксперт", "expert"]],
    ["candidate master", ["кандидат в мастера", "cm"]],
    ["master", ["мастер", "master"]],
    ["international master", ["международный мастер", "master"]],
    ["grandmaster", ["гроссмейстер", "gm"]],
    ["international grandmaster", ["международный гроссмейстер", "gm"]],
    ["legendary grandmaster", ["легендарный гроссмейстер", "legendary"]],
  ]);
  // рейтинг → цвет звания с таким рейтингом
  const RATING_COLORS = [
    [2400, "gm"],
    [2100, "master"],
    [1900, "cm"],
    [1600, "expert"],
    [1400, "specialist"],
    [1200, "pupil"],
  ];
  const LEVELS = new Map([
    ["новичок", "novice"],
    ["средний", "mid"],
    ["продвинутый", "adv"],
  ]);
  // самооценка: число звёзд → что оно значит
  const STAR_WORDS = ["не оценена", "не понял", "понял смутно", "понял основное", "понял, решаю задачи", "могу объяснить другому"];
  // практика по задачам Codeforces (см. cfGrade): подпись и модификатор .ob-status--*
  const CF_GRADES = [["нет практики", "none"], ["начал", "progress"], ["в процессе", "progress"], ["уверенно", "done"]];
  // почему тема попала в «Что дальше» (см. tierOf)
  const TIER_KICKERS = ["Закрыть пробел", "Новая тема", "Закрепить практикой", "Следующий шаг", "Закрепить знакомую тему"];
  // У этих техник нет отдельного точного тега CF. Задачу рекомендуем только из
  // проверенной подборки: тег trees сам по себе не означает LCA, а dp — рюкзак.
  const CURATED_TOPICS = new Set([
    "binary-lifting", "lca", "segment-tree", "treap", "sparse-table", "sieve",
    "knapsack", "dp-optimizations", "centroid-decomposition", "hld", "sqrt-decomposition",
  ]);
  const ERRORS = {
    offline: ["Нет связи с Codeforces", "Проверь интернет и попробуй ещё раз."],
    network: ["Не получилось достучаться до Codeforces", "Проверь интернет. Если он в порядке — Codeforces сейчас недоступен, попробуй позже."],
    timeout: ["Codeforces долго не отвечает", "Попробуй ещё раз чуть позже."],
    limit: ["Слишком много запросов", "Codeforces просит подождать. Попробуй ещё раз через пару секунд."],
    unavailable: ["Codeforces сейчас недоступен", "Попробуй ещё раз позже."],
  };

  // ---------- Codeforces API: только user.info и user.status, по одному запросу в 2 секунды ----------

  class CfError extends Error {
    constructor(kind) {
      super(kind);
      this.kind = kind;
    }
  }

  let queue = Promise.resolve();
  let lastCall = 0;

  function cfApi(method, params) {
    const result = queue.then(() => waitForSlot().then(() => request(method, params)));
    queue = result.catch(() => {});
    return result;
  }

  function storedCall() {
    return Number(String(load(LAST_CALL_KEY) || "").split(":")[0]) || 0;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Метка последнего запроса лежит в localStorage — так лимит держится и после перезагрузки, и между вкладками.
  // Метку ставим прямо перед отправкой и проверяем, что её не перебила другая вкладка.
  async function waitForSlot() {
    for (;;) {
      const now = Date.now();
      const last = Math.max(lastCall, Math.min(storedCall(), now)); // метке «из будущего» не верим
      if (now < last + API_GAP_MS) {
        await sleep(last + API_GAP_MS - now);
        continue;
      }
      const mark = `${now}:${TAB}`;
      save(LAST_CALL_KEY, mark);
      await sleep(50); // две вкладки могли занять один момент — отправляет та, что записала последней
      const current = load(LAST_CALL_KEY);
      if (current === null || current === mark) {
        lastCall = Date.now();
        save(LAST_CALL_KEY, `${lastCall}:${TAB}`);
        return;
      }
    }
  }

  // Интервал отсчитываем и от ответа: тогда и до Codeforces запросы доходят не чаще раза в 2 секунды.
  function markDone() {
    const now = Date.now();
    lastCall = Math.max(lastCall, now);
    if (storedCall() < now) save(LAST_CALL_KEY, `${now}:${TAB}`);
  }

  async function request(method, params) {
    const url = new URL(method, API);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    const controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let data;
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: "omit" });
      clearTimeout(timer);
      timer = setTimeout(() => controller.abort(), BODY_TIMEOUT_MS);
      data = await response.json();
    } catch (error) {
      if (error.name === "AbortError") throw new CfError("timeout");
      if (error instanceof SyntaxError) throw new CfError("unavailable");
      // при сбое Codeforces ответ без CORS-заголовков браузер тоже показывает как сетевую ошибку
      throw new CfError(navigator.onLine === false ? "offline" : "network");
    } finally {
      clearTimeout(timer);
      markDone();
    }
    if (data && data.status === "OK") return data.result;
    const comment = data && typeof data.comment === "string" ? data.comment : "";
    if (/not found/i.test(comment)) throw new CfError("not-found");
    if (/limit exceeded/i.test(comment)) throw new CfError("limit");
    throw new CfError("unavailable");
  }

  // ---------- Данные сайта: темы и подборки ----------

  async function fetchSite(url, as) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SITE_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(String(response.status));
      return await response[as]();
    } finally {
      clearTimeout(timer);
    }
  }

  let topicsPromise = null;
  let catalogPromise = null;

  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetchSite(new URL("assets/progress-catalog.json", SITE), "json")
        .then((data) => {
          if (!data || !Array.isArray(data.problems) || !data.topics) throw new Error("catalog");
          return {
            topics: data.topics,
            problems: data.problems.filter((p) => Number.isInteger(p.contestId) && /^[A-Za-z0-9]+$/.test(p.index)
              && isText(p.name) && Number.isInteger(p.rating) && Array.isArray(p.tags)),
          };
        })
        .catch(() => { catalogPromise = null; return null; });
    }
    return catalogPromise;
  }

  function loadTopics() {
    if (!topicsPromise) {
      topicsPromise = fetchSite(new URL("assets/topics.json", SITE), "json")
        .then((list) => list.filter((t) => t && /^[a-z0-9-]+$/.test(t.slug) && isText(t.title) && Array.isArray(t.cf_tags)))
        .catch(() => {
          topicsPromise = null; // в следующий раз попробуем снова
          return null;
        });
    }
    return topicsPromise;
  }

  const selections = new Map();

  // Задачи подборки — внешняя ссылка из колонки «Задача» в каждой строке таблиц docs/practice/<slug>.md
  // (если такой колонки нет — первая внешняя ссылка строки).
  function loadSelection(slug) {
    if (!selections.has(slug)) {
      const url = new URL(`practice/${slug}/`, SITE);
      const promise = fetchSite(url, "text")
        .then((html) => {
          const page = new DOMParser().parseFromString(html, "text/html");
          const content = page.querySelector("article") || page.body;
          const problems = [];
          for (const table of content.querySelectorAll("table")) {
            const heads = [...table.querySelectorAll("thead th")].map((th) => th.textContent.trim().toLowerCase());
            const column = heads.findIndex((head) => head.startsWith("задача"));
            const ratingColumn = heads.findIndex((head) => head.startsWith("сложность"));
            for (const row of table.querySelectorAll("tbody tr")) {
              const cell = column >= 0 ? row.cells[column] : row;
              const link = cell && [...cell.querySelectorAll("a[href]")].find((a) => {
                const href = safeUrl(a.getAttribute("href"), url);
                return href && href.origin !== SITE.origin;
              });
              if (!link) continue;
              const href = safeUrl(link.getAttribute("href"), url);
              const ratingText = ratingColumn >= 0 && row.cells[ratingColumn] ? row.cells[ratingColumn].textContent : "";
              const ratingMatch = ratingText.match(/\d{3,4}/);
              problems.push({ url: href.href, name: link.textContent.trim() || href.href, key: cfKey(href),
                rating: ratingMatch ? Number(ratingMatch[0]) : null, estimated: ratingText.includes("≈") });
            }
          }
          return { problems };
        })
        .catch(() => {
          selections.delete(slug);
          return { problems: [], failed: true };
        });
      selections.set(slug, promise);
    }
    return selections.get(slug);
  }

  function safeUrl(raw, base) {
    try {
      const url = new URL(raw, base);
      return url.protocol === "https:" || url.protocol === "http:" ? url : null;
    } catch {
      return null;
    }
  }

  function cfKey(url) {
    if (!/^(www\.)?codeforces\.com$/.test(url.hostname)) return null;
    const m = url.pathname.match(CF_PROBLEM_PATH);
    return m ? `${m[1] || m[3]}/${(m[2] || m[4]).toUpperCase()}` : null;
  }

  // ---------- Подсчёт ----------

  function problemKey(problem) {
    const index = isText(problem.index) ? problem.index.toUpperCase() : null;
    if (!index) return null;
    if (Number.isInteger(problem.contestId)) return `${problem.contestId}/${index}`;
    return isText(problem.problemsetName) ? `${problem.problemsetName}/${index}` : null;
  }

  function solvedProblems(submissions) {
    const solved = new Map();
    for (const submission of submissions) {
      const problem = submission && submission.problem;
      if (!problem || submission.verdict !== "OK") continue;
      const key = problemKey(problem);
      if (key && (!solved.has(key) || (submission.creationTimeSeconds || 0) > solved.get(key).solvedAt)) {
        solved.set(key, { ...problem, solvedAt: submission.creationTimeSeconds || 0 });
      }
    }
    return solved;
  }

  function tagsOf(problem) {
    return Array.isArray(problem.tags) ? [...new Set(problem.tags.filter(isText))] : [];
  }

  function countBy(items, keysOf) {
    const counts = new Map();
    for (const item of items) {
      for (const key of keysOf(item)) counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }

  async function progressOf(topic, solved, catalog, target) {
    let matching;
    if (topic.cf_tags.length) {
      const keys = new Set(catalog && catalog.topics[topic.slug] ? catalog.topics[topic.slug].keys : []);
      matching = [...solved.values()].filter((p) => topic.cf_tags.every((tag) => tagsOf(p).includes(tag)) || keys.has(problemKey(p)));
      return { n: matching.length, near: matching.filter((p) => p.rating >= target - 200).length };
    }
    // У темы нет тега на Codeforces — считаем решённые задачи Codeforces из её подборки.
    const meta = catalog && catalog.topics[topic.slug];
    const selection = meta ? null : await loadSelection(topic.slug);
    const keys = new Set(meta ? meta.keys : selection.problems.map((p) => p.key).filter(Boolean));
    if (!keys.size) {
      return { n: null, near: 0, total: 0, selection };
    }
    matching = [...keys].filter((key) => solved.has(key)).map((key) => solved.get(key));
    return { n: matching.length, near: matching.filter((p) => p.rating >= target - 200).length, total: keys.size, selection };
  }

  function trainingLevel(user, solved) {
    const recent = [...solved.values()].filter((p) => Number.isInteger(p.rating))
      .sort((a, b) => b.solvedAt - a.solvedAt).slice(0, 30);
    const ratings = recent.map((p) => p.rating).sort((a, b) => a - b);
    const median = ratings.length ? ratings[Math.floor((ratings.length - 1) / 2)] : null;
    const rating = Number.isInteger(user.rating) && user.rating > 0 ? user.rating : null;
    // Рейтинг — основной ориентир; недавняя практика сдвигает его не более чем на 100.
    const base = rating == null ? (median == null ? 700 : median)
      : rating + (median == null ? 0 : Math.max(-200, Math.min(200, median - rating)) / 2);
    const target = Math.max(800, Math.min(3500, Math.round((base + 100) / 100) * 100));
    return { target, low: Math.max(800, target - 200), high: Math.min(3500, target + 200), rating, recent: recent.length };
  }

  // Самооценка { slug → 1…5 }. Прежние отметки «Изучена» переносим как 3 ★ — «понял основное».
  function selfRatings(handle, topics) {
    const valid = new Set(topics.map((topic) => topic.slug));
    const ratings = new Map();
    try {
      const stored = JSON.parse(load(STARS_KEY + handle.toLowerCase()) || "null");
      if (stored && typeof stored === "object" && !Array.isArray(stored)) {
        for (const [slug, stars] of Object.entries(stored)) {
          if (valid.has(slug) && Number.isInteger(stars) && stars >= 1 && stars <= 5) ratings.set(slug, stars);
        }
        return ratings;
      }
      const learned = JSON.parse(load(LEARNED_KEY + handle.toLowerCase()) || "[]");
      if (Array.isArray(learned)) learned.filter((slug) => valid.has(slug)).forEach((slug) => ratings.set(slug, 3));
    } catch { /* испорченная запись — начинаем без оценок */ }
    return ratings;
  }

  // Практика по задачам CF: 0 — нет, 1 — начал (1–2 задачи), 2 — в процессе (3–4 или почти все ниже ориентира),
  // 3 — уверенно (5+, из них хотя бы 2 от нижней границы ориентира); null — по теме нечего считать.
  function cfGrade(n, near) {
    if (n == null) return null;
    if (n === 0) return 0;
    if (n <= 2) return 1;
    return n >= 5 && near >= 2 ? 3 : 2;
  }

  // Очередь «Что дальше», меньше — раньше: пробел по самооценке, новая тема, понятая тема без практики,
  // тема в процессе, тема, уверенная и по звёздам, и по задачам.
  function tierOf(stars, grade) {
    const practice = grade ?? 0;
    if (stars && stars <= 2) return 0;
    if (!stars && practice <= 1) return 1;
    if (stars && practice <= 1) return 2;
    if (stars >= 4 && practice === 3) return 4;
    return 3;
  }

  // ---------- Страница ----------

  // Узел с атрибутами и детьми; строки становятся текстовыми узлами, HTML в них не разбирается.
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs || {})) {
      if (value != null && value !== false) node.setAttribute(name, value === true ? "" : value);
    }
    node.append(...children.flat(Infinity).filter((child) => child != null && child !== false && child !== ""));
    return node;
  }

  function isText(value) {
    return typeof value === "string" && value.trim() !== "";
  }

  function load(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      // хранилище недоступно (приватный режим) — просто не запоминаем
      return false;
    }
  }

  function pageUrl(section, slug) {
    return new URL(`${section}/${slug}/`, SITE).href;
  }

  function init() {
    const root = document.getElementById("cf-progress");
    if (!root || root.dataset.ready) return;
    root.dataset.ready = "true";

    const input = el("input", {
      id: "cf-handle",
      class: "ob-input",
      type: "text",
      maxlength: 24,
      placeholder: "например, tourist",
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false",
    });
    const button = el("button", { type: "submit", class: "ob-btn ob-btn--primary" }, "Показать");
    const form = el("form", { class: "ob-form" }, el("label", { for: "cf-handle" }, "Хендл Codeforces"), input, button);
    const ui = { root, input, button, message: el("div", { "aria-live": "polite" }), result: el("div") };
    root.replaceChildren(form, ui.message, ui.result);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      show(ui, input.value);
    });
    const saved = load(HANDLE_KEY);
    if (saved && HANDLE.test(saved)) {
      input.value = saved;
      show(ui, saved);
    }
  }

  function note(ui, text) {
    ui.message.replaceChildren(...(text ? [el("p", { class: "ob-note" }, text)] : []));
  }

  function fail(ui, title, text) {
    ui.message.replaceChildren(
      el("div", { class: "admonition failure" }, el("p", { class: "admonition-title" }, title), el("p", {}, text)),
    );
  }

  async function show(ui, value) {
    if (ui.busy) return;
    const handle = value.trim();
    if (!HANDLE.test(handle)) {
      fail(ui, "Проверь хендл", "Хендл Codeforces — до 24 символов: латинские буквы, цифры, «_», «-» и «.».");
      ui.input.focus();
      return;
    }
    ui.busy = true;
    ui.button.disabled = true;
    ui.result.setAttribute("aria-busy", "true"); // не на всём блоке: иначе экранный диктор не прочтёт сообщения
    ui.result.replaceChildren();
    const topicsReady = loadTopics();
    const catalogReady = loadCatalog();
    try {
      note(ui, "Загружаем профиль…");
      const users = await cfApi("user.info", { handles: handle });
      const user = Array.isArray(users) ? users[0] : null;
      if (!user || !isText(user.handle)) throw new CfError("unavailable");
      save(HANDLE_KEY, user.handle);
      if (ui.input.value.trim().toLowerCase() === handle.toLowerCase()) ui.input.value = user.handle; // не затираем новый ввод
      ui.result.append(renderProfile(user));
      if (!ui.root.isConnected) return; // страницу уже сменили — второй запрос не нужен

      note(ui, "Загружаем решённые задачи…");
      const submissions = await cfApi("user.status", { handle: user.handle });
      if (!Array.isArray(submissions)) throw new CfError("unavailable");
      const solved = solvedProblems(submissions);
      ui.result.append(...(await renderTopics(await topicsReady, solved, user, await catalogReady)), renderStats(solved));
      note(ui, "");
    } catch (error) {
      if (!(error instanceof CfError)) console.error(error); // ошибка в этом скрипте — пусть будет видна
      if (error.kind === "not-found") {
        fail(
          ui,
          "Такого хендла нет",
          `Пользователь «${handle}» не найден на Codeforces. Проверь написание: хендл — это имя в адресе профиля codeforces.com/profile/…`,
        );
      } else {
        fail(ui, ...(ERRORS[error.kind] || ERRORS.unavailable));
      }
    } finally {
      ui.busy = false;
      ui.button.disabled = false;
      ui.result.removeAttribute("aria-busy");
    }
  }

  function rankOf(raw) {
    const key = typeof raw === "string" ? raw.toLowerCase() : "";
    if (RANKS.has(key)) {
      const [text, color] = RANKS.get(key);
      return { text, color };
    }
    return isText(raw) ? { text: raw, color: null } : null;
  }

  function ratingColor(rating) {
    const step = RATING_COLORS.find(([min]) => rating >= min);
    return step ? step[1] : "newbie";
  }

  function rankClass(color) {
    return color ? `ob-rank--${color}` : null;
  }

  function avatarUrl(user) {
    for (const raw of [user.titlePhoto, user.avatar]) {
      const url = isText(raw) ? safeUrl(raw, "https://codeforces.com/") : null;
      if (url && url.protocol === "https:" && url.hostname === "userpic.codeforces.org") return url.href;
    }
    return null;
  }

  function stat(label, value, cls) {
    return el(
      "div",
      { class: "ob-stat" },
      el("span", { class: "ob-stat__label" }, label),
      el("span", { class: cls ? `ob-stat__value ${cls}` : "ob-stat__value" }, value),
    );
  }

  function renderProfile(user) {
    const rank = rankOf(user.rank);
    const name = [user.firstName, user.lastName].filter(isText).join(" ");
    const about = [name, user.organization].filter(isText).join(" · ");
    const rated = Number.isInteger(user.rating);
    const photo = avatarUrl(user);
    const avatar = photo && el("img", { src: photo, alt: `Аватар ${user.handle}`, width: 80, height: 80 });
    if (avatar) avatar.addEventListener("error", () => avatar.remove()); // сервер картинок Codeforces бывает недоступен
    // первая буква «легендарного» цвета текста — только у хендла, как на Codeforces
    const tileColor = rank && rank.color === "legendary" ? "gm" : rank && rank.color;
    return el(
      "div",
      { class: "ob-card ob-profile" },
      avatar,
      el(
        "div",
        { class: "ob-profile__info" },
        el(
          "p",
          { class: "ob-profile__handle" },
          el(
            "a",
            { href: `https://codeforces.com/profile/${encodeURIComponent(user.handle)}`, class: rank && rankClass(rank.color) },
            user.handle,
          ),
        ),
        about && el("p", { class: "ob-note" }, about),
        el(
          "div",
          { class: "ob-stats" },
          stat("Рейтинг", rated ? String(user.rating) : "—", rated && rankClass(ratingColor(user.rating))),
          rated && Number.isInteger(user.maxRating) && stat("Максимум", String(user.maxRating), rankClass(ratingColor(user.maxRating))),
          stat("Звание", rank ? rank.text : "—", rankClass(tileColor)),
        ),
        !rated && el("p", { class: "ob-note" }, "Рейтинга пока нет: рейтинговых контестов ещё не было."),
      ),
    );
  }

  function levelBadge(topic) {
    const level = LEVELS.get(topic.level);
    return isText(topic.level) && el("span", { class: level ? `ob-lvl ob-lvl--${level}` : "ob-lvl" }, topic.level);
  }

  function progressBar(n, goal) {
    const percent = goal > 0 ? Math.min(100, (100 * n) / goal) : 0;
    return el("div", { class: "ob-bar", style: `--p: ${percent.toFixed(1)}%` });
  }

  async function renderTopics(topics, solved, user, catalog) {
    if (!topics) {
      return [
        el(
          "div",
          { class: "admonition warning" },
          el("p", { class: "admonition-title" }, "Не удалось загрузить список тем"),
          el("p", {}, "Обнови страницу. Статистика по решённым задачам — ниже."),
        ),
      ];
    }
    const training = trainingLevel(user, solved);
    const ratings = selfRatings(user.handle, topics);
    const solvedNames = new Set([...solved.values()].map((p) => p.name));
    const rows = await Promise.all(topics.map(async (topic, order) => {
      const meta = catalog && catalog.topics[topic.slug];
      const progress = await progressOf(topic, solved, catalog, training.target);
      let candidates;
      if (catalog) {
        const keys = new Set(meta && Array.isArray(meta.keys) ? meta.keys : []);
        const curated = !topic.cf_tags.length || CURATED_TOPICS.has(topic.slug);
        candidates = catalog.problems.filter((p) => curated || p.gym ? keys.has(problemKey(p))
          : topic.cf_tags.every((tag) => tagsOf(p).includes(tag)))
          .map((p) => ({ ...p, key: problemKey(p), url: p.gym
            ? `https://codeforces.com/gym/${p.contestId}/problem/${p.index}`
            : `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}` }));
      } else {
        // Каталог не загрузился: доступны задачи из существующих подборок.
        candidates = (progress.selection || await loadSelection(topic.slug)).problems;
      }
      candidates = candidates.filter((p) => p.key && !solved.has(p.key) && !solvedNames.has(p.name)
        && Number.isInteger(p.rating) && p.rating >= training.low && p.rating <= training.high)
        .sort((a, b) => Math.abs(a.rating - training.target) - Math.abs(b.rating - training.target)
          || (b.contestId || 0) - (a.contestId || 0) || a.key.localeCompare(b.key));
      return { topic, order, ...progress, grade: cfGrade(progress.n, progress.near), candidates, ready: !!(meta && meta.ready) };
    }));
    const recommendations = el("div", { class: "ob-recommendations", "aria-live": "polite" });
    const refresh = () => recommendations.replaceChildren(renderNext(rows, training, ratings, !!catalog));
    refresh();
    return [recommendations, renderTopicTable(rows, training, ratings, user.handle, refresh)];
  }

  function renderNext(rows, training, ratings, hasCatalog) {
    const accessible = (row) => row.topic.level !== "продвинутый" || training.target >= 1800;
    const available = rows.filter((row) => row.candidates.length && accessible(row)
      && (row.topic.level !== "средний" || training.target >= 1100));
    const pool = available.map((row) => {
      const stars = ratings.get(row.topic.slug);
      return { row, stars, tier: tierOf(stars, row.grade) };
    }).sort((a, b) => a.tier - b.tier || a.row.near - b.row.near || (a.row.n || 0) - (b.row.n || 0) || a.row.order - b.row.order);
    const next = [];
    const usedKeys = new Set();
    const usedNames = new Set();
    for (const { row, stars, tier } of pool) {
      // Тему с пробелом начинаем с самой простой задачи диапазона.
      const candidates = tier === 0 ? [...row.candidates].sort((a, b) => a.rating - b.rating) : row.candidates;
      const problem = candidates.find((p) => !usedKeys.has(p.key) && !usedNames.has(p.name));
      if (!problem) continue;
      next.push(renderNextCard(row, problem, stars, tier, training));
      usedKeys.add(problem.key);
      usedNames.add(problem.name);
      if (next.length === 2) break;
    }
    const basis = [training.rating != null ? `рейтинг ${training.rating}` : "рейтинга пока нет",
      training.recent ? `последние ${training.recent} решённых задач с рейтингом` : "решений с рейтингом пока нет"];
    return el(
      "section",
      {},
      el("h2", {}, "Что дальше"),
      el("div", { class: "ob-card ob-training" },
        el("p", { class: "ob-kicker" }, "Твой ориентир для тренировки"),
        el("p", { class: "ob-training__range" }, `${training.low}–${training.high}`),
        el("p", { class: "ob-note" }, `Учтены: ${basis.join("; ")}. Это ориентир, а не оценка твоих знаний.`),
        el("details", {}, el("summary", {}, "Как подбираются задачи"),
          el("p", {}, "Берём текущий рейтинг и сложность последних 30 уникальных решённых задач. Недавняя практика может сдвинуть ориентир на 100 пунктов; без рейтинга опираемся на решения. Для первого старта — 800–1000."),
          el("p", {}, "Предлагаем нерешённые задачи в этом диапазоне. Темы идут по очереди: сначала те, что ты оценил на 1–2 ★ (для них — самая простая задача диапазона), потом новые темы без практики, потом понятые темы, где мало решённых задач. Темы на 4–5 ★, где и по задачам CF «уверенно», — в последнюю очередь. Внутри очереди раньше идут темы с меньшей практикой на твоём уровне."))),
      !ratings.size && el("p", {}, el("strong", {}, "Оцени темы звёздами"), " в таблице ", el("a", { href: "#ob-topics" }, "«Темы»"),
        " ниже — подборка учтёт, как ты понял каждую тему."),
      !hasCatalog && el("p", { class: "ob-note" }, "Общий каталог сейчас недоступен. Подбираем задачи из подборок сайта; статистика и самооценка работают."),
      next.length
        ? el("div", { class: "grid" }, next)
        : el("p", {}, "Подходящих нерешённых задач в этом диапазоне пока нет. Открой подборку нужной темы ниже."),
    );
  }

  function renderNextCard({ topic, n, near, total, ready, grade }, problem, stars, tier, training) {
    return el(
      "div",
      { class: "ob-card ob-next" },
      el("p", { class: "ob-kicker" }, TIER_KICKERS[tier]),
      el("p", {}, el("strong", {}, topic.title), " ", levelBadge(topic)),
      el("p", { class: "ob-note" }, `Самооценка: ${stars ? `${"★".repeat(stars)}${"☆".repeat(5 - stars)} ${STAR_WORDS[stars]}` : STAR_WORDS[0]}. Практика на CF: ${grade == null ? "нет данных" : CF_GRADES[grade][0]}.`),
      el("p", { class: "ob-note" }, `${total == null ? "По тегам и подборке" : "Из подборки"}: ${n || 0} решений, ${near} сложностью от ${training.low}.`),
      el("p", {}, el("a", { href: problem.url, class: "ob-recommended-problem" }, problem.name), " ",
        el("span", { class: "ob-chip" }, problem.estimated ? `≈ ${problem.rating}` : `CF ${problem.rating}`)),
      problem.estimated ? el("p", { class: "ob-note" }, "≈ — оценка ИИ по шкале Codeforces.") : null,
      el("p", {}, el("a", { class: "ob-btn ob-btn--primary", href: problem.url }, "Решать задачу →")),
      el("p", { class: "ob-note" }, ready ? el("a", { href: pageUrl("theory", topic.slug) }, "Читать статью")
        : "Статья готовится", " · ", el("a", { href: pageUrl("practice", topic.slug) }, "Вся подборка")),
    );
  }

  function renderTopicTable(rows, training, ratings, handle, refresh) {
    const savedMessage = el("p", { class: "ob-note", "aria-live": "polite" }, "Самооценка сохраняется в этом браузере отдельно для каждого хендла.");
    const count = el("span", { class: "ob-chip" }, `Оценено: ${ratings.size} / ${rows.length}`);
    const body = rows.map(({ topic, n, near, total, ready, grade }) => {
      const word = el("span", { class: "ob-note" });
      const hint = el("span", { class: "ob-note" });
      const stars = [1, 2, 3, 4, 5].map((value) => el("button", { type: "button", class: "ob-star", "data-topic": topic.slug,
        "data-value": value, title: STAR_WORDS[value], "aria-label": `${topic.title}: ${value} из 5 — ${STAR_WORDS[value]}` }, "★"));
      const paint = () => {
        const value = ratings.get(topic.slug) || 0;
        stars.forEach((star, i) => star.setAttribute("aria-pressed", String(i < value)));
        word.textContent = STAR_WORDS[value];
        hint.textContent = value && value <= 2 && grade >= 2 ? "Задач решено немало — возможно, хватит перечитать статью."
          : value >= 4 && grade === 0 ? "Задач по теме пока нет — проверь себя на подборке." : "";
      };
      stars.forEach((star, i) => star.addEventListener("click", () => {
        // Повторное нажатие на ту же звезду снимает оценку.
        if (ratings.get(topic.slug) === i + 1) ratings.delete(topic.slug);
        else ratings.set(topic.slug, i + 1);
        const saved = save(STARS_KEY + handle.toLowerCase(), JSON.stringify(Object.fromEntries(ratings)));
        savedMessage.textContent = saved ? "Самооценка сохранена. Рекомендации обновлены."
          : "Браузер не разрешает сохранять самооценку. Она действует до перезагрузки страницы.";
        count.textContent = `Оценено: ${ratings.size} / ${rows.length}`;
        paint();
        refresh();
      }));
      paint();
      const [label, status] = grade == null ? ["нет данных", "skip"] : CF_GRADES[grade];
      return el(
        "tr",
        {},
        el(
          "td",
          {},
          topic.title,
          el("br"),
          levelBadge(topic),
        ),
        // Самооценка — сразу после темы: на телефоне таблица прокручивается вбок, звёзды должны быть видны.
        el("td", {}, el("div", { class: "ob-stars", role: "group", "aria-label": `Самооценка: ${topic.title}` }, stars), word, el("br"), hint),
        el("td", {}, el("span", { class: `ob-lvl ob-status--${status}` }, grade == null ? label : `${"●".repeat(grade)}${"○".repeat(3 - grade)} ${label}`),
          el("br"), el("span", { class: "ob-note" }, n == null ? "Нет CF-тега или задач для подсчёта"
            : `${n}${total != null ? ` из ${total}` : ""} решено · ${near} от ${training.low}${total != null ? " · по подборке" : " · по тегам и подборке"}`)),
        el(
          "td",
          {},
          ready ? el("a", { href: pageUrl("theory", topic.slug) }, "статья") : el("span", { class: "ob-note" }, "статья готовится"),
          " · ",
          el("a", { href: pageUrl("practice", topic.slug) }, "подборка"),
        ),
      );
    });
    return el(
      "section",
      { id: "ob-topics" },
      el("h2", {}, "Темы"),
      el("p", {}, count),
      el("p", {}, el("strong", {}, "Поставь звёзды в колонке «Самооценка»"),
        ": 1 ★ — не понял, 3 ★ — понял основное, 5 ★ — могу объяснить другому. Повторное нажатие на ту же звезду снимает оценку. «Что дальше» сразу учтёт оценку; решённых задач она не добавляет."),
      savedMessage,
      el("div", { class: "ob-topics-scroll", tabindex: "0", role: "region", "aria-label": "Прогресс по темам" }, el(
        "table", {},
        el("thead", {}, el("tr", {}, ["Тема", "Самооценка", "Практика на CF", "Материалы"].map((h) => el("th", {}, h)))),
        el("tbody", {}, body),
      )),
      el("details", {}, el("summary", {}, "Как считается «Практика на CF»"), el(
        "p",
        { class: "ob-note" },
        `«Начал» — 1–2 решённые задачи по теме, «в процессе» — 3–4 или почти все ниже ориентира, «уверенно» — 5 и больше, из них хотя бы 2 сложностью от ${training.low}. Практика считается по всей полученной истории Codeforces: по тегам и задачам подборки, включая Gym. Для тем без CF-тега считаем только подборку. Решения Gym засчитываются, если Codeforces вернул их в истории; оценки ИИ не заменяют официальный рейтинг решений. Общие теги дают приблизительное соответствие: например, задача с тегом trees не обязательно требует LCA.`,
      )),
    );
  }

  // entries — [подпись, число, класс подписи]
  function countTable(title, entries) {
    const max = Math.max(...entries.map((entry) => entry[1]));
    return el(
      "table",
      {},
      el("thead", {}, el("tr", {}, el("th", {}, title), el("th", {}, "Задач"))),
      el(
        "tbody",
        {},
        entries.map(([label, count, cls]) =>
          el("tr", {}, el("td", {}, el("span", { class: cls }, String(label))), el("td", {}, String(count), progressBar(count, max))),
        ),
      ),
    );
  }

  function renderStats(solved) {
    const problems = [...solved.values()];
    const head = el("h2", {}, "Решённые задачи");
    if (!problems.length) {
      return el("section", {}, head, el("p", {}, "Пока ни одной задачи с вердиктом OK. Начни с блока «Что дальше»."));
    }
    const tags = [...countBy(problems, tagsOf)]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => [tag, count, null]);
    const last = (rating) => (rating == null ? Infinity : rating); // «без рейтинга» — в конце
    const ratings = [...countBy(problems, (p) => [Number.isInteger(p.rating) ? p.rating : null])]
      .sort((a, b) => last(a[0]) - last(b[0]))
      .map(([rating, count]) => (rating == null ? ["без рейтинга", count, null] : [rating, count, rankClass(ratingColor(rating))]));
    const rated = problems.map((p) => p.rating).filter(Number.isInteger);
    const hardest = rated.length ? Math.max(...rated) : null;
    return el(
      "section",
      {},
      head,
      el(
        "div",
        { class: "ob-stats" },
        stat("Решено задач", String(problems.length)),
        hardest != null && stat("Самая сложная", String(hardest), rankClass(ratingColor(hardest))),
      ),
      el("p", { class: "ob-note" }, "Уникальные задачи с вердиктом OK: каждая считается один раз, сколько бы ни было посылок."),
      el(
        "div",
        { class: "grid" },
        el("div", {}, el("h3", {}, "По тегам"), tags.length ? countTable("Тег", tags) : el("p", {}, "У решённых задач нет тегов.")),
        el("div", {}, el("h3", {}, "По рейтингу задач"), countTable("Рейтинг", ratings)),
      ),
    );
  }

  if (window.document$) document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
