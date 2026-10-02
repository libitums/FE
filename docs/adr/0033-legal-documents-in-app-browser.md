# ADR-0033 — 법률 문서(개인정보 처리방침 · 이용약관)를 앱 안 브라우저로 연다

- 상태: **채택** — 목적지 URL과 여는 방식은 사용자 결정이다(2026-09-30).
- 날짜: 2026-09-30
- 다루는 축: **호스트 네이티브 능력**(ADR-0017의 축 — 아홉째 모듈) · **나가는 외부 이동의 목적지**(ADR-0026 D4 ·
  ADR-0028 D4의 축)
- 대체하는 것:
  - **LIB-259의 「개인정보 보호 및 약관」 화면** — `screens/terms/` 여섯 파일(고정 임시 본문 · 절 넷)이 사라진다.
    `docs/specs/settings.md` §3의 약관 절 · 이벤트 `terms_opened` · route `terms`도 함께 사라진다.
  - [ADR-0031](0031-ui-language-catalog.md) U4의 「약관 본문은 영어 초안」과 확인 필요 5 — 본문이 앱 밖(Notion)으로
    나가 앱에 약관 문구가 없다.
- 적용 기록(결정을 바꾸지 않는다):
  [ADR-0026](0026-permission-entry-conditions-and-denial-handling.md) D4 — 나가는 목적지에 **고정 문서 둘**이 더해진다.
  [ADR-0029](0029-product-analytics-posthog.md) — 이벤트 이름 하나가 바뀐다(`terms_opened` → `legal_document_opened`).

**왜 새 번호인가** — 호스트 모듈이 하나 더 서고(ADR-0017 D2 재검토 트리거 발동), 나가는 목적지가 는다. 두 축 모두
기존 ADR이 **이 목적지를** 덮지 않는다(ADR-0010 D10).

## 맥락

- 스토어 · Google · Meta 로그인 설정이 **공개 URL의 개인정보 처리방침**을 요구한다. 사용자가 두 문서를 위키 초안에서
  Notion 공개 페이지로 옮겼다.
- 앱에는 LIB-259가 세운 **고정 임시 본문** 화면이 있었다. 문구는 자리표였고 실제 문서와 달랐다.
- 로그인 화면의 동의 문구(`By signing up, you agree to the Terms of Use & Privacy Policy`)는 눌러도 아무 데도 가지
  않았다.

## 결정

### D1. 문서는 Notion 공개 페이지이고, 앱은 **URL 둘을 호스트에 고정**한다

| `LegalDocument` | URL |
|---|---|
| `privacy-policy` | `https://gregarious-pharaoh-bb6.notion.site/DURU-Privacy-Policy-3eb0c2540c01802cad91cc0430552402` |
| `terms-of-use` | `https://gregarious-pharaoh-bb6.notion.site/DURU-Term-of-Use-3eb0c2540c0180ef9072f0b447b3b468` |

- 정본은 `apps/ios/Host/LegalDocumentModule.swift`의 `LegalDocumentURL.table`이다. **JS는 URL을 모른다** — 문서
  이름(`LegalDocument`)만 넘기고, 호스트가 표에서 찾는다. 표에 없는 이름 · 문자열이 아닌 값 · `https`가 아닌 주소는
  열지 않는다(`invalid-arguments`).
- 그래서 JS 번들이 바뀌어도 **열 수 있는 곳은 둘에서 늘지 않는다.** 목적지를 바꾸려면 호스트 빌드가 필요하다 —
  이것이 대가다(「대가」).

### D2. 호스트 모듈 `LegalDocumentModule` — 메서드는 **하나**(`open(args, callback)`)

- `SFSafariViewController`를 최상위 뷰 컨트롤러 위에 띄운다. 콜백은 표시가 끝난 뒤 `opened`, 띄울 자리가 없으면
  `failed`, 인자가 틀리면 `invalid-arguments`다. JS 쪽은 모양이 틀린 응답을 `malformed`로 읽는다.
- **ADR-0017 D1의 입장 조건 셋을 통과한다**: (1) 제품 화면이 요구한다(로그인 · 설정). (2) 대체 경로 0개 — Lynx에는
  웹뷰도 외부 URL 열기도 없다. (3) 권한 · 엔타이틀먼트를 요구하지 않는다.
- 접점은 `apps/mobile/src/lib/legal-document.ts`(`openLegalDocument`)다. 호스트가 없으면(`ui` · 웹 미리보기)
  `unavailable`을 돌려주고 아무 일도 없다.

### D3. 어디서 여는가 — 로그인의 동의 문구 링크 둘과 설정의 항목 둘

- **로그인**: 동의 문장 아래 `Terms of Use` · `Privacy Policy`가 각각 버튼(`accessibility-traits="button"`)이다.
  조작 단위 목록에서 수단 넷 뒤에 선다.
- **설정**: 이동 항목이 **셋**이 된다 — `User profile` · `Privacy Policy` · `Terms of Use`. 앞의 둘이었던
  `Privacy and terms`는 사라진다. 법률 문서 항목은 **스택에 `push`하지 않는다** — 설정 화면이 그대로 서 있고 그 위에
  시트가 뜬다.

### D4. 이벤트는 `legal_document_opened { document, source }` 하나다

- `source`는 `login` · `settings`. 탭 직후 · 호스트 호출 전에 1회 낸다 — `terms_opened`가 `push` 직전에 냈던 것과
  같은 자리다. 호스트가 실제로 띄웠는지는 싣지 않는다.
- 이벤트 이름 목록은 27개 그대로다(하나가 바뀌었다).

### D5. ADR-0026 D4의 표로 문서 시트를 읽는다

| | 딥링크 (**여전히 금지**) | 문서 시트 (**이 ADR이 여는 것**) |
|---|---|---|
| 방향 | 들어온다 | **나간다** — 목적지 둘 중 하나를 연다. 돌아오는 값이 없다 |
| 등록이 필요한가 | 그렇다 | **아니다** |
| 진입점이 느는가 | 는다 | **늘지 않는다** |
| 누가 시작하나 | 밖 | **사용자가 로그인 · 설정에서 누른다** |
| 목적지 | 임의 | **둘** — 호스트에 고정된 `https` URL. 거기서 다른 페이지로 가는 것은 시트 안의 일이고 앱에 닿지 않는다 |

## 버린 대안

- **Safari로 밖에 연다(`UIApplication.open`)** — 앱을 떠나 돌아오는 길이 상태 막대의 작은 버튼 하나가 된다. 로그인
  중간에 이탈이 는다.
- **JS가 URL을 넘긴다** — 번들 하나로 임의 목적지가 열린다. ADR-0026 D4의 「목적지가 고정」이 무너진다.
- **앱 안에 본문을 그대로 둔다(LIB-259 화면에 실제 문구)** — 문구가 두 곳(Notion · 앱)에 살아 어긋난다. 스토어가
  요구하는 공개 URL은 어차피 필요하다.
- **`WKWebView` 화면** — 주소 표시 · 공유 · 닫기를 다시 만들어야 하고, 시트 안의 이동을 막는 규칙을 우리가 져야 한다.

## 대가

- 문서 URL이 바뀌면(Notion 페이지 이동 · 자체 도메인) **호스트 빌드**가 필요하다. 문서 **내용**만 바뀌는 것은 빌드가
  필요 없다.
- 오프라인이면 시트가 Safari의 오류 페이지를 보인다. 앱은 그것을 알지 못한다.
- Android 호스트에는 같은 모듈을 `Custom Tabs`로 이관했다(2026-10-02). 로그인 화면의
  두 링크는 기기에서 검증했고, 설정 화면의 링크는 실제 계정이 없어 E2E가 남았다.

## 재검토 조건

- 문서가 셋째로 요구되면(예: 데이터 삭제 안내 페이지) 표에 한 줄을 더하는 것은 이 결정 안이다. **목적지를 JS가
  고르게 하자는 요구**가 오면 이 ADR을 다시 연다.
- 자체 도메인으로 옮기면 D1의 표를 고친다 — 결정은 그대로다.
