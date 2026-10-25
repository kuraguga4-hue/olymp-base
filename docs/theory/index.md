---
title: Теория
hide:
  - navigation
  - toc
---

<p class="ob-kicker">раздел 01 · теория</p>

# Теория

15 тем в шести группах — от сортировки до FFT. Внутри группы темы идут от простой к сложной; метка «подробно» — большой разбор сложного алгоритма простым языком.
{: .ob-lead }

## Сортировка и поиск

Упорядочить данные — и искать в них быстро: бинпоиском или двумя указателями.
{: .ob-note }

<div class="ob-set" markdown>

1. [Сортировки](sorting.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-hook">Упорядочить данные, чтобы вместо всех пар сравнивать соседей. Слияние даёт первый пример «разделяй и властвуй». <span class="ob-note">Текст для чтения.</span></span>
1. [Бинарный поиск и поиск по ответу](binary-search.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-hook">Заменить перебор миллиардов ответов несколькими десятками проверок «подходит ли этот ответ». <span class="ob-note">Текст для чтения.</span></span>
1. [Два указателя](two-pointers.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-hook">Двигать границы окна, не возвращаясь назад: длиннейший подходящий отрезок за один проход. <span class="ob-note">Статья готовится — пока есть [задачи](../practice/two-pointers.md).</span></span>

</div>

## Жадность и динамика

Два способа найти лучший ответ: доказанный локальный выбор или таблица ответов на подзадачи.
{: .ob-note }

<div class="ob-set" markdown>

1. [Жадные алгоритмы](greedy.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-hook">Сделать локальный выбор и доказать, что он не испортит лучший ответ. <span class="ob-note">Текст для чтения.</span></span>
1. [Динамическое программирование](dp-intro.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">Заменить повторный перебор таблицей ответов на подзадачи: состояние, база, переход и порядок. <span class="ob-note">Текст для чтения.</span></span>

</div>

## Запросы на отрезках

Одна задача — сумма на отрезке — и всё более сильные инструменты: от неизменного массива до изменений, разрезов и разворотов.
{: .ob-note }

<div class="ob-set" markdown>

1. [Префиксные суммы](prefix-sums.md)
   <span class="ob-lvl ob-lvl--novice">новичок</span>
   <span class="ob-hook">Одна подготовка массива — и сумма любого отрезка находится одним вычитанием. <span class="ob-note">Текст для чтения.</span></span>
1. [Корневая декомпозиция](sqrt-decomposition.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook"><span class="ob-chip">подробно</span> Суммы отрезков с изменениями: целые блоки считаем сразу, края — обычным проходом. <span class="ob-note">Статья готовится — пока есть [задачи](../practice/sqrt-decomposition.md).</span></span>
1. [Дерево отрезков](segment-tree.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook"><span class="ob-chip">подробно</span> Разделить массив пополам и собирать ответ из готовых частей; менять значение за путь от листа к корню. <span class="ob-note">Статья готовится — пока есть [задачи](../practice/segment-tree.md).</span></span>
1. [Декартово дерево](treap.md)
   <span class="ob-lvl ob-lvl--adv">продвинутый</span>
   <span class="ob-hook"><span class="ob-chip">подробно</span> Разрезать последовательность, перевернуть отрезок и склеить обратно — через split, merge и случайные приоритеты. <span class="ob-note">Статья готовится — пока есть [задачи](../practice/treap.md).</span></span>

</div>

## Графы

Обойти граф, найти кратчайшие расстояния и следить за тем, какие вершины связаны.
{: .ob-note }

<div class="ob-set" markdown>

1. [Обход в глубину (DFS)](dfs.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">Пройти граф и найти компоненты связности: один обход вместо нового поиска на каждый вопрос. <span class="ob-note">Статья готовится — пока есть [задачи](../practice/dfs.md).</span></span>
1. [Кратчайшие пути](shortest-paths.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">Найти путь с минимумом ходов или минимальной суммой весов; понять, когда нужны BFS и Дейкстра. <span class="ob-note">Статья готовится — пока есть [задачи](../practice/shortest-paths.md).</span></span>
1. [Система непересекающихся множеств (DSU)](dsu.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">Объединять компоненты после добавления дорог и быстро проверять, связаны ли две вершины. <span class="ob-note">Статья готовится — пока есть [задачи](../practice/dsu.md).</span></span>

</div>

## Математика

Делимость и простые числа, затем многочлены и их быстрое умножение.
{: .ob-note }

<div class="ob-set" markdown>

1. [Теория чисел](number-theory.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">НОД, простые числа, решето и быстрое возведение в степень — компактный набор для задач с числами. <span class="ob-note">Статья готовится — пока есть [задачи](../practice/number-theory.md).</span></span>
1. [FFT и свёртки](fft.md)
   <span class="ob-lvl ob-lvl--adv">продвинутый</span>
   <span class="ob-hook"><span class="ob-chip">подробно</span> От подсчёта пар с каждой суммой — к свёртке и быстрому умножению многочленов. <span class="ob-note">Текст для чтения.</span></span>

</div>

## Строки

Найти образец в тексте и быстро сравнивать подстроки.
{: .ob-note }

<div class="ob-set" markdown>

1. [Строки и хеширование](strings.md)
   <span class="ob-lvl ob-lvl--mid">средний</span>
   <span class="ob-hook">Искать образец и сравнивать подстроки: различать точный алгоритм и хеш с риском коллизии. <span class="ob-note">Статья готовится — пока есть [задачи](../practice/strings.md).</span></span>

</div>

## Как устроен раздел

Группы идут от простого к сложному, темы внутри группы — тоже. Близкие идеи собраны в одну статью: решето — в теории чисел, хеширование — в строках, свёртки — в FFT.

Если базовые приёмы пока незнакомы, начни с [сортировок](sorting.md), [бинпоиска](binary-search.md) или [префиксных сумм](prefix-sums.md). Другие темы — в [дополнительных подборках](../practice/index.md#extra-practice).
