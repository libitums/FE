// 내 스토리 문구(en, ADR-0179).

import type { MyStoriesCopy } from "../screens/messenger-chat/my-stories-copy.contract";

const replies = (count: number) => (count === 1 ? "1 reply" : `${count} replies`);

const LIVE = "LIVE";

export const myStoriesEn: MyStoriesCopy = {
  language: "en",
  row: {
    create: "New",
    createLabel: "Make a new story",
    mine: "Your story",
    mineLabel: (count, unseen) => `Your story, ${replies(count)}${unseen ? ", new replies" : ""}`,
  },
  guide: {
    title: "Share a Korean word",
    body: "Your friends here will reply — every story is a little Korean practice.",
    steps: [
      { title: "Pick a word or a lesson card", body: "From your saved words or your lessons." },
      {
        title: "Friends reply over the day",
        body: "They use your word. Tap Answer to keep the chat going.",
      },
      {
        title: "Only your duru friends see it",
        body: "Other people never do. Delete it anytime in Settings › My stories.",
      },
    ],
    start: "Make my first story",
    later: "Not now",
    stepLabel: (n, title, body) => `${n}. ${title}. ${body}`,
  },
  composer: {
    title: "New story",
    close: "Close",
    tabsLabel: "What to share",
    tab: (kind) => (kind === "word" ? "My words" : "Lesson cards"),
    wordsTitle: "Pick a word you saved",
    wordCount: (count) => (count === 1 ? "1 word" : `${count} words`),
    all: "All",
    emptyWords: "No saved words yet. Words from your lessons show up here.",
    emptyCards: "Finish a lesson to share its cards.",
    chipLabel: (label, on) => `${label}${on ? ", selected" : ""}`,
    choiceLabel: (ko, meaning, selected) => `${ko}, ${meaning}${selected ? ", selected" : ""}`,
    share: (ko) => `Make a card with ${ko}`,
    shareCard: "Share the card",
    posting: "Sharing…",
    dailyLimit: "You've shared enough stories for today. Try again tomorrow.",
    failed: "Couldn't share your story. Try again.",
  },
  viewer: {
    yourStory: "Your story",
    kindLabel: (kind) => (kind === "word" ? "Word card" : "Lesson card"),
    cardTag: (kind) => (kind === "word" ? "MY WORD OF THE DAY" : "LESSON CARD"),
    close: "Close",
    options: "Story options",
    delete: "Delete story",
    repliesTitle: "Friends used your word",
    waiting: "Your friends will reply over the day.",
    hidden: "Friends saw this for 24 hours. Only you see it now.",
    answer: (name) => `Answer ${name}`,
    reactionLabel: (name, text, meaning) => `${name}: ${text}${meaning ? `. ${meaning}` : ""}`,
  },
  remove: {
    title: "Delete this story?",
    body: (count) =>
      `Your card and ${replies(count)} from friends will be deleted. Chats keep a “Deleted story” note. You can't undo this.`,
    allTitle: "Delete all stories?",
    allBody:
      "All your stories and friend replies will be deleted. Chats keep a “Deleted story” note. You can't undo this.",
    confirm: "Delete",
    cancel: "Cancel",
    failed: "Couldn't delete. Try again.",
  },
  archive: {
    entryTitle: "My stories",
    entryDescription: "Words and cards you shared",
    title: "My stories",
    back: "Back to Settings",
    keep: "Keep my stories after 24 hours",
    keepBody: "Friends see a story for 24 hours. Only you see this archive.",
    count: (count) => (count === 1 ? "1 story" : `${count} stories`),
    newest: "Newest first",
    live: LIVE,
    tileMeta: (date, count) => `${date} · ${replies(count)}`,
    tileLabel: (ko, meaning, date, count, live) =>
      `${ko}, ${meaning}, ${date}, ${replies(count)}${live ? `, ${LIVE}` : ""}`,
    deleteOne: (date) => `Delete story from ${date}`,
    deleteToday: "Delete today's story",
    deleteAll: "Delete all stories",
    deleteAllNote: "Your cards and friend replies are deleted from our servers.",
    empty: "No stories yet. Tap + above your chats to share a word.",
    today: "Today",
    date: (month, day) =>
      `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1] ?? month} ${day}`,
  },
  quote: {
    mine: "You answered about your story",
    replyingMine: "Replying about your story",
    deleted: "Deleted story",
    deletedLabel: "Reply to a deleted story",
  },
};
