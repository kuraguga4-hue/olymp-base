// Генератор получает только готовую задачу: ключ AITUNNEL остаётся на сервере.
(() => {
  const script = document.currentScript || document.querySelector('script[src*="js/generator.js"]');
  const site = new URL("../", script.src);
  const topics = [
    ["binary-search", "Бинарный поиск"], ["prefix-sums", "Префиксные суммы"],
    ["two-pointers", "Два указателя"], ["greedy", "Жадные алгоритмы"],
    ["dp-intro", "Динамическое программирование"], ["shortest-paths", "Кратчайшие пути"],
  ];

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, value);
    node.append(...children.flat().filter((value) => value != null));
    return node;
  }

  async function endpoint() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(new URL("assets/generator.json", site), { signal: controller.signal });
      if (!response.ok) throw new Error("config");
      const config = await response.json();
      const local = ["localhost", "127.0.0.1"].includes(location.hostname);
      if (local && config.endpoint === "/api/generate" && location.port !== "8002") {
        return new URL("http://127.0.0.1:8002/api/generate");
      }
      const url = new URL(config.endpoint, site);
      if (url.protocol !== "https:" && !(local && url.protocol === "http:")) throw new Error("config");
      return url;
    } finally { clearTimeout(timer); }
  }

  function validTask(data) {
    return data && ["id", "topic", "title", "story", "statement", "input_format", "output_format", "hint"]
      .every((key) => typeof data[key] === "string")
      && (typeof data.constraints === "string" || (Array.isArray(data.constraints) && data.constraints.every((s) => typeof s === "string")))
      && ["examples", "tests"].every((key) => Array.isArray(data[key]) && data[key].length > 0 && data[key].length <= 30
        && data[key].every((test) => test && typeof test.input === "string" && typeof test.output === "string"));
  }

  function sample(test, i) {
    return el("div", { class: "ob-gen__sample" }, el("p", { class: "ob-note" }, `Пример ${i + 1}`),
      el("div", { class: "grid" },
        el("div", {}, el("strong", {}, "Ввод"), el("pre", {}, el("code", {}, test.input))),
        el("div", {}, el("strong", {}, "Вывод"), el("pre", {}, el("code", {}, test.output)))));
  }

  function renderTask(data) {
    const discuss = el("button", { type: "button", class: "ob-btn ob-btn--primary" }, "Обсудить задачу с ИИ");
    discuss.addEventListener("click", () => window.dispatchEvent(new CustomEvent("ob:ask-mentor", { detail: {
      title: data.title,
      text: [data.title, data.story, data.statement, data.input_format, data.output_format,
        Array.isArray(data.constraints) ? data.constraints.join("\n") : data.constraints,
        ...data.examples.map((sample) => `Ввод:\n${sample.input}\nВывод:\n${sample.output}`)].join("\n\n"),
    } })));
    const download = el("button", { type: "button", class: "ob-btn" }, `Скачать тесты (${data.tests.length})`);
    download.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify({ topic: data.topic, id: data.id, tests: data.tests }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = el("a", { href: url, download: `training-${data.topic.replace(/[^a-z0-9-]/g, "")}-tests.json` });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
    const constraints = Array.isArray(data.constraints) ? data.constraints.join("\n") : data.constraints;
    return el("article", { class: "ob-card ob-generated-task", tabindex: "-1" },
      el("p", { class: "ob-kicker" }, "Новая тренировочная задача"),
      el("h3", {}, data.title), el("p", {}, data.story),
      el("h4", {}, "Условие"), el("p", { class: "ob-gen__multiline" }, data.statement),
      el("h4", {}, "Формат ввода"), el("p", { class: "ob-gen__multiline" }, data.input_format),
      el("h4", {}, "Формат вывода"), el("p", { class: "ob-gen__multiline" }, data.output_format),
      el("h4", {}, "Ограничения"), el("p", { class: "ob-gen__multiline" }, constraints),
      ...data.examples.map(sample),
      el("details", {}, el("summary", {}, "Подсказка"), el("p", {}, data.hint)),
      el("p", { class: "ob-note" }, "Тесты содержат входные данные и ожидаемые ответы для проверки твоего решения. Решение в браузере не запускается."),
      el("div", { class: "ob-mentor-task-actions" }, discuss, download));
  }

  function init() {
    const root = document.getElementById("task-generator");
    if (!root || root.dataset.ready) return;
    root.dataset.ready = "true";
    const content = root.querySelector(".ob-gen__content");
    const select = el("select", { id: "generator-topic", class: "ob-input ob-gen__select", name: "topic" },
      topics.map(([value, title]) => el("option", { value }, title)));
    const button = el("button", { type: "submit", class: "ob-btn ob-btn--primary" }, "Сгенерировать задачу");
    const form = el("form", { class: "ob-form" }, el("label", { for: "generator-topic" }, "Тема"), select, button);
    const message = el("p", { class: "ob-note", role: "status", "aria-live": "polite" });
    const result = el("div", { class: "ob-gen__result" });
    content.replaceChildren(form, message, result);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (button.disabled) return;
      button.disabled = true;
      select.disabled = true;
      result.setAttribute("aria-busy", "true");
      message.textContent = "Придумываем сюжет и готовим примеры…";
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);
      try {
        const url = await endpoint();
        const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: select.value }), signal: controller.signal, credentials: "omit" });
        let data;
        try { data = await response.json(); } catch { throw new Error("Генератор сейчас недоступен. Попробуй чуть позже."); }
        if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Не удалось создать задачу. Попробуй ещё раз.");
        if (!validTask(data) || data.topic !== select.value) throw new Error("Не удалось проверить ответ генератора. Попробуй ещё раз.");
        if (!root.isConnected) return;
        const task = renderTask(data);
        result.replaceChildren(task);
        message.textContent = "Готово. Примеры и тесты рассчитаны программой.";
        task.focus({ preventScroll: true });
        task.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        message.textContent = error.name === "AbortError" ? "Генерация заняла слишком долго. Попробуй ещё раз."
          : error instanceof TypeError ? "Нет связи с генератором. Проверь интернет или попробуй позже."
          : error.message === "config" ? "Генератор пока недоступен. Попробуй позже." : error.message;
      } finally {
        clearTimeout(timer);
        button.disabled = false;
        select.disabled = false;
        result.removeAttribute("aria-busy");
      }
    });
  }

  if (window.document$) document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
