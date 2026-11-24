// 세그먼트별 기본 문구입니다. 콘솔에서 고쳐 보낼 수 있고, 보낸 문구는 캠페인 기록에 남습니다.
// 자리표시: {name} 학습자 이름(없으면 지워짐) · {episode} 에피소드 영어 제목 · {streak} 연속 일수 · {steps} 남은 단계 수 ·
// {store} 그 사람 플랫폼의 스토어 이름(Google Play · App Store — 업데이트 세그먼트).
// zh-TW(대만 중국어 번체)는 ADR-0185. 영어 외 언어는 초안입니다 — 처음 보내기 전에 원어민 확인을 권합니다.

/** @type {Record<string, Record<string, { title: string, body: string }>>} */
export const DEFAULT_COPY = {
  "tutorial-cover": {
    en: {
      title: "Your Korean story is waiting",
      body: "{name}, open the first page — it takes a minute.",
    },
    vi: {
      title: "Câu chuyện tiếng Hàn đang chờ bạn",
      body: "{name}, mở trang đầu tiên nhé — chỉ mất một phút.",
    },
    id: {
      title: "Cerita Koreamu sedang menunggu",
      body: "{name}, buka halaman pertama — cuma satu menit.",
    },
    ms: {
      title: "Cerita Korea anda sedang menunggu",
      body: "{name}, buka halaman pertama — hanya seminit.",
    },
    es: {
      title: "Tu historia en coreano te espera",
      body: "{name}, abre la primera página: solo toma un minuto.",
    },
    ja: {
      title: "韓国語のストーリーが待っています",
      body: "{name}さん、最初のページを開いてみましょう。1分で終わります。",
    },
    "zh-TW": {
      title: "你的韓語故事正在等你",
      body: "{name}，打開第一頁吧，只要一分鐘。",
    },
  },
  "tutorial-lesson1": {
    en: { title: "Lesson 1 takes 2 minutes", body: "{name}, learn your first Korean words now." },
    vi: {
      title: "Bài 1 chỉ mất 2 phút",
      body: "{name}, học những từ tiếng Hàn đầu tiên ngay bây giờ.",
    },
    id: {
      title: "Pelajaran 1 cuma 2 menit",
      body: "{name}, pelajari kata-kata Korea pertamamu sekarang.",
    },
    ms: {
      title: "Pelajaran 1 hanya 2 minit",
      body: "{name}, belajar perkataan Korea pertama anda sekarang.",
    },
    es: {
      title: "La lección 1 dura 2 minutos",
      body: "{name}, aprende tus primeras palabras en coreano ahora.",
    },
    ja: {
      title: "レッスン1は2分で終わります",
      body: "{name}さん、最初の韓国語の単語を覚えましょう。",
    },
    "zh-TW": { title: "第1課只要2分鐘", body: "{name}，現在就來學你的第一批韓語單字。" },
  },
  "tutorial-lesson2": {
    en: {
      title: "Give lesson 2 another try",
      body: "{name}, lesson 2 is the hardest part of the tutorial. One more try!",
    },
    vi: {
      title: "Thử lại bài 2 nhé",
      body: "{name}, bài 2 là phần khó nhất của phần hướng dẫn. Thử thêm một lần nữa nhé!",
    },
    id: {
      title: "Coba lagi pelajaran 2",
      body: "{name}, pelajaran 2 adalah bagian tersulit di tutorial. Coba sekali lagi!",
    },
    ms: {
      title: "Cuba lagi pelajaran 2",
      body: "{name}, pelajaran 2 ialah bahagian paling sukar dalam tutorial. Cuba sekali lagi!",
    },
    es: {
      title: "Intenta otra vez la lección 2",
      body: "{name}, la lección 2 es la parte más difícil del tutorial. ¡Inténtalo una vez más!",
    },
    ja: {
      title: "レッスン2にもう一度挑戦",
      body: "{name}さん、レッスン2はチュートリアルでいちばん難しいところです。もう一度やってみましょう！",
    },
    "zh-TW": {
      title: "再挑戰一次第2課",
      body: "{name}，第2課是教學中最難的部分。再試一次吧！",
    },
  },
  "tutorial-rest": {
    en: {
      title: "Almost done with the tutorial",
      body: "{name}, you're only a few steps from the end.",
    },
    vi: { title: "Sắp xong phần hướng dẫn rồi", body: "{name}, chỉ còn vài bước nữa thôi." },
    id: { title: "Tutorial hampir selesai", body: "{name}, tinggal beberapa langkah lagi." },
    ms: { title: "Tutorial hampir selesai", body: "{name}, tinggal beberapa langkah lagi." },
    es: { title: "Ya casi terminas el tutorial", body: "{name}, solo te faltan unos pasos." },
    ja: { title: "チュートリアルはもうすぐ終わり", body: "{name}さん、あと少しです。" },
    "zh-TW": { title: "教學快要完成了", body: "{name}，只剩幾個步驟就結束了。" },
  },
  "episode-next": {
    en: { title: "New story: {episode}", body: "{name}, your next episode is ready." },
    vi: { title: "Câu chuyện mới: {episode}", body: "{name}, tập tiếp theo đã sẵn sàng." },
    id: { title: "Cerita baru: {episode}", body: "{name}, episode berikutnya sudah siap." },
    ms: { title: "Cerita baharu: {episode}", body: "{name}, episod seterusnya sudah sedia." },
    es: { title: "Nueva historia: {episode}", body: "{name}, tu próximo episodio está listo." },
    ja: {
      title: "新しいストーリー：{episode}",
      body: "{name}さん、次のエピソードの準備ができました。",
    },
    "zh-TW": { title: "新故事：{episode}", body: "{name}，下一集已經準備好了。" },
  },
  "episode-mid": {
    en: { title: "Continue {episode}", body: "{name}, pick up where you left off." },
    vi: { title: "Tiếp tục {episode}", body: "{name}, học tiếp từ chỗ bạn dừng lại nhé." },
    id: { title: "Lanjutkan {episode}", body: "{name}, lanjutkan dari tempat terakhir." },
    ms: { title: "Teruskan {episode}", body: "{name}, sambung dari tempat anda berhenti." },
    es: { title: "Continúa {episode}", body: "{name}, sigue donde lo dejaste." },
    ja: { title: "{episode}の続き", body: "{name}さん、続きから始めましょう。" },
    "zh-TW": { title: "繼續{episode}", body: "{name}，從上次停下的地方繼續吧。" },
  },
  "all-done": {
    en: {
      title: "Keep your Korean fresh",
      body: "{name}, replay a favorite episode in a few minutes.",
    },
  },
  // 앱을 올리지 않은 사람(D13) — 새 기능(채팅)을 알리고 스토어에서 올리라고만 합니다. 알림을 눌러도 옛 앱이 열려요.
  "update-available": {
    en: {
      title: "New in Duru: chat in Korean 💬",
      body: "{name}, talk with the characters from your story. Update Duru on {store} to start.",
    },
    vi: {
      title: "Mới trên Duru: trò chuyện bằng tiếng Hàn 💬",
      body: "{name}, trò chuyện với các nhân vật trong câu chuyện của bạn. Cập nhật Duru trên {store} để bắt đầu.",
    },
    id: {
      title: "Baru di Duru: ngobrol dalam bahasa Korea 💬",
      body: "{name}, ngobrol dengan tokoh dari ceritamu. Perbarui Duru di {store} untuk mulai.",
    },
    ms: {
      title: "Baharu di Duru: bersembang dalam bahasa Korea 💬",
      body: "{name}, bersembang dengan watak dari cerita anda. Kemas kini Duru di {store} untuk bermula.",
    },
    es: {
      title: "Nuevo en Duru: chatea en coreano 💬",
      body: "{name}, habla con los personajes de tu historia. Actualiza Duru en {store} para empezar.",
    },
    ja: {
      title: "Duruの新機能：韓国語でチャット 💬",
      body: "{name}さん、ストーリーの登場人物とおしゃべりできます。{store}でDuruをアップデートして始めましょう。",
    },
    "zh-TW": {
      title: "Duru 新功能：用韓語聊天 💬",
      body: "{name}，和故事裡的角色聊天吧。到 {store} 更新 Duru 就能開始。",
    },
  },
  "streak-at-risk": {
    en: {
      title: "Keep your {streak}-day streak",
      body: "{name}, one short lesson today keeps it going.",
    },
    vi: {
      title: "Giữ chuỗi {streak} ngày",
      body: "{name}, một bài học ngắn hôm nay để không đứt chuỗi.",
    },
    id: {
      title: "Pertahankan {streak} hari beruntun",
      body: "{name}, satu pelajaran singkat hari ini agar tidak terputus.",
    },
    ms: {
      title: "Kekalkan rentetan {streak} hari",
      body: "{name}, satu pelajaran ringkas hari ini untuk meneruskannya.",
    },
    es: {
      title: "Mantén tu racha de {streak} días",
      body: "{name}, una lección corta hoy para no perderla.",
    },
    ja: { title: "{streak}日連続を守ろう", body: "{name}さん、今日も短いレッスンをひとつだけ。" },
    "zh-TW": {
      title: "守住連續{streak}天的紀錄",
      body: "{name}，今天上一堂短短的課就能繼續保持。",
    },
  },
};

/** 세그먼트별 권장 조건입니다(콘솔의 처음 값). 시는 학습자 현지 시각 `[from, to)`. 대조군은 한 번에 150 ~ 400명이라 30% 이상 — 튜토리얼 레슨 세그먼트는 첫 실험이라 50%. */
export const DEFAULT_FILTERS = {
  "tutorial-cover": {
    minIdleHours: 20,
    maxIdleHours: 24 * 14,
    localHours: [18, 21],
    holdoutPercent: 30,
  },
  "tutorial-lesson1": {
    minIdleHours: 20,
    maxIdleHours: 24 * 14,
    localHours: [18, 21],
    holdoutPercent: 50,
  },
  "tutorial-lesson2": {
    minIdleHours: 20,
    maxIdleHours: 24 * 14,
    localHours: [18, 21],
    holdoutPercent: 50,
  },
  "tutorial-rest": {
    minIdleHours: 20,
    maxIdleHours: 24 * 14,
    localHours: [18, 21],
    holdoutPercent: 30,
  },
  "episode-next": {
    minIdleHours: 20,
    maxIdleHours: 24 * 21,
    localHours: [18, 21],
    holdoutPercent: 30,
  },
  "episode-mid": {
    minIdleHours: 20,
    maxIdleHours: 24 * 21,
    localHours: [18, 21],
    holdoutPercent: 30,
  },
  "all-done": { minIdleHours: 72, maxIdleHours: 24 * 30, localHours: [18, 21], holdoutPercent: 30 },
  // 단계별 예고(D11) — 문구는 예고 파일이 정하고, 훅 비교를 위해 대조군을 30%로 둡니다.
  "story-next": {
    minIdleHours: 20,
    maxIdleHours: 24 * 21,
    localHours: [18, 22],
    holdoutPercent: 30,
  },
  // 업데이트(D13) — 매일 쓰는 사람도 대상이라 쉰 시간 하한이 없습니다. 한 달 넘게 안 연 사람은 빼 둡니다.
  "update-available": {
    minIdleHours: 0,
    maxIdleHours: 24 * 30,
    localHours: [18, 21],
    holdoutPercent: 30,
  },
  "streak-at-risk": {
    minIdleHours: 0,
    maxIdleHours: null,
    localHours: [19, 22],
    holdoutPercent: 30,
  },
};

/**
 * 문구 B — 캐릭터 톤. 그 사람이 하던 에피소드의 인물이 한국어 한 마디로 말을 걸고, 본문이 뜻을 풀어 줍니다.
 * `{character}`는 인물의 한국어 이름(튜토리얼은 「승무원」)입니다. 죄책감 · 압박 없이, 이모지는 하나까지.
 * 다른 앱 마스코트의 문구를 흉내 내지 않습니다 — 우리 이야기 속 인물의 목소리입니다(ADR-0130 D10).
 */
export const DEFAULT_COPY_B = {
  "tutorial-cover": {
    en: {
      title: "{character}: 안녕하세요! 👋",
      body: "{name}, your Korean story starts with one hello. Say it back?",
    },
  },
  "tutorial-lesson1": {
    en: {
      title: "{character}: 곧 출발해요 ✈️",
      body: "{name}, your first Korean words are boarding now.",
    },
  },
  "tutorial-lesson2": {
    en: {
      title: "{character}: 괜찮아요, 다시 해 봐요 🙂",
      body: "{name}, lesson 2 trips everyone up at first. One more try?",
    },
  },
  "tutorial-rest": {
    en: {
      title: "{character}: 거의 다 왔어요 🎉",
      body: "{name}, just a few steps left in the tutorial.",
    },
  },
  "episode-next": {
    en: {
      title: "{character}: 다음 이야기 시작해요 👀",
      body: "{name}, {episode} is ready for you.",
    },
  },
  "episode-mid": {
    en: {
      title: "{character}: 아직이에요? 👀",
      body: "{name}, our story is paused at {episode}. Back for one lesson?",
    },
  },
  "all-done": {
    en: {
      title: "{character}: 또 만나요 🙂",
      body: "{name}, replay a favorite episode in a few minutes.",
    },
  },
  // 업데이트(D13) — 하던 이야기의 인물이 「이제 저랑 대화할 수 있어요」라고 말을 겁니다.
  "update-available": {
    en: {
      title: "{character}: 이제 저랑 대화할 수 있어요 💬",
      body: "{name}, update Duru on {store} to chat with me in Korean.",
    },
    vi: {
      title: "{character}: 이제 저랑 대화할 수 있어요 💬",
      body: "{name}, cập nhật Duru trên {store} để trò chuyện với mình bằng tiếng Hàn nhé.",
    },
    id: {
      title: "{character}: 이제 저랑 대화할 수 있어요 💬",
      body: "{name}, perbarui Duru di {store} untuk ngobrol denganku dalam bahasa Korea.",
    },
    ms: {
      title: "{character}: 이제 저랑 대화할 수 있어요 💬",
      body: "{name}, kemas kini Duru di {store} untuk bersembang dengan saya dalam bahasa Korea.",
    },
    es: {
      title: "{character}: 이제 저랑 대화할 수 있어요 💬",
      body: "{name}, actualiza Duru en {store} para chatear conmigo en coreano.",
    },
    ja: {
      title: "{character}: 이제 저랑 대화할 수 있어요 💬",
      body: "{name}さん、{store}でDuruをアップデートして、韓国語で私とおしゃべりしましょう。",
    },
    "zh-TW": {
      title: "{character}: 이제 저랑 대화할 수 있어요 💬",
      body: "{name}，到 {store} 更新 Duru，就能用韓語和我聊天了。",
    },
  },
  "streak-at-risk": {
    en: {
      title: "{character}: {streak}일째 함께해요 🔥",
      body: "{name}, one short lesson keeps your {streak}-day streak going.",
    },
  },
};
