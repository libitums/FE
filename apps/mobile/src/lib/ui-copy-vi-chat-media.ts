// 메신저 서버 사진 · 음성 문구(vi, ADR-0146 「앱 연결」).

import type { ChatMediaCopy } from "../screens/messenger-chat/chat-media.contract";

export const messengerChatMediaVi: ChatMediaCopy = {
  notice: (notice, media, name, until) => {
    const photo = media === "photo";
    switch (notice) {
      case "blocked":
        return photo
          ? `${name} không thể chia sẻ cảnh đó. Yeopjeon của bạn đã được hoàn lại.`
          : `${name} không thể ghi âm tin đó. Yeopjeon của bạn đã được hoàn lại.`;
      case "failed":
        return photo
          ? "Ảnh chưa gửi tới được. Yeopjeon của bạn đã được hoàn lại."
          : "Tin nhắn thoại chưa gửi tới được. Yeopjeon của bạn đã được hoàn lại.";
      case "limit":
        return until === null
          ? "Bạn đã đạt giới hạn hôm nay. Hãy thử lại sau."
          : `Bạn đã đạt giới hạn hôm nay. Hãy thử lại sau ${until}.`;
      case "busy":
        return photo
          ? `${name} vẫn đang làm một ảnh khác.`
          : `${name} vẫn đang ghi âm một tin nhắn thoại khác.`;
      case "no-coins":
        return "Bạn không đủ Yeopjeon. Hãy nạp thêm để yêu cầu lại.";
      case "not-eligible":
        return photo
          ? "Tin nhắn này không thể thành ảnh."
          : "Tin nhắn này không thể thành tin nhắn thoại.";
      case "unavailable":
        return "Ảnh và tin nhắn thoại hiện chưa dùng được.";
      default:
        return "Không gửi được yêu cầu. Hãy kiểm tra kết nối rồi thử lại.";
    }
  },
  hint: (availability, _media, name) => {
    switch (availability) {
      case "pending":
        return `${name} vẫn đang làm`;
      case "done":
        return "Đã gửi cho tin nhắn này";
      default:
        return `Dùng được sau tin nhắn tiếp theo của ${name}`;
    }
  },
  aiLabel: "Do AI tạo",
  voiceLabel: (name, ko, en) =>
    en === "" ? `${name}: tin nhắn thoại, ${ko}` : `${name}: tin nhắn thoại, ${ko}, ${en}`,
  listVoice: "Tin nhắn thoại",
};
