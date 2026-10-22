// @libitums/episode-core/lines — 롤플레이 줄 찾기 · 「나」 화자 값. zod도 background-only도 끌고 오지 않아
// 앱의 메인 스레드(화면 경로)가 값을 가져와도 됩니다. 같은 값은 `./episode`에서도 내보냅니다(호환).

export { EPISODE_SELF_SPEAKER } from "./speaker";
export { roleplayLinesOf, type RoleplayLines } from "./roleplay-lines";
