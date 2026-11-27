// 대만 중국어(번체, zh-TW) 문구표 구획 — 에피소드 롤플레이(미리보기 · 말하기 대화) 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { RoleplayStoryCopy } from "../screens/roleplay-story/roleplay-story.contract";

export const roleplayStoryZhTw: RoleplayStoryCopy = {
  lineCount: (count) => `${String(count)}句台詞`,
  withCounterpart: (name) => `與 ${name}`,
  previewBody: (name) => `和 ${name} 一起演出這一幕。每一句都要大聲說出來回答。`,
  start: "開始角色扮演",
  lineProgress: (ordinal, total) => `第${String(ordinal)}句，共${String(total)}句`,
  me: "我",
  speak: "說話",
  stop: "停止",
  listening: "聆聽中… 說完後再點一下。",
  yourLine: "你的台詞",
  hearIt: "聽一聽",
  showKorean: "看韓文",
  showHint: "顯示提示",
  hint: (translation) => `試著說：${translation}`,
  cantSpeak: "現在不方便說話",
  great: "很棒",
  notQuite: "還差一點",
  youSaid: (heard) => `你說的是：${heard}`,
  heardNothing: "我沒聽清楚。",
  unavailable: "目前無法使用說話功能。你可以略過這一句。",
  blocked: "請在設定中允許此 App 使用麥克風和語音辨識，或略過這一句。",
  permissionTitle: "開啟麥克風",
  permissionBody: "角色扮演需要開口說話。請在設定中允許此 App 使用麥克風和語音辨識。",
  openSettings: "開啟設定",
  notNow: "稍後再說",
  unsupportedTitle: "無法使用說話功能",
  unsupportedBody: "這台裝置目前不支援語音辨識。你仍然可以播放這一幕，並逐句略過。",
  startAnyway: "仍要開始",
  retryHeard: "我沒聽清楚。請點一下麥克風再試一次。",
  playAgain: "再玩一次",
};
