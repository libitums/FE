// Story 줄에 서는 에피소드 카드입니다. **에피소드가 하나 나올 때마다 사람이 맨 앞에 하나 더합니다** — 줄은 이 배열 순서 그대로
// 새 것이 먼저고, 첫 카드에 `New` 표가 붙습니다. 다음 에피소드의 내용 · 시기는 여기에도 적지 않습니다(스펙 「이야기를 공항으로 못 박지 않는다」).
//
// 카드는 홍보용이라 **그림만** 보입니다. 제목 · 때 · 티저는 카드 위에 올려 두거나(호버 · 포커스) 눌러야 보이는 숨김 층입니다.
// 그래서 그림은 **인물이 나오지 않는 컷**으로 고릅니다 — 얼굴을 먼저 보여 주면 만남의 기대가 꺾입니다. 손 · 뒷모습 정도는 됩니다.
//
// 더하는 절차(README 「Story 카드 더하기」):
//   1. 인물 없는 버킷 그림 하나를 고르고 `node scripts/fetch-content-image.mjs images/<unit>/<file>.webp`로 사본을 받는다(바이트 그대로, 재인코딩 없음).
//   2. 아래 배열 맨 앞에 항목을 더한다. 제목은 앱 JSON의 `title_en` · `title` 그대로, 티저(`teaser`)는 **한 문장**, 등장인물 이름과
//      결말 · 대사의 답을 말하지 않는다. `alt`는 그림에 **보이는 것**만 적는다.
//   3. `pnpm --filter @libitums/landing test:ui`(카드 수 · New 표 · 숨김 층)와 `test:integration`(빌드)을 돌린다.
//
// 주의 — 체험판(`src/assets/trial/images/u00-tutorial/`)에 u00 컷의 **같은 바이트** 사본이 있다(이름은 다를 수 있다 — 체험판 `pre-4` =
// 버킷 `pre-5-v2`). Vite는 내용이 같은 파일을 빌드 결과에서 하나로 합치고, 그 하나를 여기서 `<Image>`로 변환하면 Astro가 원본을
// 지워 체험판이 404를 낸다(2026-10-29 e2e TE1). 그래서 체험판에 없는 컷만 쓴다 — `episodes.unit.test.ts`가 바이트를 대조해 막는다.

import type { ImageMetadata } from "astro";

import type { Language } from "../site";
import u00 from "../assets/content/images/u00-tutorial/pre-3-v2.webp";
import u01 from "../assets/content/images/u01-water/post-1.webp";
import u02 from "../assets/content/images/u02-checkin/post-3.webp";
import u03 from "../assets/content/images/u03-mina/post-2.webp";
import u04 from "../assets/content/images/u04-directions/pre-1.webp";
import u05 from "../assets/content/images/u05-baekban/post-2.webp";
import u06 from "../assets/content/images/u06-cafe/pre-2-v2.webp";
import u07 from "../assets/content/images/u07-jaemin/post-3.webp";
import u08 from "../assets/content/images/u08-umbrella/post-2.webp";
import u09 from "../assets/content/images/u09-subway/pre-1.webp";
import u10 from "../assets/content/images/u10-laundry/pre-2.webp";

type Localized = Readonly<Record<Language, string>>;

export interface StoryEpisode {
  /** 앱 콘텐츠의 unit id(`u08-umbrella`). 카드의 `data-episode`가 된다. */
  readonly id: string;
  /** 에피소드 번호. 카드에 두 자리(`08`)로 적는다. 튜토리얼이 0이다. */
  readonly number: number;
  /** 이야기 속 때(`Day 2 · Evening`). 앱 JSON의 `day` · `time_of_day`를 사람이 옮긴다. 숨김 층에 들어간다. */
  readonly when: Localized;
  /** 앱 JSON의 `title_en` · `title` 그대로. 숨김 층에 들어간다. */
  readonly title: Localized;
  /** 살짝만 스포하는 **한 문장**. 등장인물 이름 · 답 · 결말을 말하지 않는다. 숨김 층에 들어간다. */
  readonly teaser: Localized;
  /** 버킷 그림의 사본(`src/assets/content/images/…`). 인물이 없는 컷. Astro가 크기별로 다시 굽는다. */
  readonly image: ImageMetadata;
  /** 그림에 보이는 것만. */
  readonly alt: Localized;
  /** 4:5로 자를 때 남길 자리(`object-position`). 기본은 가운데. */
  readonly focus?: string;
}

/** 새 것이 먼저다. 맨 앞 카드가 `New`. */
export const storyEpisodes: readonly StoryEpisode[] = [
  {
    id: "u10-laundry",
    number: 10,
    when: { en: "Day 3 · Afternoon", ko: "3일째 · 낮" },
    title: { en: "Doing Laundry", ko: "빨래하기" },
    teaser: {
      en: "Every button in the laundromat is in Korean.",
      ko: "빨래방 버튼은 전부 한글뿐이에요.",
    },
    image: u10,
    alt: {
      en: "A lit 24-hour coin laundry sign above a glass door at the end of a rainy hanok alley",
      ko: "비 오는 한옥 골목 끝, 유리문 위에 불 켜진 24시 코인빨래 간판",
    },
  },
  {
    id: "u09-subway",
    number: 9,
    when: { en: "Day 3 · Morning", ko: "3일째 · 아침" },
    title: { en: "Taking the Subway", ko: "지하철 타기" },
    teaser: {
      en: "Three colors, three arrows, one rainy morning underground.",
      ko: "비 오는 아침, 지하의 세 가지 색과 세 개의 화살표.",
    },
    image: u09,
    alt: {
      en: "The glass-roofed exit 4 of Jongno 3-ga station on a rainy morning, stairs leading underground",
      ko: "비 오는 아침 유리 지붕을 얹은 종로3가역 4번 출구와 지하로 내려가는 계단",
    },
  },
  {
    id: "u08-umbrella",
    number: 8,
    when: { en: "Day 2 · Evening", ko: "2일째 · 저녁" },
    title: { en: "Sudden Rain", ko: "갑자기 온 비" },
    teaser: {
      en: "You open the café door into a downpour, and someone follows you out.",
      ko: "카페 문을 열자 비가 쏟아지고, 누군가 뒤따라 나와요.",
    },
    image: u08,
    alt: {
      en: "Heavy rain falling on a lantern-lit hanok alley at night, seen from under a dark umbrella",
      ko: "어두운 우산 밑에서 올려다본, 등불 켜진 밤의 한옥 골목에 쏟아지는 비",
    },
  },
  {
    id: "u07-jaemin",
    number: 7,
    when: { en: "Day 2 · Afternoon", ko: "2일째 · 낮" },
    title: { en: "Wrong Seat", ko: "자리 착각" },
    teaser: {
      en: "The sunniest seat in the café looks free. It isn't.",
      ko: "햇빛 제일 좋은 자리가 비어 있는 줄 알았어요.",
    },
    image: u07,
    alt: {
      en: "A long black umbrella leaning in the corner of a sunlit café window seat under a clear sky",
      ko: "맑은 하늘 아래 햇살 드는 카페 창가 구석에 기대 세운 긴 검은 우산",
    },
  },
  {
    id: "u06-cafe",
    number: 6,
    when: { en: "Day 2 · Morning", ko: "2일째 · 아침" },
    title: { en: "Ordering Coffee", ko: "커피 주문" },
    teaser: {
      en: "The café that was locked last night has its lights on.",
      ko: "어젯밤 잠겨 있던 카페에 불이 켜져 있어요.",
    },
    image: u06,
    alt: {
      en: "A café on the corner of a sunny morning hanok alley, its sign lit",
      ko: "아침 햇살 비치는 한옥 골목 모퉁이의, 간판에 불이 켜진 카페",
    },
  },
  {
    id: "u05-baekban",
    number: 5,
    when: { en: "Day 1 · Evening", ko: "1일째 · 저녁" },
    title: { en: "Eating Alone", ko: "혼자 밥 먹기" },
    teaser: {
      en: "A handwritten menu, no photos, and a question you didn't expect.",
      ko: "사진 없는 손글씨 메뉴판, 그리고 생각 못 한 질문 하나.",
    },
    image: u05,
    alt: {
      en: "A bubbling pot of kimchi stew with a bowl of rice and side dishes on a restaurant table",
      ko: "식당 테이블 위에 밥 한 공기, 반찬과 함께 놓인 보글보글 끓는 김치찌개 뚝배기",
    },
  },
  {
    id: "u04-directions",
    number: 4,
    when: { en: "Day 1 · Evening", ko: "1일째 · 저녁" },
    title: { en: "Finding the Restaurant", ko: "식당 찾기" },
    teaser: {
      en: "Five minutes, they said. You have passed this flower pot twice.",
      ko: "5분이면 간다더니, 같은 화분을 두 번 지났어요.",
    },
    image: u04,
    alt: {
      en: "A lantern-lit hanok alley at dusk splitting into several similar-looking paths",
      ko: "해 질 녘 등불 켜진 한옥 골목이 비슷해 보이는 여러 갈래로 갈라지는 모습",
    },
  },
  {
    id: "u03-mina",
    number: 3,
    when: { en: "Day 1 · Afternoon", ko: "1일째 · 낮" },
    title: { en: "Meeting Mina", ko: "미나 만나기" },
    teaser: {
      en: "Four bunk beds, a hand-drawn map, and a question about your name.",
      ko: "이층 침대 네 개, 손으로 그린 약도, 그리고 이름을 묻는 말.",
    },
    image: u03,
    alt: {
      en: "A hand holding a small note with a hand-drawn map in a sunlit dormitory",
      ko: "햇살 드는 도미토리에서 손으로 그린 약도가 적힌 작은 메모지를 든 손",
    },
  },
  {
    id: "u02-checkin",
    number: 2,
    when: { en: "Day 1 · Afternoon", ko: "1일째 · 낮" },
    title: { en: "Check-in", ko: "체크인" },
    teaser: {
      en: "Room 201 is half open, and someone's backpack is already on the bed.",
      ko: "201호 문은 반쯤 열려 있고, 침대 위엔 이미 누군가의 배낭이 있어요.",
    },
    image: u02,
    alt: {
      en: "A half-open door of a dormitory room with bunk beds and a backpack on the bed by the window",
      ko: "반쯤 열린 도미토리 문 너머로 보이는 이층 침대와 창가 침대 위의 배낭",
    },
  },
  {
    id: "u01-water",
    number: 1,
    when: { en: "Day 1 · Afternoon", ko: "1일째 · 낮" },
    title: { en: "Buying Water", ko: "물 사기" },
    teaser: {
      en: "Thirsty, lost, dragging a suitcase. The first shop you find is tiny.",
      ko: "목은 마르고 길은 모르겠고, 겨우 찾은 가게는 좁아요.",
    },
    image: u01,
    alt: {
      en: "A quiet hanok alley in afternoon light seen from a convenience store door, a guesthouse further in",
      ko: "편의점 문 앞에서 본 오후의 조용한 한옥 골목, 안쪽으로 보이는 게스트하우스",
    },
  },
  {
    id: "u00-tutorial",
    number: 0,
    when: { en: "Day 0 · Arrival", ko: "0일째 · 도착" },
    title: { en: "Tutorial", ko: "튜토리얼" },
    teaser: {
      en: "Your first words in Korean are about to leave your mouth. You don't know them yet.",
      ko: "첫 한국어가 곧 입 밖으로 나올 참인데, 아직 그 말을 몰라요.",
    },
    image: u00,
    alt: {
      en: "A dreamlike night convenience store: a big cup of spicy stir-fried noodles and a triangle gimbap on a window-side table",
      ko: "꿈처럼 번지는 밤의 편의점, 창가 테이블 위의 매운 볶음면 큰컵과 삼각김밥",
    },
  },
];
