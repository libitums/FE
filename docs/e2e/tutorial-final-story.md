# 이야기형 최종 복습

스펙: [tutorial-final-story](../specs/tutorial-final-story.md)

1. 기존 튜토리얼을 마친 맵에서 최종 유닛을 연다. 첫 화면은 Almost There 제목의 기내 이야기이며 시험 선택지는 아직 없다.
2. 세 대사를 넘겨 상상 속 카페와 민서가 도착하는 내용을 읽는다. 장면 배경은 기내에서 카페로 전환되며 신규 인물 이미지는 없다.
3. 인사·물 주문·내일 인사 3문항에서 상황, 뜻, 로마자를 확인하고 답한다.
4. 0~1개 정답이면 엔딩이나 완료 카드가 나오지 않는다. 격려와 세 정답 표현을 읽고 다시 풀 수 있다.
5. 재도전에서 2개 이상 맞히면 이전 오답과 섞이지 않은 현재 시도로 엔딩이 열린다.
6. 통과 직후에는 아직 결과 화면이나 맵 완료 표시를 만들지 않는다. 카페·기내·공항의 4개 엔딩 대사를 읽은 뒤 결과 화면이 나온다. Check 이후 완료·롤플레이 해금이 반영된다.
7. 엔딩 중 Back to map을 누르면 완료되지 않는다. 다시 들어오면 도입 첫 장면이다. 빠르게 여러 번 눌러도 완료 콜백은 한 번이다.
8. 개발 미리보기는 current=tutorial-final-story로 첫 도입부터 열 수 있다. 엔딩 후 실제 앱과 같은 결과 화면이 뜨며 만점은 PERFECT LESSON!, 2개 정답은 LESSON COMPLETE!로 표시된다. Check를 눌러야 맵으로 돌아가며 실제 완료 저장은 App 통합 테스트에서 확인한다.

자동 검증: EpisodeFinalJourneyScreen.ui.test.tsx, episode-final-story.unit.test.ts, App.episode-final.integration.test.tsx, App.tutorial-journey.integration.test.tsx.
