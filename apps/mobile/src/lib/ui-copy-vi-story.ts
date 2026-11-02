// 베트남어 문구표 구획 — 이야기 · 롤플레이(episodeIntro ~ roleplay).
// 번역 초안 — 원어민 검수 필요(ADR-0091 D3).

import type {
  EpisodeIntroCopy,
  MessengerCopy,
  RoleplayCopy,
  VisualNovelCopy,
} from "./ui-copy-sections.contract";
import type { StoryCallCopy } from "../screens/story-call/story-call.contract";
import type { StoryIntroCopy } from "../screens/story-intro/story-intro.contract";
import type { StoryMessengerCopy } from "../screens/story-messenger/story-messenger.contract";

export const episodeIntroVi: EpisodeIntroCopy = {
  guide: {
    map: "Chạm để bắt đầu bài học!",
    continue: "Chạm vào bất kỳ đâu để tiếp tục",
  },
  skipDialog: {
    title: "Bỏ qua câu chuyện?",
    description: "Nếu bỏ qua, câu chuyện của tập này sẽ không xuất hiện lại.",
    skip: "Bỏ qua",
    keepWatching: "Xem tiếp",
  },
};

export const messengerVi: MessengerCopy = {
  keyboard: {
    shift: "Shift",
    shiftOn: "Shift, đang bật",
    backspace: "Xóa",
    comma: "Dấu phẩy",
    period: "Dấu chấm",
    space: "Dấu cách",
    questionMark: "Dấu hỏi",
  },
};

export const visualNovelVi: VisualNovelCopy = {
  sceneProgress: (ordinal, total) => `Cảnh ${ordinal} / ${total}`,
};

export const roleplayVi: RoleplayCopy = {
  title: "Nhập vai",
  form: { story: "Nhập vai" },
  viewAll: "Xem tất cả",
  viewAllLabel: (sectionLabel) => `Xem tất cả, ${sectionLabel}`,
  plus: "Plus",
  plusTagline: "Luyện các tình huống tương tự",
  plusSectionLabel: (sectionLabel) =>
    `${sectionLabel} nhập vai Plus, luyện các tình huống giống tập này`,
  plusDialogTitle: "Nhập vai Plus",
  lockedSection: (name) => `${name}, đã khóa, hoàn thành tập này trong hành trình để mở khóa`,
  premiumLock: { episode: "đã khóa", payment: "Chỉ dành cho Plus" },
  premiumNotice: (itemTitle) => `“${itemTitle}” là bài nhập vai Plus. Plus hiện chưa có sẵn.`,
};

export const storyMessengerVi: StoryMessengerCopy = {
  back: "Về bản đồ",
  typing: (speaker) => `${speaker} đang nhập`,
  replyTitle: "Bạn sẽ trả lời thế nào?",
  closeReply: "Đóng",
  send: "Gửi",
  composerPlaceholder: "Tin nhắn",
  finish: "Kết thúc câu chuyện",
};

export const storyIntroVi: StoryIntroCopy = {
  overline: (ordinal) => `CÂU CHUYỆN · TẬP ${ordinal}`,
  back: "Về bản đồ",
  skip: "Bỏ qua",
  start: "Bắt đầu",
  skipDialog: {
    title: "Bỏ qua câu chuyện?",
    description: "Bạn có thể xem lại bất cứ lúc nào từ bản đồ.",
    skip: "Bỏ qua",
    keepWatching: "Xem tiếp",
  },
};

export const storyCallVi: StoryCallCopy = {
  incoming: "Cuộc gọi đến",
  answer: "Trả lời",
  connecting: "Đang kết nối…",
  callEnded: (clock) => `Đã kết thúc cuộc gọi · ${clock}`,
  me: "Tôi",
  mute: "Tắt tiếng",
  speaker: "Loa ngoài",
  end: "Kết thúc",
  back: "Về bản đồ",
  finish: "Kết thúc câu chuyện",
};
