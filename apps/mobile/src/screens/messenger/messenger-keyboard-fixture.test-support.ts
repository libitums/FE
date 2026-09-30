import type { MessengerConversation, MessengerUnitId } from "./messenger.contract";

const conversations: Record<MessengerUnitId, MessengerConversation> = {
  "appointment-confirmation": {
    id: "appointment-confirmation",
    title: "A Message from Minseo",
    participantName: "Minseo",
    messages: [
      {
        id: "jimin-schedule",
        sender: "jimin",
        text: "토요일 오후 2시에 역 앞 카페에서 만나요.",
        translation: "Let's meet at the café by the station at 2 p.m. on Saturday.",
      },
      { id: "self-accept", sender: "self", text: "좋아요!", translation: "Sounds good!" },
      {
        id: "jimin-directions",
        sender: "jimin",
        text: "카페는 2번 출구 오른쪽에 있어요.",
        translation: "The café is on the right of Exit 2.",
      },
      {
        id: "self-thanks",
        sender: "self",
        text: "고마워요!",
        translation: "Thank you!",
        choices: ["미안해요!", "고마워요!", "괜찮아요?", "안녕히 가세요!"],
      },
      {
        id: "jimin-goodbye",
        sender: "jimin",
        text: "그럼 토요일에 봬요!",
        translation: "See you on Saturday, then!",
      },
    ],
  },
};
export const keyboardConversation = conversations["appointment-confirmation"];
