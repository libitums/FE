// 마이크 권한 안내(사전 안내 P1 · 거부 P2) · 인식 실패(P3) 문구입니다(ADR-0206). 여덟 언어를 한 파일에 둡니다 — 각 언어의 껍데기 표가
// 자기 몫을 꽂습니다. 「목소리는 저장하지 않음」은 개인정보 처리방침(「We do not record, store, or receive your voice.」)과 같은 뜻입니다.

export type MicPermissionCopy = {
  /** 사전 안내 제목 — 첫 말하기 문항 직전. */
  readonly primeTitle: string;
  /** 왜 마이크가 필요한가 + 목소리를 저장하지 않음. */
  readonly primeBody: string;
  /** 사전 안내의 주 버튼 — 누르면 시스템 권한 창이 뜹니다. */
  readonly allow: string;
  /** 사전 안내의 보조 버튼 — 이 레슨의 말하기를 건너뜁니다. */
  readonly notNow: string;
  readonly deniedTitle: string;
  /** 설정에서 켜고 돌아오면 다시 확인한다는 안내입니다. */
  readonly deniedBody: string;
  readonly openSettings: string;
  /** 거부 시트의 보조 버튼 — 이 레슨의 남은 말하기 문항을 건너뜁니다. */
  readonly continueWithout: string;
  /** 시트 닫기 단추의 낭독 이름입니다(이 시트는 닫기 단추를 그리지 않지만 시트가 이름을 요구합니다). */
  readonly close: string;
  /** 인식 실패(마이크 입력 실패 등) — 거부와 다른 문구, 다시 말하기 안내입니다. */
  readonly listenFailed: string;
  /** 두 번 실패한 뒤 함께 서는 「정답 듣기」 단추입니다. */
  readonly hearIt: string;
};

export const micPermissionEn: MicPermissionCopy = {
  primeTitle: "Time to speak Korean",
  primeBody: "Duru listens to your voice to check your pronunciation. Your voice isn't saved.",
  allow: "Allow microphone",
  notNow: "Not now — skip speaking",
  deniedTitle: "Microphone is off",
  deniedBody: "Turn on the microphone for Duru in Settings, then come back — we'll check again.",
  openSettings: "Open Settings",
  continueWithout: "Continue without speaking",
  close: "Close",
  listenFailed: "Something went wrong while listening. Try again.",
  hearIt: "Hear it",
};

export const micPermissionEs: MicPermissionCopy = {
  primeTitle: "Hora de hablar coreano",
  primeBody: "Duru escucha tu voz para revisar tu pronunciación. Tu voz no se guarda.",
  allow: "Permitir micrófono",
  notNow: "Ahora no — omitir hablar",
  deniedTitle: "El micrófono está desactivado",
  deniedBody: "Activa el micrófono para Duru en Ajustes y vuelve: lo comprobaremos de nuevo.",
  openSettings: "Abrir Ajustes",
  continueWithout: "Seguir sin hablar",
  close: "Cerrar",
  listenFailed: "Algo salió mal al escuchar. Inténtalo de nuevo.",
  hearIt: "Escuchar",
};

export const micPermissionId: MicPermissionCopy = {
  primeTitle: "Saatnya bicara bahasa Korea",
  primeBody: "Duru mendengarkan suaramu untuk memeriksa pelafalanmu. Suaramu tidak disimpan.",
  allow: "Izinkan mikrofon",
  notNow: "Nanti saja — lewati bicara",
  deniedTitle: "Mikrofon mati",
  deniedBody:
    "Aktifkan mikrofon untuk Duru di Pengaturan, lalu kembali — kami akan memeriksanya lagi.",
  openSettings: "Buka Pengaturan",
  continueWithout: "Lanjut tanpa bicara",
  close: "Tutup",
  listenFailed: "Ada masalah saat mendengarkan. Coba lagi.",
  hearIt: "Dengarkan",
};

export const micPermissionJa: MicPermissionCopy = {
  primeTitle: "韓国語を話してみましょう",
  primeBody: "Duruはあなたの声を聞いて発音をチェックします。声は保存されません。",
  allow: "マイクを許可",
  notNow: "あとで（話す問題をスキップ）",
  deniedTitle: "マイクがオフです",
  deniedBody: "設定でDuruのマイクをオンにしてから戻ってください。もう一度確認します。",
  openSettings: "設定を開く",
  continueWithout: "話さずに続ける",
  close: "閉じる",
  listenFailed: "音声の聞き取り中に問題が起きました。もう一度お試しください。",
  hearIt: "お手本を聞く",
};

export const micPermissionMy: MicPermissionCopy = {
  primeTitle: "ကိုရီးယားစကား ပြောကြမယ်",
  primeBody: "သင့်အသံထွက်ကို စစ်ဆေးရန် Duru က သင့်အသံကို နားထောင်ပါသည်။ သင့်အသံကို သိမ်းဆည်းမထားပါ။",
  allow: "မိုက်ခရိုဖုန်းကို ခွင့်ပြုရန်",
  notNow: "နောက်မှ — ပြောခြင်းကို ကျော်ရန်",
  deniedTitle: "မိုက်ခရိုဖုန်း ပိတ်ထားသည်",
  deniedBody: "ဆက်တင်များတွင် Duru အတွက် မိုက်ခရိုဖုန်းကို ဖွင့်ပြီး ပြန်လာပါ — ထပ်မံ စစ်ဆေးပါမည်။",
  openSettings: "ဆက်တင်များ ဖွင့်ရန်",
  continueWithout: "မပြောဘဲ ဆက်သွားရန်",
  close: "ပိတ်ရန်",
  listenFailed: "နားထောင်နေစဉ် တစ်ခုခု မှားသွားပါသည်။ ထပ်စမ်းကြည့်ပါ။",
  hearIt: "နားထောင်ရန်",
};

export const micPermissionTh: MicPermissionCopy = {
  primeTitle: "ได้เวลาพูดภาษาเกาหลีแล้ว",
  primeBody: "Duru ฟังเสียงของคุณเพื่อตรวจการออกเสียง เราไม่บันทึกเสียงของคุณ",
  allow: "อนุญาตไมโครโฟน",
  notNow: "ไว้ทีหลัง — ข้ามการพูด",
  deniedTitle: "ไมโครโฟนปิดอยู่",
  deniedBody: "เปิดไมโครโฟนให้ Duru ในการตั้งค่า แล้วกลับมาที่นี่ — เราจะตรวจอีกครั้ง",
  openSettings: "เปิดการตั้งค่า",
  continueWithout: "ไปต่อโดยไม่พูด",
  close: "ปิด",
  listenFailed: "เกิดปัญหาระหว่างฟังเสียง ลองอีกครั้ง",
  hearIt: "ฟังคำตอบ",
};

export const micPermissionVi: MicPermissionCopy = {
  primeTitle: "Đến lúc nói tiếng Hàn rồi",
  primeBody: "Duru nghe giọng bạn để kiểm tra phát âm. Giọng của bạn không được lưu lại.",
  allow: "Cho phép micrô",
  notNow: "Để sau — bỏ qua phần nói",
  deniedTitle: "Micrô đang tắt",
  deniedBody: "Hãy bật micrô cho Duru trong Cài đặt rồi quay lại — mình sẽ kiểm tra lại.",
  openSettings: "Mở Cài đặt",
  continueWithout: "Tiếp tục mà không nói",
  close: "Đóng",
  listenFailed: "Đã có lỗi khi nghe. Hãy thử lại.",
  hearIt: "Nghe đáp án",
};

export const micPermissionZhTw: MicPermissionCopy = {
  primeTitle: "來說韓語吧",
  primeBody: "Duru 會聽你的聲音來檢查發音。你的聲音不會被儲存。",
  allow: "允許使用麥克風",
  notNow: "稍後再說（略過口說）",
  deniedTitle: "麥克風已關閉",
  deniedBody: "請在設定中為 Duru 開啟麥克風，再回到這裡，我們會重新確認。",
  openSettings: "開啟設定",
  continueWithout: "不開口，繼續",
  close: "關閉",
  listenFailed: "收音時發生問題。請再試一次。",
  hearIt: "聽答案",
};
