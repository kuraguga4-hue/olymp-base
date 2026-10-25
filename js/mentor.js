// Наставник: вопрос + выбранный контекст, без доступа к ключу API или выполнению кода.
(() => {
  const script = document.currentScript || document.querySelector('script[src*="js/mentor.js"]');
  const site = new URL("../", script.src);
  let ui;
  let path = "";
  let history = [];
  let context = {};
  let version = 0;
  let active;

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs || {})) node.setAttribute(name, value);
    node.append(...children.flat().filter((child) => child != null));
    return node;
  }

  function pageContext() {
    const heading = document.querySelector("article h1")?.cloneNode(true);
    if (heading) heading.querySelectorAll(".headerlink").forEach((link) => link.remove());
    return { path: location.pathname, title: (heading?.textContent || document.title).trim().slice(0, 200), selection: "", task: "" };
  }

  function reset(nextContext) {
    version += 1;
    if (active) active.abort();
    active = null;
    history = [];
    context = nextContext;
    ui.log.replaceChildren();
    ui.status.textContent = "";
    ui.send.disabled = false;
    ui.input.disabled = false;
    ui.input.value = "";
    ui.label.textContent = context.task ? `Задача: ${context.title}` : context.selection ? `Выделенный фрагмент · ${context.title}` : `Страница: ${context.title}`;
  }

  function open(task) {
    if (task && typeof task.text === "string") {
      reset({ ...pageContext(), title: String(task.title || "Тренировочная задача").slice(0, 200), task: task.text.slice(0, 12000) });
      ui.mode.value = "hint";
      ui.input.value = "Помоги начать: дай одну подсказку без готового решения.";
    } else {
      const selection = window.getSelection();
      const article = document.querySelector("article.md-content__inner");
      if (selection && article && article.contains(selection.anchorNode) && article.contains(selection.focusNode)) {
        const text = selection.toString().trim().slice(0, 6000);
        if (text && text !== context.selection) reset({ ...pageContext(), selection: text });
      }
    }
    if (!ui.dialog.open) ui.dialog.showModal();
    ui.input.focus();
  }

  async function endpoint() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(new URL("assets/generator.json", site), { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось подключить наставника. Попробуй позже.");
      const data = await response.json();
      const raw = data.mentor_endpoint || new URL("mentor", new URL(data.endpoint, site)).href;
      const local = ["localhost", "127.0.0.1"].includes(location.hostname);
      // На ноутбуке — всегда свой сервер: демо не зависит от публичного адреса API.
      if (local) return location.port === "8002" ? new URL("/api/mentor", location.href).href : "http://127.0.0.1:8002/api/mentor";
      const url = new URL(raw, site);
      if (url.protocol !== "https:" && !(local && url.protocol === "http:")) throw new Error("Наставник сейчас недоступен.");
      return url.href;
    } finally { clearTimeout(timer); }
  }

  function bubble(role, text) {
    const node = el("div", { class: `ob-mentor-message ob-mentor-message--${role}` },
      el("p", { class: "ob-mentor-speaker" }, role === "user" ? "Ты" : "ИИ-наставник"));
    // Только текст и ограждённые блоки кода: HTML и команды из ответа не исполняются.
    const blocks = text.split(/(```[\s\S]*?```)/g);
    for (const block of blocks) {
      if (block.startsWith("```")) {
        const code = block.slice(3, -3).replace(/^[a-zA-Z0-9_+-]*\n/, "");
        node.append(el("pre", {}, el("code", {}, code)));
      } else if (block.trim()) node.append(el("p", { class: "ob-mentor-text" }, block.trim()));
    }
    ui.log.append(node);
    ui.log.scrollTop = ui.log.scrollHeight;
    return node;
  }

  async function send(event) {
    event.preventDefault();
    const message = ui.input.value.trim();
    if (!message || ui.send.disabled) return;
    const currentVersion = version;
    const controller = new AbortController();
    active = controller;
    const timer = setTimeout(() => controller.abort(), 60000);
    ui.send.disabled = true;
    ui.input.disabled = true;
    ui.status.textContent = "Разбираем вопрос…";
    const userBubble = bubble("user", message);
    try {
      const payload = { message, mode: ui.mode.value, context: { ...context }, history: history.slice(-8) };
      const size = () => new TextEncoder().encode(JSON.stringify(payload)).length;
      while (size() > 38000 && payload.history.length) payload.history.splice(0, 2);
      for (const key of ["selection", "task"]) {
        while (size() > 38000 && payload.context[key].length) payload.context[key] = payload.context[key].slice(0, Math.floor(payload.context[key].length / 2));
      }
      const response = await fetch(await endpoint(), { method: "POST", credentials: "omit",
        headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify(payload) });
      let data;
      try { data = await response.json(); } catch { throw new Error("Наставник сейчас недоступен. Попробуй позже."); }
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Не удалось получить ответ.");
      if (typeof data.reply !== "string" || !data.reply.trim() || data.reply.length > 12000) throw new Error("Получен некорректный ответ. Попробуй ещё раз.");
      if (version !== currentVersion) return;
      const answer = bubble("assistant", data.reply);
      if (Array.isArray(data.sources)) {
        const links = [];
        for (const source of data.sources.slice(0, 6)) {
          if (!source || typeof source.title !== "string" || typeof source.url !== "string") continue;
          try {
            const url = new URL(source.url, site);
            if (!["https:", "http:"].includes(url.protocol)) continue;
            links.push(el("li", {}, el("a", { href: url.href, target: "_blank", rel: "noopener noreferrer" },
              `${source.kind === "ARTICLE_EXCERPT" ? "Статья" : source.kind === "EDITORIAL" ? "Разбор" : "Карточка"}: ${source.title.slice(0, 200)}`)));
          } catch { /* неверная ссылка не мешает прочитать ответ */ }
        }
        if (links.length) answer.append(el("p", { class: "ob-note" }, "Материалы из базы"), el("ul", {}, links));
      }
      ui.log.scrollTop = ui.log.scrollHeight;
      history.push({ role: "user", content: message }, { role: "assistant", content: data.reply.slice(0, 4000) });
      history = history.slice(-8);
      ui.input.value = "";
      ui.status.textContent = "";
    } catch (error) {
      if (version !== currentVersion) return;
      userBubble.remove();
      ui.status.textContent = error.name === "AbortError" ? "Ответ занял слишком долго. Попробуй ещё раз."
        : error instanceof TypeError ? "Нет связи с наставником. Проверь соединение и попробуй позже." : error.message;
    } finally {
      clearTimeout(timer);
      if (version === currentVersion) {
        active = null;
        ui.send.disabled = false;
        ui.input.disabled = false;
        if (ui.dialog.open) ui.input.focus();
      }
    }
  }

  function init() {
    if (!document.querySelector("article.md-content__inner")) return;
    if (!ui) {
      const launcher = el("button", { type: "button", class: "ob-btn ob-btn--primary ob-mentor-launch", "aria-haspopup": "dialog" }, "Спросить ИИ");
      const close = el("button", { type: "button", class: "ob-mentor-close", "aria-label": "Закрыть наставника" }, "×");
      const clear = el("button", { type: "button", class: "ob-btn ob-mentor-clear" }, "Новый разговор");
      const dialog = el("dialog", { class: "ob-mentor-dialog", "aria-labelledby": "mentor-title" });
      const input = el("textarea", { id: "mentor-question", class: "ob-mentor-input", rows: "3", maxlength: "4000", required: "",
        placeholder: "Напиши вопрос, свою идею или вставь код…" });
      const mode = el("select", { class: "ob-input", id: "mentor-mode" },
        [["hint", "Одна подсказка"], ["explain", "Объяснить подробнее"], ["review", "Проверить мою идею / код"]]
          .map(([value, title]) => el("option", { value }, title)));
      const submit = el("button", { type: "submit", class: "ob-btn ob-btn--primary" }, "Отправить");
      const log = el("div", { class: "ob-mentor-log", role: "log", "aria-live": "polite", "aria-label": "Переписка с наставником" });
      const label = el("p", { class: "ob-note ob-mentor-context" });
      const status = el("p", { class: "ob-note ob-mentor-status", role: "status" });
      const form = el("form", { class: "ob-mentor-form" }, el("label", { for: "mentor-mode" }, "Как помочь"), mode,
        el("label", { for: "mentor-question" }, "Твой вопрос"), input, status, submit);
      dialog.append(el("div", { class: "ob-mentor-head" }, el("h2", { id: "mentor-title" }, "ИИ-наставник"), close),
        label, el("p", { class: "ob-note ob-mentor-intro" }, "Спроси о теме или укажи номер задачи, например 1676E. Наставник найдёт материалы в нашей базе. Можно выделить непонятный фрагмент перед открытием. Ответ ИИ может потребовать проверки."),
        log, clear, form);
      document.body.append(el("div", { class: "md-typeset", id: "ai-mentor" }, launcher, dialog));
      ui = { dialog, input, mode, send: submit, log, label, status };
      launcher.addEventListener("click", () => open());
      close.addEventListener("click", () => dialog.close());
      clear.addEventListener("click", () => { reset(pageContext()); input.focus(); });
      form.addEventListener("submit", send);
      input.addEventListener("keydown", (event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") form.requestSubmit(); });
      window.addEventListener("ob:ask-mentor", (event) => open(event.detail));
    }
    if (path !== location.pathname) { path = location.pathname; reset(pageContext()); }
  }

  if (window.document$) document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
