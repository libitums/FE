// 친구 스토리 줄 · 보기 · 대화 인용 문구(vi, ADR-0178).

import type { FriendStoriesCopy } from "../screens/messenger-chat/friend-stories.contract";

export const messengerChatStoriesVi: FriendStoriesCopy = {
  language: "vi",
  // 낭독 조각 잇기 — 언어마다 구분자(감사 다국어 minor 9).
  listSeparator: ", ",
  labelSeparator: ": ",
  rowTitle: "Tin",
  watchAll: "Xem tất cả",
  watchAllLabel: "Xem tất cả tin",
  age: (age) =>
    age.unit === "now" ? "vừa xong" : age.unit === "m" ? `${age.value} phút` : `${age.value} giờ`,
  seen: "Đã xem",
  newBadge: "Mới",
  friendLabel: (name, age, seen) => `Tin của ${name}, ${age}${seen ? ", đã xem" : ", mới"}`,
  unmetLabel: (name) => `Tin của ${name}, bạn mới`,
  findFriends: "Tìm bạn",
  findFriendsLabel: "Tìm bạn",
  listPreview: (line) => `Vừa đăng tin · ${line}`,
  listRowLabel: (name, line) => `${name}, vừa đăng tin: ${line}. Mở tin`,
  viewer: {
    label: (name) => `Tin của ${name}`,
    progress: (index, count) => `Tin ${index} trên ${count}`,
    pause: "Tạm dừng",
    play: "Phát",
    close: "Đóng",
    previous: "Tin trước",
    next: "Tin tiếp theo",
    photoLabel: (name) => `Ảnh của ${name}`,
    saveWord: (ko, meaning) => `${ko} · ${meaning} — Lưu từ`,
    saveWordLabel: (ko, meaning) => `Lưu ${ko}, ${meaning}, vào Từ của tôi`,
    saved: (ko) => `Đã lưu ${ko} vào Từ của tôi`,
    freeReply: "Trả lời đầu tiên miễn phí",
    replyPlaceholder: (name) => `Trả lời ${name}…`,
    replyChipLabel: (text) => `Trả lời: ${text}`,
    send: "Gửi",
    sent: "Đã gửi",
    sentLabel: (name) => `Đã gửi cho ${name}`,
    openChat: "Mở trò chuyện",
    sendFailed: "Không gửi được. Hãy thử lại.",
    coinsShort: "Không đủ xu",
    newFriend: "BẠN MỚI",
    addAndReply: "Kết bạn và trả lời",
    profile: (name) => `Hồ sơ của ${name}`,
  },
  reply: {
    caption: (name) => `Bạn đã trả lời tin của ${name}`,
    storyMeta: (age) => (age === null ? "Tin" : `Tin · ${age}`),
    replying: (name) => `Đang trả lời tin của ${name}`,
    removeQuote: "Bỏ trích dẫn",
  },
};
