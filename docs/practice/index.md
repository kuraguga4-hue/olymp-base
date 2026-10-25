---
title: Практика
hide:
  - navigation
  - toc
---

<p class="ob-kicker">раздел 02 · практика</p>

# Практика

15 основных тем — те же маршруты, теперь с задачами по возрастанию сложности и подсказками. Дополнительные подборки сохранены в конце страницы.
{: .ob-lead }

<div class="ob-gen" id="task-generator">
  <div class="ob-gen__head">
    <span class="ob-gen__icon">&gt;_</span>
    <span class="ob-gen__title">Генератор задач на тему</span>
    <span class="ob-chip">6 из 15 тем</span>
  </div>
  <p class="ob-gen__text">На сайте 15 тем, генератор пока работает для 6 из них — для каждой есть проверенная схема задачи. Выбери тему и получи тренировочную задачу с новым сюжетом, примерами и тестами: сюжет придумывает ИИ, ответы в примерах и тестах считает программа. Задачи по остальным темам — в подборках ниже.</p>
  <div class="ob-gen__content"><p class="ob-note">Загружаем форму…</p><noscript>Для генератора нужен JavaScript.</noscript></div>
</div>

## Архив олимпиад

<div class="ob-card" markdown>

ВсОШ, Открытая олимпиада, Высшая проба, Innopolis Open и Vorg CUP: выбирай сезон, открывай условия и задачи. Разборы команды доступны прямо на сайте; статус проверки указан у каждого.

[Открыть архив олимпиад](olympiads/index.md){ .ob-btn .ob-btn--primary }

</div>

## Сложные идеи простым языком

<div class="ob-set" markdown>

1. [Корневая декомпозиция](sqrt-decomposition.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">Суммы отрезков с изменениями: целые блоки считаем сразу, края — обычным проходом.</span>
   <span class="ob-links">[теория](../theory/sqrt-decomposition.md)</span>
1. [Дерево отрезков](segment-tree.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">Разделить массив пополам и собирать ответ из готовых частей; менять значение за путь от листа к корню.</span>
   <span class="ob-links">[теория](../theory/segment-tree.md)</span>
1. [Декартово дерево](treap.md)
   <span class="ob-lvl ob-lvl--adv">продвинутый</span>
   <span class="ob-hook">Разрезать последовательность, перевернуть отрезок и склеить обратно — через split, merge и случайные приоритеты.</span>
   <span class="ob-links">[теория](../theory/treap.md)</span>
1. [FFT и свёртки](fft.md)
   <span class="ob-lvl ob-lvl--adv">продвинутый</span>
   <span class="ob-hook">От подсчёта пар с каждой суммой — к свёртке и быстрому умножению многочленов.</span>
   <span class="ob-links">[теория](../theory/fft.md)</span>

</div>

## Основные приёмы

<div class="ob-set" markdown>

1. [Сортировки](sorting.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-hook">Упорядочить данные, чтобы вместо всех пар сравнивать соседей. Слияние даёт первый пример «разделяй и властвуй».</span>
   <span class="ob-links">[теория](../theory/sorting.md)</span>
1. [Бинарный поиск и поиск по ответу](binary-search.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-hook">Заменить перебор миллиардов ответов несколькими десятками проверок «подходит ли этот ответ».</span>
   <span class="ob-links">[теория](../theory/binary-search.md)</span>
1. [Префиксные суммы](prefix-sums.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-hook">Одна подготовка массива — и сумма любого отрезка находится одним вычитанием.</span>
   <span class="ob-links">[теория](../theory/prefix-sums.md)</span>
1. [Два указателя](two-pointers.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-hook">Двигать границы окна, не возвращаясь назад: длиннейший подходящий отрезок за один проход.</span>
   <span class="ob-links">[теория](../theory/two-pointers.md)</span>
1. [Жадные алгоритмы и как их доказывать](greedy.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-hook">Сделать локальный выбор и доказать, что он не испортит лучший ответ.</span>
   <span class="ob-links">[теория](../theory/greedy.md)</span>
1. [Динамическое программирование: начало](dp-intro.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">Заменить повторный перебор таблицей ответов на подзадачи: состояние, база, переход и порядок.</span>
   <span class="ob-links">[теория](../theory/dp-intro.md)</span>

</div>

## Графы, строки и числа

<div class="ob-set" markdown>

1. [Обход в глубину (DFS)](dfs.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">Пройти граф и найти компоненты связности: один обход вместо нового поиска на каждый вопрос.</span>
   <span class="ob-links">[теория](../theory/dfs.md)</span>
1. [Кратчайшие пути](shortest-paths.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">Найти путь с минимумом ходов или минимальной суммой весов; понять, когда нужны BFS и Дейкстра.</span>
   <span class="ob-links">[теория](../theory/shortest-paths.md)</span>
1. [Система непересекающихся множеств (DSU)](dsu.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">Объединять компоненты после добавления дорог и быстро проверять, связаны ли две вершины.</span>
   <span class="ob-links">[теория](../theory/dsu.md)</span>
1. [Строки и хеширование](strings.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">Искать образец и сравнивать подстроки: различать точный алгоритм и хеш с риском коллизии.</span>
   <span class="ob-links">[теория](../theory/strings.md)</span>
1. [Теория чисел: НОД, решето, быстрое возведение в степень](number-theory.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">НОД, простые числа, решето и быстрое возведение в степень — компактный набор для задач с числами.</span>
   <span class="ob-links">[теория](../theory/number-theory.md)</span>

</div>

## Дополнительные подборки {#extra-practice}

Эти материалы сохранены для отдельной тренировки и продолжения основных тем. Они не увеличивают основной маршрут из 15 тем; некоторые подборки ещё готовятся.

??? note "Открыть дополнительные темы"

    - [Бинарные подъёмы](binary-lifting.md)
    - [Наименьший общий предок (LCA)](lca.md)
    - [Разреженная таблица (Sparse table)](sparse-table.md)
    - [Комбинаторика](combinatorics.md)
    - [Реализация](implementation.md)
    - [Хеширование](hashing.md)
    - [Рандомизированные и эвристические алгоритмы](randomized.md)
    - [Центроидная декомпозиция](centroid-decomposition.md)
    - [Heavy-light декомпозиция (HLD)](hld.md)
    - [Оптимизации ДП](dp-optimizations.md)
    - [Битмаски](bitmasks.md)
    - [Перебор](brute-force.md)
    - [Разделяй и властвуй](divide-and-conquer.md)
    - [Конструктивные задачи](constructive.md)
    - [Решето Эратосфена](sieve.md)
    - [Задача о рюкзаке](knapsack.md)
    - [Сжатие координат](coordinate-compression.md)
    - [Сортировка событий (сканлайн)](scanline.md)
    - [Геометрия](geometry.md)
    - [Свёртки](convolutions.md)
