# ADR-0014 — 디자인 시스템 소비 (호스트 확인 후)

- 상태: 채택
- 날짜: 2026-09-01
- 다루는 축: 디자인 토큰, 아이콘, private registry 인증, 패키지 버전 범위
- 대체: **ADR-0011**

## 맥락

ADR-0011은 **패키지를 설치해 보기 전에** 쓴 결정이다. 그때 정할 수 없던 것을 보류 표에
남겼고, 정한 것 중 일부는 그 뒤에 드러난 사실과 어긋난다.

패키지가 배포되고(`@libitums/design-tokens`·`@libitums/icons` `0.2.0`) 실제 화면 하나를
`apps/ios` 호스트에 올려 확인했다. **확인한 것과 어긋난 결정이 넷이라 새 번호로 묶는다**
(ADR-0010 D10 — 결정 여러 개가 한꺼번에 바뀌면 새 번호).

바뀐 사실 넷은 이렇다.

1. **scope가 `@libitum`이 아니라 `@libitums`다.** 실제 GitHub 조직 owner와 맞췄다.
2. **pnpm이 저장소 `.npmrc`의 인증 설정을 무시한다.** ADR-0011 D2가 적은 형태가
   더 이상 동작하지 않는다.
3. **Lynx는 중첩 `var()`를 풀지 못한다.** ADR-0011 D1의 근거 *"중첩 참조"* 가 사실이
   아니었다. 패키지 쪽을 고쳐 해소했다.
4. **Lynx `<svg>`는 CSS `color`를 읽지 않는다.** 아이콘 색만은 D1의 CSS 전용 경로로
   지정할 수 없다.

호스트는 Lynx SDK **4.0.1**이다. `<svg>`가 추가된 3.7보다 높아 이 경로를 쓸 수 있다.
ADR-0011의 재검토 조건 *"Explorer의 Lynx 런타임이 3.9 미만이면"* 은 해소됐다.

## 결정

### D1. 토큰은 **CSS 커스텀 프로퍼티로 소비한다** (아이콘 색 제외)

ADR-0011 D1을 유지한다. 근거 하나는 **틀렸으므로 뺀다.**

```css
.home-screen {
  gap: var(--libitum-layout-gap-block);
  padding: var(--libitum-layout-screen-padding-x);
  background: var(--libitum-color-background-primary);
}
```

토큰 CSS는 **진입점에서 한 번만** 불러온다. `:root`에 올라가야 모든 화면의 `var()`가
값을 얻는다.

```tsx
// apps/mobile/src/app/index.tsx
import "@libitums/design-tokens/css/variables.css";
import "@libitums/design-tokens/css/typography.css";
```

> **ADR-0011 D1의 근거 중 하나가 사실이 아니었다.** *"Lynx의 CSS 변수는 웹 표준과 거의
> 같다 — … 중첩 참조 …"* 라고 적었는데, **Lynx는 중첩 `var()`를 풀지 못한다.**
> 엔진의 `CSSVariableHandler::ResolveCSSVariables`가 치환을 **한 번만** 하고 그 결과를
> `UnitHandler`로 다시 파싱한다. 치환 결과가 또 `var()`이면 파싱에 실패해 **선언을 통째로
> 버린다.**
>
> 패키지가 내보내던 CSS는 227개 변수 중 73개가 별칭이었다. semantic layer가 통째로
> 별칭이라 `color.fg.*`·`layout.*`·`icon.size.*`와 타이포의 `font-family`·`font-weight`가
> **전부 죽어 있었다.** 호스트에서 padding·gap이 사라지고 아이콘이 크기를 못 받아 아예
> 보이지 않았다.
>
> **FE에서 우회하지 않고 design-system을 고쳤다**(D4). 이제 패키지가 별칭을 리터럴로
> 평탄화해 내보내므로, 사용처의 `var()` 한 겹은 Lynx가 정상 처리한다. `0.2.0` 이상에서만
> 성립한다.

**여는 조건**은 ADR-0011 그대로 — JS에서 토큰 값을 계산·분기해야 하는 첫 사례가 나올 때.
D2의 아이콘 색은 그 사례가 아니라 **CSS로 지정할 방법이 없어서** 여는 예외다.

### D2. 아이콘 색은 `current-color` 속성에 **TypeScript token 상수**를 넘긴다

**아이콘 색은 CSS 커스텀 프로퍼티로 지정할 수 없다.** D1의 유일한 예외다.

```tsx
import { color } from "@libitums/design-tokens";
import house from "@libitums/icons/lynx/house";

<svg
  className="home-screen-icon"
  content={house}
  current-color={color.fg.neutral}
/>;
```

크기는 CSS로 계속 지정한다. **색만** TS 상수를 쓴다.

```css
.home-screen-icon {
  width: var(--libitum-icon-size-md);
  height: var(--libitum-icon-size-md);
}
```

Lynx `<svg>`가 받는 prop은 셋뿐이다 — `src`, `content`, `current-color`. **CSS `color`
프로퍼티가 없다.** SVG 원본의 `fill="currentColor"`를 채우는 것은 `current-color`
**속성**이고, 속성은 CSS 선언이 아니므로 `var()`도 풀리지 않는다.

호스트에서 확인한 것이다.

| 경로 | 결과 |
|---|---|
| 부모 view에 `color`, svg는 상속만 | 적용 안 됨 |
| svg 자신에 `color` | 무시됨 |
| `current-color="#ff0000"` | **동작** |
| `current-color="var(--libitum-color-gray-500)"` | 적용 안 됨 |
| `withIconColor(icon, "#ff0000")` | **동작** |

`.home-screen-icon`에 `color`를 적어도 **아무 일도 하지 않으면서 동작하는 것처럼 보인다.**
그래서 적지 않는다.

`withIconColor`는 XML에 색을 직접 박아야 할 때만 쓴다. 결과는 같으므로 기본은
`current-color`다.

**근거**: 다른 선택지가 없다. 색을 지정하려면 리터럴 문자열이 JSX에 있어야 하고, 그 값을
토큰에서 가져오는 유일한 경로가 TS 상수다. raw hex를 적는 것보다 낫다.

### D3. private registry 인증 — 저장소에는 **registry 연결만** 커밋한다

**ADR-0011 D2를 뒤집는다.** 그 형태는 더 이상 동작하지 않는다.

```ini
# .npmrc  (커밋한다)
@libitums:registry=https://npm.pkg.github.com
```

인증은 저장소 밖 **신뢰 위치**에 둔다.

- 로컬: `~/.npmrc` 또는 `<pnpm config>/auth.ini`
- CI: `actions/setup-node`가 쓰는 **사용자 수준** `.npmrc` — `NODE_AUTH_TOKEN`이 그대로 동작한다

**pnpm v10.34.2·v11.5.3부터 저장소가 소유한 `.npmrc`의 인증 항목을 무시한다.**
`_authToken`·`_auth`·`_password`·`username`·`tokenHelper`·`cert`·`key`와 `//`로 시작하는
URL 스코프 키가 대상이다. 무시될 때 ` WARN  Ignored project-level auth setting`이 뜬다.
ADR-0011 D2가 적은 `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`이 바로 이 형태다.

> **ADR-0011 D2의 근거는 유지된다** — *"무엇이 필요한지가 저장소에 없으면 새 환경에서
> 왜 안 되는지 알 수 없다."* 다만 그것을 `.npmrc`가 아니라 **문서**가 진다.
> `docs/conventions/workflow.md`의 첫 설정이 어디에 무엇을 두는지 적는다.
> `.env.example`의 `NODE_AUTH_TOKEN`은 **지운다** — 그 자리에 두면 동작하지 않는다.

### D4. 패키지에 없는 것은 **우회하지 않고 design-system에 올린다**

ADR-0011 D4를 유지하고, **실제로 그렇게 했다**는 것을 기록한다.

이번에 발견한 두 결함을 FE에서 값을 직접 풀어 넣는 방식으로 덮지 않고 design-system
이슈로 올려 고쳤다. 별칭 평탄화는 `0.2.0`으로 배포됐고, 아이콘 색 경로는 소비 가이드와
fixture에 반영됐다.

**우회했다면** FE의 CSS에 리터럴 값이 박혔을 것이고, 같은 문제가 다음 화면마다 다시
나타났을 것이다. 근본 원인이 패키지 쪽에 있는 한 소비 쪽 수정은 매번 새로 해야 한다.

### D5. 버전은 **정확 버전**으로 고정한다

ADR-0011의 보류 표를 닫는다. 잠정 조치가 아니라 결정이다.

```json
"@libitums/design-tokens": "0.2.0",
"@libitums/icons": "0.2.0"
```

design-system의 release policy가 확정됐다. **두 패키지는 하나의 버전을 공유하고 항상 함께
release한다.** 1.0.0 이전에는 **breaking 변경도 minor를 올린다.** caret은 `0.y.z`에서
minor를 잠그지 않으므로 breaking 변경을 그대로 받는다.

두 패키지를 **같은 버전으로** 적는다. 어긋나면 lockstep 전제가 깨진다.

### D6. 아이콘은 이름별 subpath로 가져온다

ADR-0011의 보류 표를 닫는다.

```tsx
import house from "@libitums/icons/lynx/house";
```

Lynx의 `<image>`는 SVG를 지원하지 않으므로 SVG XML 문자열을 그대로 받는 `<svg content>`
경로를 쓴다. 전체 index(`@libitums/icons/lynx`)를 가져오지 않는다 — 815개가 번들에 들어간다.
`withIconColor`가 필요할 때만 index에서 가져온다.

padding variant가 기본이다. frame을 정확히 채워야 하면
`@libitums/icons/lynx/no-padding/{name}`을 쓴다.

### D7. 다크모드는 여전히 제외

ADR-0011 D5를 그대로 유지한다. 배포된 `color.json`이 라이트 모드 단일 값인 것을 확인했다.

## 버린 대안

- **FE에서 별칭을 직접 풀어 리터럴로 적기** — 호스트에서 바로 화면이 나온다. 그러나
  D4가 금지하고, 같은 문제가 화면마다 반복된다. design-system을 고치는 쪽이 한 번으로
  끝난다 (D1, D4).
- **아이콘 색을 CSS `color`로 계속 적어 두기** — D1의 일관성이 유지된다. 그러나
  **아무 일도 하지 않는다.** 동작하는 것처럼 보이는 선언을 남기는 것이 더 나쁘다 (D2).
- **아이콘 색에 raw hex를 적기** — TS 상수 경로를 안 연다. 그러나 값의 출처가 토큰에서
  끊기고, ADR-0011 D4의 *"값을 하드코딩하지 않는다"* 를 정면으로 어긴다 (D2).
- **`withIconColor`를 기본 경로로** — `current-color`와 결과가 같다. 그러나 XML 문자열을
  매번 새로 만들고, Lynx가 정한 표준 prop을 두고 우회하는 형태다 (D2).
- **`.npmrc`를 `.gitignore`에 넣기** — 인증 흔적이 저장소에 안 남는다. 그러나 registry
  연결까지 사라져 새 환경에서 어느 registry를 봐야 하는지 알 수 없다. **연결은 커밋하고
  인증만 밖에 둔다**가 둘을 다 얻는다 (D3).
- **`.env.example`에 `NODE_AUTH_TOKEN`을 남겨두기** — 무엇이 필요한지는 계속 보인다.
  그러나 그 자리에 넣어도 동작하지 않으므로 **틀린 안내**다. 문서가 대신 진다 (D3).
- **caret 범위(`^0.2.0`)** — 패치를 자동으로 받는다. 그러나 `0.y.z`에서 caret은 minor를
  잠그지 않고, design-system은 **breaking을 minor로 올린다.** 자동으로 breaking을
  받게 된다 (D5).
- **`@libitums/icons/lynx`에서 이름을 꺼내 쓰기** — import가 한 줄로 준다. 그러나 아이콘
  815개가 번들에 들어간다 (D6).

## 대가

- **토큰 이름 오타를 여전히 자동으로 못 잡는다.** ADR-0011 D1이 감수한 실패가 그대로
  남아 있다. 아래 재검토 조건이 이것을 갚는 자리다.
- **아이콘 색만 다른 경로를 탄다.** 시각 값 중 하나만 TS에서 오므로, 화면을 읽을 때
  색의 출처가 두 곳이다. D2가 그 자리를 좁게 못 박는 것으로 감당한다.
- **패키지 버전을 손으로 올린다.** 정확 버전이므로 design-system이 release해도 자동으로
  오지 않는다. 올리는 PR이 시각 회귀를 사람이 확인하는 자리가 된다(ADR-0006 D6).
- **인증이 저장소 밖에 있다.** 새 기기·CI마다 신뢰 위치에 토큰을 넣어야 하고, 저장소만
  보고는 어디에 넣는지 알 수 없다. 문서가 그것을 진다 (D3).
- **`0.2.0` 미만에서는 화면이 깨진다.** D1이 패키지의 평탄화에 기대므로 하위 버전으로
  내리면 semantic token이 다시 죽는다.

## 재검토 조건

- **토큰 이름 검사를 붙일 수 있게 됐다** → 패키지가 배포됐으므로 ADR-0011의 조건이
  충족됐다. 알려진 토큰 이름만 허용하는 CSS 검사를 `lint`에 붙인다. **`var(--오타)`가
  조용히 무시되는 것을 잡을 유일한 수단이다.** D1의 감수한 실패를 갚는 자리다
- **아이콘 색 외에 JS에서 토큰을 써야 하는 사례**가 나오면 → D1·D2. 그 사례를 근거로
  TS 상수 경로를 더 연다. D2를 선례로 쓰지 않는다 — 그것은 CSS로 **불가능**해서 연 것이다
- **Lynx가 중첩 `var()`를 지원하면** → D1. 패키지의 평탄화가 불필요해지는지 다시 본다
- **`<svg>`가 CSS `color`를 읽게 되면** → D2. 아이콘 색을 CSS 경로로 되돌린다
- **design-system이 `1.0.0`이 되면** → D5. caret 범위를 다시 검토한다. 1.0.0 이상에서는
  minor가 breaking을 담지 않는다
- **두 번째 소비자가 나타나면** → `packages/ui-lynx` 승격 (ADR-0004 D2, ADR-0011 D3).
  이 축은 ADR-0011 D3이 그대로 유효하다
