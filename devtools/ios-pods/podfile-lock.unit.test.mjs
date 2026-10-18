// `unit` 계층: `Podfile.lock`이 지금의 `Podfile`로 만들어졌는가.
//
// 성능 스모크(와 릴리스 빌드)는 `pod install --deployment`로 설치합니다 — 잠금 파일이 Podfile과 어긋나면
// 그 자리에서 실패합니다. #245가 Podfile을 바꾸고 잠금 파일의 체크섬을 갱신하지 않아, 그날 밤부터 스모크가
// 매번 CocoaPods 단계에서 실패했습니다(continue-on-error가 초록으로 가렸습니다). CocoaPods의
// `PODFILE CHECKSUM`은 Podfile 내용의 SHA1이라 macOS 없이 PR에서 대조할 수 있습니다.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const read = (path) => readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)));

test("IP1. Podfile.lock의 PODFILE CHECKSUM이 지금 Podfile의 SHA1과 같다", () => {
  const lock = read("apps/ios/Podfile.lock").toString("utf8");
  const recorded = lock.match(/^PODFILE CHECKSUM: ([0-9a-f]{40})$/m)?.[1];
  assert.ok(recorded, "Podfile.lock에 PODFILE CHECKSUM이 없습니다");

  // CocoaPods는 macOS의 LF 체크아웃으로 체크섬을 만듭니다. autocrlf로 CRLF가 된 체크아웃에서도 같은 값을
  // 대조하도록 줄바꿈을 LF로 맞춰 해시합니다.
  const podfile = read("apps/ios/Podfile").toString("utf8").replace(/\r\n/g, "\n");
  const actual = createHash("sha1").update(podfile).digest("hex");
  assert.equal(
    recorded,
    actual,
    "Podfile이 바뀌었는데 Podfile.lock이 그대로입니다. apps/ios에서 `pod install`을 돌려 잠금 파일을 함께 커밋하십시오.",
  );
});
