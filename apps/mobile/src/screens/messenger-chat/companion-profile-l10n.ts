// 인물 프로필의 직업 · 한 줄 소개 번역입니다(추천 친구 프로필 시트) — 한국어 · 영어 원문은 인물 표(`companion-roster.ts`)에 있고, 여기는
// 나머지 화면 언어(es · id · ja · vi)만 둡니다. 태국어 · 미얀마어 화면은 영어 표를 쓰므로(ADR-0158) 영어 원문을 씁니다. 순수.

import type { ProfileLanguage } from "./chat-friends.contract";
import { companionCharacterOf } from "./companion-roster";

export type { ProfileLanguage };

type Translated = Readonly<Record<Exclude<ProfileLanguage, "en">, string>>;
type ProfileTranslations = { readonly job: Translated; readonly bio: Translated };

const PROFILE_TRANSLATIONS: Readonly<Record<string, ProfileTranslations>> = {
  duksu: {
    job: {
      es: "Profesor de coreano",
      id: "Guru bahasa Korea",
      ja: "韓国語の先生",
      vi: "Giáo viên tiếng Hàn",
    },
    bio: {
      es: "Enseño coreano al aire libre. ¡Me encantan los juegos de palabras!",
      id: "Aku mengajar bahasa Korea di luar ruangan. Aku suka kuis kata!",
      ja: "外で韓国語を教えています。言葉クイズが大好き！",
      vi: "Mình dạy tiếng Hàn ngoài trời. Mình mê đố chữ lắm!",
    },
  },
  yoonkyung: {
    job: {
      es: "Dueña de Ikseon Guesthouse",
      id: "Pemilik Ikseon Guesthouse",
      ja: "益善ゲストハウスのオーナー",
      vi: "Chủ nhà nghỉ Ikseon",
    },
    bio: {
      es: "Llevo una casa de huéspedes en Ikseon-dong. ¿Ya comiste?",
      id: "Saya mengelola guesthouse di Ikseon-dong. Sudah makan?",
      ja: "益善洞でゲストハウスをしています。ご飯は食べましたか？",
      vi: "Tôi mở nhà nghỉ ở Ikseon-dong. Ăn cơm chưa?",
    },
  },
  mina: {
    job: {
      es: "Mochilera de Suiza",
      id: "Backpacker dari Swiss",
      ja: "スイスから来たバックパッカー",
      vi: "Dân phượt đến từ Thụy Sĩ",
    },
    bio: {
      es: "Vine de Suiza a aprender coreano. ¡Exploremos juntas!",
      id: "Aku datang dari Swiss untuk belajar bahasa Korea. Ayo jalan bareng!",
      ja: "スイスから韓国語を学びに来ました。一緒に回ろう！",
      vi: "Mình từ Thụy Sĩ sang học tiếng Hàn. Cùng đi khám phá nhé!",
    },
  },
  doyun: {
    job: {
      es: "Trabaja en un café y es aprendiz de idol",
      id: "Pekerja paruh waktu kafe & trainee idol",
      ja: "カフェのアルバイト・アイドル練習生",
      vi: "Làm thêm ở quán cà phê & thực tập sinh idol",
    },
    bio: {
      es: "Trabajo en Cafe Kkeullim. ¡Tengo curiosidad por todo!",
      id: "Aku kerja di Cafe Kkeullim. Aku penasaran sama banyak hal!",
      ja: "カフェ・クルリムで働いています。気になることがいっぱい！",
      vi: "Mình làm ở Cafe Kkeullim. Mình tò mò đủ thứ!",
    },
  },
  jaemin: {
    job: {
      es: "Ventas B2B en una empresa tecnológica",
      id: "Sales B2B di perusahaan teknologi",
      ja: "IT企業のB2B営業",
      vi: "Nhân viên kinh doanh B2B ở công ty công nghệ",
    },
    bio: {
      es: "Trabajo en una empresa tecnológica. Me gusta la mesa junto a la ventana del café.",
      id: "Saya kerja di perusahaan teknologi. Saya suka kursi dekat jendela di kafe.",
      ja: "IT企業に勤めています。カフェの窓際の席が好きです。",
      vi: "Tôi làm ở công ty công nghệ. Tôi thích chỗ cạnh cửa sổ ở quán cà phê.",
    },
  },
  seoyeon: {
    job: {
      es: "Tatuadora e ilustradora",
      id: "Seniman tato & ilustrator",
      ja: "タトゥーアーティスト・イラストレーター",
      vi: "Thợ xăm & họa sĩ minh họa",
    },
    bio: {
      es: "Hago tatuajes en Seongsu. Hablar de arte o de lo que sea: me encanta.",
      id: "Aku bikin tato di Seongsu. Ngobrol soal seni atau apa saja, oke banget.",
      ja: "聖水洞でタトゥーをしています。絵の話でも何の話でも大歓迎。",
      vi: "Mình xăm hình ở Seongsu. Nói chuyện vẽ vời hay chuyện gì cũng được.",
    },
  },
  haejun: {
    job: {
      es: "Dueño de un bar de vinilos",
      id: "Pemilik bar piringan hitam",
      ja: "LPバーのオーナー",
      vi: "Chủ quán bar đĩa than",
    },
    bio: {
      es: "Tengo un pequeño bar de vinilos en Mangwon. Te pasaré buenas canciones.",
      id: "Aku punya bar piringan hitam kecil di Mangwon. Nanti kukasih lagu-lagu bagus.",
      ja: "望遠洞で小さなLPバーをやっています。いい曲を教えますね。",
      vi: "Mình có quán bar đĩa than nhỏ ở Mangwon. Mình sẽ giới thiệu nhạc hay cho bạn.",
    },
  },
  daeun: {
    job: {
      es: "Universitaria (Informática, 3.er año)",
      id: "Mahasiswi (Ilmu Komputer, tahun ke-3)",
      ja: "大学生（コンピューター工学科3年）",
      vi: "Sinh viên (Khoa học máy tính, năm 3)",
    },
    bio: {
      es: "Estudio Informática, 3.er año. Me encantan los juegos y los idols. ¡Quiero hacer amigos extranjeros!",
      id: "Mahasiswi Ilmu Komputer tahun ke-3. Suka game dan idol. Pengin punya teman dari luar negeri!",
      ja: "コンピューター工学科の3年生。ゲームとアイドルが好き。外国人の友達がほしい！",
      vi: "Sinh viên IT năm 3. Mình mê game và idol. Mình muốn có bạn nước ngoài!",
    },
  },
  geonwoo: {
    job: {
      es: "Universitario (Empresariales, 2.º año, tras el servicio militar)",
      id: "Mahasiswa (Bisnis, tahun ke-2, baru selesai wajib militer)",
      ja: "大学生（経営学科2年・復学生）",
      vi: "Sinh viên (Quản trị kinh doanh, năm 2, vừa xong nghĩa vụ quân sự)",
    },
    bio: {
      es: "Volví a la uni después del servicio militar. Me gusta correr y la buena comida. ¡Practiquemos coreano!",
      id: "Baru balik kuliah setelah wajib militer. Suka lari dan makanan enak. Ayo latihan bahasa Korea bareng!",
      ja: "兵役を終えて復学しました。ランニングとおいしい店が好き。一緒に韓国語を練習しよう！",
      vi: "Mình vừa đi học lại sau nghĩa vụ quân sự. Mình thích chạy bộ và quán ngon. Cùng luyện tiếng Hàn nhé!",
    },
  },
};

/** 화면 언어의 직업 · 소개 — 번역이 없으면 영어 원문입니다. 인물이 없으면 null. */
export function profileTextFor(
  characterId: string,
  language: ProfileLanguage,
): { readonly job: string; readonly bio: string } | null {
  const character = companionCharacterOf(characterId);
  if (character === null) return null;
  const { job, bio } = character.profile;
  const translated = language === "en" ? undefined : PROFILE_TRANSLATIONS[characterId];
  if (translated === undefined || language === "en") return { job: job.en, bio: bio.en };
  return { job: translated.job[language], bio: translated.bio[language] };
}

/** 번역 표가 가진 인물 id — 테스트가 인물 표와 맞춥니다. */
export const PROFILE_TRANSLATION_IDS: readonly string[] = Object.keys(PROFILE_TRANSLATIONS);
