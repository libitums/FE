// 메신저 문구 표의 덧붙는 칸(vi) — 대화 설정(ADR-0126) · 선톡 푸시 안내(ADR-0127) · 메신저 탭 접근(ADR-0128).

import type { MessengerChatExtraCopy } from "../screens/messenger-chat/chat-settings.contract";

export const messengerChatExtraVi: MessengerChatExtraCopy = {
  access: {
    signInTitle: "Nhắn tin với những người bạn gặp",
    signInBody:
      "Tạo tài khoản miễn phí để trò chuyện bằng tiếng Hàn với những người trong câu chuyện của bạn. Tiến độ của bạn vẫn được giữ.",
    signIn: "Đăng ký hoặc đăng nhập",
    comingSoonTitle: "Trò chuyện sắp ra mắt",
    comingSoonBody:
      "Chúng tôi mở trò chuyện cho một nhóm nhỏ trước. Hãy tiếp tục học — những người bạn gặp sẽ sớm nhắn tin cho bạn.",
  },
  pushNotice: { chatUnavailable: "Cuộc trò chuyện này hiện không khả dụng." },
  chatSettings: {
    entryTitle: "Trò chuyện",
    entryDescription: "Gợi ý trả lời, tin nhắn từ nhân vật, ghi nhớ",
    title: "Trò chuyện",
    back: "Quay lại",
    sectionWhile: "Khi trò chuyện",
    replyIdeas: "Gợi ý trả lời",
    replyIdeasBody: "Hiện 1–2 câu trả lời gợi ý sau mỗi tin nhắn",
    sectionProactive: "Tin nhắn từ nhân vật",
    proactive: "Nhân vật nhắn trước",
    sectionAbout: "Về bạn",
    sharedMemories: "Điều mọi nhân vật biết về bạn",
    sharedMemoriesSummary: (count) => `${count} ghi nhớ · dùng chung cho mọi nhân vật`,
    footnote:
      "Mỗi nhân vật cũng nhớ những điều từ cuộc trò chuyện với bạn. Mở một cuộc trò chuyện và chạm ☰ để xem.",
    proactiveSheet: {
      title: "Nhân vật nhắn trước",
      body: "Khi bạn im lặng một lúc, nhân vật có thể bắt đầu trò chuyện. Không bao giờ tốn xu.",
      howOften: "Tần suất",
      prefs: { off: "Tắt", daily1: "Mỗi ngày một lần", daily2: "Mỗi ngày hai lần" },
      preferredTime: "Giờ mong muốn",
      anyTime: "Bất cứ lúc nào",
      hour: (hour) => `${String(hour).padStart(2, "0")}:00`,
      quietNote:
        "Không có tin nhắn từ 22:00 đến 8:00 theo giờ của bạn. Nếu hai lần mỗi ngày, lần thứ hai đến khoảng 10 giờ sau.",
      save: "Lưu",
      close: "Đóng",
    },
    memories: {
      titleShared: "Điều mọi nhân vật biết về bạn",
      titleCharacter: (name) => `Điều ${name} nhớ`,
      count: (count, cap) => `${count} / ${cap}`,
      fullTitle: "Bộ nhớ đã đầy",
      fullBody: (name) =>
        `${name ?? "Các nhân vật"} không thể nhớ điều mới cho đến khi bạn xóa bớt. Những ghi nhớ bạn đã sửa vẫn được giữ.`,
      intro: (name) =>
        `${name ?? "Mọi nhân vật"} dùng những điều này để trò chuyện hợp với bạn hơn. Chỉ bạn thấy danh sách này. Sửa hay xóa đều miễn phí.`,
      empty: (name) =>
        `Chưa có gì. ${name ?? "Các nhân vật"} sẽ nhớ những điều bạn chia sẻ khi trò chuyện.`,
      edited: "Đã sửa",
      edit: "Sửa ghi nhớ",
      delete: "Xóa ghi nhớ",
      editTitle: "Sửa ghi nhớ",
      editHint: (name) => `${name ?? "Các nhân vật"} sẽ nhớ đúng như bạn viết.`,
      length: (count, max) => `${count} / ${max}`,
      cancel: "Hủy",
      save: "Lưu",
      deleteTitle: "Xóa ghi nhớ này?",
      deleteBody: (name) => `${name ?? "Các nhân vật"} sẽ không dùng nó từ tin nhắn tiếp theo.`,
      deleteConfirm: "Xóa",
      sidebar: (name) => `Điều ${name} nhớ`,
      sidebarSummary: (count, cap, full) =>
        full ? `${count} / ${cap} · đầy` : `${count} / ${cap}`,
    },
    feedback: {
      sidebar: "Cách sửa lỗi",
      title: "Cách sửa lỗi",
      body: (name) =>
        `${name} giúp bạn thế nào khi tiếng Hàn của bạn có lỗi. Bạn luôn nhận thẻ sửa lỗi — mục này đổi cách ${name} trả lời.`,
      modes: {
        separate: {
          title: "Chỉ thẻ",
          body: (name) => `${name} cứ tiếp tục trò chuyện. Phần sửa nằm ở ✎ dưới tin nhắn của bạn.`,
        },
        natural: {
          title: "Tự nhiên trong câu trả lời",
          body: (name) => `${name} dùng cách nói đúng trong câu trả lời, như một người bạn.`,
        },
        prefix: {
          title: "Chỉ ra trước",
          body: (name) => `${name} sửa ngắn gọn rồi tiếp tục trò chuyện.`,
        },
      },
      defaultTag: "mặc định",
      note: "Áp dụng cho mọi nhân vật từ tin nhắn tiếp theo.",
      save: "Lưu",
      close: "Đóng",
    },
  },
  feedback: {
    titles: { correction: "SỬA LỖI", better: "TỰ NHIÊN HƠN", l1_to_ko: "BẰNG TIẾNG HÀN" },
    sendCorrected: "Gửi câu đã sửa",
    sendInKorean: "Gửi bằng tiếng Hàn",
    cardLabel: (title, text, detail) =>
      detail === "" ? `${title}: ${text}` : `${title}: ${text} ${detail}`,
    good: "Câu trả lời tốt",
    bad: "Câu trả lời chưa tốt",
    goodSelected: "Câu trả lời tốt, đã chọn",
    badSelected: "Câu trả lời chưa tốt, đã chọn",
    liked: "Bạn đã thích",
    flagged: "Bạn đã đánh dấu",
    sheet: {
      title: "Có gì chưa ổn?",
      body: (name) => `Chọn những mục phù hợp. Điều này giúp ${name} trả lời tốt hơn.`,
      reasons: {
        awkward_korean: () => "Tiếng Hàn chưa tự nhiên",
        out_of_character: (name) => `Không giống ${name}`,
        too_hard: () => "Quá khó với tôi",
        uncomfortable: () => "Khiến tôi khó chịu",
        other: () => "Lý do khác",
      },
      reportPrompt: "Bạn muốn chúng tôi xem lại tin nhắn này?",
      report: "Báo cáo",
      noteLabel: "Nói thêm (không bắt buộc)",
      notePlaceholder: "Thêm ghi chú",
      send: "Gửi",
      close: "Đóng",
    },
  },
  remote: {
    noCredits: (name) => `Bạn đã hết lượt để trò chuyện với ${name}.`,
    notAvailable: (name) => `Bạn chưa thể trò chuyện với ${name}.`,
    sendFailed: "Chưa gửi được tin nhắn. Vui lòng thử lại.",
  },
};
