// 영어 문구표 구획 — 학습자 프로필(이름 · 나라) 양식.

import type { LearnerProfileCopy } from "../components/learner-profile.contract";

export const learnerProfileEn: LearnerProfileCopy = {
  nameLabel: "Your name",
  nameIssue: {
    empty: "Enter your name.",
    "too-long": "Use 30 characters or fewer.",
    "forbidden-character": "Names can't include { or }.",
  },
  countryLabel: "Country",
  notSet: "Not set",
  countryMissing: "Select your country.",
  preview: {
    heading: { example: "Example", yours: "You'll say" },
    label: (kind, ko, en) =>
      `${kind === "example" ? "Example sentence" : "You'll say"}: ${ko} Meaning: ${en}`,
  },
  picker: {
    title: "Select country",
    back: "Back",
    searchLabel: "Search countries",
    clearSearch: "Clear search",
    allCountries: (count) => `${count} countries · search by English name`,
    matches: (count) => (count === 1 ? "1 match" : `${count} matches`),
    noMatches: "No matches. Check the spelling or try a shorter name.",
    noMatchesAnnouncement: "No matches",
    row: (en, ko) => `${en} · ${ko}`,
    countrySet: (en) => `Country set to ${en}`,
  },
  signup: {
    continue: "Continue",
    back: "Back",
    name: {
      title: "What's your name?",
      caption: "We'll put it into the sentences you practice",
      helper: "We picked one for you — keep it, shuffle, or type your own.",
      shuffle: "Shuffle",
      shuffleLabel: "Pick another random name",
      previewHeading: "In a lesson it sounds like",
    },
    country: {
      title: "Where are you from?",
      caption: "You'll say it when you meet people in the story",
      searchPlaceholder: (count) => `Search ${count} countries`,
      allCountries: (count) => `ALL COUNTRIES · ${count}`,
      jumpTo: (letter) => `Jump to ${letter}`,
      jumpBar: "Jump to letter",
    },
  },
  settings: {
    title: "Name and country",
    body: "Used in the sentences you practice. Changes apply from the next lesson you open.",
    submit: "Save",
    saved: "Saved",
  },
  summary: {
    both: (name, country) => `${name} · ${country}`,
    pending: (summary) =>
      `${summary}. Saved on this device. We'll sync it when you're back online.`,
  },
};
