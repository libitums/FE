import XCTest
import UIKit

@testable import Host

final class CompletionAnnouncementModuleTests: XCTestCase {
  // 완료 안내 문구는 native 경계를 지나도 한 글자도 바뀌지 않아야 한다.
  func testPayloadPreservesOriginalContent() {
    let content = "문항을 모두 마쳤어요, 결과 보기"

    let payload = CompletionAnnouncementPayload.make(content: content)

    XCTAssertEqual(payload.string, content)
  }

  // priority 속성은 문자열 전체 범위에 high 값으로 붙어야 한다.
  func testPayloadAppliesHighAnnouncementPriorityToFullRange() {
    let content = "문항을 모두 마쳤어요, 결과 보기"

    let payload = CompletionAnnouncementPayload.make(content: content)
    var effectiveRange = NSRange(location: NSNotFound, length: 0)
    let attributes = payload.attributes(
      at: 0,
      effectiveRange: &effectiveRange
    )
    let priorityKey = NSAttributedString.Key.accessibilitySpeechAnnouncementPriority

    XCTAssertEqual(effectiveRange, NSRange(location: 0, length: (content as NSString).length))
    guard let priority = attributes[priorityKey] as? NSString else {
      return XCTFail("완료 안내 priority 속성이 없습니다")
    }
    XCTAssertEqual(priority as String, UIAccessibilityPriority.high.rawValue)
  }

  // completion 전용 payload에는 priority 하나 외의 속성이 섞이지 않아야 한다.
  func testPayloadContainsOnlyAnnouncementPriorityAttribute() {
    let content = "완료 안내"
    let payload = CompletionAnnouncementPayload.make(content: content)

    let attributes = payload.attributes(at: 0, effectiveRange: nil)

    XCTAssertEqual(
      Set(attributes.keys),
      [NSAttributedString.Key.accessibilitySpeechAnnouncementPriority]
    )
  }

  // 빈 문자열과 다국어 문구에서도 원문 보존 계약이 동일하게 적용된다.
  func testPayloadPreservesOtherContents() {
    for content in ["", "끝!", "All done — 결과 보기"] {
      XCTAssertEqual(CompletionAnnouncementPayload.make(content: content).string, content)
    }
  }

  // 유효한 content도 발표 요청의 종료를 알리는 callback을 정확히 한 번 호출해야 한다.
  func testAnnounceCallsCallbackOnceForValidContent() {
    let callbackExpectation = expectation(description: "유효한 완료 안내 callback")
    callbackExpectation.assertForOverFulfill = true
    let module = CompletionAnnouncementModule()

    module.announce(["content": "완료 안내"]) { _ in
      XCTAssertTrue(Thread.isMainThread)
      callbackExpectation.fulfill()
    }

    wait(for: [callbackExpectation], timeout: 1)
  }

  // content가 문자열이 아니어도 발표하지 않고 callback으로 요청을 종료해야 한다.
  func testAnnounceCallsCallbackOnceForInvalidContent() {
    let callbackExpectation = expectation(description: "무효한 완료 안내 callback")
    callbackExpectation.assertForOverFulfill = true
    let module = CompletionAnnouncementModule()

    module.announce(["content": 42]) { _ in
      callbackExpectation.fulfill()
    }

    wait(for: [callbackExpectation], timeout: 1)
  }

  // 실제 호스트 설정이 Storage, Audio, Completion 세 모듈을 template render에 등록하는지 본다.
  @MainActor
  func testHostRegistersAccessibilityModules() throws {
    let viewController = ViewController()
    viewController.loadViewIfNeeded()
    let lynxView = try XCTUnwrap(
      viewController.view.subviews.compactMap { $0 as? LynxView }.first,
      "ViewController가 LynxView를 만들지 않았습니다"
    )
    let templateRender = try XCTUnwrap(
      lynxView.value(forKey: "templateRender") as? LynxTemplateRender,
      "LynxView의 templateRender seam을 찾지 못했습니다"
    )

    XCTAssertTrue(templateRender.isModuleExist("StorageModule"))
    XCTAssertTrue(templateRender.isModuleExist("AudioPlaybackModule"))
    XCTAssertTrue(templateRender.isModuleExist("CompletionAnnouncementModule"))
  }
}
