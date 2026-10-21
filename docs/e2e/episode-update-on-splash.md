# 에피소드 갱신 스플래시 — 기기 확인

결정은 [ADR-0078](../adr/0078-episode-update-on-splash.md)이 진다. 자동 테스트(unit · ui · integration)는 스테이징 · 교체 · 되돌림 · 시간 규칙 · 진행률 · 주소 키를 지키지만,
**Lynx에서 게이지가 로고 아래 겹쳐 그려지는지 · 막대가 실제 받기에 맞춰 차는지 · 스플래시 체류 · 실행 사이의 교체 · 기기 HTTP 캐시(`NSURLCache`)를 정말 비켜 가는지 · VoiceOver 낭독**은 기기에서만 판정한다.
v3(요청 헤더 `no-cache`)는 unit이 통과하고 기기에서 실패했다 — EU-11이 그 자리다.

## 준비

- iPhone 17 Pro 시뮬레이터 · Debug 호스트 + `--bundle-url=main.lynx`(로컬 번들). 번들에 `PUBLIC_SUPABASE_URL` · `PUBLIC_SUPABASE_ANON_KEY`.
- 실서버 버킷 `content`는 **읽기만** 한다 — 업로드는 사용자가 한다.
- 판정: 화면 녹화 프레임 · 스크린숏 · Accessibility Inspector · 앱 컨테이너의 저장소(`defaults export`) · `Cache.db`.
- iOS `StorageModule`은 `UserDefaults.standard`에 키 앞 `libitum.`을 **하나 더** 붙여 쓴다 — 활성 매니페스트는 `libitum.libitum.content.manifest`다.
- 앱 컨테이너: `xcrun simctl get_app_container booted com.libitum.host data`(아래 `<data>`).

### 버킷을 바꾸지 않고 「바뀐 에피소드」를 만드는 법 — 저장소 시드

버킷의 원격 전용 에피소드 `u04-directions`를 쓴다. 기기를 「옛 `(old)` 버전이 열리는」 상태로 만들면 버킷의 진짜 u04가 「바뀐 버전」이 된다.

1. 새로 설치 → 온라인으로 켜 u04가 맵에 열릴 때까지 둔다([백그라운드 받기 e2e](episode-background-download.md) EB1).
2. 앱 종료: `xcrun simctl terminate booted com.libitum.host`.
3. 내보내기: `xcrun simctl spawn booted defaults export com.libitum.host - > prefs.plist`.
4. 고치기(스크래치 폴더의 파이썬 — `plistlib` · `hashlib` · `json`):

   ```python
   import hashlib, json, plistlib

   P = "libitum.libitum.content."
   ID = "u04-directions"
   prefs = plistlib.load(open("prefs.plist", "rb"))

   episode = json.loads(prefs[P + "episode." + ID])
   for key in ("title", "title_en"):
       if key in episode:
           episode[key] += " (old)"
   text = json.dumps(episode, ensure_ascii=False, separators=(",", ":"))
   raw = text.encode("utf-8")
   sha, size = hashlib.sha256(raw).hexdigest(), len(raw)
   prefs[P + "episode." + ID] = text

   manifest = json.loads(prefs[P + "manifest"])
   for entry in manifest["episodes"]:
       if entry["id"] == ID:
           entry.update(version="2026-10-18.1", sha256=sha, bytes=size, title=entry["title"] + " (old)")
   prefs[P + "manifest"] = json.dumps(manifest, ensure_ascii=False)

   assets = json.loads(prefs[P + "assets." + ID])
   prefs[P + "assets." + ID] = json.dumps({"sha256": sha, "missing": assets["missing"]})

   for key in [P + "manifest.received"] + [P + "staged." + k + "." + ID for k in ("episode", "entry", "assets")]:
       prefs.pop(key, None)
   plistlib.dump(prefs, open("prefs.plist", "wb"))
   ```

5. 들이기: `xcrun simctl spawn booted defaults import com.libitum.host prefs.plist`.
6. 기록: 켜기 전 키 · 값 요약(활성 매니페스트의 u04 `version` · `sha256`, `…received` · `…staged.*` 유무).

**느린 받기**: Xcode Additional Tools의 **Network Link Conditioner**(3G · Very Bad Network, 또는 직접 만든 「동남아 4G」 — 왕복 지연 250ms · 내려받기 5 Mbps · 손실 1 %), 또는 `<data>/Library/Application Support/content-files/images/u04-directions` · `audio/u04-directions`를 지워 자산을 다시 받게 한다.

### `Cache.db`에 낡은 응답 심기 — EU-11

Lynx `fetch`(iOS `LynxHttpService` — 기본 세션 · 기본 캐시 정책)의 HTTP 캐시는 `<data>/Library/Caches/com.libitum.host/Cache.db`(`NSURLCache`)다. 행의 키는 **전체 URL**이다.

1. 앱 종료(위 2).
2. 낡은 매니페스트를 만든다 — 지금 버킷의 `manifest.json`을 받아 `generated_at`만 `2099-01-01T00:00:00Z`로 바꾼 파일 `stale-manifest.json`(모양은 `manifest-1` 그대로여야 앱이 저장한다).
3. 쿼리 없는 매니페스트 주소의 행을 찾는다(바꾸기 전 번들이 쓰던 키):

   ```sql
   -- sqlite3 "<data>/Library/Caches/com.libitum.host/Cache.db"
   SELECT r.entry_ID, r.request_key, r.time_stamp, d.isDataOnFS, length(d.receiver_data)
   FROM cfurl_cache_response r JOIN cfurl_cache_receiver_data d ON d.entry_ID = r.entry_ID
   WHERE r.request_key LIKE '%/object/public/content/manifest.json';
   ```

4. 본문을 바꾼다. `isDataOnFS = 0`이면 행 안의 BLOB을, `1`이면 `receiver_data`가 가리키는 파일(`<data>/Library/Caches/com.libitum.host/fsCachedData/<이름>`)을 `stale-manifest.json`으로 덮는다.

   ```sql
   UPDATE cfurl_cache_receiver_data SET receiver_data = readfile('stale-manifest.json') WHERE entry_ID = <위 entry_ID>;
   ```

5. 행이 없으면(캐시가 빈 설치) **바꾸기 전 번들**(주소 키 없음 — `547a7675` 이전)로 한 번 켜서 행을 만든 뒤 1부터.
6. 켠 뒤 `defaults export`로 활성 매니페스트의 `generated_at`을 읽고, 같은 SQL로 행의 `time_stamp`가 바뀌었는지(요청이 나갔는지) 본다.

> 실행 기록(아래)의 회차는 이 절차로 2099 매니페스트를 심었다. 그 회차에 쓴 SQL 원문은 남기지 않았다 — 위는 같은 절차를 다시 하는 법이다.

## 항목

| id | 행동 | 기대 |
| --- | --- | --- |
| EU-0 | 준비(위 「저장소 시드」 1 ~ 6) | 켜기 전 상태 기록(키 · 값 요약) |
| EU-1 | **받을 것 없음**: 조작 없이 온라인으로 다시 켬 · 녹화 | 게이지 없음 · 주황 → 첫 화면까지 길이가 바꾸기 전 빌드와 ± 0.2초 |
| EU-2 | **오프라인**: Mac 네트워크를 끄고 켬 | 게이지 없음 · 같은 길이 |
| EU-3 | **다 받음**: EU-0 상태 · 보통 네트워크로 켬 · 녹화 | 로고 아래 흰 막대(폭 160pt · 높이 4pt) + 흰 굵은 `Updating episodes`(15px)가 서고 막대가 0 → 100으로 참 · 로고는 움직이지 않음 · 다 받으면 로고 끝(또는 그 뒤) 맵 · u04 제목에 ` (old)`가 **없음** · 스크린숏 `ios-episode-update-splash-gauge.png` |
| EU-4 | **넘김 · 같은 실행 옛 버전**: EU-0 상태 + 느린 받기로 켬 | 로고 끝 + 3.0 ± 0.2초에 맵 · u04가 ` (old)`로 **열림**(「준비 중」이 아님 — 표지 · 레슨에 들어가 봄) · 1 ~ 2분 뒤(받기 끝 — 컨테이너 파일이 다시 생김) · 백그라운드 → 포그라운드 뒤에도 ` (old)` 그대로 |
| EU-5 | **다음 시작 교체**: EU-4 뒤 앱 종료 · Mac 네트워크 끔 · 켬 | 게이지 없음 · u04 제목에 ` (old)` 없음(시작 교체) · 그림 · 소리가 나옴 · 저장소에 `…received` · `…staged.*` 없음 |
| EU-6 | **새 에피소드**: 새로 설치(u04가 새 에피소드) · 온라인으로 켬 | 첫 실행에 게이지가 섬 · 3초 안에 다 받으면 맵에 u04가 바로 열림, 못 받으면 맵에서 「준비 중」이었다가 같은 실행에서 열림 |
| EU-7 | **VoiceOver · 동작 줄이기**: EU-3 · EU-4를 VoiceOver(또는 Accessibility Inspector)로 · 동작 줄이기 켬 | 게이지가 처음 설 때 `Updating episodes`가 한 번 들리고 퍼센트 변경에는 다시 들리지 않음 · 게이지에 초점을 두면 `Updating episodes, N%` · 동작 줄이기에서는 막대가 미끄러지지 않고 즉시 그 값. **이번 PR에서는 돌리지 않는다(사용자 결정 2026-10-21)** — 결과는 「미실행」 |
| EU-8 | 세션이 있는 설치(로그인 뒤)로 EU-4 | 3초 뒤 게이지가 사라지고 세션 갱신 동안 로고만 · 그 뒤 맵 |
| EU-9 | **큰 글꼴**: 접근성 최대 글꼴로 EU-3 — 15px 글로 찍는다(19px 때의 증거는 낡음) | 글이 로고 폭 안에서 줄바꿈 · 화면 밖으로 넘지 않음 · 막대와 겹치지 않음 · 스크린숏 `ios-episode-update-splash-gauge-large-font.png` |
| EU-10 | **동시 받기**: EU-0 상태 + u04 자산 파일을 컨테이너에서 지움 · Network Link Conditioner 「동남아 4G」 · 녹화. 바꾸기 전 빌드(차례 받기)와 같은 조건으로 비교 | (1) 게이지 0 → 100 시간이 바꾸기 전 빌드의 약 절반 이하 · (2) 콘텐츠 폴더에 파일이 **여러 개씩** 생김(`ls -lT`를 0.2초마다, 또는 프록시의 동시 연결 수 ≤ 4) · (3) 3초 안에 끝나면 EU-3, 아니면 EU-4 판정. Android 에뮬레이터 같은 조건은 기록만 |
| EU-11 | **기기 HTTP 캐시**: 위 「`Cache.db`에 낡은 응답 심기」 → (a) 바꾸기 전 번들로 켬 → (b) 주소 키 번들로 켬(프록시가 있으면 요청 기록) | (a) 저장된 활성 매니페스트가 2099(요청 없음 — 재현) (b) 요청 `…/manifest.json?m=<정수>`가 **나가고** 활성 매니페스트가 버킷의 `generated_at` · u04 본문 요청은 `?v=<sha 앞 16자>` · 그림 요청에는 쿼리 없음. 같은 분 안에 다시 켜면 기기 캐시에서 끝날 수 있다(실패로 보지 않음 — 시각 기록). Android는 기록만 |

## 실행 기록

모든 회차: iPhone 17 Pro 시뮬레이터(이름 `FE-catalog-e2e`), Debug 호스트 + `--bundle-url=main.lynx`, 실서버 버킷, **확인자: 에이전트**(사람 확인 아님).

| 날짜 | 빌드 | 항목 | 결과 |
| --- | --- | --- | --- |
| 2026-10-21 | 결선 빌드(`4404fccc` 계열) · 버킷 2026-10-20 상태 | EU-0 → 켬 | **관찰** — 게이지 · `Updating episodes` 섰다. 버킷의 u04 JSON(10/20 같은 이름 재업로드, 150,222 B · sha `c4780d55…`)이 매니페스트(10/19판, 141,519 B · `29e72d1e…`)와 달라 `integrity-mismatch` → 막대 0 그대로 · 로고 끝 진입 · **옛 버전 유지**(ADR-0078 D3의 검증 실패 — 실서버에서 확인). 저장소: 스테이징 키 없음 · `…manifest.received`만 남음. 버킷 점검: u01 ~ u04 JSON · 그림 10/20 같은 이름 재업로드(매니페스트 미갱신), `u00-tutorial` JSON + 그림 10/21 추가(매니페스트에 없음) — [콘텐츠 계약](../specs/episode-content-json-contract.md) §13 사건 기록 |
| 2026-10-21 | 같은 빌드 · 사용자가 `manifest.json`(u01 ~ u04 `2026-10-21.1`)을 올린 뒤 | EU-4 | **통과**(EU-3의 「다 받음」 끝은 아래 행). 첫 실행은 여전히 막대 0 — 앱 `Cache.db`에 `manifest.json` · `episodes/u04` 응답이 `max-age=3600`으로 남아 다시 쓰였다(→ EU-11). 앱 캐시를 지우고 켜자 게이지가 0 → **약 95 %** 로 차고 **로고 끝 + 약 3초**에 맵 진입, 옛 버전으로 열림. |
| 2026-10-21 | v5 번들(`863c6546` 계열) | EU-3 | **통과** — EU-0 시드(u04 활성 ` (old)`, 자산은 이미 있음)로 켬: Accessibility Inspector 라벨 `Updating episodes, 100%`(약 1.8초) → 로고 끝에 진입. 앱을 다시 켜지 않고 종료한 뒤 저장소: 활성 매니페스트 u04 `2026-10-21.1` · 본문 제목 ` (old)` 없음 · `…staged.*` · `…received` 없음 → **스플래시가 나가는 순간 교체**(ADR-0078 D4 둘째 자리) 확인. (이 회차의 저장소 조작이 오래된 로그인 세션을 되살려 넣어 이후 시뮬레이터가 로그인 화면으로 돌아갔다 — 앱 결함이 아니라 시험 조작의 부작용) |
| 2026-10-21 | 같은 빌드 | EU-5 | **통과** — 다음 실행 게이지 없음(받을 것 없음), 활성 매니페스트 u01 ~ u04 모두 `2026-10-21.1` · `…staged.*` · `…received` 없음 · u04 본문 제목에 ` (old)` 없음 → 시작 교체 확인. 오프라인 조건은 아니었다 |
| 2026-10-21 | 바꾸기 전 번들 · `547a7675`(요청 헤더 `no-cache`) | EU-11 사전 | **v3 실패 확인** — 2099 매니페스트를 심고 켜자 두 번들 모두 저장된 활성 매니페스트가 2099, 캐시 행 `time_stamp` 불변(요청 안 감). 설치 번들에 `no-cache` 문자열 있음을 확인. 원인과 결정 변경은 ADR-0078 「실기 관찰」 2 |
| 2026-10-21 | `d91a9dc3`(주소 키) | EU-11 | **통과** — (a) 바꾸기 전 번들 재사용 재현 (b) `manifest.json?m=29875897` 요청이 나가고 활성 매니페스트가 `2026-10-21` 버킷판. 프록시 기록 · `?v=` 요청 · 그림 요청 쿼리 없음은 보지 않았다 |
| 2026-10-21 | `d91a9dc3` | EU-7 | **미실행**(사용자 결정 A2). 참고로 Accessibility Inspector에서 게이지 라벨이 `Updating episodes, 0%` → `…, 100%`로 바뀌는 것만 봤다 — 실청취 · 첫 등장 알림(v5) · 동작 줄이기는 보지 않았다 |
| 2026-10-21 | v5 로컬 빌드(2,383,641 B — `863c6546` 계열) | EU-9 | **통과**(장부 기록 그대로) — 기본 글꼴에서 15px 게이지 · 문구, 최대 접근성 글꼴에서 `Updating` / `episodes` 두 줄 · 화면 안. |
| 2026-10-21 | 바꾸기 전 번들(10/20 main 계열) vs v5 번들, 받을 것 없음 · 로그아웃 상태 | EU-1 | **통과** — 주황 화면 길이(녹화 30fps, 화면 위 30 % 지점 픽셀): 바꾸기 전 3.43 · 3.20초, v5 3.07 · 3.03초 — 게이지 없음, 길어지지 않음(iOS 실행 애니메이션 포함 값) |
| 2026-10-21 | v5 번들, 시뮬레이터 앱 삭제 · `defaults delete` 뒤 재설치 | EU-6 | **통과** — 첫 실행부터 게이지(라벨 7 % → 76 %, 약 0.5초 간격), 로고 끝 + 3초 상한에 첫 화면(온보딩) 진입. 같은 실행 안에서 활성 매니페스트 u01 ~ u04 모두 `2026-10-21.1` · 본문 넷 · 스테이징 없음(u01 ~ u03은 내장 id라 스테이징 → 나가는 순간 교체, u04는 새 에피소드라 활성에 바로). 로그인 전이라 맵의 노출은 보지 않았다 |
| 2026-10-21 | Android `bundled` APK(이 브랜치 · Android 받기 4 스레드 포함), Pixel_8 에뮬레이터(읽기 전용) | Android 첫 실행 | **통과** — `pm clear` 뒤 켬: 게이지 · `Updating episodes`, 막대가 차다가 상한에서 온보딩 진입 |
| 2026-10-21 | 같은 APK | EU-2 · EU-1(Android) | **통과** — Wi-Fi · 데이터 끔: 게이지 없음, 주황 길이 2.97 · 2.60초. 켜고 받을 것 없음: 게이지 없음, 2.97 · 2.77초 |
| 2026-10-21 | 같은 APK, 에뮬레이터 콘솔 `network delay 250:250` · `network speed 5000:5000`(동남아 4G 흉내) | EU-10 일부 | **관찰** — `pm clear` 뒤 켬: 게이지가 서고 5초 무렵 약 10 %, 상한에서 진입(옛 · 내장 버전으로). 「동시 1개 vs 4개」 비교(바꾸기 전 호스트 · 번들로 같은 조건)는 하지 않았다 — 동시 받기의 효과는 **미측정**. 증거 [Android 느린 망](evidence/android-episode-update-splash-gauge-throttled.png) |
| — | — | EU-7(VoiceOver 실청취 · 동작 줄이기) · EU-8(세션 있음) · EU-10 비교 · iOS 오프라인 | **미실행** — iOS 오프라인은 Mac 네트워크를 끄지 않고는 재현할 수 없어 Android로 갈음했다 |

### 증거

- [기본 글꼴](evidence/ios-episode-update-splash-gauge.png) · [최대 접근성 글꼴](evidence/ios-episode-update-splash-gauge-large-font.png) — 600 × 1304.
- 두 장 모두 같은 회차(v5 번들) 녹화의 3.6초 프레임 — 로고 손글씨가 그려지는 중에 막대와 `Updating episodes`(15px, 최대 글꼴에서는 두 줄)가 선 모습이다. 막대는 이미 **100 %**(자산이 기기에 있어 본문만 받은 회차)라 트랙(흰색 35 %)과 채움 폭의 변화는 이 두 장에 보이지 않는다 — 채워지는 과정은 EU-3 · EU-4 녹화 관찰(약 95 %까지)로 판정했다.
- 화면 녹화(EU-3 · EU-4 · EU-5)는 저장소에 넣지 않았다.
