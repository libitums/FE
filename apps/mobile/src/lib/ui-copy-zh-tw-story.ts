// 대만 중국어(번체, zh-TW) 문구표 구획 — 이야기 · 롤플레이(episodeIntro ~ roleplay) 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type {
  EpisodeIntroCopy,
  MessengerCopy,
  RoleplayCopy,
  VisualNovelCopy,
} from "./ui-copy-sections.contract";
import type { StoryCallCopy } from "../screens/story-call/story-call.contract";
import type { StoryIntroCopy } from "../screens/story-intro/story-intro.contract";
import type { StoryMessengerCopy } from "../screens/story-messenger/story-messenger.contract";

export const episodeIntroZhTw: EpisodeIntroCopy = {
  guide: {
    map: "點一下開始上課！",
    continue: "點任意處繼續",
  },
  skipDialog: {
    title: "要略過故事嗎？",
    description: "略過之後，這一集的故事就不會再出現了。",
    skip: "略過",
    keepWatching: "繼續看",
  },
};

export const messengerZhTw: MessengerCopy = {
  keyboard: {
    shift: "Shift",
    shiftOn: "Shift，已開啟",
    backspace: "刪除",
    period: "句號",
    space: "空格",
    questionMark: "問號",
  },
};

export const visualNovelZhTw: VisualNovelCopy = {
  sceneProgress: (ordinal, total) => `第${ordinal}幕，共${total}幕`,
};

export const roleplayZhTw: RoleplayCopy = {
  title: "角色扮演",
  form: { story: "角色扮演" },
  viewAll: "查看全部",
  viewAllLabel: (sectionLabel) => `查看全部，${sectionLabel}`,
  plus: "Plus",
  plusTagline: "練習類似的情境",
  plusSectionLabel: (sectionLabel) => `${sectionLabel} Plus 角色扮演，練習和這一集類似的情境`,
  plusDialogTitle: "Plus 角色扮演",
  lockedSection: (name) => `${name}，已鎖定，在旅程中完成這一集即可解鎖`,
  premiumLock: { episode: "已鎖定", payment: "Plus 限定" },
  premiumNotice: (itemTitle) => `「${itemTitle}」是 Plus 角色扮演。Plus 目前尚未推出。`,
};

export const storyMessengerZhTw: StoryMessengerCopy = {
  back: "回到地圖",
  typing: (speaker) => `${speaker} 正在輸入`,
  replyTitle: "你要怎麼回覆？",
  closeReply: "關閉",
  send: "傳送",
  composerPlaceholder: "訊息",
  finish: "結束故事",
};

export const storyIntroZhTw: StoryIntroCopy = {
  overline: (ordinal) => `故事 · 第${ordinal}集`,
  back: "回到地圖",
  skip: "略過",
  start: "開始",
  skipDialog: {
    title: "要略過故事嗎？",
    description: "之後隨時都能從地圖再看一次。",
    skip: "略過",
    keepWatching: "繼續看",
  },
};

export const storyCallZhTw: StoryCallCopy = {
  incoming: "來電",
  answer: "接聽",
  connecting: "連線中…",
  callEnded: (clock) => `通話結束 · ${clock}`,
  me: "我",
  mute: "靜音",
  speaker: "擴音",
  end: "結束通話",
  back: "回到地圖",
  finish: "結束故事",
};
