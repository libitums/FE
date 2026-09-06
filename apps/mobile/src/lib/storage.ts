// 영속 저장소. 호스트 앱의 네이티브 모듈 하나(`StorageModule`)를 감싼다 (ADR-0012 D2).
//
// **「하나」는 개수가 아니라 이 파일이 감싸는 대상이다.** 접점은 모듈마다 파일 하나다
// (ADR-0017 D3) — 호스트에 등록된 모듈은 둘이고, 목록은 `docs/adr/README.md`의
// **호스트 모듈 표**에 있다. 여기서 개수를 세지 않는다.
//
// **`lib/audio.ts`·`lib/accessibility.ts`와 같은 형태다 — `typeof` 가드 +
// `null` 정규화.** `ui`·`integration` 테스트 환경에는 `NativeModules` 전역이
// **아예 없어서**(`hasOwnProperty`가 `false`다) 가드 없이 맨 식별자 접근을 하면
// **`ReferenceError: NativeModules is not defined`** 가 난다.
//
// Lynx 자체에는 영속 저장소 API가 없다. `setSessionStorage` 계열이 전부이고
// 앱 재시작 후 남는지가 문서화돼 있지 않다.
//
// **여기 넣는 것은 로그인 토큰뿐이다** (ADR-0007 D1).
// 화면 상태나 서버 응답을 넣지 않는다 — 무효화가 사람 손으로 넘어온다.

/** 호스트가 `StorageModule`이라는 이름으로 등록한다. */
interface StorageModule {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

// `NativeModules`는 `[key: string]: any`라 오타가 런타임까지 간다.
// 이 캐스트(`NativeModules as Record<string, unknown>`)가 그것을 막는 유일한 자리다.
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
// 아래 `module ?? undefined`(모듈 값의 `null` 정규화)는 Pod 소스와
// 실기 관찰로 근거가 섰다. 이 줄은 그렇지 않다 — 같은 파일 안에서 근거의 종류가 갈린다.
function nativeModule(): StorageModule | undefined {
  if (typeof NativeModules === "undefined") {
    return undefined;
  }
  if (NativeModules === null) {
    return undefined;
  }
  const module = (NativeModules as Record<string, unknown>)["StorageModule"] as
    | StorageModule
    | undefined;
  // registerModule이 아직 안 끝났을 때는 `undefined`가 아니라 `null`이 관찰된다.
  // 캐스팅만 믿으면 이 축이 새나가므로 여기서 `undefined`로 정규화한다.
  return module ?? undefined;
}

/** 호스트 앱이 아닌 곳(Explorer·테스트)에서는 저장소가 없다. */
export function isStorageAvailable(): boolean {
  return nativeModule() !== undefined;
}

/** 없는 키는 `null`을 돌려준다. 저장소가 없어도 `null`이다. */
export function getItem(key: string): string | null {
  return nativeModule()?.get(key) ?? null;
}

export function setItem(key: string, value: string): void {
  nativeModule()?.set(key, value);
}

export function removeItem(key: string): void {
  nativeModule()?.remove(key);
}
