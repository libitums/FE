# 코드 규약

무엇을 해야 하는지만 짧게 적는다. 왜 그런지는 링크된 ADR에 있다.

## 폴더

```text
apps/mobile/src/
  app/          진입점. 루트 구성 — 화면 전환, 에러 경계, 프로바이더
  screens/      화면 단위. 확정된 화면 목록과 1:1
  components/   화면 둘 이상이 쓰는 컴포넌트, 그리고 design-system 스펙 컴포넌트
  lib/          순수 로직·API 클라이언트. UI를 import하지 않는다
  styles/       전역 스타일. 토큰 값은 여기 두지 않는다 — 패키지에서 온다
```

- 폴더는 **필요해질 때 만든다.** 지금 있는 것은 `app/` · `screens/` · `components/` ·
  `lib/` 넷이다 ([ADR-0003 D5](../adr/0003-workspace-and-directory-structure.md)).
- **`components/`는 뼈대 이슈에서 생겼다.** 첫 입주자는 바텀 네비게이션 셸이다 —
  탭 넷 위에 걸려 어느 한 화면의 것이 아니다. 아래 **컴포넌트** 절의 승격 규칙
  ([ADR-0015 D3](../adr/0015-component-primitives-and-style-application.md))이
  **처음 발동한 사례**이고, 규칙만 있고 사례가 없던 자리를 그 판단이 채웠다
  (ADR-0015 `정정 기록` 2026-09-02).
- **`components/` 아래는 평평하다.** 컴포넌트마다 폴더를 만들지 않는다. 짝 CSS와
  테스트 파일은 원래 같은 폴더에 두므로(아래 네이밍 표) 세는 대상이 아니다 —
  **하위 파일이 여럿인 컴포넌트가 나오면 그때 폴더를 만든다.**
- `packages/`는 두 번째 소비자가 실제로 나타날 때 만들고, 명시적 배포 패키지 납품과
  실제 런타임 검증 앱이 같은 작업의 수용 기준이면 둘을 함께 만든다. `tooling/`은 공유
  설정 소비자가 둘 이상일 때 만든다
  ([ADR-0004 D2](../adr/0004-package-boundaries-and-dependency-direction.md),
  [ADR-0015 D3](../adr/0015-component-primitives-and-style-application.md),
  [ADR-0003 D2](../adr/0003-workspace-and-directory-structure.md)).
- 문서는 `docs/` 아래, 산출물은 그것을 만든 앱 안(`apps/mobile/dist/`)
  ([ADR-0003 D4](../adr/0003-workspace-and-directory-structure.md)).
- 스크립트 디렉터리를 만들지 않는다. `package.json`의 `scripts`로 충분하다.

## 네이밍

| 대상 | 규칙 | 예 |
|---|---|---|
| 디렉터리 | kebab-case | `src/screens/order-detail/` |
| React 컴포넌트 파일 | PascalCase, **export 이름과 일치** | `OrderDetailScreen.tsx` |
| 그 외 파일 | kebab-case | `api-client.ts`, `use-navigation.ts` |
| 화면 컴포넌트 | `~Screen` 접미사 | `HomeScreen` |
| 훅 | `use~` 접두사, 파일은 `use-~` | `useNavigation` / `use-navigation.ts` |
| 테스트 파일 | `*.unit.test.ts` / `*.ui.test.tsx` / `*.integration.test.tsx` | 계층이 파일명에 드러난다 |
| CSS 파일 | 짝이 되는 컴포넌트 파일명의 kebab-case, **같은 폴더** | `HomeScreen.tsx` → `home-screen.css` |
| CSS 클래스 | 블록 = CSS 파일명. 하위는 `블록-요소` **한 겹만**. BEM의 `__`·`--`를 쓰지 않는다 | `.home-screen-title` |
| CSS 클래스 (상태) | `블록-요소-상태`. 상태어는 **아래 예약 목록에서만**. base 클래스에 **더해** 붙인다 | `.bottom-navigator-label-selected` |
| `data-testid` | `블록-역할`. 클래스 블록과 **같은 접두사**를 쓰고 축약하지 않는다 | `home-screen-title` |
| 상대 import | **확장자를 붙이지 않는다** | `./HomeScreen` (`./HomeScreen.js` 아님) |

- **테스트 파일은 소스와 같은 폴더에 둔다.** `test/` 트리를 만들지 않는다 — 계층은
  파일명이 가른다.
- `data-testid`는 **테스트가 실제로 질의하는 요소에만** 붙인다.

### 상태(modifier) 클래스

**예약 상태어는 지금 여섯이다.** 목록에 없는 말을 쓰지 않는다 — 새 상태가 필요하면
ADR-0003 D7의 표에 행을 먼저 더한다.

| 상태어 | 뜻 |
|---|---|
| `selected` | 여럿 중 지금 골라진 하나 |
| `done` | 진행 순서상 이미 지나온 것 |
| `current` | 진행 순서상 **지금 차례**인 하나 |
| `locked` | 앞선 것이 끝나지 않아 아직 열리지 않은 것 |
| `disabled` | 조작 조건이 충족되지 않아 비활성인 것 |
| `loading` | 요청을 처리 중이라 중복 조작을 막는 것 |

- **`current`는 `selected`가 아니다.** `selected`는 사용자가 고른 것, `current`는 진행
  순서가 정한 것이다. 둘을 한 낱말로 합치면 읽는 사람이 뜻을 판단하게 된다.
- **목록은 여섯이다.** Button 스펙의 `disabled`·`loading`으로 ADR-0003의 재검토
  조건이 발동했고, design-system이 닫은 공통 어휘라 마지막 토큰 판독 규칙을 유지하기로
  했다. 다음 상태어도 이 표와 ADR을 먼저 갱신한다.
- **읽는 규칙: 마지막 토큰이 예약 상태어면 상태, 아니면 요소다.** 예약어를 요소 이름으로
  쓸 수 없다. 구분자를 늘리는 대신 **어휘를 닫아** 경계를 준다.
- base를 **대체하지 않고 더해** 붙인다. base가 공통 값을, 상태 클래스는 **갈리는 속성만**
  선언한다. 한 요소에 상태 클래스는 **최대 하나**다.
- **상태 클래스는 base 바로 뒤에, 같은 파일에 선언한다.** 특이도가 같아 순서가 결과를
  가른다. 뒤집으면 **에러 없이 상태가 안 보인다.**
- **상태를 테스트가 보는 경로는 클래스가 아니다.** `toHaveClass`를 쓰지 않으므로(아래)
  클래스는 **시각 전용**이다. 단언이 필요하면 속성을 둔다 — 아래 **관찰 채널 넷**.
  상태 클래스마다 `data-testid`를 새로 만들지 않는다.
- **변형(variant)은 이 규칙 밖이다.** 아직 정하지 않았다 (`docs/adr/README.md` 보류 표).

([ADR-0003 D6·D7](../adr/0003-workspace-and-directory-structure.md),
[ADR-0006 D4·D7](../adr/0006-command-interface-and-test-layers.md))

### 관찰 채널 넷

**클래스가 시각 전용이므로 관찰은 전부 속성으로 한다.** 지금 채널이 넷이고,
**넷이 서로 다른 것을 본다.** 하나가 다른 하나를 대체하지 않는다 — 새 채널이
생겼다고 옛 채널을 걷지 않는다.

| 채널 | 무엇을 보나 | 예 |
|---|---|---|
| `data-testid` | **요소를 찾는다** | `bottom-navigator-tab-home` |
| 상태 `data-*` | **상태** — 로직이 이 요소를 어떤 상태로 보는가 | `data-selected="true"` · `data-status="current"` |
| `current-color` | **결선** — 그 상태에 토큰 값이 실렸는가 | `color.fg.brand` |
| `accessibility-*` | **보조기술**이 이름·역할·상태를 받는가 | `accessibility-label="홈, 선택됨"` |

- **상태 채널에 속성이 여럿 있어도 채널은 하나다.** boolean 하나로 끝나는 상태는
  `data-selected`(탭의 선택 여부), 값이 셋 이상인 상태는 `data-status`(스텝의
  완료·현재·잠김)다. 속성 이름이 는 것은 **같은 채널의 새 사례**이지 다섯째 채널이
  아니다 — 채널은 *"무엇을 보나"* 로 세지 *"속성이 몇 개인가"* 로 세지 않는다.
- **넷 다 속성이라 `toHaveAttribute` 하나로 본다.** 그래서 아래 매처 절의
  "쓰지 않는다" 칸(계산된 스타일에 의존하는 `toHaveClass`·`toHaveStyle`)에
  **걸리지 않는다.** 이것이 이 저장소에서 상태를 클래스가 아니라 속성으로 내는 이유다.
- **`accessibility-*`는 `data-testid` 카탈로그와 별개 축이다.** 카탈로그에 없는
  `accessibility-*`를 붙이는 것이 드리프트가 아니다
  ([ADR-0016 D1](../adr/0016-assistive-technology-semantics.md)).
- **`accessibility-*`는 붙었는지까지만 자동으로 판정된다.** 보조기술이 실제로 그렇게
  읽는지는 `docs/e2e/`의 실기 확인 몫이다 — 그 경계가
  [ADR-0016 D6](../adr/0016-assistive-technology-semantics.md)에 있다.
  **`ui` green을 "접근성 확인됨"으로 읽지 않는다.** 실제로 한 번 갈렸다 —
  `accessibility-value`는 `ui`에서 전부 green이었는데 iOS 실기에 도달하지 않았다.
- **선택 상태는 이름 문자열 안에 실린다.** `accessibility-value`를 쓰지 않는다 — 이
  스택의 iOS에서 낭독되지 않는다([ADR-0016 D3](../adr/0016-assistive-technology-semantics.md)의
  `정정 기록`). 그래서 상태를 보는 채널이 둘로 보이지만 겹치는 것이 아니다:
  상태 `data-*`는 **테스트가 보는 것**이고 `accessibility-label`의 접미사는
  **보조기술이 받는 것**이다. 여정 맵의 스텝도 같은 모양이다 —
  `data-status="current"`가 테스트의 것, `"주문하기, 현재 스텝"` 이 보조기술의 것이다.

## 무엇을 바꾸면 어느 테스트를 쓰나

| 바꾼 것 | 쓸 것 |
|---|---|
| 순수 함수·리듀서를 만들거나 반환값을 바꿈 | `unit` |
| **컴포넌트를 만들거나 렌더 결과·상호작용을 바꿈** | **`ui` — 같은 PR에서** |
| 모듈·훅의 협력, 인터랙션 이후 흐름을 바꿈 | `integration` |
| 내부 리팩터링 — 관찰 가능한 동작이 그대로 | 새로 쓰지 않는다 |

기준은 *"눈에 보이는가"* 가 아니라 **"관찰 가능한 동작이 바뀌는가"** 다.

**`ui`는 어떻게 보이는지를 덮지 못한다.** 계산된 스타일과 레이아웃을 단언할 수 없어
렌더 결과에는 클래스 이름만 남는다. 색·간격·정렬은 `docs/e2e/`의 수동 확인 몫이다.

강제 수단은 없다. PR diff를 읽을 때 컴포넌트 변경에 `ui` 테스트가 따라왔는지 본다.

([ADR-0006 D4](../adr/0006-command-interface-and-test-layers.md))

## jest-dom 매처는 절반만 쓴다

`ui`·`integration`은 `@testing-library/jest-dom` 매처를 쓴다. Lynx 요소는
`LynxElement extends HTMLElement`이고 실제로 jsdom 트리에 붙어서
(`document.body.contains(el)` → true) 구조 매처가 그대로 동작한다.

| 쓴다 | 쓰지 않는다 |
|---|---|
| `toBeInTheDocument` · `not.toBeInTheDocument` | `toBeVisible` |
| `toHaveAttribute` | `toHaveStyle` |
| `toHaveTextContent` | `toHaveClass` |
| `toContainElement` | 폼 계열 (`toBeChecked` · `toHaveValue`) |

오른쪽은 **계산된 스타일에 의존한다.** jsdom은 Lynx 스타일을 계산하지 않으므로 통과해도
의미가 없고, 더 나쁘게는 **거짓 확신을 준다** — jsdom 기본값으로 항상 통과할 수 있다.
바로 위 절이 말한 "`ui`는 어떻게 보이는지를 덮지 못한다"와 같은 선이다.

왼쪽의 `toHaveAttribute` 하나가 **관찰 채널 넷을 전부** 덮는다 (위 `관찰 채널 넷`).
`accessibility-*`도 DOM 속성으로 렌더되므로 여기 들어온다 — boolean 속성의 값은
문자열 `"true"`이고, `undefined`를 넘긴 속성은 **아예 붙지 않아**
`not.toHaveAttribute`가 공허하지 않다.

### 쿼리를 무엇으로 고르나

| 하려는 것 | 쓰는 것 |
|---|---|
| 존재 기대 | `getByTestId(...)` — **쿼리 자체가 단언이다** |
| 부재 단언 | `expect(queryByTestId(...)).not.toBeInTheDocument()` |
| 속성·텍스트 | `expect(getByTestId(...)).toHaveAttribute(...)` |

`getByTestId`는 못 찾으면 예외를 던지고, 그 메시지가 **무엇을 찾으려 했는지와 그 시점에
실제로 무엇이 있었는지를 DOM째로** 보여준다. 존재를 기대하는 자리에서는 이게 가장 좋은
실패 메시지다.

부재는 `getBy`로 확인할 수 없다 — 못 찾는 순간 예외가 나서 단언까지 가지 못한다.
그때만 `queryBy`를 쓴다. 반대로 존재를 `queryBy`로 확인하면 실패 메시지가
`Received has value: null` 한 줄로 줄어든다.

**`expect(screen.getByTestId(X)).toBeTruthy()`를 쓰지 않는다.** `getByTestId`가 이미
예외를 던지므로 아무것도 확인하지 않는다. 대신 그 요소에 대한 **실제 단언**
(`toHaveAttribute`·`toHaveTextContent`)을 쓴다.

`getBy` 뒤의 `toBeInTheDocument()`도 같은 의미에서 실패 조건을 더하지는 않는다.
**읽는 사람에게 "이 요소가 있는지 보는 중"이라고 알리는 표시**로만 쓴다 — 검사를
강화하는 것으로 착각하지 않는다.

**`data-testid`가 없어 클래스 셀렉터로 잡은 요소에 부정형을 걸 때는 존재 앵커를 먼저
건다.** `querySelector`는 못 찾으면 `null`을 주고 **`null`에 건 부정형 단언은 조용히
통과한다** — 셀렉터에 오타가 났거나 그 요소가 사라져도 초록이라 **게이트가 형식만
남는다.**

```ts
const indicator = tab.querySelector<HTMLElement>(".bottom-navigator-indicator");
expect(tab).toContainElement(indicator); // 존재 앵커 — 이것이 없으면 아래가 공허하다
expect(indicator).not.toHaveAttribute("accessibility-elements-hidden");
```

**같은 종류의 함정이 하나 더 있다 — `not.toHaveAttribute`의 인자 둘짜리다.**
`not.toHaveAttribute(name, value)`는 *"그 값이 아니다"* 만 단언하므로 **속성이 아예 없어도
통과한다.** 부재를 보려면 **이름 하나만** 넘긴다.

**`toHaveTextContent`도 같은 방식으로 공허해진다 — 이쪽 원인은 부분 일치다.**
`toHaveTextContent(X)`는 *"X를 품는다"* 를 단언한다. 그래서 **다른 기대값이 X를 부분
문자열로 품는 자리에서는 이 매처가 값을 가르지 못한다** — 값이 뒤집혀도 초록이다.
**이 저장소에 그런 쌍이 실제로 있다**: 평가 화면의 판정 낱말이 `통과`/`미통과`이고
**`"미통과"`가 `"통과"`를 품는다.** `toHaveTextContent("통과")`로 세운 판정 단언이
라벨이 뒤집힌 상태에서도 통과했다.

**그때의 형태는 `textContent`의 정확 비교(`toBe`)다.** 그리고 **`getByTestId`가 존재
앵커를 겸하므로** 위의 `querySelector` 사례와 달리 앵커를 따로 걸지 않는다 — 못 찾으면
예외가 난다.

```ts
// 부분 일치라 "미통과"에도 통과한다 — 판정을 가르지 못한다
expect(screen.getByTestId("assessment-screen-verdict")).toHaveTextContent("통과");

// 낱말을 지는 잎 노드를 정확 비교한다. getByTestId가 존재 앵커를 겸한다
expect(screen.getByTestId("assessment-screen-verdict-label").textContent ?? "").toBe("통과");
```

**`toHaveTextContent`를 걷어내는 것이 아니다** — 위 표의 왼쪽에 그대로 있다.
**기대값 집합에 서로를 품는 낱말이 있는지 먼저 보고**, 있으면 정확 비교로 간다.
없으면 부분 일치가 읽기 쉬운 형태다. **잡는 자리를 함께 옮긴다** — 판정을 지는 것은
낱말을 담은 **잎 노드**이지 그것을 감싼 상자가 아니다. 상자에 걸면 형제 텍스트가 섞여
들어와 같은 종류의 거짓 초록이 다시 생긴다.

**지려는 것이 「이 요소에 없다」가 아니라 「이 트리에 이것들뿐」이면, 부정형을 자리마다
놓지 말고 닫힌 집합으로 훑는다.** 자리마다 부정형을 놓으면 **완성할 수 없는 열거**가
된다 — 지켜야 할 자리가 늘어도 단언은 안 늘고, `data-testid`가 없는 자리는 애초에 적을
수도 없어 **「지켜지는 자리」가 진짜 집합보다 작아 보인다.** 대신 그 축에 오른 요소를
트리에서 쓸어 앵커 배열을 만들고 고정 목록과 `toEqual`로 대조한다. **열거하는 것은
배제된 자리가 아니라 들어온 자리이고, 배제된 자리는 「목록에 없다」로 지켜진다.**

```ts
function headingAxis(container: HTMLElement): readonly (string | null)[] {
  return [...container.querySelectorAll("[accessibility-traits]")]
    .filter((el) => (el.getAttribute("accessibility-traits") ?? "").split(",").includes("header"))
    .map((el) => el.getAttribute("data-testid") ?? el.getAttribute("class"));
}

expect(screen.getByTestId("listening-screen-complete")).toBeInTheDocument(); // 존재 앵커
expect(headingAxis(container)).toEqual(["listening-screen-title"]);
```

- **`?? getAttribute("class")` 갈래를 빼지 않는다.** 지켜야 할 자리 중에는 `data-testid`가
  없는 것이 있고, `null`로 찍히면 러너 출력이 **어느 자리가 끼어들었는지** 말하지 못한다.
  이름이 찍혀야 잡힌다.
- **`toEqual`을 `arrayContaining`으로 풀지 않는다.** 푸는 순간 「더 들어온 것」을 못 보게
  되어 이 형태가 지려던 방향 자체가 사라지고, 남는 것은 존재 단언뿐이다.
- **셀렉터를 속성 이름으로 열고, 값은 갈라서 「포함하는가」로 거른다.** 값이 통째로
  일치하는 것만 찾으면(`[accessibility-traits="header"]`) **쉼표로 이은 복수값**을 못 본다
  — 벤더된 Pod의 변환기가 이 속성을 쉼표로 갈라 역할을 OR로 합치므로 `"button,header"`는
  실기에서 **실제로 머리말 역할을 싣는다.** 못 본 자리는 배열에 안 실려 대조가 조용히
  통과한다. 다른 축의 값(`button`·`tab` 단독)은 **포함 검사가 걸러 내므로** 집합의 정의는
  흐려지지 않는다.
- **개수를 세지 않는다.** `toHaveLength`는 어긋난 **이름**을 안 알려준다. 배열째로 대조해야
  러너 출력이 어느 자리인지 말한다.
- **지키려는 자리가 그 트리에 있다는 것을 먼저 짓는다** — 위 절의 존재 앵커가 여기서도
  그대로 필요하다. 닫힌 집합 대조는 배열이 **자라야** 빨개지므로, 지키려는 자리가 트리에서
  **사라지면** 배열은 안 자라고 대조는 통과한다. 그 상태가 무대에 올리는 자리를
  `getByTestId`로 — `data-testid`가 없으면 `querySelector` + `not.toBeNull()`로 — 먼저
  짓는다. 없어지면 「앵커를 못 찾음」으로 그 케이스가 빨개진다.

덮는 결정은 [ADR-0016 D12-4](../adr/0016-assistive-technology-semantics.md)의 「더 붙임」
방향이고, 같은 자리가 그 반대 방향(「빠뜨림」)은 **테스트가 아니라 두 `git grep`의
차집합**에 배정해 뒀다 — **이 형태로 그 방향을 대신 지려 하지 마라.**

**강제 수단은 없다.** oxlint 규칙으로 막을 수 없어 PR diff를 읽을 때 본다.
등록 위치는 `apps/mobile/vitest.setup.ts`이고 이유가 그 주석에 있다.

## import

- 워크스페이스 내부 참조는 항상 `workspace:*`. 버전 범위를 쓰지 않는다.
- 방향은 `apps/* → packages/*` 한 쪽뿐. `packages/* → apps/*`와 `apps/* → apps/*`는 금지.
- 패키지 진입점은 `exports`로 명시한다. `@libitums/x/src/...` 같은 내부 경로를 열지 않는다.
- `lib/`는 UI를 import하지 않는다.
- **화면 폴더 사이(`screens/A → screens/B`)는 `import type` 하나이고, 그 타입의 소유자가
  그 화면일 때만이다.** 값(`const`·함수·컴포넌트)은 가져오지 않는다. 지금 있는 형태는
  전부 `JourneyStepId` 하나를 여정 맵에서 가져오는 것이다 — 듣기 · 문장 순서 · 단어 선택.
  **`app/`은 이 규칙 밖이다**(루트가 화면을 결선하므로 값도 가져온다).
- **소유가 흐려지면 `src/lib/`로 승격한다.** 흐려진다는 것은 둘 중 하나다 — 그 어휘를
  **화면 셋 이상이 쓰거나**, 타입 이름이 가리키는 화면의 것이 아니게 되거나.
  `AnswerResult`가 그렇게 올라왔고(`lib/answer-result.ts`), `JourneyStepId`는 **올라가지
  않는다** — 소비자가 여럿이어도 스텝 id는 여정 맵의 어휘다. **소유자가 있으면 그 자리에
  둔다.**

([ADR-0004 D3·D4·D5](../adr/0004-package-boundaries-and-dependency-direction.md) ·
[ADR-0003 D5](../adr/0003-workspace-and-directory-structure.md))

## 스타일

- 토큰은 **CSS 커스텀 프로퍼티로 쓴다.** 변수 이름은 패키지가 정의한 것만 —
  **접두사는 예외 없이 `--libitum-`이다.** `var(--libitum-color-background-primary)`이지
  `var(--color-bg-surface)`가 아니다. **다른 이름 계열을 만들지 않는다.**
- **예외는 아이콘 색 하나.** Lynx `<svg>`는 CSS `color`를 읽지 않으므로
  `current-color` 속성에 TS 상수를 넘긴다 — `import { color } from '@libitums/design-tokens'`.
  **이 예외를 선례로 쓰지 않는다.** 나머지 시각 값은 전부 CSS다.
- 시각 값은 **컴포넌트와 1:1인 CSS 파일**에만 둔다. TSX에는 `className`만 두고
  **인라인 `style`을 쓰지 않는다.**
- **값을 하드코딩하지 않는다.** 필요한 토큰이 패키지에 없으면 이름을 지어내지 말고
  design-system에 변경을 요청한다.
- **텍스트를 품은 상자에 `width`·`height`를 쓰지 않는다. `min-width`·`min-height`를 쓴다.**
  Dynamic Type은 **글자만** 키우고 상자는 안 키운다 — 고정 치수로 두면 최대 배율에서
  라벨이 상자를 넘쳐 잘리고 **잘린 내용은 사라진다**(WCAG 1.4.4). 토큰 값은 그대로 쓰고
  **제약의 성질만** 바꾸므로 하드코딩이 아니다. 아이콘·구분선처럼 **배율을 안 받는 내용**만
  든 상자와 `width: 100%`(채움)는 그대로 둔다
  ([ADR-0020 D5](../adr/0020-dynamic-type-font-scale.md), 가로 축은
  [ADR-0022 D6](../adr/0022-scroll-regions-and-fixed-affordances.md)).
- **한 flex 상자에 배율을 받는 자식(텍스트)과 안 받는 자식(아이콘·`min-height` 히트박스·
  `flex: 1` 형제)이 섞이면 축을 보고 선언을 고른다.** 규칙과 근거는 ADR이 지고 여기서는
  무엇을 하는지만 적는다.
  - **세로 열의 텍스트 상자에 `flex-shrink: 0`. 가로 행의 텍스트 상자에는 주지 않는다** —
    가로로 줄면 줄바꿈으로 흐르고, 막으면 넘쳐서 잘린다. **세로의 이 선언도 잘림을
    없애지 않고 옮긴다**(형제가 `flex: 1` 하나뿐이면 열이 넘친다).
  - **가로 행이라도 히트박스·고정 어포던스(`min-height` 상자·아이콘)에는 `flex-shrink: 0`을
    준다. 이미 붙어 있으면 걷지 않는다** — 위 줄의 「주지 않는다」는 **텍스트에만** 걸린다.
    히트박스가 가로로 눌리면 **최소 터치 영역이 깨지고**(WCAG 2.5.5 · 2.5.8) 줄바꿈이
    그것을 구해 주지 않는다. **낭독 순서를 고치는 것은 이 줄이 아니라 아래 `align-items`
    줄이다** — `flex-shrink`를 걷어도 순서는 그대로다.
  - **가로 행에 `align-items: flex-start`.** `center`는 큰 자식을 위로 올려 DOM 순서와
    낭독 순서를 가른다. **기본 배율에서 자식들의 높이가 같으면(Δ 0) 그대로 건다.**
  - **높이가 다르면(Δ ≠ 0) 「걸지 않는다」가 아니라 둘 중 하나다.** **(a)** 먼저 높이를
    맞춘 뒤 걸거나, **(b)** 걸고 **그만큼을 `margin`으로 되갚는다(안 B)** — **되갚는
    값은 `(줄 높이 − 그 자식의 높이) / 2`다.** **갚지 않고 거는 것만 금지다**(기본
    배율의 렌더가 움직인다). `.listening-screen-header`가 (b)이고
    (`(48 − 24) / 2` → 제목에 `margin-top: 12`), **`padding`은 높이를 같게 만들지
    않으므로 (b)는 (a)의 변형이 아니라 셋째 경로다.** **(b)를 고르면 그 값이 토큰
    이름이 아니라 산술 결과라는 것을 CSS 주석에 적는다** — 히트박스 하한이나
    typography scale이 바뀌면 조용히 틀린다.
  - **이 축은 자동 계층이 못 본다.** 판정은 `docs/e2e/`의 수동 항목이다
    ([ADR-0023](../adr/0023-scale-mismatch-in-flex-boxes.md) — 게이트 둘의 등급 차이와
    사례 표가 거기 있다). **`align-items: flex-start`도 `<text>`의 `padding`도 이
    저장소에서 선례 0건이고 실기로 확인된 적이 없다** — 위 네 줄은 아직 대부분
    **코드 판단** ⟨추정⟩ 위에 서 있다.
- 원본 JSON·Markdown·SVG를 복사하거나 fork하지 않는다. 패키지로만 소비한다.
- 컴포넌트 스펙과 구현이 다르면 **design-system의 스펙이 기준**이다.
- `var(--오타)`는 조용히 무시된다. 접두사가 틀린 것은 **`pnpm lint`의 접두사 검사**가
  잡는다 (ADR-0014 D8 — `lint:tokens`. `apps/mobile/src/**/*.css`를 훑는다).
  **접두사가 맞는 오타는 여전히 눈으로만** 발견된다(`docs/e2e/`).

([ADR-0014 D1·D2·D4·D8](../adr/0014-design-system-consumption-verified.md),
[ADR-0015 D2](../adr/0015-component-primitives-and-style-application.md))

## 화면 골격

```text
.<화면>
  [고정] 머리      나가는 수단 + 제목
  [흐름] 내용      <scroll-view className="<블록>-scroll" data-testid="<블록>-scroll">
  [고정] 액션 행   나아가는 수단          ← 있는 화면에만
```

- **내용 영역은 `<scroll-view>` 하나다.** 화면당 정확히 하나이고 **중첩하지 않는다.**
  내용이 한두 줄뿐인 화면에도 넣는다 — *"넘칠 것 같은 화면만"* 은 화면마다 판단을
  요구하고, **그 판단은 이미 놓친 적이 있다.**
- **머리와 액션 행은 고정이다.** 흐르게 두면 스크롤 위치에 따라 **출구와 진행 수단이
  사라진다.**
- **없는 슬롯을 만들지 않는다.** 액션 행이 없는 화면에 빈 컨테이너를 두지 않는다.
- 이름은 `<블록>-scroll`이고 **클래스와 `data-testid`가 같은 문자열**이다. `scroll`은
  예약 상태어가 아니라 **요소** 자리다 (위 네이밍 표의 읽는 규칙 그대로).
- **`scroll-view`의 prop은 소스에서 초기값을 확인한 뒤 정한다.** `@lynx-js/types`의
  `@defaultValue`는 **리셋 값**(적었다가 지웠을 때 돌아가는 값)을 적고 있을 수 있어
  **초기값의 근거가 못 된다** — 확인은 `createView`와 ivar 초기화에서 한다. **지금 적는
  것은 둘이고 여섯 화면 전부다**: `scroll-orientation="vertical"`(안 적으면 초기값이
  **가로**라 세로 스크롤이 원리적으로 불가능하다) · `scroll-bar-enable={true}`(초기값이
  `NO`라 **적어야 켜진다**). `enable-scroll`은 초기값이 `YES`라 안 적고, `bounces`도
  안 적는다 — **UIKit 기본값이 `YES`이고 그것이 우리가 원하는 값임을 실기로 확인했다**
  (2026-09-04, LIB-226 S7). **결론은 확인 전과 같고 근거가 다르다** — 전에는
  「모르니까 안 적는다」였고 지금은 「재봤더니 같으니까 안 적는다」다.
- **스크롤 컨테이너는 감싸기만 한다.** 기존 자식의 요소·클래스·`data-testid`·
  `accessibility-*`·형제 순서를 바꾸지 않는다 — **DOM 순서가 낭독 순서다.**
- **스크롤 컨테이너의 직계 자식은 0개 또는 1개다.** `<scroll-view>`는 CSS의 `display`가
  무엇이든 강제로 `linear`가 되고 **linear에는 `gap`이 없다** — 스크롤 컨테이너에 준 `gap`은
  **무동작이다.** 자식이 둘 이상 필요하면 **하나로 감싸고, `display: flex`와 `gap`은 그
  감싼 상자가 진다.**
- **남는 세로를 받는 것은 스크롤 컨테이너 하나다.** 안쪽 자식에 `flex: 1`을 남기면
  **아무 일도 안 하는 죽은 선언**이 된다 — 강제 `linear`의 자식에게는
  `flex-grow`·`flex-shrink`가 읽히지 않는다. **스크롤 컨테이너 자신의 `flex: 1`은 살아
  있다**(그것을 읽는 것은 부모이고, 부모는 linear가 아니다). 넘치는 상자를
  `justify-content: center`로 두지 않는다 — 위쪽 항목이 스크롤 원점 밖으로 밀린다.
- **겹침 레이어(오버레이·시트)는 스크롤 밖**, 화면 루트의 직계 자식이다.
- **스크롤 컨테이너에 `accessibility-*`를 붙이지 않는다.** 조작 단위가 아니라 상자다
  ([ADR-0016 D5](../adr/0016-assistive-technology-semantics.md)).

([ADR-0022](../adr/0022-scroll-regions-and-fixed-affordances.md))

## 컴포넌트

- **Lynx 내장 요소(`<view>`·`<text>`·`<svg>`)를 화면에서 직접 쓴다.** 래퍼
  프리미티브를 만들지 않는다.
- 승격은 사용처가 늘 때만 — **화면 1개면 그 화면 폴더, 화면 2개면 `src/components/`,
  앱 2개면 `packages/`.** 미리 올리지 않는다. 세는 단위는 **화면**이지 렌더 횟수가 아니다.
- **예외 하나 — design-system이 스펙을 가진 컴포넌트**(Button · Dialog · Bottom Sheet ·
  Bottom Navigator · Header · Indicator)**는 두 번째 화면을 기다리지 않고 바로
  `src/components/`에 둔다.** 스펙이 있다는 것이 두 번째 사용처가 예정돼 있다는 뜻이다.
  `packages/`는 그대로 앱 2개일 때다 (ADR-0015 `정정 기록` 2026-09-02).
- **⚠ 위 세는 규칙은 컴포넌트의 것이다. 순수 모듈(타입·상수·순수 함수)은 `src/lib/`로
  가고 저울도 다르다** — `src/components/`는 컴포넌트의 자리다(ADR-0015 D3). 순수
  모듈이 올라가는 조건은 **화면 수가 아니라 소유가 흐려지는 것**이고, 판정은 위
  「import」 절이 진다. 화면 하나가 소유하고 화면과 함께 움직이면 **화면 폴더에
  남는다** — 두 화면이 쓴다는 것만으로 올리지 않는다.
- **올린 모듈에 화면의 로직을 흘려 넣지 않는다.** 공용으로 가는 것은 **어휘**(타입과
  그 낱말)이고 **채점·전이는 각 화면 폴더에 남는다.** `lib/answer-result.ts`가
  `AnswerResult`와 `answerResultLabel` 둘만 갖는 것이 그 선이다 —
  `judgeAnswer`·`judgeSentenceOrder`·`judgeWordChoice`는 화면 쪽에 있다.
  그래서 파일 이름도 타입과 1:1이다(`feedback.ts`·`judgement.ts` 같은 상위 이름은
  「판정에 관한 것은 다 여기」로 읽혀 로직을 끌어온다).

([ADR-0015 D1·D3](../adr/0015-component-primitives-and-style-application.md) ·
[ADR-0003 D5](../adr/0003-workspace-and-directory-structure.md))

## 앱 내부

- **상태**: React 내장(`useState`·`useReducer`·`useContext`)만 쓴다. 서버 상태와
  클라이언트 상태를 개념적으로 구분해서 부른다. 영속 저장소에 넣는 것은 로그인 토큰뿐이다.
- **데이터**: `src/lib/api-client.ts` 한 파일에 모은다. **서버 응답을 전역 store에
  저장하지 않는다.** Lynx의 `fetch`는 CORS·redirect·keepalive·FormData·Blob이 없다.
- **화면 전환**: `src/app/navigation.ts`의 리듀서가 소유한다. 화면 파라미터는 union의
  필드로만 넘긴다. 화면이 스택 배열을 직접 읽거나 쓰지 않는다.
- **어느 화면을 여는지는 데이터가 정한다 — 셸에 리터럴로 적지 않는다.** 조건이 데이터에서
  오면 그 사상은 `navigation.ts`의 **순수 함수**가 지고, 셸(`App.tsx`)은 그 함수를 부르기만
  한다. 셸에 `switch`나 `if` 사슬을 두지 않는다 — **망라 검사가 셸이 아니라 함수에 서야**
  값이 늘 때 `tsc`가 빠진 자리를 잡는다. 첫 자리는 `learningScreenFor(form, stepId)`이고
  대응하는 표는 화면 폴더(`journey-map.ts`의 `learningFormByStep`)에 있다.
  **⚠ 2026-09-07 결선이 착지했다 (LIB-239)** — `App.tsx`의 `onStartStep`이
  `learningScreenFor(learningFormForStep(id), id)`를 부른다. 위 두 함수의 **제품 코드
  호출자는 셸의 이 한 자리**이고 `{ name: "listening", stepId }` 리터럴은 0건이다.
  **오늘 어느 스텝에서 시작하든 듣기가 열리는 것은 결선이 없어서가 아니라** 표의 다섯
  값이 전부 `"listening"`이기 때문이다 — 배정 값이 오는 날 이 규칙대로 **코드 변경 없이**
  화면이 갈린다. 배정이 무엇을 기다리는지는 `docs/adr/README.md` 보류 표의
  「스텝별 학습형 배정」 행.
- **에러 경계**: 루트에 하나뿐이다. 네트워크 실패는 여기로 올리지 않고 화면 안에서 재시도한다.
- 모든 화면에 **화면 내 back 수단**을 둔다. 하드웨어 뒤로가기에만 의존하지 않는다.
- **나가는 수단은 라벨이 가리키는 곳으로 간다 — 스택 깊이로 목적지를 맞추지 않는다.**
  `맵으로`는 활성 스택의 루트로 가고(`backToRoot`), `back`(한 겹 위)으로 대신하지 않는다.
  「한 겹 위가 마침 맵이다」는 깊이가 늘면 거짓이 된다. 진입을 `push`로 할지 `replace`로
  할지도 **출구를 맞추려고** 고르지 않는다.

([ADR-0007](../adr/0007-app-internals-state-routing-data-errors.md))

라이브러리(zustand · TanStack Query · 라우터)를 넣는 조건은 ADR-0007에 수치로 적혀 있다.
조건이 오면 넣고, 오기 전에 넣지 않는다.

## 임시 입력값의 이음매

**진짜 컨텐츠가 오기 전에 채워 두는 입력값은 아래 넷을 지킨다.** 화면 하나의 규칙이
아니라 **임시 입력값 일반의 규칙**이다 — 오디오 자산 · 스텝별 학습형 배정 · 문화 컨텐츠가
지금 같은 자리에 있다.

- **격리 — 임시 값은 모듈 하나에 모인다.** 흩으면 교체 지점이 세어지지 않는다.
- **타입이 모양을 진다 — 옵셔널 금지.** `x?`면 "아직 없는 것"이 타입에 생기고, 그 분기를
  소비자 전부가 지게 된다.
- **화면이 내용에 의존하지 않는다 — `ui` 테스트가 다른 fixture로도 통과해야 한다.** 값을
  단언하면 컨텐츠가 오는 날 테스트가 함께 빨개져 **깨진 것이 화면인지 값인지 갈리지 않는다.**
- **주석이 교체 지점을 적는다 — 무엇이 임시이고, 무엇이 막고 있고, 진짜가 오는 날 무엇만
  바뀌나.**

**새로 만든 규칙이 아니다. 이미 선 자리가 넷 있다.** 아래 인용은 원문 주석의 **발췌**다 —
원문에는 계약 절 번호가 함께 달려 있고 그 번호는 이 문서에서 풀리지 않는다.

- **`listening.ts`의 `ListeningQuestion.audioSource` — 한 필드가 「격리」 · 「옵셔널 금지」 ·
  「주석이 교체 지점을 적는다」 셋을 전부 진다.**
  주석이 그 값을 *"호스트가 해석하는 **불투명 문자열**"* 로 두어 **격리**하고, *"옵셔널이
  아니다 — `audioSource?`면 "아직 없는 문항"이 타입에 생긴다"* 로 **옵셔널을 막고**,
  *"자산이 오면 `AudioPlaybackModule.resolve`에 **해석만** 붙는다"* 로 **교체 지점**을
  적는다.
- **`journey-map.ts`의 `learningFormByStep` — 「주석이 교체 지점을 적는다」의 항목이 그대로
  나열돼 있다.**
  *"오른쪽 다섯 값은 배정이 아니라 … 전사(轉寫)다"*(무엇이 임시인가) ·
  *"**왜 빈 채로 둘 수 없나** — `LearningForm` union에 빈 값(`""`도 `null`도)이 없고
  `Record`가 다섯 키를 전부 요구한다"* · *"**무엇이 막고 있나** — 실제 배정은 컨텐츠
  판단이고 … **문항 값과 같은 시점에 온다**"* · *"**값이 오는 날 무엇만 바뀌나** —
  **이 표의 오른쪽 다섯 개**와 그 스텝의 문항 배열 둘뿐이다. **형태는 한 글자도 안
  바뀐다**"*. 마지막 문장이 **이음매가 성립했다는 판정 문장**이다.
- **`culture.ts`의 스텝→서사 표 — 「격리」 · 「옵셔널 금지」 ·
  「주석이 교체 지점을 적는다」 셋을 한 모듈이 진다.**
  주석이 *"**무엇이 임시인가** — 아래 다섯 값의 `title`과 `paragraphs`뿐이다. 왼쪽
  키(JourneyStepId 다섯)와 오른쪽 타입(CultureNarrative)은 임시가 아니다"* 로 임시 값을
  표 하나로 모아 **격리**하고, *"**무엇이 막고 있나** — 진짜 서사는 페르소나
  기획(LIB-231~LIB-235)에서 온다"* · *"**값이 오는 날 무엇만 바뀌나** —
  이 표의 오른쪽 다섯 값뿐이다. 형태도 export 목록도 화면도 안 바뀐다"* 로
  **교체 지점**을 적는다. **옵셔널을 막는 자리는 `learningFormByStep`과 같은 union
  쪽이다** — *"**이 표가 배정 근거가 아니다** — 다섯 키 전부에 서사가 있는 것은 표의
  타입이 `Record<JourneyStepId, …>`이고 `CultureNarrative`에 빈 값이 없기 때문이지,
  다섯 스텝이 전부 문화라는 뜻이 아니다"*.
- **`culture-quiz.ts`의 스텝→문항 표 — 「격리」 · 「옵셔널 금지」 ·
  「주석이 교체 지점을 적는다」 셋을 한 모듈이 진다.** `culture.ts`와 같은 형태이고 **표가
  비어 있다는 것만 갈린다.** 주석이 *"**무엇이 임시인가** — 오른쪽 다섯 값이 빈 것이
  임시다. 왼쪽 키…와 오른쪽 타입…은 임시가 아니다"* 로 **「빈 것이 임시다」를 명시**하고
  (서사 표는 반대로 「차 있는데도 임시」였다), *"**이 표가 배정 근거가 아니다** … 그리고
  문화 퀴즈는 스텝에 배정되지 않는다 — 들어오는 전이는 문화 학습의 액션 행 하나다"* 로
  **표를 배정으로 읽는 길을 막는다.** 표는 **export하지 않는다** — *"표를 내보내면 다음
  사람이 직접 색인해 자기 답을 짓는다."*

**셋째 규칙(「화면이 내용에 의존하지 않는다」)이 선 자리는 주석이 아니라 테스트다.**
문장 순서 · 단어 선택 · **문화 퀴즈**의 문항 `Record`는 **다섯 스텝 전부 빈 배열**인데도
세 화면의 `ui` 테스트가 돈다 — **조회 함수 하나만 `vi.mock`의 `importOriginal`로 부분
대역하고, 나머지 export는 실제 구현을 그대로 통과시킨다.** 데이터 파일은 **읽기 전용으로
두고 고치지 않는다.** **그래서 값이 오는 날 그 테스트는 그대로다** — 이것이 「다른
fixture로도 통과한다」의 실물이다. 형태의 정본은
`word-choice/WordChoiceScreen.ui.test.tsx`이고 `sentence-order/SentenceOrderScreen.ui.test.tsx` ·
`culture-quiz/CultureQuizScreen.ui.test.tsx`가 같은 형태다. **셋째 사례가 더 짓는 것 하나** —
그 fixture는 **보기 개수를 문항마다 다르게** 준다. 개수를 계약이 정하지 않았다는 것을
테스트가 실물로 지는 자리다.

**파생값에는 적용되지 않는다.** 파생값은 **임시로 채울 수 있는 종류가 아니다** — 채우면
값이 아니라 **계산 규칙**이 굳고, 교체 지점이 한 곳으로 좁혀지지 않는다. **그런 화면은
이음매를 만드는 것이 아니라 뒤로 미룬다.** 그 판정의 자리는
[`docs/screens.md`](../screens.md)의 「홈은 소비자다」다.

([ADR-0010 D6](../adr/0010-convention-docs-and-design-done-criteria.md) ·
[ADR-0007 D2·D5](../adr/0007-app-internals-state-routing-data-errors.md) ·
[ADR-0006 D4](../adr/0006-command-interface-and-test-layers.md))
