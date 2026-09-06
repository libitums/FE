// 낭독 접점. 호스트 앱의 네이티브 모듈 하나(`LynxAccessibilityModule`)를 감싼다
// (ADR-0017 D3 「접점은 모듈마다 파일 하나」의 셋째 사례).
//
// LIB-227 (logic): 계약(.agent-harness/work/lib-227/spec.md §3.2)이 고정한 타입 +
// 순수 함수 둘을 구현한다.
//
// **타이핑은 `storage.ts` · `audio.ts`의 「지역 인터페이스 + 캐스팅」 형태를 그대로
// 따른다** (계약 §3.2). `LynxAccessibilityModule`은 프레임워크가 빌트인으로
// 등록한다 — 호스트(`apps/ios/**`)를 한 줄도 바꾸지 않는다.

/**
 * 프레임워크가 `LynxAccessibilityModule`이라는 이름으로 빌트인 등록한다.
 *
 * **Pod 4.0.1 소스에서 셋을 확인했다** — JSDoc이 아니라 구현이다(ADR-0022가 세운 규칙):
 *
 * - 이름: `LynxAccessibilityModule.mm:11` `static NSString *NAME = @"LynxAccessibilityModule"`
 * - 등록: `LynxTemplateRenderHelper.mm:494` `setUpBuiltModuleWithFactory` — **조건 없이** 부른다
 * - selector: `:33` `@selector(accessibilityAnnounce:callback:)` — **인자 둘**
 *
 * 본문(`:104~115`)은 `args[@"content"]`를 읽어 `UIAccessibilityPostNotification`에 넘긴다.
 * 그래서 키 이름이 `content`다.
 */
interface LynxAccessibilityModule {
  accessibilityAnnounce(args: { content: string }, callback: (result: unknown) => void): void;
}

/** 낭독 **요청 한 번의 결과**다. 실제로 들렸는지를 답하지 않는다. */
export type AnnounceOutcome = "announced" | "unavailable";

// **`audio.ts`·`storage.ts`와 같은 형태다 — `typeof` 가드 + `null` 정규화.**
//
// `ui`·`integration` 테스트 환경에는 `NativeModules` 전역이 아예 없다. 이 모듈은
// 화면이 렌더될 때마다 불리므로(계약 §3.2 규칙 1), 가드가 없으면 두 계층이 통째로
// `ReferenceError`로 죽는다.
//
// **두 export가 모두 이 함수 하나를 지나간다.** 없을 때 조용한 것이 두 자리에
// 흩어져 있으면 한 자리만 고칠 수 있다(계약 §3.2 규칙 2).
//
// `typeof NativeModules === "undefined"`는 전역이 **없을 때**만 막는다. `typeof null`은
// `"object"`라 전역 자체가 `null`이면 이 가드를 통과하고, 바로 아래의 색인 접근
// (`NativeModules["…"]`)에서 TypeError가 난다. 아래 `NativeModules === null` 줄이 그
// 사각을 막는다.
//
// **이 방어의 근거는 관찰이 아니다.** 전역이 `null`로 세팅되는 경로는 확인되지
// 않았다 — `@lynx-js/types@4.1.0`의 `declare global { var NativeModules: INativeModules }`
// 선언에 `null`이 없고, `apps/**`에 `NativeModules =` 대입이 0건이며, iOS Pod 네이티브
// 소스가 벤더링돼 있지 않아 실제 등록 코드를 확인할 수 없다. 이 줄이 있는 이유는
// 관찰이 아니라 **위 가드가 자기가 막는다고 주장하는 값(전역이 없거나 비정상인 경우)의
// 부분집합만 실제로 막는다는 논리적 사실**이다 — `typeof` 가드는 "없음"만 잡고
// "있는데 `null`"은 놓친다.
//
// **D2·D3와 다르다.** 아래 `module ?? undefined`(모듈 값의 `null` 정규화)는 Pod 4.0.1
// 소스와 실기 관찰로 근거가 섰다(이 파일 상단 JSDoc). 이 줄은 그렇지 않다 — 같은
// 파일 안에서 근거의 종류가 갈린다.
function nativeModule(): LynxAccessibilityModule | undefined {
  if (typeof NativeModules === "undefined") {
    return undefined;
  }
  if (NativeModules === null) {
    return undefined;
  }
  const module = (NativeModules as Record<string, unknown>)["LynxAccessibilityModule"] as
    | LynxAccessibilityModule
    | undefined;
  // registerModule이 아직 안 끝났을 때는 `undefined`가 아니라 `null`이 관찰된다.
  // 캐스팅만 믿으면 이 축이 새나가므로 여기서 `undefined`로 정규화한다.
  return module ?? undefined;
}

export function isAnnouncementAvailable(): boolean {
  return nativeModule() !== undefined;
}

/**
 * `content`를 호스트의 낭독 큐에 한 번 밀어 넣는다. 던지지 않는다.
 *
 * 모듈이 없으면 아무 일도 하지 않고 `"unavailable"`을 돌려준다(계약 §3.2 규칙 5).
 *
 * **인자를 둘 넘긴다 — `args`와 콜백.** 네이티브 selector가
 * `accessibilityAnnounce:callback:`(인자 둘)이라, 하나만 넘기면 브리지가 첫 인자를
 * context로 읽는 경로로 조용히 빠진다(계약 §3.2 규칙 3). 콜백 본문은 비어 있어도
 * 된다 — 결과를 상태로 들지 않는다(계약 §3.2 규칙 4).
 */
export function announce(content: string): AnnounceOutcome {
  const host = nativeModule();
  if (host === undefined) {
    return "unavailable";
  }

  host.accessibilityAnnounce({ content }, () => {});

  return "announced";
}
