import type { Copy } from "./i18n/copy";
import { en } from "./i18n/copy";
import { es } from "./i18n/es";
import { id } from "./i18n/id";
import { ja } from "./i18n/ja";
import { ko } from "./i18n/ko";
import { ms } from "./i18n/ms";
import { vi } from "./i18n/vi";
import type { LanguageRoute } from "./seo/seo.contract";

/** 배포 주소의 기본값입니다. 배포 설정의 SITE_URL이 있으면 그것이 이깁니다. 최종 주소는 Astro.site입니다. */
export const fallbackSiteUrl = "";

/** JSON-LD · llms.txt · og:site_name이 함께 읽는 서비스 이름입니다. */
export const siteName = "Duru";

/** 스토어 주소입니다. 비어 있으면 그 카드는 링크가 아니라 "Coming soon"으로 섭니다. */
export const storeLinks = {
  ios: "",
  android: "https://play.google.com/store/apps/details?id=libitum.duru.android",
};

/**
 * 같은 것을 부르는 다른 이름입니다 — JSON-LD 세 노드의 `alternateName`. 검색엔진이 「duru」 한 단어 질의를 이 사이트와
 * 스토어 목록으로 묶는 근거가 됩니다. Play 제목(대문자 표기) · 앱의 한글 이름(Android 알림 채널 「두루 소식」) 순입니다.
 */
export const siteAlternateNames: readonly string[] = [
  "DURU",
  "DURU: Learn Korean in Stories",
  "두루",
];

/** JSON-LD `Organization.logo`입니다. Google이 112px 이상 정사각에 가까운 그림을 받으므로 글자 로고(159×60)가 아니라 앱 아이콘 180px입니다. */
export const siteLogoPath = "/apple-touch-icon.png";

/** 스토어 밖에서 이 브랜드를 가리키는 공식 프로필입니다(사용자 확인 2026-11-06). `https://` 절대 주소만. 새 프로필이 생기면 여기 더합니다. */
export const brandProfiles: readonly string[] = [
  "https://www.instagram.com/duru.korean/",
  "https://www.threads.com/@mina.duru.korean",
];

/** JSON-LD `sameAs` — 비어 있지 않은 스토어 주소와 프로필을 순서대로 모은 것입니다. */
export const brandLinks = (): readonly string[] =>
  [storeLinks.ios, storeLinks.android, ...brandProfiles].filter((link) => link !== "");

/**
 * 지원 언어입니다. 첫째가 기본 언어(`/`)이고 나머지는 `/<코드>/`에 섭니다.
 * 언어를 더하는 절차는 README 「언어 더하기」에 있습니다.
 */
export const languages = ["en", "ko", "vi", "id", "ms", "es", "ja"] as const;
export type Language = (typeof languages)[number];
export const defaultLanguage: Language = languages[0];

/** 그 언어 페이지의 사이트 루트 기준 주소입니다. */
export const pathFor = (language: Language) =>
  language === defaultLanguage ? "/" : `/${language}/`;

/** 그 언어의 웹 체험판 주소입니다(`/try/` · `/ko/try/`). */
export const trialPathFor = (language: Language) => `${pathFor(language)}try/`;

interface LanguagePage {
  /** 언어 메뉴에 적히는, 그 언어로 쓴 자기 이름입니다. */
  label: string;
  /** 영어로 쓴 언어 이름입니다. 영어로만 쓰는 `llms.txt`가 이 언어의 페이지를 가리킬 때 씁니다. */
  englishName: string;
  locale: string;
  /** public/의 공유 카드 그림(1200×630)입니다. */
  image: string;
  /** 공유 카드 그림의 대체 문구입니다. */
  imageAlt: string;
  /** 검색 결과 · 공유 카드에 실리는 제목과 설명입니다. */
  title: string;
  description: string;
  copy: Copy;
}

export const pages: Record<Language, LanguagePage> = {
  en: {
    label: "English",
    englishName: "English",
    locale: "en_US",
    image: "/og-en.jpg",
    imageAlt:
      "Duru — “Korean, lived as a story” over three scenes: an airplane window above the sea, a barista behind a café counter, and a market alley under an arched roof.",
    title: "Duru — Learn Korean by living a story",
    description:
      "Duru is a story-based Korean learning app. Step into a day in Korea, chat and talk with the people you meet, and keep the words you used.",
    copy: en,
  },
  ko: {
    label: "한국어",
    englishName: "Korean",
    locale: "ko_KR",
    image: "/og-ko.jpg",
    imageAlt:
      "Duru — 「이야기로 살아보는 한국어」. 바다 위 비행기 창밖, 카페 카운터 뒤의 바리스타, 아치형 지붕 아래 시장 골목의 세 장면.",
    title: "Duru — 이야기로 배우는 한국어",
    description:
      "Duru는 이야기 속에서 한국어를 배우는 앱이에요. 한국에서의 하루로 들어가 만나는 사람들과 메시지와 전화로 대화하고, 직접 쓴 말을 내 것으로 만들어 보세요.",
    copy: ko,
  },
  // 베트남어 · 인도네시아어 · 말레이어(2026-11-04, ADR-0094). 문구는 초안입니다 — 원어민 검수 필요.
  vi: {
    label: "Tiếng Việt",
    englishName: "Vietnamese",
    locale: "vi_VN",
    image: "/og-vi.jpg",
    imageAlt:
      "Duru — “Tiếng Hàn, sống như một câu chuyện” trên ba cảnh: cửa sổ máy bay trên biển, một nhân viên pha chế sau quầy cà phê và một con hẻm chợ dưới mái vòm.",
    title: "Duru — Học tiếng Hàn bằng cách sống trong một câu chuyện",
    description:
      "Duru là ứng dụng học tiếng Hàn qua câu chuyện. Bước vào một ngày ở Hàn Quốc, nhắn tin và gọi điện với những người bạn gặp, và giữ lại những lời bạn đã dùng.",
    copy: vi,
  },
  id: {
    label: "Bahasa Indonesia",
    englishName: "Indonesian",
    locale: "id_ID",
    image: "/og-id.jpg",
    imageAlt:
      "Duru — “Bahasa Korea, dijalani sebagai cerita” di atas tiga adegan: jendela pesawat di atas laut, barista di balik konter kafe, dan lorong pasar di bawah atap melengkung.",
    title: "Duru — Belajar bahasa Korea dengan menjalani cerita",
    description:
      "Duru adalah aplikasi belajar bahasa Korea berbasis cerita. Masuk ke satu hari di Korea, mengobrol dan menelepon orang-orang yang kamu temui, dan simpan kata-kata yang kamu pakai.",
    copy: id,
  },
  ms: {
    label: "Bahasa Melayu",
    englishName: "Malay",
    locale: "ms_MY",
    image: "/og-ms.jpg",
    imageAlt:
      "Duru — “Bahasa Korea, dihayati sebagai cerita” di atas tiga babak: tingkap pesawat di atas laut, barista di belakang kaunter kafe dan lorong pasar di bawah bumbung melengkung.",
    title: "Duru — Belajar bahasa Korea dengan menghayati cerita",
    description:
      "Duru ialah aplikasi belajar bahasa Korea berasaskan cerita. Masuk ke satu hari di Korea, berbual dan menelefon orang yang anda temui, dan simpan kata-kata yang anda gunakan.",
    copy: ms,
  },
  // 스페인어 · 일본어(2026-11-04, ADR-0097). 문구는 초안입니다 — 원어민 검수 필요.
  es: {
    label: "Español",
    englishName: "Spanish",
    locale: "es_ES",
    image: "/og-es.jpg",
    imageAlt:
      "Duru — “Coreano, vivido como una historia” sobre tres escenas: la ventanilla de un avión sobre el mar, un barista tras la barra de una cafetería y un pasillo de mercado bajo un techo abovedado.",
    title: "Duru — Aprende coreano viviendo una historia",
    description:
      "Duru es una app para aprender coreano a través de una historia. Entra en un día en Corea, chatea y llama a la gente que conoces, y quédate con las palabras que usaste.",
    copy: es,
  },
  ja: {
    label: "日本語",
    englishName: "Japanese",
    locale: "ja_JP",
    image: "/og-ja.jpg",
    imageAlt:
      "Duru — 「物語として生きる韓国語」と、海の上の飛行機の窓、カフェのカウンターに立つバリスタ、アーチ型の屋根の下の市場の通路という3つの場面。",
    title: "Duru — 物語を生きて学ぶ韓国語",
    description:
      "Duruは物語の中で韓国語を学ぶアプリです。韓国での一日に入り込み、出会った人とメッセージや電話で話し、自分で使ったことばを身につけましょう。",
    copy: ja,
  },
};

/** `languages` 순서 그대로입니다. */
export const languageRoutes: readonly LanguageRoute[] = languages.map((language) => ({
  language,
  path: pathFor(language),
  locale: pages[language].locale,
}));

/** Airbridge 대시보드의 App Name입니다(앱 호스트의 `duru.airbridge.io`와 같은 이름 — ADR-0080). */
export const airbridgeAppName = "duru";
/** utm이 없는 유입에 Airbridge가 붙이는 기본 채널입니다. */
export const airbridgeDefaultChannel = "k-duru.com";
