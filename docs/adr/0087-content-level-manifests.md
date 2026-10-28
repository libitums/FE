# ADR-0087 — 콘텐츠 수준별 매니페스트: 새 형식은 새 앱만 받는다

- 상태: **채택.** ⟨2026-10-26⟩ 막간 이야기 유닛([ADR-0088](0088-interlude-story-unit.md))과 함께 앱 상수 `CONTENT_CLIENT_LEVEL`을 2로 올렸다 — 이 앱은 `manifests/level-2.json`부터 읽는다.
- 날짜: 2026-10-26.
- **사용자 결정**(2026-10-26): 막간(INT)이 든 판을 새 앱에만 보내는 방식은 **수준별 매니페스트**다. 항목마다 `min_client_level`을 적는 방식은 고르지 않았다 — 이미 나간 앱(iOS ≤ 11, Android ≤ 6)이 그 키를 몰라 새 형식을 그대로 받는다.
- 배경: [ADR-0056](0056-episode-content-delivery.md) D8의 `min_client_level`은 매니페스트 전체에 하나라, 올리면 옛 앱이 원격에서 이긴 항목을 **모두** 잠근다(내장본이 있으면 내장본). 옛 앱에 옛 형식 수정본을 계속 보낼 길이 없었다. 앱 빌드 번호(플랫폼마다 따로 노는 수)가 아니라 정수 수준을 쓰는 근거는 0056 D8 그대로다.

## 결정

### D1. 앱은 자기 수준부터 내려가며 매니페스트를 고른다

- 경로: 수준 n ≥ 2인 앱은 `manifests/level-n.json` → … → `manifests/level-2.json` → `manifest.json` 차례로 시도한다. 수준 1은 `manifest.json` 하나(옛 앱과 같다). 순수 함수 `lib/content-manifest-path.ts` `contentManifestPathsFor`.
- 다음으로 넘어가는 것은 **서버에 없는 응답**(400 · 403 · 404 · 410 — `ABSENT_HTTP_CODES`)뿐이다. 연결 실패 · 전송 예외 · 그 밖 응답은 거기서 멈추고 `unavailable` — 흔들린 연결 틈에 낮은 수준 매니페스트를 받아 새 판을 옛 판으로 되돌리지 않는다.
- 고른 매니페스트의 처리(검증 · 계획 · 저장 · 스테이징)는 지금과 같다. 저장 키도 하나(`libitum.content.manifest`)다 — 앱이 수준을 올리면 받은 원문이 달라져 「바뀜」으로 처리된다.

### D2. 콘텐츠 쪽 규약

- `manifest.json`은 수준 1 판(옛 앱이 그릴 수 있는 형식)만 가리킨다. 수준 2 판은 `manifests/level-2.json`에 적고, 본문은 **다른 경로**(예: `episodes/level-2/<id>.json`)에 둔다 — 같은 경로를 덮으면 옛 매니페스트의 `sha256`이 어긋나 옛 앱이 그 편을 잠근다.
- 두 매니페스트의 같은 id는 `version`을 따로 올려도 된다. 그림 · 소리는 같은 경로를 함께 쓴다(경로 기준 캐시라 내용을 바꿀 때는 새 이름 — `-v2`).
- `min_client_level`은 그대로 남는다 — 한 수준 매니페스트 안에서 더 높은 앱만 열게 할 때 쓴다.

### D3. ⟨2026-10-26⟩ 테스트 빌드는 테스트 버킷을 읽는다

- **사용자 결정**(2026-10-26): 새 콘텐츠는 운영 버킷에 올리기 전에 테스트 버킷에서 본다.
- 앱은 빌드 때 `PUBLIC_CONTENT_BUCKET`이 `content-`로 시작하는 소문자 이름(`content-test`)이면 그 버킷을 읽는다. 비었거나 규칙 밖이면 운영 버킷 `content`다(`lib/content-bucket.ts` `contentBucketFrom`, `contentBaseUrl`의 둘째 인자). 같은 Supabase 프로젝트의 공개 버킷이고, 안의 경로 규약(`manifest.json` · `manifests/` · `episodes/` · `images/` · `audio/`)은 운영과 같다.
- **`.env.local`에 적지 않는다** — 테스트 번들을 지을 때 명령 앞에만 붙인다(`PUBLIC_CONTENT_BUCKET=content-test pnpm bundle:host`). 출시 빌드가 테스트 버킷을 읽는 일을 막는 장치는 이 규칙뿐이다(대가 3).
- 기기 캐시는 경로 기준이라 버킷을 바꾼 앱은 지우고 다시 설치한다 — 같은 경로의 다른 내용이 섞인다.

## 대가

1. 수준 2 판을 올릴 때 매니페스트가 둘, 본문이 두 벌이 된다. 수준 1 판을 그만 고칠 때까지 이어진다.
2. 수준 2 앱은 `manifests/level-2.json`이 없는 동안 실행마다 요청을 하나 더 보낸다(404 뒤 `manifest.json`).
3. 출시 빌드에 테스트 버킷이 실리는 것을 기계로 막지 않는다 — `.env.local`에 적지 않는 규칙과, 출시 번들에 `content-test`가 없는지 보는 사람의 확인(`grep -c content-test main.lynx.bundle`이 0)에 기댄다.

## 적용 기록

- ⟨2026-10-28⟩ **내장본도 수준 2 판으로** — **사용자 결정**: 앱에 내장한 에피소드를 버킷 `manifests/level-2.json`의 판(u00 ~ u10, INT 막간 포함 · 소리 교정 `2026-10-28.2`)으로 바꿨다. 본문만 바이트 그대로 내장하고 그림은 지금처럼 받는다(u00 그림만 내장 — ADR-0081). 버킷과 버전이 같아 원격이 이기지 않으므로 새 설치는 스플래시에서 본문을 받지 않고 바로 열리며, 오프라인 첫 실행에도 INT 노드가 선다(그림은 연결된 뒤 받음). 내장 `content/manifest.json`의 `url`은 앱 안 경로(`episodes/<id>.json`)다. 번들 상한 3,080,000 → 3,480,000 bytes(실측 3,226,393 — 내장 JSON 증가분).
