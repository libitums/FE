// 테스트 지원 — 문항 음성 화면 테스트의 픽스처입니다(듣기 · 정답 뒤 재생 값, 레슨 소리 설정 대역, DOM 순서). 제품 코드는 값 import하지 않습니다.
import { vi } from "vitest";

import type {
  AnswerEchoAudio,
  LessonAudio,
  ListenAudio,
  ListenItemReport,
  ListenItemType,
} from "./question-audio";

export const LISTEN_SOURCE = "https://cdn/audio/u01-water/q1.m4a";
export const ECHO_SOURCE = "https://cdn/audio/u01-water/e1.m4a";

export function listenAudioOf(
  itemType: ListenItemType,
  itemId = "Q1",
  source = LISTEN_SOURCE,
): ListenAudio {
  return { kind: "listen", source, ref: { itemId, itemType } };
}

export function echoAudioOf(source = ECHO_SOURCE): AnswerEchoAudio {
  return { kind: "answer-echo", source };
}

/** 문항 값에 `audio`를 더한 복사본입니다 — 문항 타입이 `audio` 키를 갖기 전에도 같은 모양으로 씁니다. */
export function withAudio<Question extends object>(question: Question, audio: unknown): Question {
  return { ...question, audio };
}

export type LessonAudioStub = {
  readonly lesson: LessonAudio;
  readonly onTogglePace: ReturnType<typeof vi.fn<() => void>>;
  readonly onListenItemAnswered: ReturnType<typeof vi.fn<(report: ListenItemReport) => void>>;
};

export function lessonAudioStub(overrides: Partial<LessonAudio> = {}): LessonAudioStub {
  const onTogglePace = vi.fn<() => void>();
  const onListenItemAnswered = vi.fn<(report: ListenItemReport) => void>();
  const lesson: LessonAudio = {
    pace: "normal",
    slowPlayback: "supported",
    autoPlay: "on",
    onTogglePace,
    onListenItemAnswered,
    ...overrides,
  };
  return { lesson, onTogglePace, onListenItemAnswered };
}

/** `root` 안에서 `ids`가 문서 순서로 나오는 차례입니다(없는 id는 빠집니다). */
export function testIdOrder(root: ParentNode, ids: readonly string[]): string[] {
  return [...root.querySelectorAll("[data-testid]")]
    .map((element) => element.getAttribute("data-testid") ?? "")
    .filter((id) => ids.includes(id));
}
