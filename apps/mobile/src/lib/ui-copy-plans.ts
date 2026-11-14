// 요금제 문구(ADR-0144) — 설정 → Plans 화면 · 티켓 대화상자 카드 · 메신저 판 카드. 다섯 언어를 한 파일에 둡니다.
// 요금제 이름(Unlimited Tickets · Chat Plus · Premium)은 스토어 상품명과 같게 모든 언어에서 영어로 둡니다.
// 엽전은 「Yeopjeon」(ADR-0116 — 화면 문구에 한글을 쓰지 않음). 혜택 숫자는 서버 표에서 오므로 문구는 함수입니다.

import { n } from "./ui-copy-en-plural";

export type PlanNameKey = "unlimited_tickets" | "chat_plus" | "premium";

export type PlansCopy = {
  readonly title: string;
  readonly subtitle: string;
  readonly names: Readonly<Record<PlanNameKey, string>>;
  readonly best: string;
  readonly perMonth: (price: string) => string;
  readonly perYear: (price: string) => string;
  /** 가격을 아직 못 읽었을 때(스토어 연결 전) 가격 자리. */
  readonly priceInStore: string;
  readonly monthly: string;
  readonly yearly: string;
  readonly periodLabel: string;
  readonly yearlyNote: string;
  readonly benefit: {
    readonly unlimitedLessons: string;
    readonly freeMessages: (perDay: number) => string;
    readonly unlimitedChat: (fairUse: number | null) => string;
    readonly monthlyCoins: (coins: number) => string;
    readonly allCharacters: string;
  };
  readonly continueWith: (name: string) => string;
  readonly restore: string;
  readonly unavailable: string;
  readonly loadFailed: string;
  readonly settingsRow: string;
  readonly settingsRowDescription: string;
  readonly goUnlimited: string;
  readonly compare: string;
  readonly selected: string;
};

export const plansCopy: Readonly<Record<"en" | "es" | "id" | "ja" | "vi", PlansCopy>> = {
  en: {
    title: "Plans",
    subtitle: "Pick what helps you learn more.",
    names: { unlimited_tickets: "Unlimited Tickets", chat_plus: "Chat Plus", premium: "Premium" },
    best: "BEST",
    perMonth: (price) => `${price} / month`,
    perYear: (price) => `${price} / year`,
    priceInStore: "Price shown in the store",
    monthly: "Monthly",
    yearly: "Yearly",
    periodLabel: "Billing period",
    yearlyNote: "Yearly: 2 months free",
    benefit: {
      unlimitedLessons: "Unlimited lessons, no waiting",
      freeMessages: (perDay) => `${n(perDay, "free message", "free messages")} a day`,
      unlimitedChat: (fairUse) =>
        fairUse === null ? "Unlimited chat" : `Unlimited chat (fair use ${fairUse} a day)`,
      monthlyCoins: (coins) => `+${coins} Yeopjeon every month`,
      allCharacters: "Chat with every character",
    },
    continueWith: (name) => `Continue with ${name}`,
    restore: "Restore purchases",
    unavailable: "Purchases aren't available yet. Please check back soon.",
    loadFailed: "Couldn't load plans. Check your connection and try again.",
    settingsRow: "Plans",
    settingsRowDescription: "Unlimited Tickets · Chat Plus · Premium",
    goUnlimited: "Go unlimited",
    compare: "Compare plans",
    selected: "Selected",
  },
  es: {
    title: "Planes",
    subtitle: "Elige lo que te ayude a aprender más.",
    names: { unlimited_tickets: "Unlimited Tickets", chat_plus: "Chat Plus", premium: "Premium" },
    best: "MEJOR",
    perMonth: (price) => `${price} / mes`,
    perYear: (price) => `${price} / año`,
    priceInStore: "Precio en la tienda",
    monthly: "Mensual",
    yearly: "Anual",
    periodLabel: "Periodo de pago",
    yearlyNote: "Anual: 2 meses gratis",
    benefit: {
      unlimitedLessons: "Lecciones ilimitadas, sin esperar",
      freeMessages: (perDay) =>
        perDay === 1 ? "1 mensaje gratis al día" : `${perDay} mensajes gratis al día`,
      unlimitedChat: (fairUse) =>
        fairUse === null ? "Chat ilimitado" : `Chat ilimitado (uso justo: ${fairUse} al día)`,
      monthlyCoins: (coins) => `+${coins} Yeopjeon cada mes`,
      allCharacters: "Chatea con todos los personajes",
    },
    continueWith: (name) => `Continuar con ${name}`,
    restore: "Restaurar compras",
    unavailable: "Las compras aún no están disponibles. Vuelve pronto.",
    loadFailed: "No se pudieron cargar los planes. Revisa tu conexión e inténtalo de nuevo.",
    settingsRow: "Planes",
    settingsRowDescription: "Unlimited Tickets · Chat Plus · Premium",
    goUnlimited: "Pasar a ilimitado",
    compare: "Comparar planes",
    selected: "Seleccionado",
  },
  id: {
    title: "Paket",
    subtitle: "Pilih yang membantumu belajar lebih banyak.",
    names: { unlimited_tickets: "Unlimited Tickets", chat_plus: "Chat Plus", premium: "Premium" },
    best: "TERBAIK",
    perMonth: (price) => `${price} / bulan`,
    perYear: (price) => `${price} / tahun`,
    priceInStore: "Harga ada di toko",
    monthly: "Bulanan",
    yearly: "Tahunan",
    periodLabel: "Periode tagihan",
    yearlyNote: "Tahunan: gratis 2 bulan",
    benefit: {
      unlimitedLessons: "Pelajaran tanpa batas, tanpa menunggu",
      freeMessages: (perDay) => `${perDay} pesan gratis per hari`,
      unlimitedChat: (fairUse) =>
        fairUse === null
          ? "Chat tanpa batas"
          : `Chat tanpa batas (pemakaian wajar ${fairUse} per hari)`,
      monthlyCoins: (coins) => `+${coins} Yeopjeon setiap bulan`,
      allCharacters: "Chat dengan semua karakter",
    },
    continueWith: (name) => `Lanjut dengan ${name}`,
    restore: "Pulihkan pembelian",
    unavailable: "Pembelian belum tersedia. Coba lagi nanti.",
    loadFailed: "Paket tidak bisa dimuat. Periksa koneksimu lalu coba lagi.",
    settingsRow: "Paket",
    settingsRowDescription: "Unlimited Tickets · Chat Plus · Premium",
    goUnlimited: "Jadi tanpa batas",
    compare: "Bandingkan paket",
    selected: "Dipilih",
  },
  ja: {
    title: "プラン",
    subtitle: "学びを広げるプランを選びましょう。",
    names: { unlimited_tickets: "Unlimited Tickets", chat_plus: "Chat Plus", premium: "Premium" },
    best: "おすすめ",
    perMonth: (price) => `${price} / 月`,
    perYear: (price) => `${price} / 年`,
    priceInStore: "価格はストアで表示されます",
    monthly: "月払い",
    yearly: "年払い",
    periodLabel: "支払い期間",
    yearlyNote: "年払い：2か月分無料",
    benefit: {
      unlimitedLessons: "レッスン無制限、待ち時間なし",
      freeMessages: (perDay) => `1日${perDay}通まで無料`,
      unlimitedChat: (fairUse) =>
        fairUse === null ? "チャット無制限" : `チャット無制限（1日${fairUse}通まで）`,
      monthlyCoins: (coins) => `毎月+${coins} Yeopjeon`,
      allCharacters: "すべてのキャラクターとチャット",
    },
    continueWith: (name) => `${name}で続ける`,
    restore: "購入を復元",
    unavailable: "購入はまだご利用いただけません。もうしばらくお待ちください。",
    loadFailed: "プランを読み込めませんでした。接続を確認して、もう一度お試しください。",
    settingsRow: "プラン",
    settingsRowDescription: "Unlimited Tickets · Chat Plus · Premium",
    goUnlimited: "無制限にする",
    compare: "プランを比較",
    selected: "選択中",
  },
  vi: {
    title: "Gói",
    subtitle: "Chọn gói giúp bạn học nhiều hơn.",
    names: { unlimited_tickets: "Unlimited Tickets", chat_plus: "Chat Plus", premium: "Premium" },
    best: "TỐT NHẤT",
    perMonth: (price) => `${price} / tháng`,
    perYear: (price) => `${price} / năm`,
    priceInStore: "Giá hiển thị trong cửa hàng",
    monthly: "Hằng tháng",
    yearly: "Hằng năm",
    periodLabel: "Kỳ thanh toán",
    yearlyNote: "Hằng năm: miễn phí 2 tháng",
    benefit: {
      unlimitedLessons: "Bài học không giới hạn, không phải chờ",
      freeMessages: (perDay) => `${perDay} tin nhắn miễn phí mỗi ngày`,
      unlimitedChat: (fairUse) =>
        fairUse === null
          ? "Trò chuyện không giới hạn"
          : `Trò chuyện không giới hạn (dùng hợp lý ${fairUse} tin/ngày)`,
      monthlyCoins: (coins) => `+${coins} Yeopjeon mỗi tháng`,
      allCharacters: "Trò chuyện với mọi nhân vật",
    },
    continueWith: (name) => `Tiếp tục với ${name}`,
    restore: "Khôi phục giao dịch",
    unavailable: "Chưa thể mua lúc này. Hãy quay lại sau nhé.",
    loadFailed: "Không tải được các gói. Hãy kiểm tra kết nối rồi thử lại.",
    settingsRow: "Gói",
    settingsRowDescription: "Unlimited Tickets · Chat Plus · Premium",
    goUnlimited: "Dùng không giới hạn",
    compare: "So sánh các gói",
    selected: "Đã chọn",
  },
};
