// 일반 인물(추천 친구) 넷의 앱 쪽 표입니다(ADR-0162 D4 · ADR-0163 D1). 순수.
// 정본은 `docs/content/companion-friends.json` — 이름 · 나이 · 직업 · MBTI · 첫 말은 그 파일과 같아야 합니다(단위 테스트 CF-U1).
// 소개는 그 파일의 `bio.en`에 es · id · ja · vi 번역을 더했고, 태그는 직업 · 취향 낱말입니다(인물 데이터 — ui-copy가 아님, ADR-0162 D4).
// 그림 · 견본 파일은 사람이 나중에 올립니다 — 그림이 없으면 아바타 자리값, 견본이 없으면 단추의 「들을 수 없음」으로 접습니다.

import type { CompanionCharacter } from "./companion-roster";
import type { LocalizedLine } from "./friend-catalog.contract";

const avatarOf = (id: string) => `content/images/profiles/${id}-casual.webp`;
const voiceOf = (id: string) => `content/audio/companion/${id}-intro.mp3`;

type FriendRow = {
  readonly id: string;
  readonly name: string;
  readonly age: number;
  readonly job: LocalizedLine;
  readonly mbti: string;
  readonly intro: LocalizedLine;
  readonly tags: readonly LocalizedLine[];
  readonly first: { readonly ko: string; readonly en: string };
};

// 일반 인물 — 해금 규칙 없음, 카테고리 없음(친구 찾기 칩은 All · From your story만), 먼저 만나기 제안 없음.
const generalOf = (row: FriendRow): CompanionCharacter => ({
  id: row.id,
  name: row.name,
  avatarPath: avatarOf(row.id),
  kind: "general",
  unlockEpisodeId: null,
  unlockEpisode: null,
  intro: row.intro,
  tags: row.tags,
  category: null,
  sheetOpening: row.first,
  earlyAccess: null,
  profile: { age: row.age, job: row.job, mbti: row.mbti, voiceSamplePath: voiceOf(row.id) },
  firstLine: row.first.ko,
});

export const GENERAL_FRIENDS: readonly CompanionCharacter[] = [
  generalOf({
    id: "seoyeon",
    name: "차서연",
    age: 28,
    job: {
      en: "Tattoo artist & illustrator",
      es: "Tatuadora e ilustradora",
      id: "Seniman tato & ilustrator",
      ja: "タトゥーアーティスト・イラストレーター",
      vi: "Thợ xăm & họa sĩ minh họa",
    },
    mbti: "ENTP",
    intro: {
      en: "I do tattoos in Seongsu. Art talk, any talk — all good.",
      es: "Hago tatuajes en Seongsu. ¿Hablar de arte o de lo que sea? Me encanta.",
      id: "Aku bikin tato di Seongsu. Ngobrol soal seni atau apa saja, oke banget.",
      ja: "聖水洞でタトゥーをしています。絵の話でも何の話でも大歓迎。",
      vi: "Mình xăm hình ở Seongsu. Chuyện vẽ vời hay chuyện gì cũng được.",
    },
    tags: [
      { en: "Tattoos", es: "Tatuajes", id: "Tato", ja: "タトゥー", vi: "Xăm hình" },
      { en: "Art", es: "Arte", id: "Seni", ja: "アート", vi: "Nghệ thuật" },
      { en: "Cats", es: "Gatos", id: "Kucing", ja: "猫", vi: "Mèo" },
    ],
    first: { ko: "안녕하세요, 차서연이에요.", en: "Hi, I'm Cha Seoyeon." },
  }),
  generalOf({
    id: "haejun",
    name: "권해준",
    age: 31,
    job: {
      en: "LP bar owner",
      es: "Dueño de un bar de vinilos",
      id: "Pemilik bar piringan hitam",
      ja: "LPバーのオーナー",
      vi: "Chủ quán bar đĩa than",
    },
    mbti: "ESFJ",
    intro: {
      en: "I run a small LP bar in Mangwon. I'll share good songs with you.",
      es: "Tengo un pequeño bar de vinilos en Mangwon. Te pasaré buenas canciones.",
      id: "Aku punya bar piringan hitam kecil di Mangwon. Nanti kukasih lagu-lagu bagus.",
      ja: "望遠洞で小さなLPバーをやっています。いい曲を教えますね。",
      vi: "Mình có quán bar đĩa than nhỏ ở Mangwon. Mình sẽ giới thiệu nhạc hay cho bạn.",
    },
    tags: [
      { en: "Vinyl", es: "Vinilos", id: "Piringan hitam", ja: "レコード", vi: "Đĩa than" },
      { en: "Music", es: "Música", id: "Musik", ja: "音楽", vi: "Âm nhạc" },
      { en: "Busan", es: "Busan", id: "Busan", ja: "釜山", vi: "Busan" },
    ],
    first: { ko: "안녕하세요, 권해준이에요.", en: "Hi, I'm Kwon Haejun." },
  }),
  generalOf({
    id: "daeun",
    name: "송다은",
    age: 23,
    job: {
      en: "University student (Computer Science, 3rd year)",
      es: "Universitaria (Informática, 3.er año)",
      id: "Mahasiswi (Ilmu Komputer, tahun ke-3)",
      ja: "大学生（コンピューター工学科3年）",
      vi: "Sinh viên (Khoa học máy tính, năm 3)",
    },
    mbti: "INFP",
    intro: {
      en: "CS junior. I love games and idols. I want to make a foreign friend!",
      es: "Estudio Informática. Me encantan los videojuegos y los idols. ¡Quiero un amigo extranjero!",
      id: "Mahasiswi Ilmu Komputer. Suka game dan idol. Pengin punya teman dari luar negeri!",
      ja: "コンピューター工学科の3年生。ゲームとアイドルが好き。外国人の友達がほしい！",
      vi: "Sinh viên IT năm 3. Mình mê game và idol. Mình muốn có bạn nước ngoài!",
    },
    tags: [
      { en: "Games", es: "Videojuegos", id: "Game", ja: "ゲーム", vi: "Game" },
      { en: "K-pop", es: "K-pop", id: "K-pop", ja: "K-POP", vi: "K-pop" },
      { en: "Coding", es: "Programación", id: "Coding", ja: "プログラミング", vi: "Lập trình" },
    ],
    first: { ko: "안녕하세요! 송다은이에요.", en: "Hello! I'm Song Daeun." },
  }),
  generalOf({
    id: "geonwoo",
    name: "임건우",
    age: 24,
    job: {
      en: "University student (Business, 2nd year, back from military service)",
      es: "Universitario (Empresariales, 2.º año, tras el servicio militar)",
      id: "Mahasiswa (Bisnis, tahun ke-2, selesai wajib militer)",
      ja: "大学生（経営学科2年・復学生）",
      vi: "Sinh viên (Quản trị kinh doanh, năm 2, vừa xong nghĩa vụ quân sự)",
    },
    mbti: "ESTP",
    intro: {
      en: "Back at uni after the army. I like running and good food. Let's practise Korean together!",
      es: "Volví a la uni después del servicio militar. Me gusta correr y comer bien. ¡Practiquemos coreano!",
      id: "Baru balik kuliah setelah wajib militer. Suka lari dan makanan enak. Ayo latihan bahasa Korea bareng!",
      ja: "兵役を終えて復学しました。ランニングとおいしい店が好き。一緒に韓国語を練習しよう！",
      vi: "Mình vừa đi học lại sau nghĩa vụ quân sự. Mình thích chạy bộ và quán ngon. Cùng luyện tiếng Hàn nhé!",
    },
    tags: [
      { en: "Running", es: "Correr", id: "Lari", ja: "ランニング", vi: "Chạy bộ" },
      { en: "Good food", es: "Buena comida", id: "Kuliner", ja: "グルメ", vi: "Quán ngon" },
      {
        en: "Campus life",
        es: "Vida universitaria",
        id: "Kehidupan kampus",
        ja: "キャンパスライフ",
        vi: "Đời sinh viên",
      },
    ],
    first: { ko: "안녕하세요! 임건우예요.", en: "Hello! I'm Lim Geonwoo." },
  }),
];
