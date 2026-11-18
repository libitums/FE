// 추천 친구 문구(vi) — 추천 줄 · 프로필 시트 · 성인 확인 대화상자. AI 표시는 방 고지(`safety.aiDisclosure`)와 같은 말 갈래입니다.

import type { FriendsCopy } from "../screens/messenger-chat/chat-friends.contract";

export const messengerChatFriendsVi: FriendsCopy = {
  profileLanguage: "vi",
  stripTitle: "Bạn bè gợi ý",
  cardLabel: (name, job) => `${name}, ${job}, xem hồ sơ`,
  addFriend: "Kết bạn",
  close: "Đóng",
  openProfile: (name) => `Hồ sơ của ${name}`,
  ageLabel: "Tuổi",
  jobLabel: "Nghề nghiệp",
  mbtiLabel: "MBTI",
  age: (age) => {
    switch (age.kind) {
      case "years":
        return `${age.value} tuổi`;
      case "decade":
        return `Ngoài ${age.value}`;
      case "range":
        return `${age.from}–${age.to} tuổi`;
    }
  },
  aiLabel: "Nhân vật AI. Câu trả lời do AI viết.",
  adultTitle: "Xác nhận bạn đã trưởng thành",
  adultBody: (name) =>
    `${name} có thể nói chuyện với giọng lãng mạn như người yêu. Hãy xác nhận bạn đã đủ 18 tuổi.`,
  adultConfirm: "Tôi đã đủ 18 tuổi",
  adultCancel: "Để sau",
  unavailable: (name) => `Hiện bạn không thể trò chuyện với ${name}.`,
};
