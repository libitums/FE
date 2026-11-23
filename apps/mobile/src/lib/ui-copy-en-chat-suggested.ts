// 추천 친구 줄 · 프로필 시트 · 친구 찾기 문구(en, ADR-0162).

import type { SuggestedFriendsCopy } from "../screens/messenger-chat/suggested-friends.contract";

export const messengerChatSuggestedEn: SuggestedFriendsCopy = {
  language: "en",
  rowTitle: "Meet new friends",
  seeAll: "See all",
  seeAllLabel: "See all friends",
  newLabel: (name) => `${name}, new friend`,
  lockedLabel: (name, episode) => `${name}, meet in Episode ${episode}`,
  earlyLabel: (name, episode, price) =>
    `${name}, meet in Episode ${episode} or chat now for ${price} coins`,
  sheetLabel: (name) => `${name}, profile`,
  newBadge: "NEW",
  startChatting: "Start chatting",
  notNow: "Not now",
  meetIn: (episode) => `You'll meet in Episode ${episode}`,
  lockedInfo: (name) => `Finish the story to swap numbers — ${name} texts first.`,
  chatNow: (price) => `Chat now · ${price}`,
  earlyButtonLabel: (price, left) =>
    `Chat now for ${price} coins, limited offer${left === null ? "" : `, ${left.days} days ${left.hours} hours left`}`,
  launchSpecial: (name) => `Launch special · meet ${name} early`,
  limited: "LIMITED",
  limitedUntil: (days, hours) => `LIMITED · ${days}d ${hours}h`,
  added: (name) => `${name} added to your chats`,
  addFailed: (name) => `Couldn't add ${name}. Try again.`,
  adultAck: {
    title: (name) => `Get closer with ${name}?`,
    body: (gender) =>
      gender === null
        ? "Chats can be warmer and more personal, like with someone you're getting to know."
        : `${gender === "female" ? "She" : "He"} can be warmer and more personal with you, like someone you're getting to know.`,
    safe: "Always kind and respectful. Never anything explicit.",
    casual: (gender) =>
      `Want to keep it casual later? ${gender === null ? "Just say so." : `Just tell ${gender === "female" ? "her" : "him"}.`}`,
    confirm: "Sounds good",
    decline: "Just friends for now",
  },
  directory: {
    title: "Find friends",
    back: "Back",
    all: "All",
    fromStory: "From your story",
    sectionStory: "FROM YOUR STORY",
    sectionNew: "NEW FRIENDS",
    chat: "Chat",
    chatLabel: (name) => `Chat with ${name}`,
    added: "Added",
    addedLabel: (name) => `${name}, already in your chats`,
    earlyLabel: (name, price) => `Meet ${name} early for ${price} coins`,
    locked: (episode) => `Ep. ${episode}`,
    lockedLabel: (name, episode) => `${name}, meet in Episode ${episode}`,
    meetIn: (episode) => `Meet in Episode ${episode}`,
    moreComing: "More friends are on the way",
    chipLabel: (label, selected) => (selected ? `${label}, selected` : label),
  },
};
