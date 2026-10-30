import type { airbridgeAppName, airbridgeDefaultChannel } from "../site";

/** 앱이 여정 탭으로 여는 커스텀 스킴 주소(ADR-0080 D2). */
export const ANDROID_JOURNEY_DEEPLINK = "duru://journey";

/** `airbridge.init`에 넘기는 옵션 — 이 다섯 키로 닫힙니다(나머지는 SDK 기본값). */
export interface AirbridgeInitOptions {
  readonly app: typeof airbridgeAppName;
  readonly webToken: string;
  readonly utmParsing: true;
  readonly defaultChannel: typeof airbridgeDefaultChannel;
  readonly autoStartTrackingEnabled: false;
}

/** `airbridge.openDeeplink`에 넘기는 옵션. `desktop` · `fallbacks.ios`는 지금 보는 랜딩 페이지 주소입니다. */
export interface AirbridgeDeeplinkOptions {
  readonly type: "click";
  readonly deeplinks: {
    readonly android: typeof ANDROID_JOURNEY_DEEPLINK;
    readonly ios: typeof ANDROID_JOURNEY_DEEPLINK;
    readonly desktop: string;
  };
  readonly fallbacks: { readonly android: "google-play"; readonly ios: string };
}

/** 로드 전 스텁 · 로드 뒤 SDK가 공통으로 갖는 표면(스텁은 호출을 큐에 쌓습니다). */
export interface AirbridgeGlobal {
  readonly isSDKEnabled?: boolean;
  init?(options: AirbridgeInitOptions): void;
  startTracking?(): void;
  openDeeplink?(options: AirbridgeDeeplinkOptions): void;
}

/** 로드 · 초기화가 끝난 SDK — `isSDKEnabled === true`이고 `openDeeplink`가 함수입니다. */
export interface AirbridgeSdk {
  readonly isSDKEnabled: true;
  openDeeplink(options: AirbridgeDeeplinkOptions): void;
}

/** `location`에서 읽은 값입니다(쿼리 · 조각 없음). */
export interface PageLocation {
  readonly origin: string;
  readonly pathname: string;
}

declare global {
  interface Window {
    airbridge?: AirbridgeGlobal;
  }
}

// 빌드 전용 순수(`airbridge-bootstrap.ts`)
/** trim → "" → ""; `^[A-Za-z0-9._-]{16,}$`가 아니면 던짐(메시지에 변수 이름만, 값 없음). */
export type ResolveAirbridgeWebToken = (env: string | undefined) => string;
export type AirbridgeInitOptionsOf = (webToken: string) => AirbridgeInitOptions;
/** `airbridgeLoaderSnippet` + `airbridge.init(<JSON>);`. 토큰 모양이 틀리면 던짐. */
export type BuildAirbridgeBootstrap = (webToken: string) => string;

// 브라우저 순수(`airbridge.ts`)
export type AirbridgeDeeplinkOptionsOf = (page: PageLocation) => AirbridgeDeeplinkOptions;
/** `Europe/*` · Atlantic/{Reykjavik,Canary,Madeira,Faroe} → false, 그 밖(undefined · "" 포함) → true. */
export type StartsTrackingIn = (timeZone: string | undefined) => boolean;
export type AirbridgeSdkOf = (candidate: unknown) => AirbridgeSdk | null;

// 접착(`scripts/airbridge-cta.ts`)
export interface AirbridgeCtaDeps {
  readonly root: ParentNode;
  /** 클릭 때마다 부릅니다 — SDK는 `load` 뒤에 뜹니다. */
  readonly sdkOf: () => AirbridgeSdk | null;
  readonly deeplink: AirbridgeDeeplinkOptions;
}
/** `a[data-store="android"]`마다 click 리스너. 돌려주는 값은 결선한 링크 수. */
export type InitAirbridgeCta = (deps: AirbridgeCtaDeps) => number;

export interface AirbridgeTrackingDeps {
  readonly airbridge: AirbridgeGlobal | undefined;
  readonly timeZone: string | undefined;
}
/** `startsTrackingIn`이 참이면 `airbridge?.startTracking?.()`. 돌려주는 값은 시작했는가. */
export type InitAirbridgeTracking = (deps: AirbridgeTrackingDeps) => boolean;
