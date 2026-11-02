// 베트남어 문구표 구획 — common · shell · journeyMap · learningShell.
// 번역 초안 — 원어민 검수 필요(ADR-0091 D3).

import type {
  CommonCopy,
  JourneyMapCopy,
  LearningShellCopy,
  ShellCopy,
} from "./ui-copy-sections.contract";
import type { ProgressLoadCopy } from "../screens/journey-map/journey-map-load.contract";
import type { SplashCopy } from "../screens/splash/splash.contract";
import type { SpecialUnitMapCopy } from "../screens/journey-map/journey-special-unit.contract";

// 베트남어는 복수형이 없어 수와 단위를 그대로 붙입니다.
export const commonVi: CommonCopy = {
  exitTo: { journey: "Về bản đồ", roleplay: "Về danh sách" },
  backToSettings: "Về cài đặt",
  back: "Quay lại",
  answerResult: { correct: "Đúng", incorrect: "Sai" },
  answerResultSuffix: { correct: "đúng", incorrect: "sai" },
  resultAnnouncement: (result) => `Kết quả, ${result === "correct" ? "đúng" : "sai"}`,
  allQuestionsDone: "Đã xong tất cả câu hỏi",
  seeResults: "Xem kết quả",
  next: "Tiếp",
  continue: "Tiếp tục",
  check: "Kiểm tra",
  ok: "OK",
  close: "Đóng",
  skip: "Bỏ qua",
  listening: "Đang nghe",
  send: "Gửi",
  sendWithText: (text) => `Gửi, ${text}`,
  me: "Tôi",
  delete: "Xóa",
  startOver: "Làm lại từ đầu",
  blank: "chỗ trống",
  selected: (label) => `${label}, đã chọn`,
  locked: (label) => `${label}, đã khóa`,
  stepTitle: (ordinal, activity) => `Bước ${ordinal} · ${activity}`,
  count: {
    streakDays: (days) => `Chuỗi ${days} ngày`,
    trophies: (count) => `${count} cúp`,
    gems: (count) => `${count} ngọc`,
    diamonds: (count) => `${count} kim cương`,
  },
};

export const shellVi: ShellCopy = {
  tabs: { journey: "Hành trình", roleplay: "Nhập vai", settings: "Cài đặt" },
  notifications: "Thông báo",
  errorBoundary: { title: "Đã xảy ra lỗi", retry: "Thử lại" },
};

export const journeyMapVi: JourneyMapCopy = {
  start: "Bắt đầu",
  activityCount: (completed, total) => `${completed}/${total} hoạt động`,
  activityProgressLabel: (completed, total) => `Đã xong ${completed} / ${total} hoạt động`,
  // 설명 줄: 끝의 마침표를 떼고, 번호는 두 자리로 채웁니다.
  episodeUnitLabel: (episodeLabel, unit) =>
    `${String(episodeLabel).replace(/\.$/, "")}, phần ${String(unit).padStart(2, "0")}`,
  statModal: {
    streakHero: (days) => `Chuỗi ${days} ngày`,
    episodesClearedHero: (count) => `Đã hoàn thành ${count} tập`,
    slotProgress: (completed, total) => `Đã hoàn thành ${completed} / ${total}`,
    kind: {
      streak: {
        title: "ngày liên tiếp",
        message: "Làm tốt lắm! Mai quay lại để giữ chuỗi ngày học nhé!",
      },
      trophy: {
        title: "Hoàn thành tập!",
        message: "Làm tốt lắm! Mai quay lại để hoàn thành tập tiếp theo nhé!",
      },
    },
    continue: "Tiếp tục →",
    // 요일 약칭 — 일요일은 CN(Chủ nhật), 월~토는 T2~T7(Thứ hai ~ Thứ bảy)입니다.
    weekdays: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
  },
};

export const learningShellVi: LearningShellCopy = {
  exitLesson: "Rời bài học",
  formLabels: {
    listening: "Nghe",
    "sentence-order": "Sắp xếp từ",
    "word-choice": "Chọn từ",
    culture: "Văn hóa",
    speaking: "Nói",
    writing: "Viết",
    typing: "Gõ chữ",
    "vocab-card": "Từ mới",
    "pair-match": "Ghép cặp",
    "culture-card": "Văn hóa",
    "syllable-build": "Ghép âm tiết",
    "read-aloud": "Nói",
    "speak-word": "Nói",
  },
  progressLabel: (ordinal, total) => `Câu ${String(ordinal)} / ${String(total)}`,
  cultureQuizLabel: "Đố vui văn hóa",
  completionDescription: "Hít một hơi nhé. Bạn đã sẵn sàng cho bước tiếp theo.",
  completedQuestions: (count) => `Đã hoàn thành ${count} câu hỏi`,
  // 완료 카드(시안 A)의 활동 타일 낭독 이름과, 숫자 타일의 보이는 이름(대문자 — 결과 화면 `PERFECT LESSON`과 같은 갈래)입니다.
  completedActivities: (count) => `Đã hoàn thành ${count} hoạt động`,
  completionStats: {
    questions: "CÂU HỎI",
    activities: "HOẠT ĐỘNG",
  },
  leaveDialog: {
    title: "Rời bài học này?",
    description: "Câu trả lời đến giờ sẽ không được lưu, lần sau bạn sẽ học lại từ đầu.",
    leave: "Rời đi",
    stay: "Học tiếp",
  },
  headerNoQuestions: (formLabel) => `${formLabel}, không có câu hỏi`,
  headerQuestionOf: (formLabel, ordinal, count) => `${formLabel}, câu ${ordinal} / ${count}`,
};

export const specialUnitMapVi: SpecialUnitMapCopy = {
  eyebrow: "ĐẶC BIỆT",
  accessibilityLabel: (name) => `đặc biệt, ${name}`,
};

export const progressLoadVi: ProgressLoadCopy = {
  loading: "Đang tải tiến độ của bạn…",
  loadingAnnouncement: "Đang tải tiến độ của bạn",
  failed: "Không tải được tiến độ của bạn.",
  retry: "Thử lại",
};

export const splashVi: SplashCopy = {
  updating: "Đang cập nhật các tập",
  updatingLabel: (percent) => `Đang cập nhật các tập, ${percent}%`,
};
