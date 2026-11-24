// 주간 순위 · 채팅 단어 문구의 대만 중국어(번체, zh-TW) 덩어리(ADR-0185). 엽전은 「Yeopjeon」(ADR-0116).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { RankingCopy } from "../screens/ranking/ranking.contract";

export const rankingCopyZhTw: RankingCopy = {
  title: "每週排名",
  group: (count) => `你的小組 · ${count}位學習者`,
  endsIn: (days) => `${days}天後結束`,
  boards: { lessons: "課程", "chat-words": "聊天單字" },
  selected: (label) => `${label}，已選取`,
  unit: (board) => (board === "lessons" ? "課" : "個單字"),
  zoneTop: (reward) => (reward === null ? "本週前3名" : `前3名可獲得 ${reward} Yeopjeon 獎勵`),
  zoneClimb: (more) => (more === null ? "繼續往上爬" : `繼續往上爬 · 再${more}就能進入前3名`),
  you: "你",
  morePass: (more, name) => `再${more}就能超過 ${name}`,
  first: "你是第1名！",
  rowLabel: (rank, name, episode, score) =>
    [`第${rank}名`, name, episode, score].filter((part) => part !== null).join("，"),
  loading: "正在載入排名",
  notices: {
    guest: { title: "登入即可參加", body: "排名僅限會員。登入後就能一起競賽。" },
    notJoined: {
      title: "你的一週即將開始",
      body: "完成一堂課，或在聊天中用上學過的單字，就能加入小組。",
    },
    hidden: { title: "你已隱藏", body: "其他人在排名中看不到你。" },
    error: { title: "無法載入排名", body: "請再試一次。" },
    offline: { title: "你目前離線", body: "連上網路即可查看排名。" },
  },
  actions: { signIn: "登入", showMe: "顯示我", retry: "再試一次" },
  chat: {
    stripCount: (words) => `${words}個聊天單字`,
    stripRank: (rank) => (rank === null ? "本週" : `本週 · 小組第${rank}名`),
    stripLabel: (words, rank) =>
      `本週${words}個聊天單字${rank === null ? "" : `，小組第${rank}名`}。開啟排名`,
    earned: (count) => `+${count}個聊天單字`,
    pending: "重新正確傳送後就會計入",
  },
  settings: {
    hideTitle: "在排名中隱藏我",
    hideBody: "其他人在每週排名中將看不到你",
  },
};
