// 일본어 문구표 구획 — 에피소드 롤플레이(미리보기 · 말하기 대화).
// 번역 초안 — 원어민 검수 필요(ADR-0098).

import type { RoleplayStoryCopy } from "../screens/roleplay-story/roleplay-story.contract";

export const roleplayStoryJa: RoleplayStoryCopy = {
  lineCount: (count) => `${String(count)}つのセリフ`,
  withCounterpart: (name) => `${name}と`,
  previewBody: (name) =>
    `${name}とこの場面を演じましょう。それぞれのセリフに声に出して答えてください。`,
  start: "ロールプレイを始める",
  lineProgress: (ordinal, total) => `セリフ ${String(ordinal)} / ${String(total)}`,
  me: "自分",
  speak: "話す",
  stop: "停止",
  listening: "聞き取り中… 話し終えたらもう一度タップしてください。",
  showHint: "ヒントを見る",
  hint: (translation) => `言ってみよう：${translation}`,
  cantSpeak: "今は話せない",
  great: "すばらしい",
  notQuite: "おしい！",
  youSaid: (heard) => `あなたの発話：${heard}`,
  heardNothing: "聞き取れませんでした。",
  unavailable: "今は音声入力を使えません。このセリフはスキップできます。",
  blocked: "設定でこのアプリのマイクと音声認識を許可するか、このセリフをスキップしてください。",
  permissionTitle: "マイクをオンにする",
  permissionBody:
    "ロールプレイは声に出して行います。設定でこのアプリのマイクと音声認識を許可してください。",
  openSettings: "設定を開く",
  notNow: "あとで",
  unsupportedTitle: "音声入力を使えません",
  unsupportedBody:
    "このデバイスでは今、音声認識を使えません。場面の再生と各セリフのスキップはできます。",
  startAnyway: "このまま始める",
  retryHeard: "聞き取れませんでした。マイクをタップしてもう一度お試しください。",
  playAgain: "もう一度再生",
};
