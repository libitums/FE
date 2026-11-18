// 추천 친구 문구(en) — 추천 줄 · 프로필 시트 · 성인 확인 대화상자. AI 표시는 방 고지(`safety.aiDisclosure`)와 같은 말 갈래입니다.

import type { FriendsCopy } from "../screens/messenger-chat/chat-friends.contract";

export const messengerChatFriendsEn: FriendsCopy = {
  profileLanguage: "en",
  stripTitle: "Recommended friends",
  cardLabel: (name, job) => `${name}, ${job}, view profile`,
  addFriend: "Add friend",
  close: "Close",
  openProfile: (name) => `${name}'s profile`,
  ageLabel: "Age",
  jobLabel: "Job",
  mbtiLabel: "MBTI",
  age: (age) => {
    switch (age.kind) {
      case "years":
        return String(age.value);
      case "decade":
        return `${age.value}s`;
      case "range":
        return `${age.from}–${age.to}`;
    }
  },
  aiLabel: "AI character. Replies are written by AI.",
  adultTitle: "Confirm you're an adult",
  adultBody: (name) =>
    `${name} may talk in a romantic, couple-like tone. Please confirm that you are an adult (18 or older).`,
  adultConfirm: "I'm an adult",
  adultCancel: "Not now",
  unavailable: (name) => `You can't chat with ${name} right now.`,
};
