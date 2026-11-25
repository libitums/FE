// 내 스토리 문구(en, ADR-0194 · ADR-0191 — 반응은 그 친구 방의 메시지 · 올리기 창 · 덕수쌤 퀴즈).

import type { MyStoriesCopy } from "../screens/messenger-chat/my-stories-copy.contract";
import { storyPhotoEn } from "./ui-copy-story-photo";

const replies = (count: number) => (count === 1 ? "1 reply" : `${count} replies`);

const LIVE = "LIVE";
const PART = { morning: "morning", day: "afternoon", night: "evening" } as const;

export const myStoriesEn: MyStoriesCopy = {
  language: "en",
  row: {
    create: "New",
    createLabel: "Make a new story",
    mine: "Your story",
    mineLabel: (count, unseen) => `Your story, ${replies(count)}${unseen ? ", new replies" : ""}`,
    next: "Next story",
    nextLabel: (time) => `Next story opens at ${time}`,
  },
  guide: {
    title: "Share a Korean word",
    body: "Your friends here will reply — every story is a little Korean practice.",
    steps: [
      { title: "Pick a word", body: "From your saved words." },
      {
        title: "Friends reply within the hour",
        body: "Their replies show up in each friend's chat.",
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
    emptyWords: "No saved words yet. Words from your lessons show up here.",
    choiceLabel: (ko, meaning, selected) => `${ko}, ${meaning}${selected ? ", selected" : ""}`,
    posting: "Sharing…",
    dailyLimit: "You've shared enough stories for today. Try again tomorrow.",
    windowUsed: (time) =>
      time === null
        ? "You've already shared a story in this part of the day."
        : `You've already shared a story in this part of the day. The next one opens at ${time}.`,
    failed: "Couldn't share your story. Try again.",
    checkLimit: "You've tried enough for today. Try again tomorrow.",
    invalid: "Couldn't share this story. Try changing it.",
  },
  viewer: {
    yourStory: "Your story",
    kindLabel: (kind) => (kind === "word" ? "Word card" : "Lesson card"),
    textLabel: "Text story",
    cardTag: (kind) => (kind === "word" ? "MY WORD OF THE DAY" : "LESSON CARD"),
    close: "Close",
    options: "Story options",
    delete: "Delete story",
    replied: (count) =>
      count === 0
        ? "No replies yet"
        : count === 1
          ? "1 friend replied"
          : `${count} friends replied`,
    seenBy: (count) => `Seen by ${count}`,
    seenByLabel: (count) => (count === 1 ? "Seen by 1 friend" : `Seen by ${count} friends`),
    openChat: "Open chat",
    openChatLabel: (name) => `Open chat with ${name}`,
    saved: "Replies are saved in each friend's chat.",
    waiting: "Friends usually reply within an hour.",
    waitingBody: "We'll let you know. Replies show up here and in each friend's chat.",
    noFriendsTitle: "Add a friend to get replies",
    noFriendsBody: "Chat with someone first — then they'll see your stories.",
    findFriends: "Find friends",
    hidden: "Friends saw this for 24 hours. Only you see it now.",
    reactionLabel: (name, text, meaning) => `${name}: ${text}${meaning ? `. ${meaning}` : ""}`,
  },
  window: {
    title: (slot) => `You shared this ${PART[slot]}'s story`,
    body: (time) => `One story each morning, afternoon and evening. The next one opens at ${time}.`,
    slot: (slot) => (slot === "morning" ? "Morning" : slot === "day" ? "Afternoon" : "Evening"),
    range: (start, end) => `${start} – ${end}`,
    time: (hour, minute) =>
      `${hour % 12 === 0 ? 12 : hour % 12}${minute === 0 ? "" : `:${String(minute).padStart(2, "0")}`} ${hour < 12 ? "AM" : "PM"}`,
    shared: "Shared",
    missed: "Missed",
    open: "Open now",
    opens: (time) => `Opens ${time}`,
    slotLabel: (slot, range, state) => `${slot}, ${range}, ${state}`,
    ok: "OK",
    close: "Close",
  },
  photo: storyPhotoEn,
  start: {
    title: "New story",
    close: "Close",
    camera: "Camera",
    background: "Background",
    recent: "Recent photos",
  },
  editor: {
    label: "Story editor",
    back: "Back",
    colors: "Background color",
    color: (background) =>
      background === "orange"
        ? "Orange"
        : background === "green"
          ? "Green"
          : background === "blue"
            ? "Blue"
            : "Purple",
    colorLabel: (name, on) => `${name}${on ? ", selected" : ""}`,
    text: "Text",
    words: "Words",
    share: "Share with friends",
    posting: "Sharing…",
    hintOne: "Add a word to share it.",
    hintOneText: "Add a word or write a line to share it.",
    hintMove: "Drag to move, pinch to resize.",
    stickerLabel: (ko, meaning) => `${ko}, ${meaning}`,
    remove: (ko) => `Remove ${ko}`,
    textBlocked: "This text can't be shared. Try different words.",
  },
  textEntry: {
    label: "Story text, Korean or English",
    help: "Korean or English — we'll help",
    done: "Done",
    colors: "Text color",
    color: (textColor) =>
      textColor === "brown"
        ? "Brown"
        : textColor === "black"
          ? "Black"
          : textColor === "white"
            ? "White"
            : "Orange",
    colorLabel: (name, on) => `${name}${on ? ", selected" : ""}`,
    editLabel: (ko) => `Edit text: ${ko}`,
  },
  add: {
    title: "Add a word",
    hint: "Tap a word to place it. Up to 8 on one story.",
    hintOne: "Tap a word to place it.",
  },
  quiz: {
    free: "Quiz answer is free",
    freeAnswer: "Free · quiz answer",
    lastTry: "Free · last try",
    correct: (name) => `Correct! You and ${name} got closer`,
  },
  remove: {
    title: "Delete this story?",
    body: (count) =>
      `Your card and the ${replies(count)} on it will be removed. Messages in your chats stay, with a “Deleted story” note. You can't undo this.`,
    allTitle: "Delete all stories?",
    allBody:
      "All your stories and the replies on them will be removed. Messages in your chats stay, with a “Deleted story” note. You can't undo this.",
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
    deleteAllNote: "Your cards and the replies on them are deleted from our servers.",
    empty: "No stories yet. Tap + above your chats to share a word.",
    today: "Today",
    date: (month, day) =>
      `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1] ?? month} ${day}`,
  },
  quote: {
    mine: "You answered about your story",
    reacted: "Replied to your story",
    deleted: "Deleted story",
    deletedLabel: "Reply to a deleted story",
  },
};
