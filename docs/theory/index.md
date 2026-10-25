---
title: Теория
hide:
  - navigation
  - toc
---

<p class="ob-kicker">раздел 01 · теория</p>

# Теория

35 тем в трёх дивизионах — как на Codeforces: Div. 3 для старта, Div. 2 — основа, Div. 1 — продвинутые техники. Каждая статья начинается с задачи, которую тема делает простой, и проверена олимпиадником.
{: .ob-lead }

## Div. 3 · новичок

9 тем — для старта
{: .ob-note }

<div class="ob-set" markdown>

1. [Бинарный поиск и поиск по ответу](binary-search.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-hook">k принтеров, i-й печатает страницу за tᵢ секунд; за какое минимальное время они вместе напечатают n страниц (n, tᵢ ≤ 10⁹)? Ответ бывает до 10¹⁸ секунд — перебирать время по секунде нельзя, бинпоиск по ответу — около 60 проверок «успеем ли за T», каждая — один проход по принтерам.</span>
1. [Префиксные суммы](prefix-sums.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-hook">10⁵ чисел и 10⁵ вопросов «чему равна сумма на отрезке [l, r]?»: в лоб — до 10¹⁰ сложений, с префиксными суммами — 10⁵ сложений на подготовку и одно вычитание на каждый вопрос.</span>
1. [Жадные алгоритмы и как их доказывать](greedy.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-hook">10⁵ заявок на одну аудиторию (отрезки времени) — выбрать максимум непересекающихся. Перебор подмножеств — 2¹⁰⁰⁰⁰⁰ вариантов; «бери самую короткую» и «бери ту, что раньше начинается» ломаются уже на трёх заявках; «бери ту, что раньше заканчивается» — сортировка и один проход, а обменный аргумент доказывает, что это оптимально.</span>
1. [Сортировки](sorting.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-links"><span class="ob-chip">sortings</span></span>
1. [Реализация](implementation.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-links"><span class="ob-chip">implementation</span></span>
1. [Перебор](brute-force.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-links"><span class="ob-chip">brute force</span></span>
1. [Два указателя](two-pointers.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-hook">Самый длинный отрезок массива из 2·10⁵ положительных чисел с суммой не больше S: в лоб — 2·10¹⁰ пар (l, r), двумя указателями — один проход, не больше 4·10⁵ сдвигов.</span>
1. [Решето Эратосфена](sieve.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-links"><span class="ob-chip">number theory</span></span>
1. [Сжатие координат](coordinate-compression.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>

</div>

## Div. 2 · средний

19 тем — основа олимпиадной программы
{: .ob-note }

<div class="ob-set" markdown>

1. [Динамическое программирование: начало](dp-intro.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">Сколькими способами подняться на n ≤ 50 ступенек шагами на 1 и на 2? Рекурсия в лоб на n = 50 делает около 4·10¹⁰ вызовов, ДП — 49 сложений; сам ответ, 20 365 011 074, не влезает даже в int.</span>
1. [Обход в глубину (DFS)](dfs.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-links"><span class="ob-chip">dfs and similar</span> <span class="ob-chip">graphs</span></span>
1. [Кратчайшие пути](shortest-paths.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">За сколько ходов конь доберётся из одной клетки доски 1000×1000 в другую? Перебор последовательностей ходов растёт как 8ᵏ, а ходов нужны сотни; BFS посещает каждую из 10⁶ клеток один раз и находит и число ходов, и сам путь.</span>
1. [Бинарные подъёмы](binary-lifting.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-links"><span class="ob-chip">trees</span></span>
1. [Наименьший общий предок (LCA)](lca.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-links"><span class="ob-chip">trees</span></span>
1. [Дерево отрезков](segment-tree.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-links"><span class="ob-chip">data structures</span></span>
1. [Разреженная таблица (Sparse table)](sparse-table.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-links"><span class="ob-chip">data structures</span></span>
1. [Теория чисел: НОД, решето, быстрое возведение в степень](number-theory.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">Посчитать aᵇ mod m при b = 10¹⁸: в лоб — 10¹⁸ умножений (даже при 10⁹ умножений в секунду это 30 лет), быстрым возведением в степень — около 60 шагов.</span>
1. [Комбинаторика](combinatorics.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-links"><span class="ob-chip">combinatorics</span></span>
1. [Хеширование](hashing.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-links"><span class="ob-chip">hashing</span></span>
1. [Строковые алгоритмы](strings.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-links"><span class="ob-chip">strings</span></span>
1. [Битмаски](bitmasks.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-links"><span class="ob-chip">bitmasks</span></span>
1. [Разделяй и властвуй](divide-and-conquer.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-links"><span class="ob-chip">divide and conquer</span></span>
1. [Конструктивные задачи](constructive.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-links"><span class="ob-chip">constructive algorithms</span></span>
1. [Корневая оптимизация](sqrt-decomposition.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-links"><span class="ob-chip">data structures</span></span>
1. [Задача о рюкзаке](knapsack.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-links"><span class="ob-chip">dp</span></span>
1. [Сортировка событий (сканлайн)](scanline.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
1. [Геометрия](geometry.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-links"><span class="ob-chip">geometry</span></span>
1. [Система непересекающихся множеств (DSU)](dsu.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">10⁵ городов и 10⁵ событий: «построили дорогу между a и b» или «можно ли доехать из a в b?». Обход графа на каждый вопрос — порядка 10¹⁰ операций на всё, DSU — несколько операций на событие.</span>

</div>

## Div. 1 · продвинутый

7 тем — продвинутые структуры и техники
{: .ob-note }

<div class="ob-set" markdown>

1. [Декартово дерево](treap.md)
   <span class="ob-lvl ob-lvl--adv">продвинутый</span>
   <span class="ob-links"><span class="ob-chip">data structures</span></span>
1. [Рандомизированные и эвристические алгоритмы](randomized.md)
   <span class="ob-lvl ob-lvl--adv">продвинутый</span>
1. [Центроидная декомпозиция](centroid-decomposition.md)
   <span class="ob-lvl ob-lvl--adv">продвинутый</span>
   <span class="ob-links"><span class="ob-chip">divide and conquer</span> <span class="ob-chip">trees</span></span>
1. [Heavy-light декомпозиция (HLD)](hld.md)
   <span class="ob-lvl ob-lvl--adv">продвинутый</span>
   <span class="ob-links"><span class="ob-chip">trees</span> <span class="ob-chip">data structures</span></span>
1. [Быстрое преобразование Фурье (FFT)](fft.md)
   <span class="ob-lvl ob-lvl--adv">продвинутый</span>
   <span class="ob-links"><span class="ob-chip">fft</span></span>
1. [Оптимизации ДП](dp-optimizations.md)
   <span class="ob-lvl ob-lvl--adv">продвинутый</span>
   <span class="ob-links"><span class="ob-chip">dp</span></span>
1. [Свёртки](convolutions.md)
   <span class="ob-lvl ob-lvl--adv">продвинутый</span>

</div>
