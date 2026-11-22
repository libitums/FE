// `@libitums/design-tokens`의 `dist/index.js`는 토큰 묶음마다 `export const x = deepFreeze({...})`를
// 최상위에서 부릅니다. 호출은 부수 효과가 있을 수 있는 식이라, 앱이 쓰지 않는 묶음(typography · font ·
// elevation · layout · tokens …)도 번들러가 버리지 못하고 두 스레드에 모두 실립니다.
// 최상위 `export const … = deepFreeze(` 호출에만 `/*#__PURE__*/`를 붙여, 쓰이지 않는 묶음만 버리게 합니다.
// 함수 본문의 재귀 호출은 건드리지 않으므로 남는 묶음은 지금처럼 깊게 얼려집니다.
const EXPORT_CALL = /^export const (\w+) = deepFreeze\(/gm;

module.exports = function pureTokenExportsLoader(source) {
  const marked = source.replace(EXPORT_CALL, "export const $1 = /*#__PURE__*/ deepFreeze(");
  if (marked === source) {
    // 패키지 모양이 바뀌면 조용히 크기만 되돌아가지 않게 빌드를 멈춥니다.
    throw new Error("pure-token-exports-loader: `export const … = deepFreeze(` not found");
  }
  return marked;
};
