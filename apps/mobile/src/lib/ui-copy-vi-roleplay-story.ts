// 베트남어 문구표 구획 — 에피소드 롤플레이(미리보기 · 말하기 대화).
// 번역 초안 — 원어민 검수 필요(ADR-0091 D3).

import type { RoleplayStoryCopy } from "../screens/roleplay-story/roleplay-story.contract";

export const roleplayStoryVi: RoleplayStoryCopy = {
  lineCount: (count) => `${String(count)} câu thoại`,
  withCounterpart: (name) => `với ${name}`,
  previewBody: (name) => `Đóng cảnh này cùng ${name}. Hãy nói to từng câu trả lời.`,
  start: "Bắt đầu nhập vai",
  lineProgress: (ordinal, total) => `Câu ${String(ordinal)} / ${String(total)}`,
  me: "Tôi",
  speak: "Nói",
  stop: "Dừng",
  listening: "Đang nghe… Nói xong thì chạm lại.",
  showHint: "Xem gợi ý",
  hint: (translation) => `Hãy nói: ${translation}`,
  cantSpeak: "Không nói được lúc này",
  great: "Tuyệt",
  notQuite: "Chưa đúng lắm",
  youSaid: (heard) => `Bạn đã nói: ${heard}`,
  heardNothing: "Mình chưa nghe rõ.",
  unavailable: "Hiện không thể nói. Bạn có thể bỏ qua câu này.",
  blocked:
    "Hãy cho phép Micrô và Nhận dạng giọng nói cho ứng dụng này trong Cài đặt, hoặc bỏ qua câu này.",
  permissionTitle: "Bật micrô",
  permissionBody:
    "Nhập vai cần nói thành tiếng. Hãy cho phép Micrô và Nhận dạng giọng nói cho ứng dụng này trong Cài đặt.",
  openSettings: "Mở Cài đặt",
  notNow: "Để sau",
  unsupportedTitle: "Không thể nói",
  unsupportedBody:
    "Hiện thiết bị này không hỗ trợ nhận dạng giọng nói. Bạn vẫn có thể xem cảnh và bỏ qua từng câu.",
  startAnyway: "Vẫn bắt đầu",
  retryHeard: "Mình chưa nghe rõ. Chạm vào micrô và thử lại.",
  playAgain: "Chơi lại",
};
