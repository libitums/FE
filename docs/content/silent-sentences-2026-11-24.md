# 소리가 안 나는 문장 — 점검 보고

[ADR-0189](../adr/0189-replay-audio-and-chip-sound.md) D6의 도구가 만든 파일입니다(`node devtools/content/silent-sentences-report.mjs`). 손으로 고치지 않습니다.
까닭: `no-audio-id` 콘텐츠에 음성 id 없음 · `not-in-manifest` id는 있는데 음성 정보 파일에 없음(미업로드) · `no-recording` 레슨 정답과 같은 녹음 없음 · `placeholder` 자리표시자라 앱이 끔.

음성 정보 파일 `generated_at` 2026-11-13T04:00:00Z · 에피소드 18편 · 소리 없는 문장 179개

| 까닭 | 문장 수 |
|---|--:|
| no-audio-id | 178 |
| not-in-manifest | 0 |
| no-recording | 0 |
| placeholder | 1 |

| 자리 | 문장 수 |
|---|--:|
| pre_cut | 46 |
| post_cut | 47 |
| dialogue | 4 |
| interlude_cut | 81 |
| lesson_answer | 1 |

칩 소리 범위(앱이 싣는 유형):

| 유형 | 소리 있음 | 전체 |
|---|--:|--:|
| CLOZE | 215 | 679 |
| CLOZE_CHOICE | 188 | 410 |
| CULTURE_CHECK | 2 | 147 |
| IMG_MATCH | 204 | 330 |
| PARTICLE_FILL | 0 | 56 |
| PARTICLE_SWAP | 1 | 126 |
| REPLY_SELECT | 120 | 163 |
| ROLE_LINE | 237 | 290 |
| TRANSLATE_TO_EN | 0 | 280 |
| TURN_ORDER | 72 | 72 |
| WORD_ORDER | 32 | 168 |

| 에피소드 | 자리 | 참조 | 문장 | 까닭 |
|---|---|---|---|---|
| u00-tutorial | pre_cut | 1 | 화면에서만 보던 나라, 한국. 일주일 동안 어떤 일이 생길까? | no-audio-id |
| u00-tutorial | pre_cut | 2 | 내가 아는 한국어는 드라마에서 들은 몇 마디뿐. 대박, 사랑해요, 화이팅… | no-audio-id |
| u00-tutorial | pre_cut | 3 | 눈을 감는다. 밤의 편의점, 매운 라면에 삼각김밥. | no-audio-id |
| u00-tutorial | pre_cut | 4 | 비 오는 골목에서 누군가 우산을 내민다. | no-audio-id |
| u00-tutorial | pre_cut | 5 | 밤의 강에 불빛이 흔들린다. 다리 위로 도시의 불빛이 길게 번진다. | no-audio-id |
| u00-tutorial | post_cut | 3 | 꿈은 벌써 희미하다. 그래도 그 목소리는 남아 있다. 다음에 또… 누구였을까? | no-audio-id |
| u00-tutorial | post_cut | 4 | 여행은 이제 시작이다. 먼저 익선동 숙소부터 가 볼까? | no-audio-id |
| u01-water | pre_cut | 1 | 비행기를 오래 탔더니 목이 마르다. 편의점이 어디 있지? | no-audio-id |
| u01-water | pre_cut | 2 | 골목 어귀에 편의점 간판이 보인다. | no-audio-id |
| u01-water | pre_cut | 5 | 안쪽으로 들어가 냉장고에서 생수를 하나 꺼내 계산대에 올린다. | no-audio-id |
| u01-water | post_cut | 1 | 생수를 들고 편의점을 나와 게스트하우스로 향한다. | no-audio-id |
| u01-water | post_cut | 2 | 골목 안쪽에서 게스트하우스 간판이 보인다. | no-audio-id |
| u02-checkin | pre_cut | 4 | 사장님을 따라 현관 옆 프런트 앞에 선다. 데스크 위에 공책과 열쇠 몇 개가 놓여 있다. | no-audio-id |
| u02-checkin | post_cut | 2 | 신발장 빈칸에 운동화를 넣고, 캐리어를 두 손으로 들어 이 층으로 올라간다. | no-audio-id |
| u02-checkin | post_cut | 3 | 201호 문이 반쯤 열려 있다. 창가 침대 위에 아까 거실에서 본 배낭이 놓여 있다. | no-audio-id |
| u02-checkin | post_cut | 4 | 설마 아까 그 사람이랑 같은 방인가? | no-audio-id |
| u02-checkin | dialogue | D2 | {이름}(으)로 예약했어요. | no-audio-id |
| u03-mina | pre_cut | 1 | 방에 들어서니 아무도 없다. 캐리어를 어디에 둬야 할지 두리번거린다. | no-audio-id |
| u03-mina | pre_cut | 3 | 캐리어를 눕혀 침대 밑에 밀어 넣는다. 딱 맞게 들어간다. | no-audio-id |
| u03-mina | post_cut | 2 | 메모지에는 '유진식당'이라는 이름과 골목 약도가 그려져 있다. | no-audio-id |
| u03-mina | interlude_cut | 1 | 창가 침대 머리맡 벽에 사진 세 장이 붙어 있다. | no-audio-id |
| u03-mina | interlude_cut | 2 | 맛있어요! | no-audio-id |
| u03-mina | interlude_cut | 3 | 청계천에서 책 읽기! | no-audio-id |
| u03-mina | interlude_cut | 4 | 같은 방 친구? | no-audio-id |
| u03-mina | interlude_cut | 5 | 같은 방 친구... 나? | no-audio-id |
| u03-mina | dialogue | D2 | 안녕하세요, 저는 {이름}이에요. | no-audio-id |
| u03-mina | dialogue | D7 | 저는 스위스에서 한국어 배우러 왔어요. {이름}은/는요? | no-audio-id |
| u03-mina | dialogue | D8 | 저는 {나라}에서 왔어요. 여기서 며칠 묵어요? | no-audio-id |
| u03-mina | lesson_answer | S8-01 | 안녕하세요, 저는 {이름}이에요. | placeholder |
| u04-directions | pre_cut | 1 | 미나 씨가 오 분이라고 했는데 벌써 십 분째다. 식당이 어디 있지? | no-audio-id |
| u04-directions | pre_cut | 2 | 메모지 속 지도를 이리저리 돌려 보다가 아까 지나친 화분 앞에 또 선다. | no-audio-id |
| u04-directions | pre_cut | 4 | 통화를 마친 사람이 앞치마를 가방에 넣다가 화분 앞을 맴도는 모습에 걸음을 늦춘다. | no-audio-id |
| u04-directions | post_cut | 1 | 고맙다고 고개를 숙이자 그 사람은 손을 한 번 흔들고 반대쪽 골목으로 사라진다. | no-audio-id |
| u04-directions | post_cut | 2 | 조금 걷다 오른쪽으로 꺾자 불 켜진 유리문에 '유진식당' 글씨가 보인다. | no-audio-id |
| u04-directions | post_cut | 3 | 맛있는 냄새가 난다. 여기 맞겠지? | no-audio-id |
| u04-directions | interlude_cut | 1 | 식당 찾았어요? | no-audio-id |
| u04-directions | interlude_cut | 2 |  | no-audio-id |
| u04-directions | interlude_cut | 3 | 아이고! 괜찮아요, 가까워요! | no-audio-id |
| u04-directions | interlude_cut | 3 | 유진식당이요? 김치찌개가 정말 맛있어요! | no-audio-id |
| u04-directions | interlude_cut | 4 | 잠깐만요! | no-audio-id |
| u04-directions | interlude_cut | 5 | 여기예요! | no-audio-id |
| u04-directions | interlude_cut | 6 |  | no-audio-id |
| u04-directions | interlude_cut | 7 | 네! 맛있게 먹어요! | no-audio-id |
| u04-directions | interlude_cut | 7 | 유진식당이요! | no-audio-id |
| u04-directions | interlude_cut | 8 | 아! 큰 화분 보여요? | no-audio-id |
| u04-directions | interlude_cut | 9 | 화분에서 가까워요! | no-audio-id |
| u04-directions | interlude_cut | 10 |  | no-audio-id |
| u04-directions | interlude_cut | 11 | 저도 처음에 길을 몰랐어요. ㅎㅎ | no-audio-id |
| u05-baekban | pre_cut | 1 | 배가 고프다. 혼자 들어가도 되겠지? | no-audio-id |
| u05-baekban | pre_cut | 4 | 벽에 붙은 메뉴판을 올려다본다. 사진 없이 손글씨만 빼곡하다. | no-audio-id |
| u05-baekban | post_cut | 2 | 곧 김치찌개가 나온다. 푹 익은 김치와 돼지고기로 국물이 깊고, 매운맛은 천천히 올라온다. | no-audio-id |
| u05-baekban | post_cut | 3 | 아까 문 잠그던 그 카페, 내일 아침에 가 볼까? | no-audio-id |
| u05-baekban | interlude_cut | 1 | 벽에 걸어 둔 가방에서 앞치마 끈이 삐져나와 있다. 음악이 끝나 간다. | no-audio-id |
| u06-cafe | pre_cut | 1 | 커피가 마시고 싶다. 어제 그 카페가 이 근처였지? | no-audio-id |
| u06-cafe | pre_cut | 2 | 모퉁이를 돌자 어젯밤 문이 잠겨 있던 카페에 불이 켜져 있다. | no-audio-id |
| u06-cafe | pre_cut | 4 | 앞치마 명찰에 '도윤'이라고 적혀 있다. 어제 길을 알려 준 그 사람이다. | no-audio-id |
| u06-cafe | post_cut | 3 | 고개를 끄덕이자 도윤이 엄지를 들어 보인다. | no-audio-id |
| u06-cafe | post_cut | 4 | 창가 자리가 비어 있네. 저기 앉을까? | no-audio-id |
| u06-cafe | interlude_cut | 1 | Mami, alles guet! | no-audio-id |
| u06-cafe | interlude_cut | 2 | 앗! | no-audio-id |
| u06-cafe | interlude_cut | 3 | 죄송해요. 엄마한테... | no-audio-id |
| u06-cafe | interlude_cut | 4 |  | no-audio-id |
| u06-cafe | interlude_cut | 5 | 휴... | no-audio-id |
| u06-cafe | interlude_cut | 5 | 엄마한테 말할게요. ㅎㅎ | no-audio-id |
| u06-cafe | interlude_cut | 6 | 어제 김치찌개 어땠어요? | no-audio-id |
| u06-cafe | interlude_cut | 7 |  | no-audio-id |
| u06-cafe | interlude_cut | 8 | 와, 진짜요? 저는 많이 매웠어요... | no-audio-id |
| u06-cafe | interlude_cut | 8 | 조금이요?! 저는 물 세 병 마셨어요... | no-audio-id |
| u07-jaemin | pre_cut | 1 | 햇빛이 좋다. 오늘은 어디 갈지 여기서 정해 볼까? | no-audio-id |
| u07-jaemin | pre_cut | 2 | 의자를 당겨 앉고 나서야 맞은편 의자 뒤에 놓인 검은 가방이 눈에 들어온다. | no-audio-id |
| u07-jaemin | post_cut | 2 | 말투는 딱딱했는데, 끝인사는 다정했다. 무슨 일 하는 사람이지? | no-audio-id |
| u07-jaemin | post_cut | 3 | 창가 벽에 검은 장우산이 기대 세워져 있다. 창밖은 구름 한 점 없다. | no-audio-id |
| u07-jaemin | post_cut | 4 | 이렇게 맑은데 우산? 오늘 비 오나? | no-audio-id |
| u07-jaemin | interlude_cut | 1 | 카페 문 옆 골목. 셔츠 소매를 걷은 사람이 벽에 기대 통화 중이다. | no-audio-id |
| u07-jaemin | interlude_cut | 3 | 전화 너머가 조용해진다. 먼저 말하지 않는다. | no-audio-id |
| u08-umbrella | pre_cut | 1 | 벌써 저녁이네. 이제 숙소에 가야지. | no-audio-id |
| u08-umbrella | pre_cut | 3 | 아침에는 그렇게 맑았는데. 그 우산, 이래서였구나. | no-audio-id |
| u08-umbrella | pre_cut | 5 | 하루 종일 창가에서 노트북을 보던 그 사람이다. 우산을 한 번, 이쪽을 한 번 본다. | no-audio-id |
| u08-umbrella | post_cut | 1 | 남자는 가방을 머리에 얹고 골목 끝으로 뛰어간다. 한 번도 돌아보지 않는다. | no-audio-id |
| u08-umbrella | post_cut | 3 | 숙소에 돌아와 젖은 우산을 신발장 옆에 펼쳐 말린다. | no-audio-id |
| u08-umbrella | post_cut | 4 | 내일 저녁에 가면 그 사람 있겠지? | no-audio-id |
| u08-umbrella | interlude_cut | 1 | 비 와요!! | no-audio-id |
| u08-umbrella | interlude_cut | 2 | 저 우산 없어요. | no-audio-id |
| u08-umbrella | interlude_cut | 3 |  | no-audio-id |
| u08-umbrella | interlude_cut | 4 | 우리 둘 다요? ㅎㅎ | no-audio-id |
| u08-umbrella | interlude_cut | 4 | 알아요! 저 벌써 다 젖었어요! | no-audio-id |
| u08-umbrella | interlude_cut | 5 | 저는 그냥 뛰어요! | no-audio-id |
| u09-subway | pre_cut | 1 | 비가 그칠 것 같지 않다. 광장시장은 지하철로 가 볼까? | no-audio-id |
| u09-subway | pre_cut | 2 | 계단을 내려가자 천장의 표지판이 세 갈래로 갈라진다. 남색, 주황색, 보라색. | no-audio-id |
| u09-subway | pre_cut | 4 | 노선도 앞에 선다. 색색의 줄이 이 역에서 한꺼번에 겹친다. | no-audio-id |
| u09-subway | post_cut | 1 | 역무원이 가리킨 계단을 내려가자 남색 표지판이 보인다. 한 정거장은 금방이다. | no-audio-id |
| u09-subway | post_cut | 2 | 8번 출구로 올라오자 빗줄기가 굵다. 시장 입구까지 몇 걸음 사이에 바짓단이 흠뻑 젖는다. | no-audio-id |
| u09-subway | post_cut | 3 | 지붕 덮인 시장 골목 안은 빗소리 대신 기름 소리다. 노점이 골목 끝까지 이어진다. | no-audio-id |
| u09-subway | post_cut | 4 | 커다란 철판 위에서 두툼한 전이 기름에 지글거린다. 이 가게 앞 줄이 제일 길다. | no-audio-id |
| u09-subway | post_cut | 5 | 손가락만 한 김밥이 한입에 쏙. 겨자 소스를 찍으니 코가 톡 쏜다! | no-audio-id |
| u09-subway | post_cut | 6 | 칼국수는 작은 그릇으로. 국물이 뜨끈해서 젖은 몸이 좀 풀린다. | no-audio-id |
| u09-subway | post_cut | 7 | 육회는 처음이라 망설였는데, 배랑 같이 먹으니 달고 고소하다. | no-audio-id |
| u09-subway | post_cut | 8 | 배는 부르다. 저 전은 다음에 누구랑 같이 와서 먹어야지. 젖은 바지는 어디서 빨지? | no-audio-id |
| u10-laundry | pre_cut | 1 | 바지가 아직 축축하다. 숙소엔 세탁기가 없는데, 어디서 빨지? | no-audio-id |
| u10-laundry | pre_cut | 2 | 골목 끝에 24시간 코인 빨래방 간판이 보인다. | no-audio-id |
| u10-laundry | pre_cut | 3 | 빈 세탁기 앞에 봉지를 내려놓는다. 버튼도 안내문도 전부 한글이다. | no-audio-id |
| u10-laundry | post_cut | 1 | 교환기에 지폐를 넣자 500원짜리 동전이 와르르 쏟아진다. | no-audio-id |
| u10-laundry | post_cut | 3 | 세탁기가 천천히 돌기 시작한다. 구석에서 빨래를 개던 사람이 눈이 마주치자 가볍게 고개를 끄덕인다. | no-audio-id |
| u10-laundry | post_cut | 4 | 빨래 다 되면 저 서점에 가 볼까? | no-audio-id |
| u10-laundry | interlude_cut | 1 | 빨래방 가요? | no-audio-id |
| u10-laundry | interlude_cut | 2 |  | no-audio-id |
| u10-laundry | interlude_cut | 3 | 저도 어제 갔어요! | no-audio-id |
| u10-laundry | interlude_cut | 3 | 사장님이 말했어요. 사장님은 다 알아요. ㅎㅎ | no-audio-id |
| u10-laundry | interlude_cut | 4 | 그런데 조심해요... | no-audio-id |
| u10-laundry | interlude_cut | 5 | 이거 하얀색 티셔츠였어요. | no-audio-id |
| u10-laundry | interlude_cut | 6 |  | no-audio-id |
| u10-laundry | interlude_cut | 7 | 빨간 양말이 하나 있었어요... | no-audio-id |
| u10-laundry | interlude_cut | 7 | ...고마워요. 저도 이제 분홍색 좋아요. | no-audio-id |
| u10-laundry | interlude_cut | 8 | 빨간 옷은 따로 빨아요! | no-audio-id |
| u11-bookstore | pre_cut | 1 | 빨래가 끝났다. 비는 아직 오는데, 저 서점에 가 볼까? | no-audio-id |
| u11-bookstore | pre_cut | 2 | 문 옆 우산꽂이에 우산을 세운다. 천장까지 닿는 나무 서가 사이로 긴 테이블 하나, 그 위에 낮게 전등이 켜져 있다. | no-audio-id |
| u11-bookstore | pre_cut | 3 | 서점이라기보다 누구네 서재 같다. 비 오는 날엔 이런 데가 딱이지. | no-audio-id |
| u11-bookstore | pre_cut | 4 | 책등이 전부 한글이다. 계산대 옆 매대에 단색 표지 책이 몇 권 쌓여 있다. | no-audio-id |
| u11-bookstore | pre_cut | 5 | 한국 서점은 처음이다. 요즘은 뭐가 인기일까? | no-audio-id |
| u11-bookstore | post_cut | 2 | 평소엔 책만 펴면 잠이 오는데. 이건 읽어 봐야겠다. | no-audio-id |
| u11-bookstore | post_cut | 3 | 우산꽂이에서 우산을 뽑는다. 문을 열자 빗소리가 커진다. | no-audio-id |
| u11-bookstore | post_cut | 4 | 가방에 책 한 권. 이제 우산을 돌려줄 차례다. 저녁에 카페에 가면 우산 주인이 있겠지? | no-audio-id |
| u11-bookstore | interlude_cut | 1 | 비 오는 오후, 카페 끌림에 손님이 없다. 카운터 안에서 도윤이 잔을 닦는다. 어제 아침 아이스 아메리카노를 내준 그 직원이다. | no-audio-id |
| u12-cafe-missed | pre_cut | 1 | 벌써 저녁이다. 이 우산, 돌려주러 가야지. 그 카페, 이 근처였지? | no-audio-id |
| u12-cafe-missed | pre_cut | 3 | 유리문 너머로 창가 자리가 보인다. 의자가 비어 있다. 의자 뒤 구석에 가방도, 우산도 없다. | no-audio-id |
| u12-cafe-missed | pre_cut | 4 | 접은 하늘색 우산 끝에서 바닥으로 물이 떨어진다. 카운터 안에서 잔을 닦던 도윤이 고개를 든다. | no-audio-id |
| u12-cafe-missed | post_cut | 4 | 번호를 찍어 돌려준다. 도윤이 화면을 확인하더니 손가락 하트를 내민다. | no-audio-id |
| u12-cafe-missed | post_cut | 6 | 아샷추, 달고 쓰다. 내일은 더 일찍 와야지. 일단 숙소로. 미나 씨도 들어왔겠지? | no-audio-id |
| u12-cafe-missed | interlude_cut | 1 | 비 오는 저녁, 카페 끌림 창가. 어제 우산을 빌려준 그 사람이 노트북을 펴고 메일을 본다. 퇴근길에 잠깐 들른 참이다. | no-audio-id |
| u13-pajeon | pre_cut | 3 | 아, 아침 전화가 그거였구나. 줄이 제일 길던 그 전 가게… 그게 빈대떡이었어. | no-audio-id |
| u13-pajeon | post_cut | 3 | 겉은 바삭하고 파는 달다. 빗소리랑 기름 소리가 진짜 닮았네. | no-audio-id |
| u13-pajeon | post_cut | 4 | 막걸리는 뿌옇고 달큰한데 끝이 톡 쏜다. 요구르트 같기도 하고 사이다 같기도 하고. | no-audio-id |
| u13-pajeon | post_cut | 6 | 밤이 되니 빗소리보다 저녁 식탁의 웃음소리가 더 선명하다. 서울에 온 지 사흘. 젖은 골목마다 불빛이 번진다. 이 도시는 좀처럼 고요해지지 않는데, 이상하게 그 소란이 좋다. | no-audio-id |
| u13-pajeon | interlude_cut | 1 | 안녕하세요! 카페 끌림 도윤이에요. 저 이제 문 닫았어요! | no-audio-id |
| u13-pajeon | interlude_cut | 2 | 비 아직 많이 와요? 조심해서 가요! | no-audio-id |
| u13-pajeon | interlude_cut | 3 |  | no-audio-id |
| u13-pajeon | interlude_cut | 4 | 우산 있죠? 제일 큰 거! ㅎㅎ | no-audio-id |
| u13-pajeon | interlude_cut | 4 | 저는 괜찮아요. 저는 그냥 뛰어요! | no-audio-id |
| u13-pajeon | interlude_cut | 5 | 내일은 비 안 와요. 내일 또 봐요! | no-audio-id |
| u14-hanbok | pre_cut | 1 | 오늘은 한복 입고 창덕궁이다. 한복은 어디서 빌리지? | no-audio-id |
| u14-hanbok | pre_cut | 3 | 저녁에는 꼭 돌려줘야지. | no-audio-id |
| u14-hanbok | pre_cut | 5 | 다 예쁘다. 뭘 골라야 하지? | no-audio-id |
| u14-hanbok | post_cut | 4 | 걸을 때마다 치마가 사락사락 소리를 낸다. 햇빛을 받으니 파란색이 더 곱다. 이 모습, 궁에 가면 꼭 사진으로 남겨야지. | no-audio-id |
| u14-hanbok | interlude_cut | 1 | 그 시각, 어느 집 현관. 오늘 해 질 녘 덕수궁에서 외국인 학생들에게 한국어를 가르칠 선생님이 거울 앞에 선다. | no-audio-id |
| u15-changdeokgung | post_cut | 4 | 한복 돌려주고, 숙소에서 우산 챙기고. 이번엔 퇴근 시간에 맞춰 가 볼까? | no-audio-id |
| u15-changdeokgung | interlude_cut | 1 | 미나 씨한테 들었어요. 오늘 한복 입고 궁에 가요? | no-audio-id |
| u15-changdeokgung | interlude_cut | 2 | 빨간 한복이 잘 어울릴 텐데... | no-audio-id |
| u15-changdeokgung | interlude_cut | 3 |  | no-audio-id |
| u15-changdeokgung | interlude_cut | 4 | 파란 한복이요? 그것도 잘 어울려요! | no-audio-id |
| u15-changdeokgung | interlude_cut | 4 | 아이고, 다 빌려 갔나 봐요. | no-audio-id |
| u15-changdeokgung | interlude_cut | 5 | 저도 옛날에 한복 입고 궁에 갔어요. 제 옛날 사진 보내 줄게요. | no-audio-id |
| u15-changdeokgung | interlude_cut | 6 | 빨간 한복이에요. | no-audio-id |
| u15-changdeokgung | interlude_cut | 7 |  | no-audio-id |
| u15-changdeokgung | interlude_cut | 8 | 그때는 저도 젊었어요. | no-audio-id |
| u15-changdeokgung | interlude_cut | 8 | 옆에는 제 친구예요. 지금도 친구예요. | no-audio-id |
| u15-changdeokgung | interlude_cut | 9 | 근데 보세요. 저 눈 감았어요. ㅎㅎ | no-audio-id |
| u15-changdeokgung | interlude_cut | 10 | 그래도 이게 제일 좋은 사진이에요. 조심해서 다녀와요. | no-audio-id |
| u16-umbrella-return | pre_cut | 1 | 한복도 돌려줬다. 이제 이 우산 차례다. 퇴근 시간이면 그 사람 있겠지? | no-audio-id |
| u16-umbrella-return | pre_cut | 2 | 해가 기운 골목으로 퇴근하는 사람들이 지나간다. 카페 끌림 유리문에 불이 켜져 있다. | no-audio-id |
| u16-umbrella-return | pre_cut | 3 | 유리문 너머 창가 자리를 살짝 들여다본다. 오늘은 의자가 비어 있지 않다. | no-audio-id |
| u16-umbrella-return | post_cut | 1 | 창가 손님이 노트북을 덮고 가방을 멘다. 검은 장우산은 이제 그 사람 손에 있다. 카운터의 도윤이 잔을 든 채 둘을 본다. | no-audio-id |
| u16-umbrella-return | post_cut | 4 | 그걸 기억하다니. 그냥 기억력이 좋은 건가? 아니면... | no-audio-id |
| u16-umbrella-return | interlude_cut | 1 | 인사동을 돌아 덕수궁까지 온 미나. 아직 한복 차림이다. 전각 앞 마당에서 누가 큰 소리로 한국어를 가르치고 있다. | no-audio-id |
| u16-umbrella-return | interlude_cut | 5 | 삼겹살... 진짜 먹고 싶다. | no-audio-id |
| u17-samgyeopsal | pre_cut | 1 | 우산은 돌려줬다. 이제 저녁이다. 고깃집은 처음인데, 뭘 어떻게 하지? | no-audio-id |
| u17-samgyeopsal | post_cut | 1 | 상추, 깻잎, 마늘, 쌈장… 이거 어떻게 먹지? | no-audio-id |
| u17-samgyeopsal | post_cut | 4 | 왜냐고? 한국어로 다 말하기엔 아직 길다. 그냥, 아무도 날 모르는 데서 하루를 시작해 보고 싶었다. 짧게 그렇게만 말한다. | no-audio-id |
| u17-samgyeopsal | post_cut | 5 | 고기를 다 먹고 식사를 시킨다. 재민은 냉면, 이쪽은 된장찌개. | no-audio-id |
| u17-samgyeopsal | interlude_cut | 1 | 아까는 손님이 너무 많았어요! 오늘 뭐 했어요? | no-audio-id |
| u17-samgyeopsal | interlude_cut | 2 |  | no-audio-id |
| u17-samgyeopsal | interlude_cut | 3 | 와! 한복 입고 어디 갔어요? | no-audio-id |
| u17-samgyeopsal | interlude_cut | 3 | 와, 창덕궁! 한복도 입었어요? | no-audio-id |
| u17-samgyeopsal | interlude_cut | 4 | 아, 사진! 사진 보내 주세요! | no-audio-id |
| u17-samgyeopsal | interlude_cut | 5 |  | no-audio-id |
| u17-samgyeopsal | interlude_cut | 6 | 부끄러워요? 저는 매일 거울 앞에서 춤춰요! | no-audio-id |
| u17-samgyeopsal | interlude_cut | 6 | 저는 안 괜찮아요! 너무 궁금해요! | no-audio-id |
| u17-samgyeopsal | interlude_cut | 7 | 그럼 제가 먼저 보낼게요. | no-audio-id |
| u17-samgyeopsal | interlude_cut | 8 | 지금 연습실이에요! | no-audio-id |
| u17-samgyeopsal | interlude_cut | 9 | 이제 보내 주세요! ㅎㅎ | no-audio-id |
