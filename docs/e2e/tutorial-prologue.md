# 상상 튜토리얼 시작 유닛

제품에서는 튜토리얼 표지의 Next로 진입합니다. 화면 배치만 확인할 때는 playground의
`tutorial-prologue`를 사용합니다. playground는 완료 시 맵으로 가므로 제품의 보상·잠금 해제는
App 통합 테스트 또는 제품 경로에서 확인합니다.

## 확인 절차

1. 기내에서 `Before We Land` 헤더와 기존 VisualNovelDialog의 독백·번역을 확인합니다.
   배경이 화면 하단까지 이어지고 흰 safe area 띠가 없어야 합니다.
2. 독백을 진행합니다. 같은 배경에서는 애니메이션을 다시 시작하지 않고, 거리로 바뀔 때는
   이미지 로드 뒤 페이드합니다. 등장인물 그림이 없어야 합니다.
3. 민서의 메시지를 받고 두 번 답장을 보냅니다. 입력창은 하단 safe area 위 8px에 있어야 하며,
   메시지를 보내기 전에는 다음 구간으로 넘어가지 않아야 합니다.
4. Continue로 카페에 진입해 민서를 기다리는 독백을 읽습니다.
5. 전화 화면에서 Minseo 이름과 익명 아바타를 확인합니다. 통화 종료 후 Continue로 진행합니다.
   음성 재생은 현재 연결되어 있지 않습니다.
6. 기내로 돌아와 마지막 독백까지 진행합니다. 이 시점에만 제품의 완료 화면이 표시되고,
   완료 화면에서 맵으로 돌아가면 표지가 완료되어 일반 학습이 열려야 합니다.
7. 중간 구간에서 나갔다가 다시 진입합니다. 첫 기내 독백부터 시작하고 이전 대화 타이머가
   새 화면을 넘기지 않아야 합니다.

## 검증 기록

네이티브 화면 확인과 미측정 성능 범위는
[튜토리얼 분석 기록](../performance/reports/tutorial-imagination-prologue-iphone-17-pro-simulator-01.md)에 남깁니다.
완료·이탈·재진입·단일 형식 호환은 `App.episode-intro.integration.test.tsx`와
`EpisodePrologueScreen.integration.test.tsx`에서 확인합니다.
