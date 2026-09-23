// 낭독 접점입니다. 일반 발화는 프레임워크 builtin 모듈을 쓰고, 완료 발화만
// `CompletionAnnouncementModule` 전용 호스트 모듈로 보냅니다. 타이핑은 `storage.ts` ·
// `audio.ts`의 「지역 인터페이스 + 캐스팅」 형태를 그대로 따릅니다.

/**
 * 프레임워크가 `LynxAccessibilityModule`이라는 이름으로 빌트인 등록합니다.
 *
 * **Pod 4.0.1 소스에서 셋을 확인했습니다** — JSDoc이 아니라 구현입니다(ADR-0022가 세운 규칙):
 *
 * - 이름: `LynxAccessibilityModule.mm:11` `static NSString *NAME = @"LynxAccessibilityModule"`
 * - 등록: `LynxTemplateRenderHelper.mm:494` `setUpBuiltModuleWithFactory` — **조건 없이** 부릅니다
 * - selector: `:33` `@selector(accessibilityAnnounce:callback:)` — **인자 둘**
 *
 * 본문(`:104~115`)은 `args[@"content"]`를 읽어 `UIAccessibilityPostNotification`에 넘깁니다.
 * 그래서 키 이름이 `content`입니다.
 */
interface LynxAccessibilityModule {
  accessibilityAnnounce(args: { content: string }, callback: (result: unknown) => void): void;
}

// 완료 발화만 전용 호스트 모듈로 전달하기 위한 접점입니다.
interface CompletionAnnouncementModule {
  announce(args: { content: string }, callback: (result: unknown) => void): void;
}

function completionModule(): CompletionAnnouncementModule | undefined {
  if (typeof NativeModules === "undefined" || NativeModules === null) return undefined;
  const module = (NativeModules as Record<string, unknown>)["CompletionAnnouncementModule"] as
    | CompletionAnnouncementModule
    | null
    | undefined;
  return module ?? undefined;
}

/** 낭독 **요청 한 번의 결과**입니다. 실제로 들렸는지를 답하지 않습니다. */
export type AnnounceOutcome = "announced" | "unavailable";

// **`audio.ts`·`storage.ts`와 같은 형태입니다 — `typeof` 가드 + `null` 정규화.**
//
// `ui`·`integration` 테스트 환경에는 `NativeModules` 전역이 아예 없습니다. 이 모듈은
// 화면이 렌더될 때마다 불리므로 가드가 없으면 두 계층이 통째로 `ReferenceError`로
// 죽습니다.
//
// `isAnnouncementAvailable`과 `announce` 두 export가 이 함수 하나를 지납니다.
// `announceCompletion`은 전용 모듈이 없을 때만 `announce`로 fallback합니다.
//
// `typeof NativeModules === "undefined"`는 전역이 **없을 때**만 막습니다. `typeof null`은
// `"object"`라 전역 자체가 `null`이면 이 가드를 통과하고, 바로 아래의 색인 접근
// (`NativeModules["…"]`)에서 TypeError가 납니다. 아래 `NativeModules === null` 줄이 그
// 사각을 막습니다.
//
// **이 방어의 근거는 관찰이 아닙니다.** 전역이 `null`로 세팅되는 경로는 확인되지
// 않았습니다 — `@lynx-js/types@4.1.0`의 `declare global { var NativeModules: INativeModules }`
// 선언에 `null`이 없고, `apps/**`에 `NativeModules =` 대입이 0건이며, iOS Pod 네이티브
// 소스가 벤더링돼 있지 않아 실제 등록 코드를 확인할 수 없습니다. 이 줄이 있는 이유는
// 관찰이 아니라 **위 가드가 자기가 막는다고 주장하는 값(전역이 없거나 비정상인 경우)의
// 부분집합만 실제로 막는다는 논리적 사실**입니다 — `typeof` 가드는 "없음"만 잡고
// "있는데 `null`"은 놓칩니다.
//
// 아래 `module ?? undefined`(모듈 값의 `null` 정규화)는 Pod 4.0.1
// 소스와 실기 관찰로 근거가 섰습니다(이 파일 상단 JSDoc). 이 줄은 그렇지 않습니다 — 같은
// 파일 안에서 근거의 종류가 갈립니다.
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
  // registerModule이 아직 안 끝났을 때는 `undefined`가 아니라 `null`이 관찰됩니다.
  // 캐스팅만 믿으면 이 축이 새나가므로 여기서 `undefined`로 정규화합니다.
  return module ?? undefined;
}

export function isAnnouncementAvailable(): boolean {
  return nativeModule() !== undefined;
}

/**
 * `content`를 호스트의 낭독 큐에 한 번 밀어 넣습니다. 던지지 않습니다.
 *
 * 모듈이 없으면 아무 일도 하지 않고 `"unavailable"`을 돌려줍니다.
 *
 * **인자를 둘 넘깁니다 — `args`와 콜백.** 네이티브 selector가
 * `accessibilityAnnounce:callback:`(인자 둘)이라, 하나만 넘기면 브리지가 첫 인자를
 * context로 읽는 경로로 조용히 빠집니다. 콜백 본문은 비어 있어도 됩니다 — 결과를
 * 상태로 들지 않습니다.
 */
export function announce(content: string): AnnounceOutcome {
  const host = nativeModule();
  if (host === undefined) {
    return "unavailable";
  }

  host.accessibilityAnnounce({ content }, () => {});

  return "announced";
}

export function announceCompletion(content: string): AnnounceOutcome {
  const host = completionModule();
  if (host === undefined) return announce(content);
  host.announce({ content }, () => {});
  return "announced";
}
