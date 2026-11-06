// 베트남어 문구표 구획 — 진입 흐름(onboarding · languageSelect · journeyEntry · login · verificationCode).
// 번역 초안 — 원어민 검수 필요(ADR-0091 D3).

import type { AuthFailureCopy } from "./auth-failure";
import type { JourneyEntryCopy } from "../screens/journey-entry/journey-entry.contract";
import type { LanguageSelectCopy } from "../screens/language-select/language-select.contract";
import type { LoginCopy } from "../screens/login/login.contract";
import type { OnboardingScreenCopy } from "../screens/onboarding/onboarding.contract";
import type { VerificationCodeCopy } from "../screens/verification-code/verification-code.contract";

// 제목은 영어처럼 「앞말 + 강조어」 둘로 나뉩니다 — 강조어가 뒤에 와야 자연스러운 어순으로 골랐습니다.
export const onboardingVi: OnboardingScreenCopy = {
  steps: {
    0: {
      title: "Học qua",
      titleEmphasis: "câu chuyện",
      body: "Theo dõi những khoảnh khắc thường ngày\nvà học tiếng Hàn trên đường đi.",
    },
    1: {
      title: "Luyện",
      titleEmphasis: "tiếng Hàn",
      body: "Luyện hội thoại thực tế và\nkiểm tra bài đã học bằng câu đố nhanh.",
    },
    2: {
      title: "Chỉ",
      titleEmphasis: "5 phút",
      body: "Bài học ngắn mỗi ngày, vừa vặn lịch của bạn.\nHoàn thành một bài chỉ trong năm phút.",
    },
  },
  next: "Tiếp",
  getStarted: "Bắt đầu",
  progress: (ordinal, total) => `Bước ${ordinal} / ${total}`,
  storyChat: {
    staff: "Nhân viên",
    welcome: "Xin chào! Bạn đang tìm gì ạ?",
    sunscreen: "Có kem chống nắng không?",
    thisWay: "Có, mời đi lối này.",
  },
  quiz: { replay: "Nghe lại", stop: "Dừng", play: "Phát" },
  unit: {
    title: "Mua sắm ở cửa hàng mỹ phẩm",
    meta: "Bài 1 · 5 phút",
    status: { active: "Đang học", clear: "Hoàn thành" },
  },
};

export const languageSelectVi: LanguageSelectCopy = {
  title: "Chọn ngôn ngữ",
  caption: "Chọn ngôn ngữ bạn muốn sử dụng",
  preview: {
    question: "Bạn đã nghe gì?",
    meaning: "Cảm ơn",
  },
};

export const journeyEntryVi: JourneyEntryCopy = {
  title: "Hành trình đang chờ bạn",
  display: "Bắt đầu câu chuyện",
  caption: "Khám phá Seoul, làm quen bạn mới và học tiếng Hàn trên đường đi.",
  notice: "Một số hình ảnh trong dịch vụ này được tạo bằng công nghệ AI",
  start: "Bắt đầu",
};

export const loginVi: LoginCopy = {
  guest: "Tiếp tục không cần tài khoản",
  method: {
    phone: "Tiếp tục",
    google: "Tiếp tục với Google",
    apple: "Đăng nhập bằng Apple",
    facebook: "Tiếp tục với Facebook",
  },
  heading: {
    visible: {
      title: "Đăng nhập hoặc đăng ký bằng số điện thoại",
      caption: "Vui lòng nhập số điện thoại để tiếp tục",
    },
    hidden: { title: "Đăng nhập hoặc đăng ký", caption: "Chọn cách bạn muốn tiếp tục" },
  },
  countryCode: (name, dialCode) => `Mã quốc gia, ${name} ${dialCode}`,
  phoneNumber: "Số điện thoại",
  or: "hoặc",
  countrySheetTitle: "Chọn quốc gia",
  legal: {
    lead: "Khi tiếp tục, bạn đồng ý với",
    termsOfUse: "Điều khoản sử dụng",
    and: "&",
    privacyPolicy: "Chính sách quyền riêng tư",
  },
  // 수단 사용 불가 안내 대화상자(ADR-0111 개정 2).
  unavailable: {
    title: (method) => `Đăng nhập bằng ${method} tạm thời không khả dụng`,
    description:
      "Chúng tôi đang chuyển cách đăng nhập này sang thiết lập mới. Tạm thời, hãy tiếp tục với Google hoặc không cần tài khoản.",
    descriptionWithoutGuest:
      "Chúng tôi đang chuyển cách đăng nhập này sang thiết lập mới. Tạm thời, hãy tiếp tục với Google.",
    close: "Đóng",
  },
};

export const verificationCodeVi: VerificationCodeCopy = {
  title: "Mã xác minh OTP",
  sentTo: "Mã xác minh đã được gửi đến",
  digit: (ordinal, total) => `Chữ số ${ordinal} / ${total}`,
  resendHint: "Chưa nhận được mã?",
  resend: "Gửi lại",
  submit: "Tiếp tục",
};

export const authFailureVi: AuthFailureCopy = {
  network: "Không thể kết nối. Hãy kiểm tra mạng và thử lại.",
  unavailable: "Đã xảy ra lỗi. Vui lòng thử lại.",
  unconfigured: "Hiện chưa thể đăng nhập.",
  "rate-limited": "Bạn đã thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại.",
  rejected: "Không thể gửi mã đến số này. Hãy kiểm tra số điện thoại và thử lại.",
  "invalid-code": "Mã không đúng hoặc đã hết hạn.",
  "sign-in-incomplete": "Đăng nhập chưa hoàn tất. Vui lòng thử lại.",
  unsupported: "Cách đăng nhập này không có trên thiết bị này.",
};
