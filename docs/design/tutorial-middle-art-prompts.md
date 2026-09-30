# 중간 카페 아트 — 생성 기록

2026-09-30, built-in image_gen 도구로 생성했습니다. 기본 모델 경로를 사용했고 CLI/API fallback은 사용하지 않았습니다.

참조: 초반 `imagined-cafe.jpg`, 최종 `final-cafe.jpg`, 교체 전 지민 기본 포즈. 기존 이미지 원본은 Git 이력에 보존됩니다. 인물 기본 이미지를 생성한 뒤 같은 결과를 입력해 미소 표정을 만들었습니다.

산출물: `apps/mobile/src/screens/visual-novel/assets/cafe/`의 배경 PNG 941×1672, 기본/미소 인물 PNG 각각 1086×1448. 두 인물 이미지는 alpha 투명도를 보존했습니다. 같은 artwork resolver를 사용하는 전화 프로필에도 새 기본 이미지가 적용됩니다.

## 배경 프롬프트

Use case: illustration-story. Create a production mobile visual novel BACKGROUND ONLY, portrait 9:16 (prefer 864x1536). The two reference images are the EXISTING opening and final café scenes of the same story. Match their soft painterly animated-film illustration, golden afternoon sunlight, honey-colored wood, muted sage green, delicate foliage shadows, blue Seoul sky, gentle luminous detail. Show the exterior entrance of this SAME hillside Seoul café from a visitor's eye-level on the little stone lane: warm cream plaster, wood-framed open glass door, large wooden window, pale sage-and-cream striped awning, trailing ivy and a few potted plants. Through the door subtly see the familiar wooden chairs and round table. This is the middle story between the references. Compose a natural full-bleed scene, keep middle area open for a separately composited standing character, and lower 35% relatively quiet pavement for app dialogue overlay. No characters, no people, no written text, no signs, no logos, no interface, no borders. Avoid the glossy realistic 3D/game-render look; preserve the exact warm illustrated atmosphere of the references. Output a single finished background image.

## 기본 표정 프롬프트

Use case: style-transfer / identity-preserve. Production transparent visual novel character sprite. Reference image 1 is the exact character identity, outfit, proportions and standing pose to preserve: young adult Korean woman Jimin, shoulder-length gently wavy dark brown hair, sage green top, loose cream knitted cardigan with rolled sleeves, dark brown trousers, tan cross-body bag, hands lightly resting together in front. Reference image 2 is ONLY the art-direction reference for the soft luminous painterly animated-film world: warm golden afternoon, diffuse honey highlights, delicate brush-painted texture, muted sage and cream colors. Redraw image 1 so she convincingly belongs in image 2 rather than looking like a glossy fashion game cutout. Preserve recognizably the same face and outfit. Friendly calm small CLOSED-MOUTH smile, natural expressive brown eyes, subtle painterly facial features, restrained fine linework, not photorealistic, no plastic skin. Single centered head-to-below-knee portrait sprite, whole head/hair and both arms/hands fully inside frame, same front-facing standing pose. Portrait 3:4, prefer 1024x1360. True TRANSPARENT background with clean soft alpha edges; no scene, no white backdrop, no black backdrop, no checkerboard baked into pixels, no text, no logo, no UI. Golden light from upper left consistent with the café. Do not add props or people.

## 미소 표정 프롬프트

Use case: identity-preserve. Edit this transparent visual-novel character sprite to create the second expression variant for the SAME woman. Change ONLY her expression to a clearly warmer happy smile, with gently smiling eyes and a slightly open smiling mouth. Preserve EXACTLY the face identity, hairstyle, body proportions, pose, hands, clothing, bag, position, golden left-side light, painterly texture, framing, canvas size and transparent alpha background. Keep all silhouette edges and shoulder/hip alignment consistent so switching between the two images does not visibly jump. No extra props, text, backdrop, UI, checkerboard or additional people. Output one transparent PNG sprite.
