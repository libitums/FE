// 친구 스토리 줄 · 보기 · 대화 인용 문구(en, ADR-0178).

import type { FriendStoriesCopy } from "../screens/messenger-chat/friend-stories.contract";

export const messengerChatStoriesEn: FriendStoriesCopy = {
  language: "en",
  // 낭독 조각 잇기 — 언어마다 구분자(감사 다국어 minor 9).
  listSeparator: ", ",
  labelSeparator: ": ",
  rowTitle: "Stories",
  watchAll: "Watch all",
  watchAllLabel: "Watch all stories",
  age: (age) => (age.unit === "now" ? "now" : `${age.value}${age.unit}`),
  seen: "Seen",
  newBadge: "New",
  friendLabel: (name, age, seen) => `${name}'s story, ${age}${seen ? ", seen" : ", new"}`,
  unmetLabel: (name) => `${name}'s story, new friend`,
  findFriends: "Find friends",
  findFriendsLabel: "Find friends",
  listPreview: (line) => `New story · ${line}`,
  listRowLabel: (name, line) => `${name}, new story: ${line}. Opens the story`,
  viewer: {
    label: (name) => `${name}'s story`,
    progress: (index, count) => `Story ${index} of ${count}`,
    pause: "Pause",
    play: "Play",
    close: "Close",
    previous: "Previous story",
    next: "Next story",
    photoLabel: (name) => `Photo from ${name}`,
    saveWord: (ko, meaning) => `${ko} · ${meaning} — Save word`,
    saveWordLabel: (ko, meaning) => `Save ${ko}, ${meaning}, to My words`,
    saved: (ko) => `${ko} saved to My words`,
    freeReply: "First reply is free",
    replyPlaceholder: (name) => `Reply to ${name}…`,
    replyChipLabel: (text) => `Reply: ${text}`,
    newFriend: "NEW FRIEND",
    addAndReply: "Add friend and reply",
    seeHowToMeet: "See how to meet",
  },
  reply: {
    caption: (name) => `You replied to ${name}'s story`,
    storyMeta: (age) => (age === null ? "Story" : `Story · ${age}`),
    replying: (name) => `Replying to ${name}'s story`,
    removeQuote: "Remove quote",
  },
};
