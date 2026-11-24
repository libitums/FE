# ADR-0158 — 태국어 · 미얀마어는 이야기 번역 전용 언어로 연다

- 상태: **채택 — 앱 · 버킷 번역 파일.** ⟨2026-11-20 개정⟩ **화면 문구도 th · my로 — 아래 「개정」이 D1의 「화면 문구는 영어」를 대체한다.** 매니페스트(`manifests/level-5.json`)에 두 언어 항목을 더하는 것은 사람 몫(아래 「적용」).
- 날짜: 2026-11-18.
- 사용자 결정(2026-11-18): 「버킷 + 앱 번역 언어」 — 태국 · 미얀마 학습자가 에피소드 대사 번역을 th · my로 본다. 앱 화면 문구(UI)는 영어 그대로.
- 이어받는 결정: [ADR-0091](0091-vietnamese-localization.md)(번역표 · `localizeEpisode`) · [ADR-0102](0102-episode-translation-files.md) D2 · D3(언어별 번역 파일 · 받기 차례) ·
  [ADR-0145](0145-content-level-5.md)(수준 5 매니페스트).

## 맥락

콘텐츠 원본(staging, 11-10판)의 18편 모두에 `translations.th` · `translations.my`가 있지만 운영 버킷에는 vi · id · es · ja만 올라가 있었고, 앱도
네 언어만 읽었다. 앱의 번역 언어는 UI 언어와 같은 값(`loadUiLanguage`)이고, 언어 선택 화면 하나가 둘을 함께 정한다.

## 결정

### D1. th · my를 `EntryLanguage`(= `UiLanguage`)에 더하고, 화면 문구 표는 비운다
- `entryLanguages = [en, vi, id, es, ja, th, my]`. 문구표(`uiCopyCatalog`)의 th · my는 `{}` — `uiCopyFor("th")`는 영어 표 그대로다(`isStoryOnlyLanguage`).
- 따로 「번역 언어」 저장값을 두지 않는다. 지금 구조(언어 하나가 UI · 번역 · 채팅 l1을 함께 정함)를 그대로 쓰면 받기 차례 · 카탈로그 번역 · 설정 › Language ·
  저장 알림이 바뀌지 않는다. 언어가 하나라 「UI는 베트남어, 이야기는 태국어」 같은 조합은 없다 — 필요해지면 그때 나눈다.
- 라벨은 영어 이름 + 그 언어 이름(`Thai · ภาษาไทย`, `Burmese · မြန်မာ`) — 영어를 못 읽는 학습자도 자기 언어를 찾는다. 국기는 같은 틀(40×28)로 그렸다.
- 기기 언어 태그 `th-*` · `my-*`도 그 언어로 받는다(저장값이 없을 때).
- 채팅 l1도 th · my로 맞춰진다(서버 `l1` 검사는 BCP-47 모양만 본다) — 번역 · 교정 설명이 그 언어로 온다.

### D2. 번역 언어 어휘(`ContentLanguage`)와 매니페스트 · 본문 디코더가 th · my를 읽는다
- episode-core `translationsOf` · 앱 `translationRefsOf`의 언어 목록에 th · my. 모르는 언어 키를 조용히 버리는 규칙은 그대로라, **옛 앱(1.4.x 이하)은 매니페스트의
  th · my 항목을 무시한다**(MT2 — 11-05 #376부터 같은 규칙). 수준 5 매니페스트는 #425(11-14) 이후 앱만 읽는다.

### D3. 글꼴은 시스템 대체 글꼴에 맡긴다 — 번들 글꼴을 더하지 않는다
- Jost · Duru Sans에 타이 · 미얀마 글자가 없어 글자마다 시스템 글꼴로 떨어진다. Android: API 30 · 37 에뮬레이터 모두 `NotoSansThai` · `NotoSansMyanmar`(UI 판 포함) 있음,
  bundled 빌드에서 언어 선택 · 시작 화면의 타이 · 미얀마 글자가 정상으로 그려짐(2026-11-18). iOS: 런타임에 `Thonburi` · `MyanmarSangamMN` · `NotoSansMyanmar` 있음 —
  기기 화면 확인은 아직.
- 번들 크기: 국기 SVG 둘 · 라벨뿐(`main.lynx.bundle` 5039.1 kB / 천장 5327.0 kB).

## 적용(버킷)
- 2026-11-18: `content/translations/level-5/{th,my}/<id>.json` 36개 새로 올림(덮어쓰기 없음, `x-upsert: false`). 만든 법은 vi와 같다
  (`{schema, episode, language, entries}`, `ensure_ascii=False`, 들여쓰기 2, 끝 줄바꿈) — 같은 변환으로 만든 vi가 운영 vi와 17/18 바이트 일치(u15만 손으로 더한 aside 한 줄 차이).
  공개 URL sha256 36/36 일치.
- **남은 일(사람)**: `manifests/level-5.json`의 각 편 `translations`에 th · my 항목(`url` · `version` = 그 편 vi 판 · `sha256` · `bytes`)을 더해 올린다. 그 전에는 새 앱도
  파일을 받지 않는다(받기 차례는 매니페스트 항목만 따른다).

## 대가 · 위험
1. 화면 문구는 영어다 — 영어를 못 읽는 태국 · 미얀마 학습자에게 UI가 막힐 수 있다. 전체 UI 번역은 별도 결정.
2. u15 「Stepping back to fit them both in the frame.」 aside는 staging 원본에 번역이 없어 th · my에서도 영어로 남는다(vi 등은 손으로 더해 둠).
3. 미얀마 기기 일부는 Zawgyi 인코딩 글꼴을 쓴다 — 유니코드 미얀마 글자가 깨져 보일 수 있다. 지금 대응하지 않는다.

## 개정 ⟨2026-11-20⟩ — 화면 문구도 태국어 · 미얀마어로(사용자 결정 「B」)

- **사용자 결정(2026-11-20)**: 「B — 화면 문구를 번들에 싣고 번들 천장을 올린다」. 버린 대안: 문구표를 버킷에서 받기(첫 실행 · 오프라인에서 영어가 섬, 받기 경로가 늘어남).
- **D1 대체**: `uiCopyCatalog.th` · `.my`가 완전한 표(`ui-copy-th*.ts` · `ui-copy-my*.ts`, 언어마다 vi와 같은 구획 14개 + 요금제 · 상점 · 고지 구획 `ui-copy-<lang>-plans.ts` 하나 — vi는 공용 `ui-copy-plans.ts` · `ui-copy-shop-asia.ts`를 씀)이고
  `uiCopyFor("th" | "my")`는 영어가 아니다. `isStoryOnlyLanguage`는 지웠다(이야기 번역 전용 언어가 없다). 언어 하나가 UI · 번역 · 채팅 l1을 함께 정하는 구조는 그대로다.
- **함께 바뀐 자리**: 요금제 · 상점 · 고지(`ui-copy-<lang>-plans.ts`, 요금제 이름은 영어 — ADR-0144 · 0160), 연속 학습 보상 · 조립 힌트(구획 파일 안), 엽전 수 묶음 기호 `,`,
  학습자 프로필 미리보기 틀(`learner-profile.json`의 `preview.*.th` · `.my`), 나라 이름 표(`country-names/{th,my}.json` — 버킷, [ADR-0059](0059-learner-profile.md) 개정),
  인물 소개 · 직업 · 나이 · 시트 첫 말(`companion-*roster.ts`), iOS 추적 허용 안내(`th.lproj` · `my.lproj`), Android 알림 채널(`values-th` · `values-my`).
- **D3 보탬 — 미얀마어 줄 간격**: iPhone 13 mini 시뮬레이터에서 미얀마어 여러 줄 글의 위아래 표시가 닿아, `.app-lang-my`가 줄 간격 토큰(본문 · 캡션 · 제목 · 라벨)을
  글자 크기의 약 1.75배로 다시 정의한다(`app-shell-class.ts` · `app.css`). 태국어는 닿지 않아 두지 않았다. 절차 · 기록은 [e2e](../e2e/ui-thai-burmese.md).
- **번역**: 모두 초안 — 원어민 검수 전이다. 태국어는 성별 어미(ครับ · ค่ะ) 없는 중립 존댓말, 미얀마어는 유니코드(Zawgyi 아님 — 단위 테스트 TM-U9). 인물 이름은 vi처럼 로마자.
- **번들**: `main.lynx.bundle` 5,324,085 → 5,674,045 B(+349,960). 천장 5,327,000 → 5,705,000 B([ADR-0149](0149-bundle-size-ceiling-and-report.md) 개정).
- **대가 1(위) 갱신**: 화면 문구가 영어라 막히는 위험은 없어졌다. 대신 번역 품질 위험(초안)과 번들 +6.6%가 생겼다.
- ⟨2026-11-24⟩ 같은 길로 대만 중국어(zh-TW)를 더했다 — [ADR-0185](0185-ui-traditional-chinese-taiwan.md). zh-TW는 이야기 번역 파일이 없어 콘텐츠는 영어 원문이다.
- **남은 일(사람)**: 원어민 검수 · 버킷에 `country-names/{th,my}.json` 올리기 · 스토어 등록정보(App Store Connect에는 미얀마어 현지화가 없다 — Play만 가능).
