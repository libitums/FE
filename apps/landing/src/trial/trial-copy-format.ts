// 문구의 `{name}` 자리표시자를 값으로 바꾸는 순수 함수입니다.

import type { FormatCopy } from "../components/trial/trial-components.contract";

const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;

/** 한 번에 훑어 바꿉니다 — 값 안의 중괄호 · `$` 패턴은 다시 치환하지 않습니다. 모르는 이름은 그대로 둡니다. */
export const formatCopy: FormatCopy = (template, values) =>
  template.replace(PLACEHOLDER, (whole, name: string) =>
    Object.hasOwn(values, name) ? (values[name] ?? whole) : whole,
  );
