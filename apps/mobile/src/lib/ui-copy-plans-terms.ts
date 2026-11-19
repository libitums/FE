// 요금제 화면의 구독 고지 · 지금 요금제 문구(ADR-0144 2단계 후속). App Store 심사 지침 3.1.2 · Play 구독 정책이 구매 화면에
// 요구하는 것 — 요금제 이름 · 가격과 기간 · 결제 계정 · 자동 갱신 · 해지 방법 · 이용약관 · 개인정보처리방침. 다섯 언어를 한 파일에 둡니다.
// 이용약관 · 개인정보처리방침 이름은 설정 목록(`settings.nav`)과 같은 말입니다. 무료 체험이 생기면 체험 문장을 더합니다(지금 없음).

export type PlanStoreKey = "ios" | "android" | "unknown";

export type PlanTermsCopy = {
  /** `price`는 「$11.99 / month」 같은 가격 · 기간 글(없으면 「스토어에서」 안내), `store`는 `stores`의 이름. */
  readonly disclosure: (name: string, price: string, store: string) => string;
  readonly stores: Readonly<Record<PlanStoreKey, string>>;
  readonly termsOfUse: string;
  readonly privacyPolicy: string;
  readonly current: string;
  readonly manage: string;
};

export const planTermsCopy: Readonly<Record<"en" | "es" | "id" | "ja" | "vi", PlanTermsCopy>> = {
  en: {
    disclosure: (name, price, store) =>
      `${name}: ${price}. Payment is charged to your ${store} account. Your subscription renews automatically at the same price unless you cancel at least 24 hours before the current period ends. Manage or cancel anytime in your ${store} account settings.`,
    stores: { ios: "App Store", android: "Google Play", unknown: "app store" },
    termsOfUse: "Terms of Use",
    privacyPolicy: "Privacy Policy",
    current: "Current plan",
    manage: "Manage subscription",
  },
  es: {
    disclosure: (name, price, store) =>
      `${name}: ${price}. El pago se carga a tu cuenta de ${store}. La suscripción se renueva automáticamente al mismo precio, salvo que la canceles al menos 24 horas antes de que termine el periodo actual. Puedes gestionarla o cancelarla cuando quieras en los ajustes de tu cuenta de ${store}.`,
    stores: { ios: "App Store", android: "Google Play", unknown: "la tienda de apps" },
    termsOfUse: "Términos de uso",
    privacyPolicy: "Política de privacidad",
    current: "Plan actual",
    manage: "Gestionar suscripción",
  },
  id: {
    disclosure: (name, price, store) =>
      `${name}: ${price}. Pembayaran ditagihkan ke akun ${store} kamu. Langganan diperpanjang otomatis dengan harga yang sama kecuali kamu membatalkannya paling lambat 24 jam sebelum periode saat ini berakhir. Kelola atau batalkan kapan saja di pengaturan akun ${store} kamu.`,
    stores: { ios: "App Store", android: "Google Play", unknown: "toko aplikasi" },
    termsOfUse: "Ketentuan Penggunaan",
    privacyPolicy: "Kebijakan Privasi",
    current: "Paket saat ini",
    manage: "Kelola langganan",
  },
  ja: {
    disclosure: (name, price, store) =>
      `${name}：${price}。お支払いは${store}のアカウントに請求されます。現在の期間が終わる24時間前までに解約しない限り、同じ料金で自動更新されます。管理・解約は${store}のアカウント設定からいつでもできます。`,
    stores: { ios: "App Store", android: "Google Play", unknown: "アプリストア" },
    termsOfUse: "利用規約",
    privacyPolicy: "プライバシーポリシー",
    current: "現在のプラン",
    manage: "サブスクリプションを管理",
  },
  vi: {
    disclosure: (name, price, store) =>
      `${name}: ${price}. Khoản thanh toán được tính vào tài khoản ${store} của bạn. Gói đăng ký tự động gia hạn với cùng mức giá trừ khi bạn hủy ít nhất 24 giờ trước khi kỳ hiện tại kết thúc. Bạn có thể quản lý hoặc hủy bất cứ lúc nào trong phần cài đặt tài khoản ${store}.`,
    stores: { ios: "App Store", android: "Google Play", unknown: "cửa hàng ứng dụng" },
    termsOfUse: "Điều khoản sử dụng",
    privacyPolicy: "Chính sách quyền riêng tư",
    current: "Gói hiện tại",
    manage: "Quản lý gói đăng ký",
  },
};
