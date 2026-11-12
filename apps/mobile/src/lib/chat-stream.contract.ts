// 호스트의 SSE 전송(`ChatStreamModule`)과 JS 어댑터(`chat-stream.ts`)가 같이 쓰는 어휘입니다.
// iOS Lynx의 `lynx.fetch`는 스트리밍 본문을 잃어서(ADR-0124), 자유 대화 답의 조각은 호스트가 받아
// 빈 줄 경계로 자른 SSE 이벤트 블록 하나씩 전역 이벤트로 올립니다.
//
// 타입만 있습니다. 값(이벤트 이름 · 해석)은 구현 모듈이 가집니다.

/** 스트림이 끝난 까닭입니다. 스트림마다 정확히 한 번 옵니다. */
export type ChatStreamEndReason =
  | "complete"
  | "cancelled"
  | "http-error"
  | "network"
  | "timeout-connect"
  | "timeout-idle"
  | "unavailable";

/** SSE 이벤트 블록 하나를 푼 값입니다. `event`가 없으면 `"message"`, `data` 줄은 `\n`으로 잇습니다. */
export type ChatStreamSseEvent = {
  readonly event: string;
  readonly id: string | null;
  readonly data: string;
};

/** POST 하나입니다. 본문은 JSON 문자열을 그대로 싣습니다. */
export type ChatStreamRequest = {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
};

export type ChatStreamHandlers = {
  /** 응답 머리가 왔을 때 한 번입니다. 2xx가 아니어도 옵니다. */
  readonly onOpen: (status: number) => void;
  readonly onEvent: (event: ChatStreamSseEvent, seq: number) => void;
  /** `http-error`면 `detail`이 응답 본문(64KB까지)입니다. 그 밖은 `null`이거나 호스트의 짧은 설명입니다. */
  readonly onEnd: (reason: ChatStreamEndReason, detail: string | null) => void;
};

export type ChatStreamHandle = {
  readonly streamId: string;
  /** 바로 `onEnd("cancelled")`를 한 번 부르고, 뒤에 오는 호스트 이벤트는 버립니다. */
  readonly cancel: () => void;
};

/** `NativeModules.ChatStreamModule`의 모양입니다. 결과는 전역 이벤트로만 옵니다. */
export type ChatStreamNative = {
  readonly open: (
    streamId: string,
    url: string,
    headers: Readonly<Record<string, string>>,
    body: string,
  ) => void;
  readonly cancel: (streamId: string) => void;
};

/** 전역 이벤트 하나를 구독하고 해제 함수를 돌려줍니다. */
export type ChatStreamSubscribe = (
  eventName: string,
  listener: (args: readonly unknown[]) => void,
) => () => void;

export type ChatStreamClientDeps = {
  readonly native: ChatStreamNative | null;
  readonly subscribe: ChatStreamSubscribe;
  readonly newStreamId: () => string;
};

export type ChatStreamClient = {
  readonly open: (request: ChatStreamRequest, handlers: ChatStreamHandlers) => ChatStreamHandle;
  /** 구독을 걷습니다. 열린 스트림은 더 받지 않습니다. */
  readonly dispose: () => void;
};
