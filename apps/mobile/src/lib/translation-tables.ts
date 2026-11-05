// 번역표 두 단계(언어 → 영어 원문 → 번역)의 같음입니다. 키 순서와 무관하고 직렬화하지 않습니다 — 카탈로그 원문 비교와
// 세션 병합이 「번역이 실제로 바뀌었는가」를 볼 때 씁니다(ADR-0102 D3).

type Table = Readonly<Record<string, string>>;
type Tables = Readonly<Record<string, Table | undefined>>;

function sameTable(a: Table | undefined, b: Table | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && a[key] === b[key]);
}

export function sameTranslationTables(a: Tables | undefined, b: Tables | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  const languages = Object.keys(a);
  if (languages.length !== Object.keys(b).length) return false;
  return languages.every(
    (language) =>
      Object.prototype.hasOwnProperty.call(b, language) && sameTable(a[language], b[language]),
  );
}
