// 영속 저장소. 호스트 앱의 네이티브 모듈 하나를 감싼다 (ADR-0012 D2).
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
// 이 한 줄이 그것을 막는 유일한 자리다.
function nativeModule(): StorageModule | undefined {
  return (NativeModules as Record<string, unknown>)["StorageModule"] as StorageModule | undefined;
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
