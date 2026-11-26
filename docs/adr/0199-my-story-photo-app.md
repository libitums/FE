# ADR-0199 내 스토리 사진 — 앱(고르기 · 찍기 · 줄이기 · 올리기 · 거절 · 확인 중)

- 상태: 채택 — 앱 · 호스트(iOS · Android), 초안 PR(머지 금지 — 스토리 PR). 서버는 운영에 있다(`20270104130000_my_story_photos.sql` · #598).
- 날짜: 2026-11-25
- 관련: [ADR-0191](0191-my-stories-reactions-as-chat.md) D11 · D13 · D15(사진 스토리 서버) · [ADR-0194](0194-my-stories.md)(내 스토리 앱) ·
  [ADR-0017](0017-host-native-capabilities-and-audio.md) D1 · D2(호스트 모듈 입장 조건) · [ADR-0026](0026-permission-entry-conditions-and-denial-handling.md)(권한 표) ·
  [ADR-0125](0125-messenger-safety-ui.md)(위기 안내 카드) · [ADR-0029](0029-product-analytics-posthog.md)(이벤트) · [ADR-0149](0149-bundle-size-ceiling-and-report.md) 개정 4(번들 천장)

## 맥락

사용자 결정(2026-11-25 「사진 스토리 진행」): 내 스토리 앱(PR #593)은 단어 · Aa 글 스토리만 있어 시작 시트에 Background만 선다. 서버(사진 버킷 · 검수 · 거절)는
운영에 있고, `companion_my_stories`의 `kinds`가 photo를 줄 때(사진 스위치 `my_story_photo` + 성인)만 사진을 올릴 수 있다. 앱 쪽 사진 고르기 · 업로드
화면을 만든다. 시안: 5 · 13 · 14번(사진 업로드 · 사진 스토리 보기), 26번(Camera · Background · 최근 사진), 27 ~ 30번(편집). 서버 계약이 시안을 이긴다.

## 결정

### D1. 시작 시트 — Camera · 사진(「Recent photos」) · Background

- 사진 둘은 `kinds`에 photo가 있고 호스트 모듈(`StoryPhotoModule`)이 있을 때만 선다(옛 호스트 · Explorer는 Background만).
- **시안 26의 「최근 사진」 격자 대신 시스템 사진 고르기를 여는 칸 하나**: 격자는 사진 보관함 읽기 권한(iOS 전체 · 제한 접근, Android
  `READ_MEDIA_IMAGES`)이 필요하고 Google Play 사진 권한 정책상 이 앱은 Photo Picker를 써야 한다. iOS `PHPickerViewController` · Android Photo
  Picker(`PickVisualMedia`)는 권한이 없고 최근 사진이 먼저 보인다.
- 고르기 결과: picked → 그 사진 위 편집, 닫음 → 시트에 그대로, 카메라 권한 거부 · 카메라 없음 · 못 읽음 → 시트 아래 안내 줄.

### D2. 호스트 모듈 `StoryPhotoModule` — `pick` · `upload` · `discard`(메서드 셋)

- `pick(source, cb)`: 고르거나 찍은 뒤 **기기에서 줄인다** — 방향을 픽셀에 적용, 긴 변 최대 1600px(키우지 않음), JPEG 품질 0.8, 다시 인코딩해 원본
  EXIF(위치 포함)를 싣지 않는다. 앱 캐시 `story-photos/<uuid>.jpg`. 콜백 값은 문자열(`picked` · `cancelled` · `denied` · `unavailable` · `busy` ·
  `failed` · `invalid`).
- `upload(path, url, headers, cb)`: 그 폴더의 `.jpg`만, `https`만, 본문은 파일 바이트(JS를 지나지 않음 — ADR-0071과 같은 이유), `Content-Type:
  image/jpeg` 고정. `discard(path)`: 그 폴더 안 파일만 지운다. pick을 시작할 때 24시간 넘은 파일을 정리한다.
- iOS: PHPicker(권한 없음) · `UIImagePickerController` 카메라(`NSCameraUsageDescription`, 9개 InfoPlist.strings). Android: Photo Picker ·
  `ACTION_IMAGE_CAPTURE` + FileProvider(`story-photos/capture/`만 공유). **Android는 CAMERA 권한을 선언하지 않는다** — 선언하면 카메라 앱 호출에도
  런타임 권한이 필요해진다.
- 입장 조건(ADR-0017 D1): (1) 화면 목록이 요구한다(사진 스토리) (2) Lynx에 사진 고르기 · 카메라 · 이미지 다시 인코딩 · 파일 업로드 경로가 없다
  (3) e2e에 사람이 판정할 항목이 있다([e2e](../e2e/my-stories.md) MSP-E1 ~ E6).

### D3. 올리기 — 업로드 → 게시, 다시 시도

- 경로는 `<액세스 토큰의 sub>/<파일 이름>`(서버 정규식 `^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$`). 업로드는 `POST /storage/v1/object/my-story-photos/<경로>`
  (bearer · apikey, `x-upsert` 없음 — 저장소 정책은 insert · select만). 같은 파일을 다시 올리면 Storage가 「이미 있음」(409 · 400 Duplicate)으로
  답하고 앱은 올린 것으로 본다.
- 게시: `companion-my-story` `{ action: "post", client_id, image_path, ko, roman, overlays, lang, tz_offset_min, client_region? }`. `client_region`은
  색 바탕과 같이 스토어 계정 나라를 알 때만.
- **한 줄(`ko`)은 서버 필수(1 ~ 120자)**: 글 상자 글, 없으면 첫 단어. 둘 다 없으면 Share가 꺼지고 「Add a word or write a line to share your photo.」.
- 만들기 한 번에 clientId 하나(두 번 눌러도 하나). 업로드에 실패하면 게시를 부르지 않고 `upload_failed`. 올리는 동안 「Uploading your photo…」.
- 올리면(또는 편집을 닫으면) 기기 캐시 파일을 지운다.

### D4. 결과

- `ok`: 보기. 스토리 `status`가 `checking`이면 사진 위에 「Checking your photo — Only you can see it until the check is done.」.
- `rejected`: 거절 판(「This photo can't be shared」 · 한 문구 — 분류는 보이지 않음) · Share 꺼짐(같은 사진은 같은 판정). 거절 id가 있으면 「Ask for a
  review」 → `companion_request_story_review` → 「Thanks — we'll take another look.」(실패면 다시 누름). 다시 본 결과를 읽는 RPC는 없다.
- `text_blocked` · `crisis`(위기 안내 카드) · `window_used` · `daily_limit` · `check_limit` · `invalid`는 글 스토리와 같은 안내. `age` → off,
  `no_photo` → 업로드 실패로.
- 읽기: 사진 · 확인 중 스토리를 읽는다(앞에는 건너뜀). 보기의 사진은 서명 주소(한 시간, 같은 경로는 45분 다시 씀).

### D5. 이벤트(PostHog만)

- 새 이름 둘: `my_story_photo_picked { source: camera | library, outcome }` · `my_story_review_requested { ok }`. `my_story_posted.kind`에 `photo`,
  `my_story_post_failed.reason`에 `rejected` · `upload_failed`. AN1 125 · AB3 95 / 87.

## 대가

- 번들 +35 kB(6,034,135 → 6,069,358 B) — 앞 천장 6,035,000 B를 넘어 **사용자 결정으로 천장 6,100,000 B**(ADR-0149 개정 4). 사진 원격 · 호스트 접점을
  `background-only`로 떼는 시험은 결선이 값으로 가져와 빌드가 실패했다.
- 보기 카드(높이 360)와 편집 바탕의 비율이 달라 aspectFill 사진 위 얹은 것의 자리가 조금 다를 수 있다(글 스토리와 같은 한계).
- 거절 판의 「다시 확인 요청」 결과를 앱이 모른다(서버에 읽기 RPC 없음).
- 서버 검수 · 사진 읽기 비용은 서버 ADR-0191 D11의 몫이다.

## 스스로 정한 기본값

- 최근 사진 격자 → 시스템 고르기 칸 하나(D1). 사진 편집은 Aa · 얹기 여덟을 늘 켬. 거절 분류는 보이지 않음 · 거절 뒤 Share 꺼짐.
- 서명 주소 한 시간 · 45분 다시 씀. 업로드 머리는 bearer · apikey만, 이미 있음 = 올림.
- 호스트: 요청 코드 7301 · 7302, 업로드 타임아웃 15초(유휴) · 60초(전체), 24시간 지난 캐시는 pick 때 정리.
- iOS `PrivacyInfo.xcprivacy`에 수집 유형 PhotosorVideos(앱 기능 · 사용자와 연결 · 추적 아님) — 사용자 결정(2026-11-25).

## 확인

- 앱: `my-story-photo.unit.test.ts`(MSP-U1 ~ U7) · `companion-my-story-photo-api.unit.test.ts`(MSP-S1 ~ S4) · `MyStoryPhoto.ui.test.tsx`(MSP-UI1 ~ UI7) ·
  `App.my-story-photo.integration.test.tsx`(MSP-I1 · I2).
- 호스트: `apps/ios/HostTests/StoryPhotoModuleTests.swift`(SP1 ~ SP13) · `apps/android/app/src/test/java/com/libitum/host/StoryPhotoSizeTest.java` ·
  `StoryPhotoPathsTest.java`.
- 기기: [e2e](../e2e/my-stories.md) MSP-E1 ~ E6.

## 개정 ⟨올리기 단계⟩ — 올라간 뒤에는 「Checking your photo…」, 줄이기 값은 그대로 ⟨2026-11-26⟩

사용자 보고(아이폰 실기기 1.4.0 (30) Release): 「서버에 이미지 보낼 때도 다운스케일해서 보내야 할 것 같은데, 오래 걸리네」. 단계별로 쟀다
([성능 보고서](../performance/reports/my-story-photo-upload-speed-iphone-17-pro-simulator-01.md)).

- **잰 것**: 기기 줄이기 0.05 ~ 0.25 s(시뮬레이터, 12MP HEIC · JPEG · 세로 · 스크린샷), 업로드 0.23 ~ 0.50 MB · 원점 0.25 ~ 0.42 s(운영 로그),
  게시 요청 6.9 ~ 9.5 s(운영 셋 — 문 · 글 검수 약 1.8 s + 사진 내려받기 약 0.5 s + 사진 읽기 · 저장 약 5 s). Share 뒤 대기의 약 90%가 서버 확인이다.
  셋 다 요청 안에서 live — 「확인 중」으로 넘어간 것은 없다.
- **D2 값은 바꾸지 않는다(긴 변 1600 · JPEG 0.8, iOS · Android 같음)**: 1280 · 0.75로 내리면 업로드가 0.2 ~ 0.5 s 준다(전체 대기의 5% 안팎). 대신
  9:16 전체 화면에서 가로 사진의 키움 배율이 3x 기기 기준 약 2.2배 → 2.7배로 커진다. 서버 사진 읽기의 이미지 입력도 API가 큰 사진을 먼저 줄여
  1600과 1280이 거의 같다(약 1,600 토큰, 추정 — 보고서). 줄이기는 이미 ImageIO 썸네일 디코드 · `inSampleSize` · 메인 스레드 밖이다.
- **D3 개정 — 단계 안내**: 사진 원격 `post(draft, onUploaded?)`가 업로드가 끝나고 게시를 부르기 전에 `onUploaded`를 한 번 부른다(업로드 실패면 부르지
  않음). 결선(`my-stories-wiring`)이 그대로 넘기고, 올리기 상태(`useStoryShare`)가 `checking`을 세워 편집 아래 줄이 「Uploading your photo…」 →
  「Checking your photo…」로 바뀐다. 새 문구 키는 만들지 않고 보기의 `checkingTitle`(8개 언어)에 「…」를 붙인다.
- **서버는 바꾸지 않는다(사용자 결정 몫)** — 제안: 글 검수를 사진 읽기와 나란히, 사진 읽기 제한을 줄여 넘으면 `checking`으로 먼저 보이기.
  사진을 고르자마자 미리 올리기는 공유하지 않은 사진이 서버에 남아 하지 않았다.
- 번들 +237 B(로컬 `.env.local` 없음 6,187,376 → 6,187,613 B). 확인: MSP-S5(원격 — 알림 순서 · 실패 때 없음) · MSP-UI3(안내 전환) · MSP-I1(결선이
  알림을 넘김) · e2e MSP-E4 기대 문구.
