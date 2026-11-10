// 자판 지우기 아이콘입니다. 디자인 시스템 아이콘(@libitums/icons 0.5.0)에 지우기(backspace) 모양이 없어 앱에
// 둡니다 — 왼쪽이 뾰족한 칸 안에 ×(ADR-0112). 예전 `cross`(×만)는 「닫기」로 읽혔습니다. 색은
// `current-color`로 받습니다(다른 아이콘과 같은 규약). 아이콘 패키지에 생기면 그것으로 바꿉니다.

const outline = "M9 5h11a1 1 0 011 1v12a1 1 0 01-1 1H9l-6-7 6-7z";
const cross = "M12.5 9.5l5 5M17.5 9.5l-5 5";

export const backspaceIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="${outline}"/><path d="${cross}"/></svg>`;
