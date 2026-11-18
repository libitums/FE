// 추천 친구 문구(ja) — 추천 줄 · 프로필 시트 · 성인 확인 대화상자. AI 표시는 방 고지(`safety.aiDisclosure`)와 같은 말 갈래입니다.

import type { FriendsCopy } from "../screens/messenger-chat/chat-friends.contract";

export const messengerChatFriendsJa: FriendsCopy = {
  profileLanguage: "ja",
  stripTitle: "おすすめの友達",
  cardLabel: (name, job) => `${name}、${job}、プロフィールを見る`,
  addFriend: "友達に追加",
  close: "閉じる",
  openProfile: (name) => `${name}のプロフィール`,
  ageLabel: "年齢",
  jobLabel: "職業",
  mbtiLabel: "MBTI",
  age: (age) => {
    switch (age.kind) {
      case "years":
        return `${age.value}歳`;
      case "decade":
        return `${age.value}代`;
      case "range":
        return `${age.from}〜${age.to}歳`;
    }
  },
  aiLabel: "AIのキャラクターです。返信はAIが書いています。",
  adultTitle: "成人であることの確認",
  adultBody: (name) =>
    `${name}は恋人のようなロマンチックな口調で話すことがあります。あなたが成人（18歳以上）であることを確認してください。`,
  adultConfirm: "成人です",
  adultCancel: "今はしない",
  unavailable: (name) => `今は${name}とチャットできません。`,
};
