// 베트남어 문구표 구획 — 계정 · 기타(notifications ~ gemPurchase).
// 번역 초안 — 원어민 검수 필요(ADR-0091 D3).

import type { FeedbackCopy } from "./feedback.contract";
import type {
  AppUpdateCopy,
  GemPurchaseCopy,
  NotificationsCopy,
  ProfileCopy,
  SettingsCopy,
} from "./ui-copy-sections.contract";
import type { DownloadSheetCopy } from "./ui-copy-settings.contract";

export const notificationsVi: NotificationsCopy = {
  title: "Thông báo",
  emptyTitle: "Chưa có thông báo nào",
  emptyBody: "Khi có gì mới, chúng tôi sẽ báo cho bạn tại đây.",
  deleteLabel: (message) => `${message}, xóa`,
  destination: {
    "roleplay-list": "Xem danh sách nhập vai",
  },
};

export const settingsVi: SettingsCopy = {
  title: "Cài đặt",
  group: { account: "Tài khoản", learning: "Học tập", accountActions: "Thao tác tài khoản" },
  nav: {
    profile: "Hồ sơ người dùng",
    "learner-profile": "Tên và quốc gia trong bài học",
    language: "Ngôn ngữ",
    download: "Tải xuống",
    notifications: "Thông báo",
    feedback: "Gửi góp ý",
    "privacy-policy": "Chính sách quyền riêng tư",
    "terms-of-use": "Điều khoản sử dụng",
  },
  downloads: {
    title: "Tải xuống",
    caption: "Chọn khi nào tải hình ảnh và âm thanh.",
    mobileDataHeading: "Tải bằng dữ liệu di động",
    policy: { ask: "Luôn hỏi", always: "Luôn tải", "wifi-only": "Chỉ Wi-Fi" },
    offlineHeading: "Ngoại tuyến",
    downloadAll: "Tải tất cả để học ngoại tuyến",
    downloadAllCaption: "Hình ảnh và âm thanh của mọi tập, để bạn học không cần mạng.",
    downloadAllStarted: "Đang tải ở chế độ nền. Bạn có thể tiếp tục học.",
    downloaded: (size) => `Đã tải: ${size}`,
    episodeRow: (n, d, t) => `Tập ${n}: ${d} trên ${t} bài học`,
    episodeRowComplete: (n) => `Tập ${n}: hoàn tất`,
    downloadRest: (n) => `Tải phần còn lại của Tập ${n}`,
    confirm: {
      title: "Tải bằng dữ liệu di động?",
      description: "Tải tất cả các tập có thể tốn nhiều dữ liệu. Bạn cũng có thể đợi Wi-Fi.",
      download: "Tải ngay",
      cancel: "Hủy",
      restDescription: (n) =>
        `Phần còn lại của Tập ${n} sẽ tải bằng dữ liệu di động. Bạn cũng có thể đợi Wi-Fi.`,
    },
  },
  sessionOption: {
    "auto-play-audio": "Tự động phát",
    "show-transcript": "Hiện phụ đề",
    "show-choice-romanization": "Phiên âm ở các lựa chọn",
    vibration: "Rung",
  },
  sessionOptionDescription: {
    "show-choice-romanization": "Hiện cách đọc của từng đáp án tiếng Hàn bằng chữ nhỏ phía trên.",
    vibration: "Rung khi câu trả lời đúng hoặc sai và khi gõ bàn phím.",
  },
  optionState: { on: "bật", off: "tắt" },
  action: {
    "sign-in": "Đăng nhập",
    "sign-out": "Đăng xuất",
    "delete-account": "Xóa tài khoản",
  },
  signOutDialog: { title: "Đăng xuất?", confirm: "Đăng xuất", cancel: "Vẫn đăng nhập" },
  deleteDialog: {
    title: "Xóa tài khoản của bạn?",
    description:
      "Tài khoản và tiến độ học của bạn sẽ bị xóa vĩnh viễn. Không thể hoàn tác thao tác này.",
    confirm: "Xóa tài khoản",
    cancel: "Giữ tài khoản",
  },
  deleteFailure: {
    network: "Không thể xóa tài khoản. Hãy kiểm tra kết nối và thử lại.",
    other: "Không thể xóa tài khoản. Vui lòng thử lại.",
  },
  exitAnnouncement: { "signed-out": "Bạn đã đăng xuất.", deleted: "Tài khoản của bạn đã bị xóa." },
  version: (name, build) => `Phiên bản ${name} (${build})`,
};

export const appUpdateVi: AppUpdateCopy = {
  title: "Cập nhật Duru để tiếp tục",
  description:
    "Phiên bản Duru này không còn được hỗ trợ. Hãy tải phiên bản mới nhất từ cửa hàng để tiếp tục học.",
  update: "Cập nhật",
  failure: "Không thể mở cửa hàng. Vui lòng cập nhật Duru từ App Store hoặc Google Play.",
};

export const feedbackVi: FeedbackCopy = {
  title: "Gửi góp ý",
  ratingQuestion: "Bạn thấy Duru thế nào?",
  ratingOption: { 1: "Chưa tốt", 2: "Cần cải thiện", 3: "Tạm được", 4: "Tốt", 5: "Rất thích" },
  messageLabel: "Bạn còn muốn nói gì với chúng tôi không? (không bắt buộc)",
  send: "Gửi",
  sent: "Cảm ơn bạn! Chúng tôi đã nhận được góp ý.",
  failed: "Không thể gửi góp ý. Vui lòng thử lại.",
  survey: {
    title: "Bạn thấy tập này thế nào?",
    description: (episodeTitle) =>
      `Bạn đã hoàn thành ${episodeTitle}. Hãy cho chúng tôi biết cảm nhận của bạn.`,
    skip: "Để sau",
  },
};

export const profileVi: ProfileCopy = {
  notProvided: "Chưa cung cấp",
  learningLanguage: "Tiếng Hàn",
  title: "Hồ sơ người dùng",
  itemLabel: {
    name: "Tên",
    "learning-language": "Ngôn ngữ đang học",
    email: "Email",
    phone: "Số điện thoại",
  },
};

export const gemPurchaseVi: GemPurchaseCopy = {
  packAmount: (_count, display) => `${display} ngọc`,
  balance: (_count, display) => `Bạn có ${display} ngọc`,
  paymentMethod: "Phương thức thanh toán",
  notice: {
    title: "Sắp có thanh toán",
    description: "Hiện chưa thể thanh toán ngọc. Vui lòng quay lại sau.",
  },
};

export const downloadSheetVi: DownloadSheetCopy = {
  askTitle: (n) => `Tải Tập ${n}?`,
  askDescription:
    "Hình ảnh và âm thanh của tập này chưa có trên điện thoại. Tải xuống sẽ dùng dữ liệu di động.",
  size: (size) => `Khoảng ${size}`,
  downloadNow: "Tải ngay",
  onWifi: "Tải khi có Wi-Fi",
  wifiOnlyTitle: (n) => `Tập ${n} sẽ tải khi có Wi-Fi`,
  wifiOnlyDescription:
    "Bạn đã chọn Chỉ Wi-Fi trong Cài đặt. Dùng dữ liệu di động lần này, mở không cần hình ảnh và âm thanh, hoặc đổi cài đặt.",
  ok: "OK",
  offlineTitle: "Bạn đang ngoại tuyến",
  offlineDescription: (n) => `Tập ${n} chưa được tải. Tập này sẽ tải khi bạn có mạng trở lại.`,
  openAnyway: "Vẫn mở",
  close: "Đóng",
  askUnitTitle: (l) => `Tải ${l}?`,
  askUnitDescription:
    "Hình ảnh và âm thanh của bài học này chưa có trên điện thoại. Tải xuống sẽ dùng dữ liệu di động.",
  rows: {
    common: "Hình ảnh và âm thanh dùng chung",
    allLessons: "Tất cả bài học trong tập này",
    otherLessons: "Các bài học khác",
    status: { done: "Đã có trên điện thoại", pending: "Đang tải ngay", wifi: "Khi có Wi-Fi" },
  },
  askHint: "Mỗi lần bạn sẽ được hỏi. Đổi trong Cài đặt › Tải xuống.",
  wifiOnlyUnitTitle: (l) => `${l} sẽ tải khi có Wi-Fi`,
  mobileDataOnce: "Dùng dữ liệu di động lần này",
  openWithout: "Mở không cần hình ảnh và âm thanh",
  changeSetting: "Đổi cài đặt",
  offlineUnitDescription: (l) => `${l} chưa được tải. Bài học này sẽ tải khi bạn có mạng trở lại.`,
  offlineHint: "Hình ảnh hiện thành màu trơn và các câu nghe sẽ bị bỏ qua.",
  allCleared: {
    title: "Bạn đã học hết các câu chuyện ở đây",
    description: "Có thể đã có tập mới. Hãy kết nối internet, chúng tôi sẽ kiểm tra giúp bạn.",
    offline: "Bạn đang ngoại tuyến",
    lastChecked: (d) =>
      d === null
        ? "Chưa kiểm tra"
        : d === 0
          ? "Kiểm tra lần cuối hôm nay"
          : d === 1
            ? "Kiểm tra lần cuối hôm qua"
            : `Kiểm tra lần cuối ${d} ngày trước`,
    checkNow: "Kiểm tra ngay",
    later: "Để sau",
    autoNote: "Chúng tôi cũng sẽ tự kiểm tra khi bạn có mạng trở lại.",
    offlineHint: "Chúng tôi sẽ kiểm tra ngay khi bạn có kết nối.",
  },
};
