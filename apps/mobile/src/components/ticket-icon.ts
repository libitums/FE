// 학습 티켓 아이콘입니다. 디자인 시스템 아이콘(@libitums/icons 0.5.0)에 티켓이 없어 앱에 둡니다 — 시안(EnE1 · EnE3)의
// 모양 그대로, 양옆이 파인 표 한 장입니다. 색은 `current-color`로 받습니다(다른 아이콘과 같은 규약).
// 아이콘 패키지에 티켓이 생기면 그것으로 바꿉니다.

const ticketPath =
  "M3 7a2 2 0 012-2h14a2 2 0 012 2v2.5a2.5 2.5 0 000 5V17a2 2 0 01-2 2H5a2 2 0 01-2-2v-2.5a2.5 2.5 0 000-5V7z";

export const ticketIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="${ticketPath}"/></svg>`;
