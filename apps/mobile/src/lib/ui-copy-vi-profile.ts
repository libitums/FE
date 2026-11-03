// 베트남어 문구표 구획 — 학습자 프로필(이름 · 나라) 양식.
// 번역 초안 — 원어민 검수 필요(ADR-0091 D3).

import type { LearnerProfileCopy } from "../components/learner-profile.contract";

export const learnerProfileVi: LearnerProfileCopy = {
  nameLabel: "Tên của bạn",
  nameIssue: {
    empty: "Hãy nhập tên của bạn.",
    "too-long": "Tối đa 30 ký tự.",
    "forbidden-character": "Tên không được chứa { hoặc }.",
  },
  countryLabel: "Quốc gia",
  notSet: "Chưa đặt",
  countryMissing: "Hãy chọn quốc gia của bạn.",
  preview: {
    heading: { example: "Ví dụ", yours: "Bạn sẽ nói" },
    label: (kind, ko, en) =>
      `${kind === "example" ? "Câu ví dụ" : "Bạn sẽ nói"}: ${ko} Nghĩa: ${en}`,
  },
  picker: {
    title: "Chọn quốc gia",
    back: "Quay lại",
    searchLabel: "Tìm quốc gia",
    clearSearch: "Xóa tìm kiếm",
    allCountries: (count) => `${String(count)} quốc gia · tìm theo tên tiếng Anh`,
    matches: (count) => `${String(count)} kết quả`,
    noMatches: "Không có kết quả. Hãy kiểm tra chính tả hoặc thử tên ngắn hơn.",
    noMatchesAnnouncement: "Không có kết quả",
    row: (en, ko) => `${en} · ${ko}`,
    countrySet: (en) => `Đã chọn quốc gia: ${en}`,
  },
  signup: {
    continue: "Tiếp tục",
    back: "Quay lại",
    name: {
      title: "Bạn tên là gì?",
      caption: "Chúng tôi sẽ đưa tên bạn vào các câu bạn luyện tập",
      helper: "Chúng tôi đã chọn sẵn một tên — giữ nguyên, đổi ngẫu nhiên hoặc tự nhập.",
      shuffle: "Đổi tên",
      shuffleLabel: "Chọn một tên ngẫu nhiên khác",
      previewHeading: "Trong bài học sẽ nghe như thế này",
    },
    country: {
      title: "Bạn đến từ đâu?",
      caption: "Bạn sẽ nói điều này khi gặp mọi người trong câu chuyện",
      searchPlaceholder: (count) => `Tìm trong ${String(count)} quốc gia`,
      allCountries: (count) => `TẤT CẢ QUỐC GIA · ${String(count)}`,
      jumpTo: (letter) => `Đến chữ ${letter}`,
      jumpBar: "Chuyển đến chữ cái",
    },
  },
  settings: {
    title: "Tên và quốc gia",
    body: "Được dùng trong các câu bạn luyện tập. Thay đổi sẽ áp dụng từ bài học tiếp theo bạn mở.",
    submit: "Lưu",
    saved: "Đã lưu",
  },
  summary: {
    both: (name, country) => `${name} · ${country}`,
    pending: (summary) =>
      `${summary}. Đã lưu trên thiết bị này. Chúng tôi sẽ đồng bộ khi bạn có mạng trở lại.`,
  },
};
