# 수동 e2e — 선톡 푸시 목적지 companion-chat (ADR-0127)

Android 에뮬레이터에서 **실제 시스템 알림 → 누름 → `PushNotificationTapActivity` → 앱** 경로를 본다. 원격 FCM 발송은 쓰지 않고, 로그인 고정(`SignedInScreenFixtureTest`)의 알림 방송에 목적지를 넘긴다(`run-push-notifications.sh`와 같은 고정 — 가짜 Supabase · 디버그 APK + 로컬 번들).

```sh
PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
(cd apps/android && ./gradlew assembleDebug assembleDebugAndroidTest)
python3 -m http.server 18772 --bind 127.0.0.1 --directory apps/mobile/dist &
# 두 APK 설치 · POST_NOTIFICATIONS 허용 뒤
adb shell am instrument -w -e class com.libitum.host.SignedInScreenFixtureTest \
  -e bundleUrl http://10.0.2.2:18772/main.lynx.bundle libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner &
# 앱을 다른 탭에 두고 HOME → 알림 방송(원격 셸이 띄어쓰기를 쪼개므로 명령 전체를 따옴표로)
adb shell "am broadcast -a com.libitum.host.test.POST_PUSH_FIXTURE --es title 'Mina' --es body 'Did you go to a cafe today?' --es target '{\"kind\":\"companion-chat\",\"characterId\":\"mina\",\"variant\":\"a\"}'"
adb shell cmd statusbar expand-notifications   # 알림을 누른다
```

| id | 확인 | 기대 |
|---|---|---|
| CP-E1 | 설정 탭에 두고 미나 목적지 알림 누름 | 메신저 탭의 미나 방(생년 unasked면 ADR-0125 시트가 먼저) |
| CP-E2 | 방에서 뒤로 | 채팅 목록, 탭 Chats |
| CP-E3 | 잠긴 점원 목적지 알림 누름 | 채팅 목록 + 탭 바 위 「This chat isn't available right now.」 |
| CP-E4 | 3초 뒤 · 방에 다녀온 뒤 | 안내가 사라지고 다시 뜨지 않음 |
| CP-E5 | 실제 원격 푸시(서버 send-push · A/B 문구) | 서버 결선 뒤 — 미실행 |
| CP-E6 | iOS 실기기 탭 · VoiceOver 안내 낭독 | 미실행(iOS는 목적지 사전을 통째로 넘겨 호스트 변경 없음) |

## 실행 기록

### 2026-11-11 — Android 에뮬레이터 CP-E1 ~ E4 통과(기기 결함 하나 고침)

- Pixel_8 에뮬레이터(읽기 전용), 위 절차. 미나 알림 → 설정 탭에서 미나 방으로(생년 시트 먼저) · 뒤로 → Chats 목록.
- **결함 — 안내가 안 보임**: 점원 알림 → 목록은 섰는데 안내 줄이 보이지 않았다. 임시 콘솔 로그로 보니 상태는 3초 동안 켜져 있었다(56.8 s → 59.8 s) — 줄을 목록 바닥 24px에 두어 **목록 위에 겹치는 바텀 네비게이션에 가려졌다**. → 네비게이션 몫(64 + 4)만큼 더 띄웠다. 그 뒤 탭 바 위에 보이고 3초 뒤 사라지며, 미나 방에 다녀와도 다시 뜨지 않았다. 임시 로그는 지웠다.
- 알림 방송 고정이 `title` · `body` · `target` extra를 받도록 넓혔다(없으면 이전과 같이 알림 목록).
- 시도했다 버린 길: 디버그 가능(`debuggable`) bundled APK + `run-as … am start PushNotificationTapActivity` — `debuggable`이 `BuildConfig.DEBUG`를 켜 앱이 10.0.2.2:3000 번들을 읽으려다 비었다. 이 변경은 되돌렸다.
