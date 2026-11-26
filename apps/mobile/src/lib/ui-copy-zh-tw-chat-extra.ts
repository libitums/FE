// 메신저 문구 표의 덧붙는 칸 — 대화 설정(ADR-0126) · 선톡 푸시 안내(ADR-0127) · 메신저 탭 접근(ADR-0128)의 대만 중국어(번체, zh-TW) 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { MessengerChatExtraCopy } from "../screens/messenger-chat/chat-settings.contract";
import { messengerChatMediaZhTw } from "./ui-copy-zh-tw-chat-media";
import { messengerChatAlbumZhTw } from "./ui-copy-zh-tw-chat-album";
import { messengerChatSuggestedZhTw } from "./ui-copy-zh-tw-chat-suggested";
import { messengerChatStoriesZhTw } from "./ui-copy-zh-tw-chat-stories";
import { myStoriesZhTw } from "./ui-copy-zh-tw-my-stories";

export const messengerChatExtraZhTw: MessengerChatExtraCopy = {
  media: messengerChatMediaZhTw,
  album: messengerChatAlbumZhTw,
  suggested: messengerChatSuggestedZhTw,
  stories: messengerChatStoriesZhTw,
  myStories: myStoriesZhTw,
  access: {
    signInTitle: "傳訊息給你遇見的人",
    signInBody: "建立免費帳號，就能用韓文和故事裡的人物聊天。你目前的進度都會保留。",
    signIn: "註冊或登入",
    promptTitle: "登入後即可傳送訊息",
    promptBody: "建立免費帳號，就能和故事裡的人物聊天。你目前的進度都會保留。",
    promptLater: "稍後再說",
    promptKeepBody: "建立免費帳號，保留你的 Yeopjeon 和票券。",
  },
  pushNotice: { chatUnavailable: "這個聊天目前無法使用。" },
  newMessages: {
    label: ({ count, latest }) =>
      latest === "photo"
        ? count === 1
          ? "傳了一張照片"
          : `傳了一張照片 · ${count} 則新訊息`
        : latest === "voice"
          ? count === 1
            ? "傳了一則語音訊息"
            : `傳了一則語音訊息 · ${count} 則新訊息`
          : count === 1
            ? "新訊息"
            : `${count} 則新訊息`,
    jump: "跳到新訊息",
    latest: "捲動到最新訊息",
  },
  replyToast: {
    dismiss: "關閉",
    more: (count) => `+${count}`,
    spoken: (name, preview, more) =>
      `${name} 傳來新訊息：${preview}` + (more > 0 ? `。還有 ${more} 則` : ""),
  },
  pushAsk: {
    title: (name) => `${name} 傳訊息給你時，要通知你嗎？`,
    body: "我有時會先傳訊息給你 — 大約一天一次，在傍晚。",
    turnOn: "開啟",
    notNow: "稍後再說",
    on: (name) => `通知已開啟 — ${name} 傳訊息時會通知你。`,
  },
  chatSettings: {
    entryTitle: "聊天",
    entryDescription: "回覆建議、角色傳來的訊息、記憶",
    title: "聊天",
    back: "返回",
    sectionWhile: "聊天時",
    replyIdeas: "回覆建議",
    replyIdeasBody: "每則訊息後顯示1–2個建議回覆",
    sectionProactive: "角色傳來的訊息",
    proactive: "角色主動傳訊息給你",
    sectionAbout: "關於你",
    sharedMemories: "大家都知道的關於你的事",
    sharedMemoriesSummary: (count) => `${count}則記憶 · 所有角色共用`,
    footnote: "每個角色也會記得和你聊過的事。打開聊天並點一下 ☰ 即可查看。",
    proactiveSheet: {
      title: "角色主動傳訊息給你",
      body: "當你一段時間沒說話時，角色可能會先開啟聊天。這完全不花錢幣。",
      howOften: "頻率",
      prefs: { off: "關閉", daily1: "每天一次", daily2: "每天兩次" },
      preferredTime: "偏好時間",
      anyTime: "任何時間",
      hour: (hour) => `${String(hour).padStart(2, "0")}:00`,
      quietNote:
        "在你當地時間22:00到8:00之間不會傳訊息。選擇每天兩次時，第二則大約在10小時後傳來。",
      save: "儲存",
      close: "關閉",
    },
    memories: {
      titleShared: "大家都知道的關於你的事",
      titleCharacter: (name) => `${name} 記得的事`,
      count: (count, cap) => `${count}則，上限${cap}則`,
      fullTitle: "記憶已滿",
      fullBody: (name) =>
        `在你刪除一些記憶之前，${name ?? "角色們"}無法記住新的事。你編輯過的記憶會保留。`,
      intro: (name) =>
        `${name ?? "每個角色"}會用這些讓聊天更貼近你。只有你看得到這份清單，編輯或刪除都免費。`,
      empty: (name) => `目前還沒有。${name ?? "角色們"}會記住你在聊天中分享的事。`,
      edited: "已編輯",
      edit: "編輯記憶",
      delete: "刪除記憶",
      editTitle: "編輯記憶",
      editHint: (name) => `${name ?? "角色們"}會完全照你寫的內容記住。`,
      length: (count, max) => `${count}字，上限${max}字`,
      cancel: "取消",
      save: "儲存",
      deleteTitle: "要刪除這則記憶嗎？",
      deleteBody: (name) => `從你的下一則訊息起，${name ?? "角色們"}不會再使用它。`,
      deleteConfirm: "刪除",
      sidebar: (name) => `${name} 記得的事`,
      sidebarSummary: (count, cap, full) =>
        full ? `${count}則 · 已滿` : `${count}則，上限${cap}則`,
    },
    feedback: {
      sidebar: "糾正方式",
      title: "糾正方式",
      body: (name) =>
        `你的韓文有錯時，${name} 會怎麼幫你。你一定會收到糾正卡片 — 這個選項改變的是 ${name} 回覆的方式。`,
      modes: {
        separate: {
          title: "只用卡片",
          body: (name) => `${name} 會照常繼續聊天。修正內容顯示在你訊息下方的 ✎。`,
        },
        natural: {
          title: "自然地融入回覆",
          body: (name) => `${name} 會像朋友一樣，在回答中使用正確的說法。`,
        },
        prefix: {
          title: "先指出來",
          body: (name) => `${name} 會先簡短糾正你，再繼續聊天。`,
        },
      },
      defaultTag: "預設",
      note: "從你的下一則訊息起，套用到所有角色。",
      save: "儲存",
      close: "關閉",
    },
  },
  feedback: {
    titles: { correction: "修正", better: "更自然", l1_to_ko: "用韓文說" },
    sendCorrected: "傳送修正後的句子",
    sendInKorean: "用韓文傳送",
    cardLabel: (title, text, detail) =>
      detail === "" ? `${title}：${text}` : `${title}：${text} ${detail}`,
    good: "好回覆",
    bad: "不好的回覆",
    goodSelected: "好回覆，已選取",
    badSelected: "不好的回覆，已選取",
    liked: "你喜歡這則回覆",
    flagged: "你已回報這則回覆",
    sheet: {
      title: "哪裡不好？",
      body: (name) => `選出所有符合的項目，這能幫助 ${name} 回覆得更好。`,
      reasons: {
        awkward_korean: () => "韓文聽起來不自然",
        out_of_character: (name) => `不像 ${name} 會說的話`,
        too_hard: () => "對我來說太難",
        uncomfortable: () => "讓我感到不舒服",
        other: () => "其他原因",
      },
      reportPrompt: "要我們檢查這則訊息嗎？",
      report: "檢舉",
      noteLabel: "告訴我們更多（選填）",
      notePlaceholder: "加上備註",
      send: "傳送",
      close: "關閉",
    },
  },
  guide: {
    cardTitle: (name) => `嗨！我是 ${name}。`,
    cardBody: "在這裡你可以和韓國朋友傳訊息。先從我開始吧 — 我會幫你。",
    cardButton: (name) => `和 ${name} 聊天`,
    steps: {
      ideas: "不知道要說什麼嗎？點一下輸入框旁的燈泡，就能看到回覆建議。",
      media: "你也可以用鍵盤上方的按鈕，請我傳照片或語音訊息。",
      sample: "想看看我在做什麼嗎？點一下「快照」，我就傳一張照片給你。第一張我請客。",
      voice: "想聽聽我的聲音嗎？點一下「語音快訊」，我就把那則訊息唸給你聽。第一次也是我請客。",
    },
    keyboard: {
      phone: {
        title: "用你自己的語言聊天吧——我會告訴你用韓文怎麼說。",
        body: "接下來，試著自己打韓文。",
      },
      hangul: {
        title: "也可以直接在這裡用韓文鍵盤打韓文。",
        body: "不需要安裝韓文輸入法。隨時可以用輸入框下方的切換鈕切換。",
      },
    },
    next: "下一步",
    done: "知道了",
    skip: "略過",
    stepOf: (step, total) => `第${step}步，共${total}步`,
    newTag: "新",
    free: "免費",
  },
  launch: {
    newTag: "新",
    coinsTitle: "認識 Yeopjeon，你的聊天錢幣",
    coinsBody: "Yeopjeon 是和韓國朋友聊天用的錢幣。這是你目前已經賺到的數量。",
    fromEpisodes: "來自你已完成的集數",
    launchBonus: "上線獎勵",
    balance: "你的餘額",
    perLesson: "每首次完成一課，就再加5。",
    gotIt: "知道了",
    chatTitle: "傳訊息給你遇見的朋友",
    chatBody: "你在各集中遇見的每個人，都能成為聊天朋友。完成更多集數，認識更多人。",
    met: "已相遇",
    now: "現在",
    episode: (order) => `第${order}集`,
    metCount: (met, total) => `已遇見${met}位朋友，共${total}位`,
    prices: "訊息 3 · 語音 15 · 照片 35",
    later: "稍後",
    start: "開始聊天",
  },
  remote: {
    noCredits: (name) => `你和 ${name} 聊天的額度已用完。`,
    notAvailable: (name) => `你還不能和 ${name} 聊天。`,
    sendFailed: "訊息未送出，請再試一次。",
    replyFailed: (name) => `${name} 現在無法回覆。`,
    cantReply: (name) => `${name} 無法回覆這句話。試著換個說法吧。`,
    rateLimited: "你傳得太快了。請稍等一下再傳送。",
    updateRequired: "請更新 App 以繼續聊天。",
    serverError: "我們這邊出了點問題，請稍後再試。",
    signedOut: "你已登出，所以這則訊息沒有送出。",
    notSent: "未送出",
    sendAgain: "重新傳送",
    unsentTitle: "訊息未送出",
    unsentDescription: "重新傳送，或刪除這則訊息。",
    deleteUnsent: "刪除",
    cancel: "取消",
    recovering: "正在取得其餘的回覆…",
    stalled: "回覆未完成。",
    refresh: "重新整理",
    loadFailedTitle: "無法載入你的聊天",
    loadFailedBody: "請檢查網路連線，然後再試一次。",
    loadFailedNew: "無法載入新訊息。",
    tryAgain: "再試一次",
  },
};
