// 미션 프롬프트의 「틀 + 채우기」. 틀은 `{{이름}}` 자리표를 담은 글이고, 서버와 실험실 번들(대시보드)이 같은 틀을 채웁니다 —
// 프롬프트 문장이 두 벌이 되지 않게 하려는 것입니다(`mission-lab-bundle.json`의 `prompts`). 순수 함수입니다.

const placeholderPattern = /\{\{([a-z][a-z0-9_]*)\}\}/g;

/** 틀에 나오는 자리표 이름(처음 나온 순서, 중복 없음). */
export function placeholders(template: string): string[] {
  return [...new Set([...template.matchAll(placeholderPattern)].map((match) => match[1] ?? ""))];
}

/**
 * 자리표를 값으로 바꿉니다. 한 번에 훑어 바꾸므로 값 안의 `{{…}}`(학습자 글 등)는 다시 바꾸지 않습니다.
 * 틀의 자리표에 값이 없으면 던집니다 — 번들 규격의 「모르는 자리표가 남으면 오류」와 같은 규칙입니다.
 */
export function fillTemplate(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  const missing = placeholders(template).filter((name) => !(name in values));
  if (missing.length > 0) throw new Error(`틀에 값이 없는 자리표: ${missing.join(", ")}`);
  return template.replace(placeholderPattern, (_match, name: string) => String(values[name]));
}
