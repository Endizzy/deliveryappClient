// Поиск по меню для форм создания/редактирования заказа.
// Запрос разбивается на слова; позиция найдена, если КАЖДОЕ слово запроса
// является началом какого-либо слова названия ("ph cl" -> "Philadelphia classic").
// Регистр, диакритика (ā, š, ž...) и лишние пробелы/знаки не учитываются.

/** Нормализация: нижний регистр, без диакритики, знаки -> пробелы. */
export function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // диакритика (кириллическое й/ё не трогаем ниже)
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const words = (s) => (s ? s.split(" ") : []);

// Качество совпадения одного поля (меньше = лучше), либо null.
//  0 — слова запроса идут подряд с начала названия, каждое — начало слова
//  1 — каждое слово запроса — начало какого-то слова названия (любой порядок)
//  2 — слова запроса встречаются внутри слов (подстрока, от 2 символов)
function scoreField(fieldWords, qTokens) {
  if (!fieldWords.length) return null;

  // Каждый токен — префикс слова; слова не переиспользуются дважды.
  const used = new Set();
  const positions = [];
  let allPrefix = true;
  for (const tok of qTokens) {
    let found = -1;
    for (let i = 0; i < fieldWords.length; i++) {
      if (!used.has(i) && fieldWords[i].startsWith(tok)) { found = i; break; }
    }
    if (found === -1) { allPrefix = false; break; }
    used.add(found);
    positions.push(found);
  }
  if (allPrefix) {
    const inOrderFromStart = positions.every((p, i) => p === i);
    return inOrderFromStart ? 0 : 1;
  }

  // Запасной вариант: подстрока внутри слова (для токенов ≥ 2 символов).
  const used2 = new Set();
  for (const tok of qTokens) {
    if (tok.length < 2) return null;
    let found = -1;
    for (let i = 0; i < fieldWords.length; i++) {
      if (!used2.has(i) && fieldWords[i].includes(tok)) { found = i; break; }
    }
    if (found === -1) return null;
    used2.add(found);
  }
  return 2;
}

/**
 * @param {Array<{name?:string, category?:string}>} menu
 * @param {string} query
 * @param {number} limit
 */
export function searchMenu(menu, query, limit = 8) {
  const qTokens = words(normalizeSearchText(query));
  if (!qTokens.length || !Array.isArray(menu)) return [];

  const scored = [];
  for (const item of menu) {
    const nameWords = words(normalizeSearchText(item?.name));
    const nameScore = scoreField(nameWords, qTokens);
    let rank;
    if (nameScore !== null) {
      rank = nameScore; // 0..2
    } else {
      const catScore = scoreField(words(normalizeSearchText(item?.category)), qTokens);
      if (catScore === null) continue;
      rank = 3 + catScore; // совпадения по категории — после названий
    }
    scored.push({ item, rank });
  }

  scored.sort(
    (a, b) =>
      a.rank - b.rank ||
      String(a.item?.name ?? "").localeCompare(String(b.item?.name ?? ""))
  );
  return scored.slice(0, limit).map((s) => s.item);
}
