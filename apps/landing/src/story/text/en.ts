// Story 카드의 영어 글입니다(원본). `episodes.contract.ts`의 id마다 넷을 채운다 — 빠지면 타입 검사가 짚는다.
// 새 에피소드는 **맨 위**에 더한다(배열과 같은 순서). 제목은 앱 JSON의 `title_en` 그대로, 티저는 한 문장, alt는 보이는 것만.
import type { StoryEpisodeId, StoryEpisodeText } from "../episodes.contract";

export const en: Record<StoryEpisodeId, StoryEpisodeText> = {
  "u10-laundry": {
    when: "Day 3 · Afternoon",
    title: "Doing Laundry",
    teaser: "Every button in the laundromat is in Korean.",
    alt: "A lit 24-hour coin laundry sign above a glass door at the end of a rainy hanok alley",
  },
  "u09-subway": {
    when: "Day 3 · Morning",
    title: "Taking the Subway",
    teaser: "Three colors, three arrows, one rainy morning underground.",
    alt: "The glass-roofed exit 4 of Jongno 3-ga station on a rainy morning, stairs leading underground",
  },
  "u08-umbrella": {
    when: "Day 2 · Evening",
    title: "Sudden Rain",
    teaser: "You open the café door into a downpour, and someone follows you out.",
    alt: "Heavy rain falling on a lantern-lit hanok alley at night, seen from under a dark umbrella",
  },
  "u07-jaemin": {
    when: "Day 2 · Afternoon",
    title: "Wrong Seat",
    teaser: "The sunniest seat in the café looks free. It isn't.",
    alt: "A long black umbrella leaning in the corner of a sunlit café window seat under a clear sky",
  },
  "u06-cafe": {
    when: "Day 2 · Morning",
    title: "Ordering Coffee",
    teaser: "The café that was locked last night has its lights on.",
    alt: "A café on the corner of a sunny morning hanok alley, its sign lit",
  },
  "u05-baekban": {
    when: "Day 1 · Evening",
    title: "Eating Alone",
    teaser: "A handwritten menu, no photos, and a question you didn't expect.",
    alt: "A bubbling pot of kimchi stew with a bowl of rice and side dishes on a restaurant table",
  },
  "u04-directions": {
    when: "Day 1 · Evening",
    title: "Finding the Restaurant",
    teaser: "Five minutes, they said. You have passed this flower pot twice.",
    alt: "A lantern-lit hanok alley at dusk splitting into several similar-looking paths",
  },
  "u03-mina": {
    when: "Day 1 · Afternoon",
    title: "Meeting Mina",
    teaser: "Four bunk beds, a hand-drawn map, and a question about your name.",
    alt: "A hand holding a small note with a hand-drawn map in a sunlit dormitory",
  },
  "u02-checkin": {
    when: "Day 1 · Afternoon",
    title: "Check-in",
    teaser: "Room 201 is half open, and someone's backpack is already on the bed.",
    alt: "A half-open door of a dormitory room with bunk beds and a backpack on the bed by the window",
  },
  "u01-water": {
    when: "Day 1 · Afternoon",
    title: "Buying Water",
    teaser: "Thirsty, lost, dragging a suitcase. The first shop you find is tiny.",
    alt: "A quiet hanok alley in afternoon light seen from a convenience store door, a guesthouse further in",
  },
  "u00-tutorial": {
    when: "Day 0 · Arrival",
    title: "Tutorial",
    teaser: "Your first words in Korean are about to leave your mouth. You don't know them yet.",
    alt: "A dreamlike night convenience store: a big cup of spicy stir-fried noodles and a triangle gimbap on a window-side table",
  },
};
