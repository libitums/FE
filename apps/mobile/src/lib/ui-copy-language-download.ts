// 앱 언어를 바꾼 뒤 그 언어의 콘텐츠 번역 파일을 받는 시트 문구입니다(ADR-0102 개정 ⟨언어 바꿈 받기⟩). 여덟 언어를 한 파일에
// 둡니다 — 각 언어의 껍데기 표가 자기 몫을 꽂습니다. 영어는 받을 번역이 없어 시트가 서지 않지만 표의 모양을 맞추려 둡니다.
// 번역 초안 — 원어민 검수 필요.

export type LanguageDownloadCopy = {
  /** 받는 중 제목 — 그 언어 이름이 들어갑니다. */
  readonly downloadingTitle: string;
  readonly downloadingBody: string;
  /** 진행 줄 — `size`는 `120 KB` 꼴(받을 파일 전체)입니다. */
  readonly progress: (done: number, total: number, size: string) => string;
  /** 받기는 이어 가고 시트만 닫습니다. */
  readonly hide: string;
  readonly offlineTitle: string;
  readonly offlineBody: string;
  readonly ok: string;
  readonly failedTitle: string;
  readonly failedBody: string;
  readonly retry: string;
  readonly later: string;
  /** 시트 닫기 단추의 낭독 이름입니다. */
  readonly close: string;
};

export const languageDownloadEn: LanguageDownloadCopy = {
  downloadingTitle: "Downloading translations…",
  downloadingBody: "When it's done, lessons show meanings in your language.",
  progress: (done, total, size) => `${done} of ${total} · ${size}`,
  hide: "Continue in background",
  offlineTitle: "You're offline",
  offlineBody: "We'll download translations for your language when you're back online.",
  ok: "OK",
  failedTitle: "Couldn't download translations",
  failedBody: "Some meanings may stay in English until the download finishes.",
  retry: "Try again",
  later: "Later",
  close: "Close",
};

export const languageDownloadVi: LanguageDownloadCopy = {
  downloadingTitle: "Đang tải bản dịch tiếng Việt…",
  downloadingBody: "Khi xong, bài học sẽ hiển thị nghĩa bằng tiếng Việt.",
  progress: (done, total, size) => `${done} trên ${total} · ${size}`,
  hide: "Tiếp tục chạy nền",
  offlineTitle: "Bạn đang ngoại tuyến",
  offlineBody: "Chúng tôi sẽ tải bản dịch tiếng Việt khi bạn có kết nối trở lại.",
  ok: "OK",
  failedTitle: "Không tải được bản dịch",
  failedBody: "Một số nghĩa có thể vẫn hiển thị bằng tiếng Anh cho đến khi tải xong.",
  retry: "Thử lại",
  later: "Để sau",
  close: "Đóng",
};

export const languageDownloadId: LanguageDownloadCopy = {
  downloadingTitle: "Mengunduh terjemahan bahasa Indonesia…",
  downloadingBody: "Setelah selesai, pelajaran akan menampilkan arti dalam bahasa Indonesia.",
  progress: (done, total, size) => `${done} dari ${total} · ${size}`,
  hide: "Lanjutkan di latar belakang",
  offlineTitle: "Kamu sedang offline",
  offlineBody: "Terjemahan bahasa Indonesia akan diunduh saat kamu kembali online.",
  ok: "OK",
  failedTitle: "Gagal mengunduh terjemahan",
  failedBody: "Beberapa arti mungkin tetap dalam bahasa Inggris sampai unduhan selesai.",
  retry: "Coba lagi",
  later: "Nanti",
  close: "Tutup",
};

export const languageDownloadEs: LanguageDownloadCopy = {
  downloadingTitle: "Descargando traducciones al español…",
  downloadingBody: "Cuando termine, las lecciones mostrarán los significados en español.",
  progress: (done, total, size) => `${done} de ${total} · ${size}`,
  hide: "Seguir en segundo plano",
  offlineTitle: "Sin conexión",
  offlineBody: "Descargaremos las traducciones al español cuando vuelvas a tener conexión.",
  ok: "Aceptar",
  failedTitle: "No se pudieron descargar las traducciones",
  failedBody: "Algunos significados pueden seguir en inglés hasta que termine la descarga.",
  retry: "Reintentar",
  later: "Más tarde",
  close: "Cerrar",
};

export const languageDownloadJa: LanguageDownloadCopy = {
  downloadingTitle: "日本語の翻訳をダウンロード中…",
  downloadingBody: "完了すると、レッスンの意味が日本語で表示されます。",
  progress: (done, total, size) => `${total}件中${done}件 · ${size}`,
  hide: "バックグラウンドで続ける",
  offlineTitle: "オフラインです",
  offlineBody: "接続が戻ったら、日本語の翻訳をダウンロードします。",
  ok: "OK",
  failedTitle: "翻訳をダウンロードできませんでした",
  failedBody: "ダウンロードが終わるまで、一部の意味は英語のままになることがあります。",
  retry: "もう一度試す",
  later: "あとで",
  close: "閉じる",
};

export const languageDownloadTh: LanguageDownloadCopy = {
  downloadingTitle: "กำลังดาวน์โหลดคำแปลภาษาไทย…",
  downloadingBody: "เมื่อเสร็จแล้ว บทเรียนจะแสดงความหมายเป็นภาษาไทย",
  progress: (done, total, size) => `${done} จาก ${total} · ${size}`,
  hide: "ทำต่อในเบื้องหลัง",
  offlineTitle: "คุณออฟไลน์อยู่",
  offlineBody: "เราจะดาวน์โหลดคำแปลภาษาไทยเมื่อคุณกลับมาออนไลน์",
  ok: "ตกลง",
  failedTitle: "ดาวน์โหลดคำแปลไม่สำเร็จ",
  failedBody: "ความหมายบางส่วนอาจยังเป็นภาษาอังกฤษจนกว่าจะดาวน์โหลดเสร็จ",
  retry: "ลองอีกครั้ง",
  later: "ไว้ทีหลัง",
  close: "ปิด",
};

export const languageDownloadMy: LanguageDownloadCopy = {
  downloadingTitle: "မြန်မာဘာသာပြန်များကို ဒေါင်းလုဒ်လုပ်နေသည်…",
  downloadingBody: "ပြီးသွားလျှင် သင်ခန်းစာများတွင် အဓိပ္ပာယ်ကို မြန်မာလို ပြပါမည်။",
  progress: (done, total, size) => `${total} ခုအနက် ${done} ခု · ${size}`,
  hide: "နောက်ကွယ်တွင် ဆက်လုပ်ရန်",
  offlineTitle: "အော့ဖ်လိုင်း ဖြစ်နေသည်",
  offlineBody: "အင်တာနက် ပြန်ရလျှင် မြန်မာဘာသာပြန်များကို ဒေါင်းလုဒ်လုပ်ပါမည်။",
  ok: "အိုကေ",
  failedTitle: "ဘာသာပြန်များကို ဒေါင်းလုဒ် မလုပ်နိုင်ပါ",
  failedBody: "ဒေါင်းလုဒ် ပြီးဆုံးသည်အထိ အဓိပ္ပာယ်အချို့ အင်္ဂလိပ်လို ကျန်နေနိုင်သည်။",
  retry: "ထပ်ကြိုးစားရန်",
  later: "နောက်မှ",
  close: "ပိတ်ရန်",
};

export const languageDownloadZhTw: LanguageDownloadCopy = {
  downloadingTitle: "正在下載繁體中文翻譯…",
  downloadingBody: "完成後，課程中的意思會以繁體中文顯示。",
  progress: (done, total, size) => `${total} 個中的第 ${done} 個 · ${size}`,
  hide: "在背景繼續",
  offlineTitle: "目前離線",
  offlineBody: "恢復連線後，我們會下載繁體中文翻譯。",
  ok: "好",
  failedTitle: "無法下載翻譯",
  failedBody: "下載完成前，部分意思可能仍以英文顯示。",
  retry: "再試一次",
  later: "稍後",
  close: "關閉",
};
