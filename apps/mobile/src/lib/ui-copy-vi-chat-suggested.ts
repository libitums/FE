// 추천 친구 줄 · 프로필 시트 · 친구 찾기 문구(vi, ADR-0162).

import type { SuggestedFriendsCopy } from "../screens/messenger-chat/suggested-friends.contract";

export const messengerChatSuggestedVi: SuggestedFriendsCopy = {
  language: "vi",
  rowTitle: "Làm quen bạn mới",
  seeAll: "Xem tất cả",
  seeAllLabel: "Xem tất cả bạn bè",
  newLabel: (name) => `${name}, bạn mới`,
  lockedLabel: (name, episode) => `${name}, gặp ở tập ${episode}`,
  earlyLabel: (name, episode, price) =>
    `${name}, gặp ở tập ${episode} hoặc nhắn tin ngay với ${price} đồng`,
  sheetLabel: (name) => `${name}, hồ sơ`,
  newBadge: "MỚI",
  startChatting: "Bắt đầu trò chuyện",
  notNow: "Để sau",
  meetIn: (episode) => `Bạn sẽ gặp ở tập ${episode}`,
  lockedInfo: (name) => `Hoàn thành câu chuyện để trao đổi số — ${name} sẽ nhắn trước.`,
  chatNow: (price) => `Nhắn ngay · ${price}`,
  earlyButtonLabel: (price, left) =>
    `Nhắn ngay với ${price} đồng, ưu đãi giới hạn${left === null ? "" : `, còn ${left.days} ngày ${left.hours} giờ`}`,
  launchSpecial: (name) => `Ưu đãi ra mắt · gặp ${name} sớm`,
  limited: "GIỚI HẠN",
  limitedUntil: (days, hours) => `GIỚI HẠN · ${days} ngày ${hours} giờ`,
  added: (name) => `Đã thêm ${name} vào trò chuyện`,
  addFailed: (name) => `Không thêm được ${name}. Hãy thử lại.`,
  directory: {
    title: "Tìm bạn",
    back: "Quay lại",
    all: "Tất cả",
    fromStory: "Từ câu chuyện",
    sectionStory: "TỪ CÂU CHUYỆN CỦA BẠN",
    sectionNew: "BẠN MỚI",
    chat: "Nhắn tin",
    chatLabel: (name) => `Nhắn tin với ${name}`,
    added: "Đã thêm",
    addedLabel: (name) => `${name}, đã có trong trò chuyện`,
    earlyLabel: (name, price) => `Gặp ${name} sớm với ${price} đồng`,
    locked: (episode) => `Tập ${episode}`,
    lockedLabel: (name, episode) => `${name}, gặp ở tập ${episode}`,
    meetIn: (episode) => `Gặp ở tập ${episode}`,
    moreComing: "Sắp có thêm bạn mới",
    chipLabel: (label, selected) => (selected ? `${label}, đã chọn` : label),
  },
};
