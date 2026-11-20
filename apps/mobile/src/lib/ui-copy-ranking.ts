// 주간 순위 · 채팅 단어 문구(ADR-0170)입니다 — 다섯 언어를 한 파일에 둡니다(각 언어 표가 자기 몫을 꽂습니다).
// 엽전은 화면에서 「Yeopjeon」으로 적습니다(ADR-0116). th · my는 화면 문구가 영어라(ADR-0158) 영어 표를 씁니다.

import type { RankingCopy } from "../screens/ranking/ranking.contract";
import { n } from "./ui-copy-en-plural";

export const rankingCopy: Readonly<Record<"en" | "es" | "id" | "ja" | "vi", RankingCopy>> = {
  en: {
    title: "Weekly ranking",
    group: (count) => `Your group · ${n(count, "learner", "learners")}`,
    endsIn: (days) => `Ends in ${n(days, "day", "days")}`,
    boards: { lessons: "Lessons", "chat-words": "Chat words" },
    selected: (label) => `${label}, selected`,
    unit: (board, score) =>
      board === "lessons" ? (score === 1 ? "lesson" : "lessons") : score === 1 ? "word" : "words",
    episode: (episode) => `Episode ${episode}`,
    zoneTop: (reward) =>
      reward === null ? "Top 3 this week" : `Top 3 get a bonus ${reward} Yeopjeon`,
    zoneClimb: "Keep climbing",
    you: "You",
    morePass: (more, name) => `${more} more to pass ${name}`,
    first: "You're #1!",
    rowLabel: (rank, name, episode, score) =>
      [`#${rank}`, name, episode, score].filter((part) => part !== null).join(", "),
    loading: "Loading the ranking",
    notices: {
      guest: { title: "Sign in to join", body: "Rankings are for members. Sign in to compete." },
      notJoined: {
        title: "Your week starts soon",
        body: "Pass a lesson or use a learned word in chat to join a group.",
      },
      hidden: { title: "You're hidden", body: "Others can't see you in the ranking." },
      error: { title: "Couldn't load the ranking", body: "Please try again." },
      offline: { title: "You're offline", body: "Connect to the internet to see the ranking." },
    },
    actions: { signIn: "Sign in", showMe: "Show me", retry: "Try again" },
    chat: {
      stripCount: (words) => n(words, "chat word", "chat words"),
      stripRank: (rank) => (rank === null ? "this week" : `this week · #${rank} in your group`),
      stripLabel: (words, rank) =>
        `${n(words, "chat word", "chat words")} this week${rank === null ? "" : `, number ${rank} in your group`}. Open ranking`,
      earned: (count) => `+${n(count, "chat word", "chat words")}`,
      pending: "counts when you resend it right",
    },
    settings: {
      hideTitle: "Hide me from ranking",
      hideBody: "Others won't see you in the weekly ranking",
    },
  },
  es: {
    title: "Clasificación semanal",
    group: (count) => `Tu grupo · ${count} ${count === 1 ? "estudiante" : "estudiantes"}`,
    endsIn: (days) => (days === 1 ? "Termina en 1 día" : `Termina en ${days} días`),
    boards: { lessons: "Lecciones", "chat-words": "Palabras" },
    selected: (label) => `${label}, seleccionado`,
    unit: (board, score) =>
      board === "lessons"
        ? score === 1
          ? "lección"
          : "lecciones"
        : score === 1
          ? "palabra"
          : "palabras",
    episode: (episode) => `Episodio ${episode}`,
    zoneTop: (reward) =>
      reward === null ? "Top 3 de la semana" : `El top 3 gana ${reward} Yeopjeon extra`,
    zoneClimb: "Sigue subiendo",
    you: "Tú",
    morePass: (more, name) => `${more} más para pasar a ${name}`,
    first: "¡Eres el n.º 1!",
    rowLabel: (rank, name, episode, score) =>
      [`n.º ${rank}`, name, episode, score].filter((part) => part !== null).join(", "),
    loading: "Cargando la clasificación",
    notices: {
      guest: {
        title: "Inicia sesión para participar",
        body: "La clasificación es para miembros. Inicia sesión para competir.",
      },
      notJoined: {
        title: "Tu semana empieza pronto",
        body: "Aprueba una lección o usa una palabra aprendida en el chat para unirte a un grupo.",
      },
      hidden: { title: "Estás oculto", body: "Los demás no te ven en la clasificación." },
      error: { title: "No se pudo cargar la clasificación", body: "Inténtalo de nuevo." },
      offline: { title: "Sin conexión", body: "Conéctate a internet para ver la clasificación." },
    },
    actions: { signIn: "Iniciar sesión", showMe: "Mostrarme", retry: "Reintentar" },
    chat: {
      stripCount: (words) => `${words} ${words === 1 ? "palabra" : "palabras"}`,
      stripRank: (rank) => (rank === null ? "esta semana" : `esta semana · n.º ${rank} del grupo`),
      stripLabel: (words, rank) =>
        `${words} ${words === 1 ? "palabra" : "palabras"} esta semana${rank === null ? "" : `, número ${rank} del grupo`}. Abrir clasificación`,
      earned: (count) => `+${count} ${count === 1 ? "palabra" : "palabras"}`,
      pending: "cuenta cuando lo reenvíes bien",
    },
    settings: {
      hideTitle: "Ocultarme de la clasificación",
      hideBody: "Los demás no te verán en la clasificación semanal",
    },
  },
  id: {
    title: "Peringkat mingguan",
    group: (count) => `Grupmu · ${count} pelajar`,
    endsIn: (days) => `Berakhir dalam ${days} hari`,
    boards: { lessons: "Pelajaran", "chat-words": "Kata obrolan" },
    selected: (label) => `${label}, dipilih`,
    unit: (board) => (board === "lessons" ? "pelajaran" : "kata"),
    episode: (episode) => `Episode ${episode}`,
    zoneTop: (reward) =>
      reward === null ? "3 teratas minggu ini" : `3 teratas dapat bonus ${reward} Yeopjeon`,
    zoneClimb: "Terus naik",
    you: "Kamu",
    morePass: (more, name) => `${more} lagi untuk menyalip ${name}`,
    first: "Kamu peringkat 1!",
    rowLabel: (rank, name, episode, score) =>
      [`#${rank}`, name, episode, score].filter((part) => part !== null).join(", "),
    loading: "Memuat peringkat",
    notices: {
      guest: {
        title: "Masuk untuk ikut",
        body: "Peringkat hanya untuk anggota. Masuk untuk bersaing.",
      },
      notJoined: {
        title: "Minggumu segera dimulai",
        body: "Selesaikan pelajaran atau pakai kata yang sudah dipelajari di obrolan untuk masuk grup.",
      },
      hidden: { title: "Kamu disembunyikan", body: "Orang lain tidak melihatmu di peringkat." },
      error: { title: "Gagal memuat peringkat", body: "Coba lagi." },
      offline: {
        title: "Kamu sedang offline",
        body: "Sambungkan internet untuk melihat peringkat.",
      },
    },
    actions: { signIn: "Masuk", showMe: "Tampilkan aku", retry: "Coba lagi" },
    chat: {
      stripCount: (words) => `${words} kata obrolan`,
      stripRank: (rank) => (rank === null ? "minggu ini" : `minggu ini · #${rank} di grupmu`),
      stripLabel: (words, rank) =>
        `${words} kata obrolan minggu ini${rank === null ? "" : `, peringkat ${rank} di grupmu`}. Buka peringkat`,
      earned: (count) => `+${count} kata obrolan`,
      pending: "dihitung saat kamu kirim ulang dengan benar",
    },
    settings: {
      hideTitle: "Sembunyikan aku dari peringkat",
      hideBody: "Orang lain tidak akan melihatmu di peringkat mingguan",
    },
  },
  ja: {
    title: "週間ランキング",
    group: (count) => `あなたのグループ · ${count}人`,
    endsIn: (days) => `残り${days}日`,
    boards: { lessons: "レッスン", "chat-words": "チャット単語" },
    selected: (label) => `${label}、選択中`,
    unit: (board) => (board === "lessons" ? "レッスン" : "語"),
    episode: (episode) => `エピソード${episode}`,
    zoneTop: (reward) =>
      reward === null ? "今週のトップ3" : `トップ3は${reward} Yeopjeonのボーナス`,
    zoneClimb: "まだまだ上を目指そう",
    you: "あなた",
    morePass: (more, name) => `あと${more}で${name}さんを抜けます`,
    first: "1位です！",
    rowLabel: (rank, name, episode, score) =>
      [`${rank}位`, name, episode, score].filter((part) => part !== null).join("、"),
    loading: "ランキングを読み込み中",
    notices: {
      guest: {
        title: "ログインして参加",
        body: "ランキングは会員向けです。ログインして競いましょう。",
      },
      notJoined: {
        title: "まもなく今週がスタート",
        body: "レッスンをクリアするか、覚えた単語をチャットで使うとグループに入れます。",
      },
      hidden: { title: "非表示中です", body: "ほかの人のランキングにあなたは表示されません。" },
      error: { title: "ランキングを読み込めませんでした", body: "もう一度お試しください。" },
      offline: {
        title: "オフラインです",
        body: "ランキングを見るにはインターネットに接続してください。",
      },
    },
    actions: { signIn: "ログイン", showMe: "表示する", retry: "再試行" },
    chat: {
      stripCount: (words) => `チャット単語${words}語`,
      stripRank: (rank) => (rank === null ? "今週" : `今週 · グループ${rank}位`),
      stripLabel: (words, rank) =>
        `今週のチャット単語${words}語${rank === null ? "" : `、グループ${rank}位`}。ランキングを開く`,
      earned: (count) => `+${count}語`,
      pending: "正しく送り直すとカウント",
    },
    settings: {
      hideTitle: "ランキングに表示しない",
      hideBody: "週間ランキングでほかの人に表示されません",
    },
  },
  vi: {
    title: "Xếp hạng tuần",
    group: (count) => `Nhóm của bạn · ${count} người học`,
    endsIn: (days) => `Kết thúc sau ${days} ngày`,
    boards: { lessons: "Bài học", "chat-words": "Từ trò chuyện" },
    selected: (label) => `${label}, đang chọn`,
    unit: (board) => (board === "lessons" ? "bài" : "từ"),
    episode: (episode) => `Tập ${episode}`,
    zoneTop: (reward) =>
      reward === null ? "Top 3 tuần này" : `Top 3 được thưởng ${reward} Yeopjeon`,
    zoneClimb: "Tiếp tục leo hạng",
    you: "Bạn",
    morePass: (more, name) => `Thêm ${more} để vượt ${name}`,
    first: "Bạn đứng hạng 1!",
    rowLabel: (rank, name, episode, score) =>
      [`Hạng ${rank}`, name, episode, score].filter((part) => part !== null).join(", "),
    loading: "Đang tải bảng xếp hạng",
    notices: {
      guest: {
        title: "Đăng nhập để tham gia",
        body: "Bảng xếp hạng dành cho thành viên. Đăng nhập để thi đua.",
      },
      notJoined: {
        title: "Tuần của bạn sắp bắt đầu",
        body: "Hoàn thành một bài học hoặc dùng từ đã học khi trò chuyện để vào nhóm.",
      },
      hidden: { title: "Bạn đang ẩn", body: "Người khác không thấy bạn trên bảng xếp hạng." },
      error: { title: "Không tải được bảng xếp hạng", body: "Vui lòng thử lại." },
      offline: { title: "Bạn đang ngoại tuyến", body: "Hãy kết nối mạng để xem bảng xếp hạng." },
    },
    actions: { signIn: "Đăng nhập", showMe: "Hiện tôi", retry: "Thử lại" },
    chat: {
      stripCount: (words) => `${words} từ trò chuyện`,
      stripRank: (rank) => (rank === null ? "tuần này" : `tuần này · hạng ${rank} trong nhóm`),
      stripLabel: (words, rank) =>
        `${words} từ trò chuyện tuần này${rank === null ? "" : `, hạng ${rank} trong nhóm`}. Mở bảng xếp hạng`,
      earned: (count) => `+${count} từ trò chuyện`,
      pending: "được tính khi bạn gửi lại đúng",
    },
    settings: {
      hideTitle: "Ẩn tôi khỏi bảng xếp hạng",
      hideBody: "Người khác sẽ không thấy bạn trên bảng xếp hạng tuần",
    },
  },
};
