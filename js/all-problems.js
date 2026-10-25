// Фильтр по теме на странице «Все задачи» (practice/all.md, собирает scripts/build_all_problems.py)
(function () {
  function init() {
    var select = document.getElementById("ob-all-topic");
    var table = document.getElementById("ob-all-problems");
    if (!select || !table) return;
    var rows = table.tBodies[0].rows;
    var count = document.getElementById("ob-all-count");
    function apply() {
      var topic = select.value;
      var shown = 0;
      for (var i = 0; i < rows.length; i++) {
        var ok = !topic || rows[i].getAttribute("data-topic") === topic;
        rows[i].style.display = ok ? "" : "none";
        if (ok) shown++;
      }
      if (count) count.textContent = "Показано: " + shown;
    }
    select.addEventListener("change", apply);
    apply();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
