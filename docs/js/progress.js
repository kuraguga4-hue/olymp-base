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
  const TIMEOUT_MS = 20000;
  const HANDLE_KEY = "olymp-base:cf-handle";
  const LAST_CALL_KEY = "olymp-base:cf-last-call";
  const HANDLE = /^[A-Za-z0-9_.-]{1,24}$/;
  const CF_PROBLEM_PATH = /^\/(?:problemset\/problem\/(\d+)\/([A-Za-z]\d?)|contest\/(\d+)\/problem\/([A-Za-z]\d?))\/?$/;

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
  const STATUSES = [
    { min: 5, order: 2, cls: "done", text: "уверенно" },
    { min: 1, order: 1, cls: "progress", text: "в процессе" },
    { min: 0, order: 0, cls: "none", text: "не начато" },
  ];
  const ERRORS = {
    network: ["Нет связи с Codeforces", "Проверь интернет и попробуй ещё раз."],
    timeout: ["Codeforces долго не отвечает", "Попробуй ещё раз через минуту."],
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

  // Метка последнего запроса лежит и в localStorage — так лимит держится и после перезагрузки страницы.
  async function waitForSlot() {
    const last = Math.max(lastCall, Number(load(LAST_CALL_KEY)) || 0);
    const wait = Math.min(API_GAP_MS, last + API_GAP_MS - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCall = Date.now();
    save(LAST_CALL_KEY, String(lastCall));
  }

  async function request(method, params) {
    const url = new URL(method, API);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let data;
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: "omit" });
      data = await response.json();
    } catch (error) {
      if (error.name === "AbortError") throw new CfError("timeout");
      throw new CfError(error instanceof SyntaxError ? "unavailable" : "network");
    } finally {
      clearTimeout(timer);
    }
    if (data && data.status === "OK") return data.result;
    const comment = data && typeof data.comment === "string" ? data.comment : "";
    if (/not found/i.test(comment)) throw new CfError("not-found");
    if (/limit exceeded/i.test(comment)) throw new CfError("limit");
    throw new CfError("unavailable");
  }

  // ---------- Данные сайта: темы и подборки ----------

  let topicsPromise = null;

  function loadTopics() {
    topicsPromise ||= fetch(new URL("assets/topics.json", SITE))
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((list) => list.filter((t) => t && /^[a-z0-9-]+$/.test(t.slug) && isText(t.title) && Array.isArray(t.cf_tags)))
      .catch(() => {
        topicsPromise = null; // в следующий раз попробуем снова
        return null;
      });
    return topicsPromise;
  }

  const selections = new Map();

  // Задачи подборки — первая внешняя ссылка в каждой строке таблиц docs/practice/<slug>.md.
  function loadSelection(slug) {
    if (!selections.has(slug)) {
      const url = new URL(`practice/${slug}/`, SITE);
      const promise = fetch(url)
        .then((response) => (response.ok ? response.text() : Promise.reject()))
        .then((html) => {
          const page = new DOMParser().parseFromString(html, "text/html");
          const content = page.querySelector("article") || page.body;
          const problems = [];
          for (const row of content.querySelectorAll("table tbody tr")) {
            for (const link of row.querySelectorAll("a[href]")) {
              const href = safeUrl(link.getAttribute("href"), url);
              if (!href || href.origin === SITE.origin) continue;
              problems.push({ url: href.href, name: link.textContent.trim() || href.href, key: cfKey(href) });
              break;
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
      if (key && !solved.has(key)) solved.set(key, problem);
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

  function statusOf(n) {
    return STATUSES.find((s) => n >= s.min);
  }

  async function progressOf(topic, solved) {
    if (topic.cf_tags.length) {
      const tags = new Set(topic.cf_tags);
      const n = [...solved.values()].filter((p) => tagsOf(p).some((t) => tags.has(t))).length;
      return { n, status: statusOf(n) };
    }
    // У темы нет тега на Codeforces — считаем решённые задачи Codeforces из её подборки.
    const selection = await loadSelection(topic.slug);
    const keys = new Set(selection.problems.map((p) => p.key).filter(Boolean));
    if (!keys.size) return { n: null, status: null, selection };
    const n = [...keys].filter((key) => solved.has(key)).length;
    return { n, total: keys.size, status: n === keys.size ? STATUSES[0] : statusOf(n), selection };
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
    } catch {
      // хранилище недоступно (приватный режим) — просто не запоминаем
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
    ui.root.setAttribute("aria-busy", "true");
    ui.result.replaceChildren();
    const topicsReady = loadTopics();
    try {
      note(ui, "Загружаем профиль…");
      const users = await cfApi("user.info", { handles: handle });
      const user = Array.isArray(users) ? users[0] : null;
      if (!user || !isText(user.handle)) throw new CfError("unavailable");
      save(HANDLE_KEY, user.handle);
      ui.input.value = user.handle;
      ui.result.append(renderProfile(user));

      note(ui, "Загружаем решённые задачи…");
      const submissions = await cfApi("user.status", { handle: user.handle });
      if (!Array.isArray(submissions)) throw new CfError("unavailable");
      const solved = solvedProblems(submissions);
      ui.result.append(...(await renderTopics(await topicsReady, solved)), renderStats(solved));
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
      ui.root.removeAttribute("aria-busy");
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

  function statusBadge(status) {
    return el("span", { class: `ob-lvl ob-status--${status.cls}` }, status.text);
  }

  function levelBadge(topic) {
    const level = LEVELS.get(topic.level);
    return isText(topic.level) && el("span", { class: level ? `ob-lvl ob-lvl--${level}` : "ob-lvl" }, topic.level);
  }

  function progressBar(n, goal) {
    const percent = goal > 0 ? Math.min(100, (100 * n) / goal) : 0;
    return el("div", { class: "ob-bar", style: `--p: ${percent.toFixed(1)}%` });
  }

  async function renderTopics(topics, solved) {
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
    const rows = await Promise.all(
      topics.map(async (topic, order) => ({ topic, order, ...(await progressOf(topic, solved)) })),
    );
    return [renderNext(rows), renderTopicTable(rows)];
  }

  // «Что дальше»: две темы с наименьшим прогрессом; при равенстве — сначала уровень проще, потом порядок topics.json.
  function renderNext(rows) {
    const levels = [...LEVELS.keys()];
    const level = (topic) => (levels.includes(topic.level) ? levels.indexOf(topic.level) : levels.length);
    const next = rows
      .filter((row) => row.status)
      .sort((a, b) => a.status.order - b.status.order || a.n - b.n || level(a.topic) - level(b.topic) || a.order - b.order)
      .slice(0, 2);
    return el(
      "section",
      {},
      el("h2", {}, "Что дальше"),
      el("p", { class: "ob-note" }, "Две темы с наименьшим прогрессом; при равенстве — сначала та, что проще."),
      next.length
        ? el("div", { class: "grid" }, next.map(renderNextCard))
        : el("p", {}, "Пока не из чего выбрать: прогресс по темам не считается."),
    );
  }

  function renderNextCard({ topic, n, total, status, selection }) {
    const first = el("p", {}, "Первая задача: ", el("span", { class: "ob-note" }, "смотрим подборку…"));
    Promise.resolve(selection || loadSelection(topic.slug)).then(({ problems, failed }) => {
      const practice = el("a", { href: pageUrl("practice", topic.slug) }, "открыть подборку");
      if (problems.length) first.replaceChildren("Первая задача: ", el("a", { href: problems[0].url }, problems[0].name));
      else first.replaceChildren(failed ? "Подборку не удалось загрузить — " : "Подборка ещё в работе — ", practice);
    });
    return el(
      "div",
      { class: "ob-card ob-next" },
      el("p", {}, el("strong", {}, topic.title), " ", levelBadge(topic)),
      el("p", {}, total == null ? `Решено задач: ${n}` : `Решено из подборки: ${n} из ${total}`, " ", statusBadge(status)),
      progressBar(n, total == null ? STATUSES[0].min : total),
      el(
        "p",
        {},
        el("a", { class: "ob-btn", href: pageUrl("theory", topic.slug) }, "Читать статью ", el("span", { class: "ob-btn__arrow" }, "→")),
      ),
      first,
    );
  }

  function renderTopicTable(rows) {
    const bySelection = [];
    const uncounted = [];
    const body = rows.map(({ topic, n, total, status }) => {
      let solvedCell = String(n);
      let statusCell = status && statusBadge(status);
      if (!status) {
        solvedCell = "—";
        statusCell = el("span", { class: "ob-lvl ob-status--skip" }, "не считается");
        uncounted.push(`«${topic.title}»`);
      } else if (total != null) {
        solvedCell = `${n} из ${total} в подборке`;
        bySelection.push(`«${topic.title}»`);
      }
      return el(
        "tr",
        {},
        el(
          "td",
          {},
          topic.title,
          el("br"),
          levelBadge(topic),
          topic.cf_tags.map((tag) => [" ", el("span", { class: "ob-chip" }, tag)]),
        ),
        el("td", {}, solvedCell),
        el("td", {}, statusCell),
        el(
          "td",
          {},
          el("a", { href: pageUrl("theory", topic.slug) }, "статья"),
          " · ",
          el("a", { href: pageUrl("practice", topic.slug) }, "подборка"),
        ),
      );
    });
    return el(
      "section",
      {},
      el("h2", {}, "Темы"),
      el(
        "p",
        { class: "ob-note" },
        "Задача засчитывается теме, если у неё на Codeforces есть хотя бы один тег темы. Статус: 0 задач — не начато, 1–4 — в процессе, 5 и больше — уверенно.",
      ),
      el(
        "table",
        {},
        el("thead", {}, el("tr", {}, ["Тема", "Решено", "Статус", "Материалы"].map((h) => el("th", {}, h)))),
        el("tbody", {}, body),
      ),
      bySelection.length > 0 &&
        el(
          "p",
          { class: "ob-note" },
          bySelection.length === 1
            ? `${bySelection[0]} считается по подборке: у темы нет тега на Codeforces.`
            : `${bySelection.join(", ")} считаются по подборкам: у этих тем нет тега на Codeforces.`,
        ),
      uncounted.length > 0 &&
        el(
          "p",
          { class: "ob-note" },
          uncounted.length === 1
            ? `${uncounted[0]} пока не считается: у темы нет тега на Codeforces, а подборка ещё в работе — прогресс появится, когда в ней будут задачи с Codeforces.`
            : `${uncounted.join(", ")} пока не считаются: у этих тем нет тега на Codeforces, а подборки ещё в работе — прогресс появится, когда в них будут задачи с Codeforces.`,
        ),
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
    const ratings = [...countBy(problems, (p) => [Number.isInteger(p.rating) ? p.rating : null])]
      .sort((a, b) => (a[0] ?? Infinity) - (b[0] ?? Infinity))
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
