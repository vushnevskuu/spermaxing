---
name: vertical-rush-game-items
description: >-
  Дизайн и внедрение предметов на треке vertical rush: читаемость good/bad/obs,
  теги, спрайты vs canvas, связь с каталогом. Использовать при добавлении пикапов,
  смене арта в vertical-rush-render и vertical-rush-catalog.
---

# Vertical rush — игровые предметы на треке

## Зачем три уровня читаемости

1. **Класс (мгновенно)** — форма внешней рамки: бафф = скруглённый прямоугольник cyan; дебафф = пунктирный квадрат под 45° (ромб); препятствие = красный «hazard» box.
2. **Идентификатор** — короткий **тег** под иконкой (`ZN`, `CH`, `PC`…), задаётся в `lib/vertical-rush-catalog.ts` (`GOOD_TRACK_TAGS`, `BAD_TRACK_TAGS`, `OBSTACLE_TRACK_TAGS`). Должен помещаться в ~26–40px ширины.
3. **Силуэт** — процедурная отрисовка в `drawGood*` / `drawBad*` / `drawObs*`; можно заменить или дополнить **спрайтом** (PNG/WebP 48–96px, прозрачный фон), подключив `drawImage` внутри `drawPickupOrObstacle` после `ctx.scale`.

## Спрайты vs процедурка

- **Процедурка** — быстрый MVP, масштаб без потери чёткости, единый неоновый стиль.
- **Спрайт** — если силуэты всё ещё путаются: один файл на `id`, путь например `public/rush/items/{id}.png`; в рендере — `if (spriteLoaded) drawImage else fallback procedural`.
- Сохранять **рамку и тег** даже со спрайтом, чтобы класс предмета не терялся.

## Тон и ограничения

- Пародийный wellness / junk food, **не** медицина, **не** откровенность.
- Цвета из каталога (`color`) — для ауры и согласованности с UI; рамки фиксированы по типу (cyan / pink / red).

## Файлы

| Задача | Файл |
|--------|------|
| Теги, цвета, подсказки | `lib/vertical-rush-catalog.ts` |
| Рамки, тег на canvas, вызов отрисовки | `lib/vertical-rush-render.ts` → `drawPickupOrObstacle`, `drawPickupKindFrame`, `drawTrackTag` |
| Экономика подбора | `components/rush/vertical-rush-client.tsx` |
| Надетое на аватаре | `components/avatar/swimmer-rush-equipped.tsx`, `lib/vertical-rush-equipped.ts` |

## Связанный скилл

- Общие правила режима: `vertical-rush-gamedesign`.
