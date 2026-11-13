// 메신저 문구 표의 덧붙는 칸(en) — 대화 설정(ADR-0126) · 선톡 푸시 안내(ADR-0127) · 메신저 탭 접근(ADR-0128).

import type { MessengerChatExtraCopy } from "../screens/messenger-chat/chat-settings.contract";

export const messengerChatExtraEn: MessengerChatExtraCopy = {
  access: {
    signInTitle: "Text the people you meet",
    signInBody:
      "Create a free account to chat in Korean with the people from your stories. Your progress so far comes with you.",
    signIn: "Sign up or log in",
    comingSoonTitle: "Chats are almost here",
    comingSoonBody:
      "We're opening chats to a small group first. Keep learning — the people you meet will be ready to text you soon.",
  },
  pushNotice: { chatUnavailable: "This chat isn't available right now." },
  chatSettings: {
    entryTitle: "Chats",
    entryDescription: "Reply ideas, messages from characters, memories",
    title: "Chats",
    back: "Back",
    sectionWhile: "While chatting",
    replyIdeas: "Reply ideas",
    replyIdeasBody: "Show 1–2 suggested replies after each message",
    sectionProactive: "Messages from characters",
    proactive: "They message you first",
    sectionAbout: "About you",
    sharedMemories: "What everyone knows about you",
    sharedMemoriesSummary: (count) =>
      `${count} ${count === 1 ? "memory" : "memories"} · shared by all characters`,
    footnote:
      "Each character also remembers things from your chats with them. Open a chat and tap ☰ to see them.",
    proactiveSheet: {
      title: "They message you first",
      body: "When you've been quiet for a while, a character may start the chat. It never costs coins.",
      howOften: "How often",
      prefs: { off: "Off", daily1: "Once a day", daily2: "Twice a day" },
      preferredTime: "Preferred time",
      anyTime: "Any time",
      hour: (hour) => `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? "AM" : "PM"}`,
      quietNote:
        "No messages between 10 PM and 8 AM your time. With twice a day, the second comes about 10 hours later.",
      save: "Save",
      close: "Close",
    },
    memories: {
      titleShared: "What everyone knows about you",
      titleCharacter: (name) => `What ${name} remembers`,
      count: (count, cap) => `${count} / ${cap}`,
      fullTitle: "Memory is full",
      fullBody: (name) =>
        `${name ?? "Characters"} can't remember new things until you delete some. Memories you edited are kept.`,
      intro: (name) =>
        `${name ?? "Every character"} uses these to keep your chats personal. Only you see this list. Editing or deleting is free.`,
      empty: (name) =>
        `Nothing yet. ${name ?? "Characters"} will remember things you share as you chat.`,
      edited: "Edited",
      edit: "Edit memory",
      delete: "Delete memory",
      editTitle: "Edit memory",
      editHint: (name) => `${name ?? "Characters"} will remember it exactly as you write it.`,
      length: (count, max) => `${count} / ${max}`,
      cancel: "Cancel",
      save: "Save",
      deleteTitle: "Delete this memory?",
      deleteBody: (name) => `${name ?? "Characters"} won't use it from your next message.`,
      deleteConfirm: "Delete",
      sidebar: (name) => `What ${name} remembers`,
      sidebarSummary: (count, cap, full) =>
        full ? `${count} / ${cap} · full` : `${count} / ${cap}`,
    },
    feedback: {
      sidebar: "Correction style",
      title: "Correction style",
      body: (name) =>
        `How ${name} helps when your Korean has a mistake. You always get the correction card — this changes how ${name} replies.`,
      modes: {
        separate: {
          title: "Card only",
          body: (name) => `${name} just keeps chatting. The fix shows on the ✎ under your message.`,
        },
        natural: {
          title: "Naturally in the reply",
          body: (name) => `${name} uses the right expression in the answer, like a friend would.`,
        },
        prefix: {
          title: "Point it out first",
          body: (name) => `${name} briefly corrects you, then continues the chat.`,
        },
      },
      defaultTag: "default",
      note: "Applies to all characters from your next message.",
      save: "Save",
      close: "Close",
    },
  },
  feedback: {
    titles: { correction: "FIX", better: "MORE NATURAL", l1_to_ko: "IN KOREAN" },
    sendCorrected: "Send corrected",
    sendInKorean: "Send in Korean",
    cardLabel: (title, text, detail) =>
      detail === "" ? `${title}: ${text}` : `${title}: ${text} ${detail}`,
    good: "Good reply",
    bad: "Bad reply",
    goodSelected: "Good reply, selected",
    badSelected: "Bad reply, selected",
    liked: "You liked this",
    flagged: "You flagged this",
    sheet: {
      title: "What went wrong?",
      body: (name) => `Pick any that apply. It helps ${name} reply better.`,
      reasons: {
        awkward_korean: () => "The Korean sounds unnatural",
        out_of_character: (name) => `Doesn't sound like ${name}`,
        too_hard: () => "Too hard for me",
        uncomfortable: () => "Made me uncomfortable",
        other: () => "Something else",
      },
      reportPrompt: "Want us to look at this message?",
      report: "Report",
      noteLabel: "Tell us more (optional)",
      notePlaceholder: "Add a note",
      send: "Send",
      close: "Close",
    },
  },
  remote: {
    noCredits: (name) => `You're out of credits to chat with ${name}.`,
    notAvailable: (name) => `You can't chat with ${name} yet.`,
    sendFailed: "Message not sent. Please try again.",
    replyFailed: (name) => `${name} can't reply right now.`,
    cantReply: (name) => `${name} can't reply to that. Try saying it another way.`,
    rateLimited: "You're sending too fast. Wait a moment, then send again.",
    updateRequired: "Update the app to keep chatting.",
    serverError: "Something went wrong on our side. Try again later.",
    signedOut: "You were signed out, so this message wasn't sent.",
    notSent: "Not sent",
    sendAgain: "Send again",
    unsentTitle: "Message not sent",
    unsentDescription: "Send it again, or delete it.",
    deleteUnsent: "Delete",
    cancel: "Cancel",
    recovering: "Getting the rest of the reply…",
    stalled: "Reply didn't finish.",
    refresh: "Refresh",
    loadFailedTitle: "Couldn't load your chat",
    loadFailedBody: "Check your connection, then try again.",
    loadFailedNew: "Couldn't load new messages.",
    tryAgain: "Try again",
  },
};
