// 영어 문구가 원본이고 `Copy`의 모양을 정합니다. 다른 언어는 같은 키를 전부 채웁니다(ko.ts).
// 값에 든 `<br />`은 제목의 줄바꿈입니다 — 컴포넌트가 set:html로 넣으므로 그 밖의 태그는 쓰지 않습니다.
// 휴대폰 목업 · 첫 표현 · 맺음 인용의 한국어 대사와 뜻풀이는 앱이 학습자에게 보여 주는 그대로라 여기에 없습니다.
export const en = {
  skip: "Skip to content",
  navWays: "Features",
  navJourney: "Story",
  navWords: "Phrases",
  navFaq: "FAQ",
  navCta: "Download",
  panel1: "Step into a scene",
  panel2: "Talk your way through it",
  panel3: "Carry it into real life",
  heroA: "Korean,<br />lived as a story",
  heroB: "Step into a day in Korea<br />and live the language",
  heroCue: "Scroll",
  manifesto1:
    "Words, particles and phrases learned one by one are hard to understand and quick to fade",
  manifesto2: "Duru puts them back where they belong: inside a story",
  manifesto3: "You step into a scene, meet the people in it, and answer them in Korean",
  manifesto4: "When the scene ends, the words you used stay with that moment",
  waysEyebrow: "Features",
  waysTitle: "1 story,<br />4 ways in",
  wayStoryTitle: "Story scenes",
  wayStoryDesc:
    "Read each scene like a short story. Every Korean line comes with its meaning, so you can always follow along.",
  wayMessengerTitle: "Messages",
  wayMessengerDesc:
    "A friend texts you in Korean. Pick your reply and keep the chat going, the way you would on your own phone.",
  wayCallTitle: "Phone calls",
  wayCallDesc:
    "Pick up and listen to Minseo’s voice. Choose what to say back while she is still on the line.",
  wayPracticeTitle: "Listen, speak, write",
  wayPracticeDesc:
    "Hear the line again, say it out loud, and trace the letters by hand until they feel like yours.",
  journeyEyebrow: "Story",
  journeyTitle: "The first story<br />starts in the air",
  journeyLead:
    "Each story drops you into a different moment of life in Korea. The first one begins a few minutes before landing. More will follow.",
  scene1Title: "Before We Land",
  scene1Desc: "Looking out of the window, you start to imagine what a day in Korea might be like.",
  scene2Title: "Your First Hello",
  scene2Desc:
    "Greetings, names, ordering, making plans. Each short lesson connects to the street you are walking down.",
  scene3Title: "A Message from Minseo",
  scene3Desc:
    "A friend you haven’t met yet texts, then calls. You answer with what you just learned.",
  scene4Title: "Our Imagined Café",
  scene4Desc: "2 cups sit on a table by the window. Sit down and have the whole conversation.",
  scene5Title: "Almost There",
  scene5Desc:
    "One last scene to use everything you practiced. Then the doors open, and the real story begins.",
  moreTitle: "More stories on the way",
  moreDesc: "New episodes open new places, people and situations.",
  railPrev: "Previous scenes",
  railNext: "Next scenes",
  wordsEyebrow: "Phrases",
  wordsTitle: "3 phrases<br />from the first story",
  downloadTitle: "Start your story",
  storeSoon: "Coming soon",
  footerTerms: "Terms of Use",
  footerPrivacy: "Privacy Policy",
  scene1Alt: "A plane window over the sea, a few minutes before landing in Korea",
  scene2Alt: "A sunlit street in Korea with a café on the corner",
  scene3Alt: "Minseo, the friend who messages and calls you in the story",
  scene4Alt: "Two cups on a café table by a window overlooking the city",
  scene5Alt: "An airport arrival hall at sunset",
  navLabel: "Sections",
  languageLabel: "Language",
  storeGet: "Download",
  faqEyebrow: "FAQ",
  faqTitle: "Questions<br />about Duru",
  faqWhatQ: "What is Duru?",
  faqWhatA:
    "Duru is a story-based Korean learning app. You step into a day in Korea, talk with the people you meet through messages and phone calls, and keep the words you used.",
  faqWhoQ: "Who is Duru for?",
  faqWhoA:
    "Duru is for people who are starting to learn Korean, including those who have never read Hangul. It suits learners who forget words quickly when they memorize them one by one.",
  faqDifferentQ: "How is Duru different from a vocabulary app?",
  faqDifferentA:
    "Duru puts words, particles and phrases inside a story instead of teaching them as separate lists. You meet each one in a scene and use it to answer someone, so it stays with the moment you used it in.",
  faqActivitiesQ: "What do you do in Duru?",
  faqActivitiesA:
    "In Duru you read story scenes, reply to messages, take phone calls, and practice by listening, speaking and tracing letters by hand. Short lessons sit between the story moments.",
  faqHangulQ: "Can I start Duru without knowing Hangul?",
  faqHangulA:
    "Yes — Duru’s lessons show Korean phrases together with their romanization and meaning, and its story scenes come with English translations, so you can start without reading Hangul. The first lessons guide you to tap a single phrase, so you can do them without a Korean keyboard.",
  faqLanguageQ: "What language is the Duru app in?",
  faqLanguageA:
    "Duru’s app interface is in English for now. The Korean you learn is shown with English meanings and romanization.",
  faqWhereQ: "Where can I download Duru?",
  faqWhereASoon:
    "Duru is not released yet. It is being prepared for iPhone (App Store) and Android (Google Play), and the store links will appear on this website when it is available.",
  faqWhereAAvailable: "Duru is available now. You can get it from the store links on this website.",
  notFoundMetaTitle: "Page not found — Duru",
  notFoundTitle: "This page doesn’t exist",
  notFoundBody:
    "The address may be mistyped, or the page may have moved. Start again from the home page.",
  notFoundHome: "Back to Duru",
};

export type Copy = Record<keyof typeof en, string>;
