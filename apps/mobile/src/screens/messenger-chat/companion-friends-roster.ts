// 추천 친구 넷의 앱 쪽 표입니다(ADR-0164 D1). 정본은 `docs/content/companion-friends.json` — 이름 · 나이 · 직업 · MBTI · 한 줄 소개 ·
// 첫 말이 그 파일과 같아야 합니다(단위 테스트 FA1이 맞춥니다). 순수 데이터. 이름 · 첫 말은 학습 내용이라 한글 그대로 둡니다.
// 얼굴 그림은 이야기 인물처럼 콘텐츠 버킷의 `content/images/profiles/<id>-casual.webp`입니다 — 올라가기 전에는 빈 얼굴(아바타 자리표시)입니다.

import type { FriendProfile, LocalizedLine } from "./friend-catalog.contract";

/** `companion-roster.ts`의 `CompanionCharacter`와 같은 모양입니다(그 파일이 이 표를 가져가 순환을 피해 여기 둡니다). */
export type FriendRosterEntry = FriendProfile & { readonly firstLine: string | null };

/** 나이 태그 — 인물 데이터의 한 칸이라 언어별 줄로 둡니다. */
const ageTag = (age: number): LocalizedLine => ({
  en: `${age} years old`,
  es: `${age} años`,
  id: `${age} tahun`,
  ja: `${age}歳`,
  vi: `${age} tuổi`,
});

type FriendSource = {
  readonly id: string;
  readonly name: string;
  readonly gender: "female" | "male";
  readonly age: number;
  readonly mbti: string;
  readonly romanceTier: "open" | "standard";
  readonly job: LocalizedLine;
  readonly bio: LocalizedLine;
  readonly first: { readonly ko: readonly string[]; readonly en: readonly string[] };
};

const entryOf = (source: FriendSource): FriendRosterEntry => ({
  id: source.id,
  name: source.name,
  avatarPath: `content/images/profiles/${source.id}-casual.webp`,
  kind: "general",
  unlockEpisodeId: null,
  unlockEpisode: null,
  intro: source.bio,
  tags: [source.job, ageTag(source.age), { en: source.mbti }],
  category: null,
  sheetOpening: { ko: source.first.ko.join(" "), en: source.first.en.join(" ") },
  earlyAccess: null,
  romanceTier: source.romanceTier,
  gender: source.gender,
  firstLine: source.first.ko[0] ?? null,
});

/** 추천 친구 넷 — 서버 순서와 같게 둡니다(보이는 순서는 서버 `companion_friends()`가 정합니다). */
export const COMPANION_FRIENDS: readonly FriendRosterEntry[] = [
  entryOf({
    id: "seoyeon",
    name: "차서연",
    gender: "female",
    age: 28,
    mbti: "ENTP",
    romanceTier: "open",
    job: {
      en: "Tattoo artist & illustrator",
      es: "Tatuadora e ilustradora",
      id: "Seniman tato & ilustrator",
      ja: "タトゥーアーティスト・イラストレーター",
      vi: "Thợ xăm & họa sĩ minh họa",
    },
    bio: {
      en: "I do tattoos in Seongsu. Art talk, any talk — all good.",
      es: "Hago tatuajes en Seongsu. Hablar de arte o de lo que sea, todo bien.",
      id: "Aku bikin tato di Seongsu. Ngobrol soal seni, soal apa saja — boleh.",
      ja: "聖水洞でタトゥーをやってます。絵の話でも何の話でも大歓迎。",
      vi: "Mình làm hình xăm ở Seongsu. Chuyện nghệ thuật hay chuyện gì cũng được.",
    },
    first: {
      ko: ["안녕하세요, 차서연이에요.", "한국엔 왜 왔어요? 궁금해요."],
      en: ["Hi, I'm Cha Seoyeon.", "What brought you to Korea? I'm curious."],
    },
  }),
  entryOf({
    id: "haejun",
    name: "권해준",
    gender: "male",
    age: 31,
    mbti: "ESFJ",
    romanceTier: "open",
    job: {
      en: "LP bar owner",
      es: "Dueño de un bar de vinilos",
      id: "Pemilik bar piringan hitam",
      ja: "レコードバーのオーナー",
      vi: "Chủ quán bar đĩa than",
    },
    bio: {
      en: "I run a small LP bar in Mangwon. I'll share good songs with you.",
      es: "Tengo un pequeño bar de vinilos en Mangwon. Te pasaré buenas canciones.",
      id: "Aku punya bar piringan hitam kecil di Mangwon. Nanti kubagi lagu-lagu bagus.",
      ja: "望遠洞で小さなレコードバーをやってます。いい曲を教えますね。",
      vi: "Mình có một quán bar đĩa than nhỏ ở Mangwon. Mình sẽ giới thiệu nhạc hay cho bạn.",
    },
    first: {
      ko: ["안녕하세요, 권해준이에요.", "한국 노래 좋아해요? 좋아하는 가수 있어요?"],
      en: ["Hi, I'm Kwon Haejun.", "Do you like Korean music? Any favourite singer?"],
    },
  }),
  entryOf({
    id: "daeun",
    name: "송다은",
    gender: "female",
    age: 23,
    mbti: "INFP",
    romanceTier: "standard",
    job: {
      en: "University student (Computer Science, 3rd year)",
      es: "Universitaria (Informática, 3.er año)",
      id: "Mahasiswi (Ilmu Komputer, tahun ke-3)",
      ja: "大学生（コンピューター工学科3年）",
      vi: "Sinh viên (Khoa học máy tính, năm 3)",
    },
    bio: {
      en: "CS junior. I love games and idols. I want to make a foreign friend!",
      es: "Estudio Informática, 3.er año. Me encantan los juegos y los ídolos. ¡Quiero hacer un amigo extranjero!",
      id: "Mahasiswi IT tahun ke-3. Suka game dan idol. Pengin punya teman dari luar negeri!",
      ja: "コンピューター工学科の3年生。ゲームとアイドルが大好き。外国人の友だちがほしいです！",
      vi: "Sinh viên CNTT năm 3. Mình mê game và thần tượng. Mình muốn có bạn nước ngoài!",
    },
    first: {
      ko: ["안녕하세요! 송다은이에요.", "어느 나라에서 왔어요? 저 외국인 친구 처음이에요!"],
      en: ["Hello! I'm Song Daeun.", "Where are you from? You're my first foreign friend!"],
    },
  }),
  entryOf({
    id: "geonwoo",
    name: "임건우",
    gender: "male",
    age: 24,
    mbti: "ESTP",
    romanceTier: "standard",
    job: {
      en: "University student (Business, 2nd year, back from military service)",
      es: "Universitario (Empresariales, 2.º año, de vuelta del servicio militar)",
      id: "Mahasiswa (Bisnis, tahun ke-2, baru selesai wajib militer)",
      ja: "大学生（経営学科2年・兵役明けの復学生）",
      vi: "Sinh viên (Kinh doanh, năm 2, vừa xong nghĩa vụ quân sự)",
    },
    bio: {
      en: "Back at uni after the army. I like running and good food. Let's practise Korean together!",
      es: "De vuelta en la uni después del ejército. Me gusta correr y comer bien. ¡Practiquemos coreano juntos!",
      id: "Balik kuliah setelah wajib militer. Suka lari dan makanan enak. Yuk latihan bahasa Korea bareng!",
      ja: "兵役を終えて復学しました。ランニングとおいしいものが好き。一緒に韓国語を練習しよう！",
      vi: "Mình vừa đi học lại sau nghĩa vụ quân sự. Mình thích chạy bộ và đồ ăn ngon. Cùng luyện tiếng Hàn nhé!",
    },
    first: {
      ko: ["안녕하세요! 임건우예요.", "한국 음식 뭐 좋아해요? 맛집 알려 줄게요."],
      en: [
        "Hello! I'm Lim Geonwoo.",
        "What Korean food do you like? I'll tell you the good places.",
      ],
    },
  }),
];
