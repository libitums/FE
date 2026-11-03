// 막간(INT) 이야기의 도메인 타입입니다(ADR-0088) — 비주얼 노벨 · 메신저 · 전화가 모두 컷으로 정규화됩니다.
// `episode-content.model.ts`가 다시 내보냅니다(그 파일이 300줄을 넘지 않게 떼었습니다).

import type { EpisodeCut, Text } from "./episode-content.model-base";

/** 메신저 막간의 한 줄입니다. `afterOption`이 있으면 바로 앞 답장에서 그 보기(1부터)를 고른 때만 나옵니다. */
export type EpisodeChatTurn =
  | { kind: "message"; speaker: string; line: Text; imageUrl?: string; afterOption?: number }
  | { kind: "reply"; options: [Text, ...Text[]] };

/** 문자(`form: "message"`) 막간의 대화입니다 — 답장 보기와 분기 줄을 모두 지닙니다. */
export type EpisodeChat = {
  counterpart: string;
  /** 막간 `profiles`에서 상대 화자의 그림(콘텐츠 상대 경로) — 없으면 아바타가 이니셜입니다. */
  counterpartImageUrl?: string;
  backgroundUrl?: string;
  turns: [EpisodeChatTurn, ...EpisodeChatTurn[]];
};

/** 전화 막간의 한 줄 — 상대(`caller`) · 나(`self`) · 배경 소리(`background`, `label`은 「안내 방송」 같은 이름)입니다. */
export type EpisodeCallLine = {
  kind: "caller" | "self" | "background";
  label: string;
  line: Text;
  /** 그 줄의 소리 id(`audio/manifest.json` 키) — 녹음이 없으면 없습니다. */
  audioUrl?: string;
};

/** 전화(`form: "call"`) 막간입니다 — 상대는 `with`, 끝 지문은 `call_end` 컷입니다. */
export type EpisodeCall = {
  counterpart: string;
  counterpartImageUrl?: string;
  backgroundUrl?: string;
  lines: [EpisodeCallLine, ...EpisodeCallLine[]];
  end?: Text;
};

/**
 * 막간(와이어 `kind: "interlude"`) 이야기입니다 — 비주얼 노벨 · 메신저 · 전화 형식이 모두 컷으로 정규화됩니다
 * (컷의 메신저 답장은 첫 보기의 흐름). 문자 형식은 분기를 지닌 `chat`도 함께 냅니다. `caption`은 「그 시각, …」
 * 같은 장면 자막입니다(ADR-0088).
 */
export type EpisodeStory = {
  form: string;
  caption?: Text;
  cuts: [EpisodeCut, ...EpisodeCut[]];
  chat?: EpisodeChat;
  call?: EpisodeCall;
};
