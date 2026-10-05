import type { Copy } from "./i18n/copy";
import { en } from "./i18n/copy";
import { ko } from "./i18n/ko";
import type { LanguageRoute } from "./seo/seo.contract";

/** 배포 주소의 기본값입니다. 배포 설정의 SITE_URL이 있으면 그것이 이깁니다. 최종 주소는 Astro.site입니다. */
export const fallbackSiteUrl = "";

/** JSON-LD · llms.txt · og:site_name이 함께 읽는 서비스 이름입니다. */
export const siteName = "Duru";

/** 스토어 주소입니다. 비어 있으면 그 카드는 링크가 아니라 "Coming soon"으로 섭니다. */
export const storeLinks = {
  ios: "",
  android: "",
};

/**
 * 지원 언어입니다. 첫째가 기본 언어(`/`)이고 나머지는 `/<코드>/`에 섭니다.
 * 언어를 더하는 절차는 README 「언어 더하기」에 있습니다.
 */
export const languages = ["en", "ko"] as const;
export type Language = (typeof languages)[number];
export const defaultLanguage: Language = languages[0];

/** 그 언어 페이지의 사이트 루트 기준 주소입니다. */
export const pathFor = (language: Language) =>
  language === defaultLanguage ? "/" : `/${language}/`;

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
      "Duru — “Korean, lived as a story” over three scenes: a plane window above the sea, a sunlit street with a café, and an airport arrival hall at sunset.",
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
      "Duru — 「이야기로 살아보는 한국어」. 바다 위 비행기 창밖, 카페가 있는 햇살 비치는 골목, 해 질 무렵 공항 도착 로비의 세 장면.",
    title: "Duru — 이야기로 배우는 한국어",
    description:
      "Duru는 이야기 속에서 한국어를 배우는 앱이에요. 한국에서의 하루로 들어가 만나는 사람들과 메시지와 전화로 대화하고, 직접 쓴 말을 내 것으로 만들어 보세요.",
    copy: ko,
  },
};

/** `languages` 순서 그대로입니다. */
export const languageRoutes: readonly LanguageRoute[] = languages.map((language) => ({
  language,
  path: pathFor(language),
  locale: pages[language].locale,
}));
