import CoreGraphics
import UIKit
import Vision

/// 손으로 그은 획을 받아 Apple Vision이 읽은 문자열로 돌려주는 호스트 네이티브 모듈이다.
///
/// **탐침이다.** LIB-263이 묻는 것은 「손으로 쓴 한글 한 글자를 Vision이 읽는가」이고,
/// 이 파일은 그 물음이 지나갈 경로를 연다. 쓰기 학습형 화면·문항·여정은 범위 밖이다.
///
/// **왜 좌표를 받는가.** Lynx(JS) 쪽에 래스터화 수단이 0개다 — `@lynx-js/types@4.1.0`
/// 전체에 `canvas` 선언이 없다. 그래서 화면은 자기가 그리는 것과 **같은 좌표**를
/// 그대로 넘기고, 오프스크린 래스터화와 인식은 여기서 한다. SVG 문자열을 넘겨
/// 되파싱하는 길은 버렸다 — 파서를 우리가 소유하게 되고, 실패했을 때 파싱인지
/// 인식인지 갈리지 않는다.
///
/// **왜 이것이 커스텀 UI도 커스텀 네이티브 엘리먼트도 아닌가** (ADR-0017 D1).
/// 걸리는지를 가르는 것은 *네이티브가 그림을 그리는가*가 아니라 **뷰 계층에 무언가가
/// 서는가**다. `UIGraphicsImageRenderer`는 비트맵 컨텍스트 하나를 만들어 베지어 경로를
/// 칠하고 `CGImage`를 돌려준 뒤 그 컨텍스트를 버린다 — `UIView`를 만들지 않고, 어떤
/// 뷰의 자식으로도 붙지 않으며, 화면에 한 픽셀도 그리지 않는다. 사용자가 보는 획은
/// 처음부터 끝까지 Lynx 쪽 `<svg content>`가 그리는 것이고, 여기서 만든 이미지는
/// Vision에 넣은 뒤 즉시 버려진다. `LynxUI` 상속·뷰 생성·props 처리·레이아웃·
/// 이벤트 중 **어느 하나도 짓지 않고** `LYNX_REGISTER_UI` 호출이 0건이라 Lynx가 아는
/// 태그 목록이 한 글자도 늘지 않는다. 노출하는 표면은 기존 모듈들과 같은 모양 —
/// **딕셔너리 인자 하나와 콜백 하나**다.
///
/// 같은 이유로 `PKCanvasView`(PencilKit)를 버렸다. 그것은 뷰를 만들어 화면에 올리므로
/// 정확히 D1이 막는 자리다.
///
/// **권한을 요청하지 않는다.** 우리가 메모리에서 만든 이미지를 우리가 읽는 것이라
/// 사진 라이브러리·카메라에 닿지 않는다. `Info.plist`에 usage description을 더하지
/// 않고 `AVCaptureDevice`·`PHPhotoLibrary` 계열 호출이 0건이다 (ADR-0017 D1).
@objc(HandwritingRecognitionModule)
final class HandwritingRecognitionModule: NSObject, LynxModule {
  @objc static var name: String { "HandwritingRecognitionModule" }

  @objc static var methodLookup: [String: String] {
    ["recognize": NSStringFromSelector(#selector(recognize(_:callback:)))]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  // MARK: - 유일한 메서드

  /// 획 목록을 오프스크린으로 그려 Vision에 넣고, 결과를 `callback`으로 **정확히 한 번**
  /// 올린다.
  ///
  /// **스레드.** 이 메서드는 Lynx JS 스레드(Background Thread Scripting)에서 불린다.
  /// 래스터화와 인식은 메인 스레드 전용 API가 아니지만 **JS 스레드에서 직접 하지
  /// 않는다** — `.accurate` 인식은 밀리초 단위로 끝나지 않고, 그동안 JS 스레드가 막히면
  /// 화면이 「요청 중」조차 그리지 못해 **탐침의 관찰이 「앱이 멈췄다」로 오염된다.**
  /// 그래서 인자 검사만 부른 스레드에서 마치고, 무거운 일은 아래 전용 큐로 넘긴다.
  /// 메인 큐는 어느 경로에서도 쓰지 않는다 — 여기에는 메인 스레드 전용 API가 없다.
  ///
  /// **콜백 호출 자리가 둘뿐이고 서로 배타적이다.** 인자가 어긋난 경로에서 한 번,
  /// 그렇지 않은 경로에서 큐 위로 한 번. 각 자리가 조건 없이 한 번 부르고 곧장 끝나
  /// 두 번 올라가거나 영영 안 올라가는 경로가 없다.
  @objc func recognize(
    _ args: [String: Any],
    callback: @escaping LynxCallbackBlock
  ) {
    guard let request = Self.parse(args) else {
      // 기대한 모양이 아니다. 읽지 않고 사유를 실어 돌아온다 —
      // `CompletionAnnouncementModule.announce`가 `callback(NSNull())`로 하는 것과
      // 같은 자리, 같은 규약이다. 다른 점은 페이로드가 사유를 실을 수 있다는 것뿐이다.
      callback(Self.payload(status: "invalid-arguments"))
      return
    }

    Self.recognitionQueue.async {
      callback(Self.read(request))
    }
  }

  // MARK: - 설정 상수

  /// 래스터화 배율. **JS가 정하지 않는다** — 화면이 아는 것은 표면 크기이고 인식 품질은
  /// 네이티브의 관심사라, 인자를 하나 덜 연다. 실기에서 인식이 약하면 이 값을 본다.
  private static let renderScale: CGFloat = 4

  /// 읽을 언어. 한글 한 글자를 읽는 것이 이 탐침의 물음이다.
  private static let recognitionLanguage = "ko-KR"

  /// 래스터화와 인식이 도는 자리. 직렬 큐라 요청이 겹쳐 와도 한 번에 하나씩 지난다 —
  /// 인식 하나가 기기 자원을 상당히 쓰므로 동시에 여럿을 돌리면 둘 다 느려진다.
  /// 이 큐 위의 코드는 인스턴스 상태를 읽지도 쓰지도 않는다(전부 `static`이고 인자로
  /// 받은 값만 만진다). 그래서 락이 없다.
  private static let recognitionQueue = DispatchQueue(
    label: "com.libitum.host.handwriting-recognition",
    qos: .userInitiated
  )

  // MARK: - 인자

  /// 인식 한 번에 필요한 값들. 브리지를 건넌 딕셔너리를 여기서 한 번 걸러,
  /// 아래 단계들이 `Any`를 다시 풀지 않게 한다.
  private struct ReadRequest {
    let size: CGSize
    let strokeWidth: CGFloat
    let strokes: [[CGPoint]]
  }

  /// JS가 넘긴 딕셔너리를 `ReadRequest`로 바꾼다. 어느 한 자리라도 어긋나면 `nil`이다.
  ///
  /// **`as? Double`이 아니라 `as? NSNumber`인 근거**: JS 수는 정수일 때와 실수일 때
  /// 브리지를 건너는 `NSNumber`의 내부 타입이 갈린다. `NSNumber`로 받아 `doubleValue`를
  /// 쓰면 그 갈림이 계약에 들어오지 않는다.
  ///
  /// **값의 범위는 보지 않는다.** 계약이 거르는 것은 *모양*이다. 크기가 0이거나 음수인
  /// 값이 와도 여기서 막지 않고, 이미지를 못 만드는 것으로 드러나 `"failed"`가 된다 —
  /// 사유가 한 자리에서만 나는 편이 실기에서 읽기 쉽다.
  private static func parse(_ args: [String: Any]) -> ReadRequest? {
    guard
      let width = args["width"] as? NSNumber,
      let height = args["height"] as? NSNumber,
      let strokeWidth = args["strokeWidth"] as? NSNumber,
      let rawStrokes = args["strokes"] as? [[[String: Any]]]
    else {
      return nil
    }

    var strokes: [[CGPoint]] = []
    strokes.reserveCapacity(rawStrokes.count)
    for rawStroke in rawStrokes {
      var points: [CGPoint] = []
      points.reserveCapacity(rawStroke.count)
      for rawPoint in rawStroke {
        guard
          let x = rawPoint["x"] as? NSNumber,
          let y = rawPoint["y"] as? NSNumber
        else {
          return nil
        }
        points.append(CGPoint(x: x.doubleValue, y: y.doubleValue))
      }
      strokes.append(points)
    }

    return ReadRequest(
      size: CGSize(width: width.doubleValue, height: height.doubleValue),
      strokeWidth: CGFloat(strokeWidth.doubleValue),
      strokes: strokes
    )
  }

  // MARK: - 읽기 — 래스터화 다음 인식

  /// 한 요청의 답을 만든다. **전용 큐에서만 부른다.**
  ///
  /// 돌려주는 값이 그대로 콜백 페이로드이고, 모든 갈래가 값 하나로 모여 나간다 —
  /// 갈래마다 콜백을 부르면 어느 갈래가 두 번 부르는지 눈으로 좇아야 한다.
  private static func read(_ request: ReadRequest) -> [String: String] {
    guard let image = rasterize(request) else {
      return payload(status: "failed")
    }
    return recognize(image)
  }

  /// 획들을 흰 바탕 위에 검게 그려 `CGImage`로 만든다. 화면에 올리지 않는다.
  ///
  /// 포맷 배율을 **1로 못박는다.** 기본값은 기기 화면 배율이라, 그대로 두면 픽셀 크기가
  /// 기기마다 갈려 같은 획이 기기마다 다른 해상도로 Vision에 들어간다 — 탐침의 답이
  /// 기기 때문에 갈리면 안 된다. 해상도는 `renderScale` 하나가 정한다.
  ///
  /// **점이 하나뿐인 획도 보여야 한다.** 자기 자신으로 가는 선을 하나 붙여 길이 0인
  /// subpath를 만들면 둥근 끝맺음이 그것을 점으로 그린다. Lynx 쪽 렌더도 같은 규칙을
  /// 쓴다 — 화면에서 보이는 것과 Vision이 보는 것이 갈리면 탐침의 답이 오염된다.
  private static func rasterize(_ request: ReadRequest) -> CGImage? {
    let scale = renderScale
    let pixelSize = CGSize(
      width: request.size.width * scale,
      height: request.size.height * scale
    )

    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true

    let rendered = UIGraphicsImageRenderer(size: pixelSize, format: format).image { context in
      UIColor.white.setFill()
      context.fill(CGRect(origin: .zero, size: pixelSize))

      UIColor.black.setStroke()
      for stroke in request.strokes {
        guard let first = stroke.first else { continue }

        let path = UIBezierPath()
        path.lineWidth = request.strokeWidth * scale
        path.lineCapStyle = .round
        path.lineJoinStyle = .round

        path.move(to: scaled(first, by: scale))
        for point in stroke.dropFirst() {
          path.addLine(to: scaled(point, by: scale))
        }
        if stroke.count == 1 {
          path.addLine(to: scaled(first, by: scale))
        }

        path.stroke()
      }
    }

    return rendered.cgImage
  }

  /// 표면 좌표를 비트맵 좌표로 옮긴다. 표면과 비트맵의 종횡비가 같아 배율 하나면 된다.
  private static func scaled(_ point: CGPoint, by scale: CGFloat) -> CGPoint {
    CGPoint(x: point.x * scale, y: point.y * scale)
  }

  /// 이미지 하나를 Vision에 넣고 답을 만든다. **전용 큐에서만 부른다.**
  ///
  /// `.accurate`인 근거: `.fast`는 처리량을 위해 인쇄체 가정에 기댄다. 필기처럼 형태가
  /// 흐트러진 입력에서 먼저 무너지고, 이 탐침이 묻는 것은 처리량이 아니라 **읽히는가**다.
  ///
  /// `usesLanguageCorrection`을 끄는 근거: 언어 모델 보정은 결과를 사전에 있는 낱말로
  /// 끌어당긴다. 한 글자 탐침에서 켜 두면 Vision이 실제로 무엇을 봤는지가 보정 결과에
  /// 가려져, 답이 「획을 읽었다」인지 「그럴듯한 낱말로 바꿨다」인지 구분되지 않는다.
  private static func recognize(_ image: CGImage) -> [String: String] {
    let request = VNRecognizeTextRequest()
    // 지원 언어 목록은 인식 수준에 따라 갈린다. 물어보기 **전에** 수준을 정한다.
    request.recognitionLevel = .accurate

    // **지원하지 않으면 요청을 보내지 않는다.** 보내고 빈 결과를 받으면 「지원이
    // 없었다」와 「보긴 했는데 아무것도 못 읽었다」가 한 값으로 뭉쳐, 탐침이 가장
    // 알고 싶은 갈림이 사라진다. 목록을 아예 못 얻는 경우도 같은 자리로 보낸다 —
    // 그때도 요청은 가지 않았고, 「읽었다」로 셀 수 있는 것이 없다.
    let supported = (try? request.supportedRecognitionLanguages()) ?? []
    guard supported.contains(recognitionLanguage) else {
      return payload(status: "language-unsupported")
    }

    request.recognitionLanguages = [recognitionLanguage]
    request.usesLanguageCorrection = false

    do {
      try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
    } catch {
      return payload(status: "failed")
    }

    // 관측이 여럿이면 최상위 후보를 **입력 순서대로 구분자 없이** 이어 붙인다.
    // 한 글자를 그렸는데 관측이 여럿으로 갈린 것 자체가 관측이고, 잘라 내면 가려진다.
    let text = (request.results ?? [])
      .compactMap { $0.topCandidates(1).first?.string }
      .joined()

    // 관측이 0건이어도 `"read"`다. **「못 읽었다」와 「경로가 안 섰다」는 다른 답이고**,
    // 앞엣것은 인식 품질의 문제, 뒤엣것은 결선의 문제라 다음에 할 일이 완전히 다르다.
    return payload(status: "read", text: text)
  }

  // MARK: - 콜백 페이로드

  /// 콜백이 실어 보내는 모양을 짓는 **유일한 자리**. 키가 둘이고 값이 둘 다 문자열이다.
  /// `"read"`가 아닌 답은 실어 보낼 글자가 없으므로 `text`가 빈 문자열이다 —
  /// 키를 빼지 않는 것은 받는 쪽이 모양 하나만 알면 되게 하려는 것이다.
  private static func payload(status: String, text: String = "") -> [String: String] {
    ["status": status, "text": text]
  }
}
