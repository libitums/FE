# 작업 스펙: 중간 스페셜 디자인 적용

## 목적 (goal)
튜토리얼 중간 스페셜의 임시 화면을 기존에 디자인된 컴포넌트로 바꾸어 앞뒤 이야기와 시각적으로 연결합니다.

## 타깃 (target)
- 디바이스: [추론] 기존 모바일 Lynx 앱 지원 범위.
- 브라우저 하한: [추론] 네이티브 앱이며 웹 지원 확대 없음.

## 디자인 (design_ref)
DESIGN.md 표준 따름. 별도 DESIGN.md가 없어 기존 VisualNovelDialog, CallCaller, CallLineBubble, Button, RoundButton과 디자인 토큰을 재사용합니다. 기존 도입·최종 서사의 명암 레이어를 카페에도 적용합니다. 기존 카페 시각 계약의 불투명 패널과 안전영역 안 배경 규칙은 이 스펙으로 대체합니다.

## 범위
- 포함(scope_in): 카페 대화창·버튼·헤더와 전체 화면 배경, 전화 상대·시계·대사·버튼 디자인 연결, 미리보기 경로.
- 제외(scope_out): 새 인물·대사·이미지·음원, 메신저의 기존 ChatBubble 교체, 완료·해금 규칙 변경.

## 수용 기준 (acceptance_criteria)
1. 카페는 기존 VisualNovelDialog의 translucent 표면을 사용하고 한국어·로마자·번역을 유지합니다. Next와 Start over는 기존 Button을 사용합니다.
2. 배경은 safe area까지 이어지고 헤더·버튼은 safe area 안에 놓입니다. 여정과 롤플레이에서 같은 화면을 사용합니다.
3. 전화는 기존 CallCaller와 CallLineBubble을 사용하며 재생·응답·대본 순서를 유지합니다. 통화 시계는 시작 후 작동하고 완료 시 멈추며 다시보기에서 초기화됩니다.
4. 중도 나가기, 완료 저장, 다시보기, 초급 학습 유닛과 최종 복습 해금은 기존 동작을 유지합니다.
5. 아이콘으로 바뀐 나가기 버튼의 접근성 이름은 진입한 여정·롤플레이 경로를 유지합니다.

## 측정 (measurement)
[추론] 기존 스페셜 완료 기록으로 중간 이야기 완료율을 확인합니다. 새 이벤트는 추가하지 않습니다.

## 제약 (constraints)
기존 이미지와 음원을 재사용하고 번들 예산과 CI 정책을 유지합니다. 시계 갱신은 기존 CallClock 안에 한정합니다.

## 시각 레퍼런스 (visual_reference)
기존 도입·최종 이야기의 VisualNovelDialog, 서사 통화의 CallCaller·CallLineBubble.

## 비고
컴포넌트 선택·기존 콘텐츠 유지·타깃·측정은 사용자 요청에서 구체화한 미확인 추론입니다.
