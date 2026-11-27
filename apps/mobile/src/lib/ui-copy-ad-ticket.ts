// 광고 보고 티켓 1장(ADR-0209, 시안 A1 ~ A5) 문구입니다. 여덟 언어를 한 파일에 둡니다 — 각 언어의 껍데기 표가 자기 몫을 꽂습니다.
// 「티켓」 · 「레슨」 낱말은 각 언어의 티켓 문구(`ui-copy-*-tickets.ts`)와 같게 맞췄습니다.

export type AdTicketCopy = {
  /** A1 줄 제목 「Watch a short ad」. */
  readonly watch: string;
  /** A1 줄 오른쪽 알약 「Free」. */
  readonly free: string;
  /** A1 줄 아래 줄 — 보상 · 오늘 남은 횟수. */
  readonly reward: (left: number) => string;
  /** A1 줄 낭독 이름입니다. */
  readonly label: (left: number) => string;
  /** A2 불러오는 중 · 아래 줄. */
  readonly loading: string;
  readonly loadingSub: string;
  /** 광고를 닫은 뒤 서버 지급을 확인하는 동안. */
  readonly confirming: string;
  /** A4 오늘 다 씀(흐림) 아래 줄. */
  readonly usedAll: (cap: number) => string;
  /** A5 광고 없음 안내 한 줄. */
  readonly noFill: string;
  /** 시작 · 보여 주기 · 확인이 실패했을 때 줄 위 안내. */
  readonly failed: string;
  /** A3 대화상자 제목 · 링 아래 글자 · 안내. */
  readonly grantedTitle: string;
  readonly grantedCaption: string;
  readonly grantedMessage: (left: number) => string;
};

export const adTicketEn: AdTicketCopy = {
  watch: "Watch a short ad",
  free: "Free",
  reward: (left) => `+1 ticket · ${left} left today`,
  label: (left) => `Watch a short ad for 1 free ticket. ${left} left today.`,
  loading: "Loading ad…",
  loadingSub: "This takes a few seconds",
  confirming: "Getting your ticket…",
  usedAll: (cap) => `Used ${cap} of ${cap} today · back tomorrow`,
  noFill: "No ad is available right now. Try again in a little while.",
  failed: "Couldn't get your ticket. Please try again.",
  grantedTitle: "You got a ticket",
  grantedCaption: "ticket ready",
  grantedMessage: (left) =>
    left <= 0
      ? "Thanks for watching."
      : `Thanks for watching. ${left} ad ${left === 1 ? "ticket" : "tickets"} left today.`,
};

export const adTicketEs: AdTicketCopy = {
  watch: "Ver un anuncio corto",
  free: "Gratis",
  reward: (left) => `+1 boleto · quedan ${left} hoy`,
  label: (left) => `Ver un anuncio corto para conseguir 1 boleto gratis. Quedan ${left} hoy.`,
  loading: "Cargando anuncio…",
  loadingSub: "Tarda unos segundos",
  confirming: "Recibiendo tu boleto…",
  usedAll: (cap) => `Usaste ${cap} de ${cap} hoy · vuelve mañana`,
  noFill: "Ahora no hay anuncios disponibles. Inténtalo de nuevo en un rato.",
  failed: "No pudimos darte el boleto. Inténtalo de nuevo.",
  grantedTitle: "¡Conseguiste un boleto!",
  grantedCaption: "boleto listo",
  grantedMessage: (left) =>
    left <= 0
      ? "Gracias por mirar."
      : `Gracias por mirar. Hoy ${left === 1 ? "queda 1 boleto" : `quedan ${left} boletos`} por anuncios.`,
};

export const adTicketId: AdTicketCopy = {
  watch: "Tonton iklan singkat",
  free: "Gratis",
  reward: (left) => `+1 tiket · sisa ${left} hari ini`,
  label: (left) => `Tonton iklan singkat untuk 1 tiket gratis. Sisa ${left} hari ini.`,
  loading: "Memuat iklan…",
  loadingSub: "Hanya beberapa detik",
  confirming: "Mengambil tiketmu…",
  usedAll: (cap) => `Sudah ${cap} dari ${cap} hari ini · kembali besok`,
  noFill: "Belum ada iklan saat ini. Coba lagi sebentar lagi.",
  failed: "Tiket belum bisa didapat. Coba lagi.",
  grantedTitle: "Kamu dapat 1 tiket",
  grantedCaption: "tiket siap",
  grantedMessage: (left) =>
    left <= 0
      ? "Terima kasih sudah menonton."
      : `Terima kasih sudah menonton. Sisa ${left} tiket dari iklan hari ini.`,
};

export const adTicketJa: AdTicketCopy = {
  watch: "短い広告を見る",
  free: "無料",
  reward: (left) => `チケット+1 · 今日はあと${left}回`,
  label: (left) => `短い広告を見て、チケットを1枚無料でもらう。今日はあと${left}回。`,
  loading: "広告を読み込み中…",
  loadingSub: "数秒かかります",
  confirming: "チケットを受け取っています…",
  usedAll: (cap) => `今日は${cap}回すべて使いました · また明日`,
  noFill: "今は表示できる広告がありません。少し時間をおいてお試しください。",
  failed: "チケットを受け取れませんでした。もう一度お試しください。",
  grantedTitle: "チケットをもらいました",
  grantedCaption: "使えるチケット",
  grantedMessage: (left) =>
    left <= 0
      ? "ご視聴ありがとうございました。"
      : `ご視聴ありがとうございました。今日はあと${left}回、広告でチケットをもらえます。`,
};

export const adTicketMy: AdTicketCopy = {
  watch: "ကြော်ငြာတို ကြည့်ရန်",
  free: "အခမဲ့",
  reward: (left) => `လက်မှတ် +1 · ဒီနေ့ ${left} ကြိမ် ကျန်သည်`,
  label: (left) => `ကြော်ငြာတို ကြည့်ပြီး လက်မှတ် ၁ စောင် အခမဲ့ ယူရန်။ ဒီနေ့ ${left} ကြိမ် ကျန်သည်။`,
  loading: "ကြော်ငြာ ဖွင့်နေသည်…",
  loadingSub: "စက္ကန့်အနည်းငယ်သာ ကြာပါမည်",
  confirming: "သင့်လက်မှတ်ကို ယူနေသည်…",
  usedAll: (cap) => `ဒီနေ့ ${cap} ကြိမ်လုံး သုံးပြီးပါပြီ · မနက်ဖြန် ပြန်လာပါ`,
  noFill: "ယခု ပြသနိုင်သော ကြော်ငြာ မရှိသေးပါ။ ခဏနေမှ ထပ်စမ်းကြည့်ပါ။",
  failed: "လက်မှတ် မရနိုင်ခဲ့ပါ။ ထပ်စမ်းကြည့်ပါ။",
  grantedTitle: "လက်မှတ် ၁ စောင် ရပါပြီ",
  grantedCaption: "လက်မှတ် အသင့်",
  grantedMessage: (left) =>
    left <= 0
      ? "ကြည့်ပေးလို့ ကျေးဇူးတင်ပါတယ်။"
      : `ကြည့်ပေးလို့ ကျေးဇူးတင်ပါတယ်။ ဒီနေ့ ကြော်ငြာကြည့်ပြီး လက်မှတ်ယူခွင့် ${left} ကြိမ် ကျန်ပါသည်။`,
};

export const adTicketTh: AdTicketCopy = {
  watch: "ดูโฆษณาสั้นๆ",
  free: "ฟรี",
  reward: (left) => `ตั๋ว +1 · วันนี้เหลือ ${left} ครั้ง`,
  label: (left) => `ดูโฆษณาสั้นๆ เพื่อรับตั๋วฟรี 1 ใบ วันนี้เหลือ ${left} ครั้ง`,
  loading: "กำลังโหลดโฆษณา…",
  loadingSub: "ใช้เวลาเพียงไม่กี่วินาที",
  confirming: "กำลังรับตั๋วของคุณ…",
  usedAll: (cap) => `วันนี้ใช้ครบ ${cap} ครั้งแล้ว · กลับมาใหม่พรุ่งนี้`,
  noFill: "ตอนนี้ยังไม่มีโฆษณา ลองใหม่อีกสักครู่",
  failed: "รับตั๋วไม่สำเร็จ ลองอีกครั้ง",
  grantedTitle: "คุณได้รับตั๋วแล้ว",
  grantedCaption: "ตั๋วพร้อมใช้",
  grantedMessage: (left) => (left <= 0 ? "ขอบคุณที่รับชม" : `ขอบคุณที่รับชม วันนี้ดูโฆษณารับตั๋วได้อีก ${left} ครั้ง`),
};

export const adTicketVi: AdTicketCopy = {
  watch: "Xem một quảng cáo ngắn",
  free: "Miễn phí",
  reward: (left) => `+1 vé · hôm nay còn ${left} lượt`,
  label: (left) => `Xem một quảng cáo ngắn để nhận 1 vé miễn phí. Hôm nay còn ${left} lượt.`,
  loading: "Đang tải quảng cáo…",
  loadingSub: "Chỉ mất vài giây",
  confirming: "Đang nhận vé của bạn…",
  usedAll: (cap) => `Hôm nay đã dùng ${cap}/${cap} lượt · mai quay lại nhé`,
  noFill: "Hiện chưa có quảng cáo. Hãy thử lại sau ít phút.",
  failed: "Chưa nhận được vé. Hãy thử lại.",
  grantedTitle: "Bạn đã nhận 1 vé",
  grantedCaption: "vé sẵn sàng",
  grantedMessage: (left) =>
    left <= 0
      ? "Cảm ơn bạn đã xem."
      : `Cảm ơn bạn đã xem. Hôm nay còn ${left} lượt xem quảng cáo để nhận vé.`,
};

export const adTicketZhTw: AdTicketCopy = {
  watch: "觀看一則短廣告",
  free: "免費",
  reward: (left) => `+1張票券 · 今天還剩${left}次`,
  label: (left) => `觀看一則短廣告，免費取得1張票券。今天還剩${left}次。`,
  loading: "正在載入廣告…",
  loadingSub: "只需要幾秒鐘",
  confirming: "正在領取你的票券…",
  usedAll: (cap) => `今天${cap}次都用完了 · 明天再來`,
  noFill: "目前沒有可播放的廣告，請稍後再試。",
  failed: "無法取得票券，請再試一次。",
  grantedTitle: "你獲得了1張票券",
  grantedCaption: "票券已就緒",
  grantedMessage: (left) =>
    left <= 0 ? "感謝觀看。" : `感謝觀看。今天還能看${left}次廣告領票券。`,
};
