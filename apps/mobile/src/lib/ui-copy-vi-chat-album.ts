// 앨범 · 사진 속 내 모습 · 다시 만들기 문구(vi, ADR-0150).

import type { ChatAlbumCopy } from "../screens/messenger-chat/chat-album.contract";

export const messengerChatAlbumVi: ChatAlbumCopy = {
  sidebarRow: "Album",
  sidebarDescription: "Ảnh và tin nhắn thoại",
  title: (name) => `Album của ${name}`,
  back: "Quay lại",
  tabs: { all: "Tất cả", photos: "Ảnh", voice: "Thoại" },
  day: (day) =>
    day.kind === "today"
      ? "Hôm nay"
      : day.kind === "yesterday"
        ? "Hôm qua"
        : `${day.day} thg ${day.month}`,
  drawing: "Đang vẽ…",
  recording: "Đang ghi âm…",
  versions: (count) => `${count} phiên bản`,
  version: (index, count) => `Phiên bản ${index}/${count}`,
  pastChat: "Từ cuộc trò chuyện trước",
  keepNote: "Ảnh và tin nhắn thoại vẫn ở đây kể cả khi bạn xóa cuộc trò chuyện.",
  empty: (name) => `Ảnh và tin nhắn thoại từ ${name} sẽ hiện ở đây.`,
  loadFailed: "Không tải được album.",
  tryAgain: "Thử lại",
  more: "Xem thêm",
  photoLabel: (name, line) => (line === "" ? `Ảnh từ ${name}` : `Ảnh từ ${name}, ${line}`),
  voiceLabel: (name, line) =>
    line === "" ? `Tin nhắn thoại từ ${name}` : `Tin nhắn thoại từ ${name}, ${line}`,
  viewerTitle: (name, day) => `${name} · ${day}`,
  fromChat: "Từ cuộc trò chuyện",
  close: "Đóng",
  redraw: (price) => `Vẽ lại · ${price}`,
  recordAgain: (price) => `Ghi âm lại · ${price}`,
  play: "Phát",
  pause: "Tạm dừng",
  redrawTitle: "Vẽ lại ảnh này?",
  redrawBody: (name) => `${name} sẽ vẽ lại khoảnh khắc này. Album vẫn giữ cả hai ảnh.`,
  recordTitle: "Ghi âm lại?",
  recordBody: (name) => `${name} sẽ nói lại câu này trong một bản ghi mới.`,
  confirmRedraw: (price) => `Vẽ lại với ${price} Yeopjeon`,
  confirmRecord: (price) => `Ghi âm với ${price} Yeopjeon`,
  balance: (coins) => `Bạn có ${coins} Yeopjeon`,
  getCoins: "Nhận Yeopjeon",
  cancel: "Hủy",
  refused: (notice, media, name) => {
    const photo = media === "photo";
    switch (notice) {
      case "no-coins":
        return "Bạn không đủ Yeopjeon.";
      case "busy":
        return photo ? `${name} vẫn đang vẽ một ảnh khác.` : `${name} vẫn đang ghi âm một tin nhắn khác.`;
      case "limit":
        return "Bạn đã đạt giới hạn hôm nay. Hãy thử lại sau.";
      case "not-eligible":
        return photo ? "Không thể vẽ lại ảnh này." : "Không thể ghi âm lại tin nhắn này.";
      default:
        return "Không gửi được yêu cầu. Hãy thử lại.";
    }
  },
  selfSection: "Về bạn",
  selfRow: "Bạn trong ảnh",
  selfTitle: "Bạn trong ảnh",
  selfBody: "Khi nhân vật gửi ảnh, bạn có thể xuất hiện trong đó. Chúng tôi không bao giờ vẽ khuôn mặt bạn.",
  selfAsk: "Bạn muốn xuất hiện thế nào?",
  selfAskNote: "Luôn nhìn từ phía sau, không bao giờ có khuôn mặt. Đổi sau trong Cài đặt › Chats.",
  selfOptions: {
    female: { title: "Nữ", body: "Nhìn từ phía sau" },
    male: { title: "Nam", body: "Nhìn từ phía sau" },
    hidden: { title: "Chỉ bàn tay", body: "Chỉ tay hoặc vai của bạn" },
  },
  save: "Lưu",
};
