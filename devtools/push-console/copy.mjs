// 세그먼트별 기본 문구입니다. 콘솔에서 고쳐 보낼 수 있고, 보낸 문구는 캠페인 기록에 남습니다.
// 자리표시: {name} 학습자 이름(없으면 지워짐) · {episode} 에피소드 영어 제목 · {streak} 연속 일수 · {steps} 남은 단계 수.
// 영어 외 언어는 초안입니다 — 처음 보내기 전에 원어민 확인을 권합니다.

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
  },
  "episode-mid": {
    en: { title: "Continue {episode}", body: "{name}, pick up where you left off." },
    vi: { title: "Tiếp tục {episode}", body: "{name}, học tiếp từ chỗ bạn dừng lại nhé." },
    id: { title: "Lanjutkan {episode}", body: "{name}, lanjutkan dari tempat terakhir." },
    ms: { title: "Teruskan {episode}", body: "{name}, sambung dari tempat anda berhenti." },
    es: { title: "Continúa {episode}", body: "{name}, sigue donde lo dejaste." },
    ja: { title: "{episode}の続き", body: "{name}さん、続きから始めましょう。" },
  },
  "all-done": {
    en: {
      title: "Keep your Korean fresh",
      body: "{name}, replay a favorite episode in a few minutes.",
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
  "streak-at-risk": {
    minIdleHours: 0,
    maxIdleHours: null,
    localHours: [19, 22],
    holdoutPercent: 30,
  },
};
