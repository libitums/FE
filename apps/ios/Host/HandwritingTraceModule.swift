import CoreGraphics
import UIKit

/// 손으로 그은 획이 **안내 글자를 얼마나 따라 그렸는가**를 두 비율로 돌려주는 호스트
/// 네이티브 모듈이다.
///
/// **왜 Vision이 아닌가.** 형제 모듈(`HandwritingRecognitionModule`)은 획을 래스터화해
/// `VNRecognizeTextRequest`에 넣는다. 그 경로는 2026-09-28 시뮬레이터 예비 관측에서
/// `read` + **빈 문자열**을 냈다 — 지원 언어 목록에 `ko-KR`이 있고 요청도 던지지
/// 않았는데 읽어 낸 글자가 없다(`docs/e2e/handwriting-probe.md`). 그 축은 열린 채로
/// 두고, 쓰기 학습형의 판정을 **인식에 기대지 않는 지표**로 세운다.
///
/// **무엇을 재는가.** 안내 글자를 같은 판에 그려 잉크 마스크 둘을 만들고, 겹치는 넓이를
/// 두 방향으로 나눈다.
///
/// - `coverage`(덮음) = |안내 ∩ 팽창(그린 것)| / |안내| — 안내를 얼마나 채웠나
/// - `stay`(머무름) = |그린 것 ∩ 팽창(안내)| / |그린 것| — 안내 밖으로 얼마나 나갔나
///
/// **왜 IoU 하나가 아니라 둘인가.** 합쳐 놓으면 낮은 값이 「빠뜨렸다」인지
/// 「삐져나갔다」인지 갈리지 않는다. 둘로 두면 판정 강도는 같고 **피드백이 나온다.**
/// 그리고 IoU는 획 두께에 지배당한다 — 완벽하게 따라 그려도 펜이 안내보다 얇으면
/// 합집합만 커져 점수가 깎인다.
///
/// **팽창이 그 두께 문제를 없앤다.** 분자의 반대편을 `tolerance`만큼 부풀린 뒤 재므로,
/// 얇은 펜이 두꺼운 안내를 덮을 수 있고 약간 빗나간 획이 안내 위로 인정된다. 부풀리는
/// 쪽을 지표마다 달리하는 것이 핵심이다 — 양쪽을 다 부풀리면 둘 다 1에 붙어 버린다.
///
/// ⚠ **문턱값은 이 파일이 정하지 않는다.** 얼마가 「통과」인지는 폰트·글자 복잡도·펜
/// 두께가 함께 정하는 수이고, 기기에서 실제로 그어 보며 잡아야 한다. 여기서는 **수를
/// 그대로 올려 보내고** 판정하지 않는다.
///
/// **뷰를 만들지 않는다**(ADR-0017 D1). 형제 모듈과 같은 근거다 — 비트맵 컨텍스트를
/// 만들어 칠하고 버린다. `UIView`를 짓지 않고 `LYNX_REGISTER_UI` 호출이 0건이다.
/// 권한도 요청하지 않는다.
@objc(HandwritingTraceModule)
final class HandwritingTraceModule: NSObject, LynxModule {
  @objc static var name: String { "HandwritingTraceModule" }

  @objc static var methodLookup: [String: String] {
    [
      "compare": NSStringFromSelector(#selector(compare(_:callback:))),
      "guide": NSStringFromSelector(#selector(guide(_:callback:))),
    ]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  // MARK: - 유일한 메서드

  /// 획과 안내 글자를 견줘 두 비율을 `callback`으로 **정확히 한 번** 올린다.
  ///
  /// 스레드 규약은 형제 모듈과 같다 — 인자 검사만 부른 스레드(JS)에서 마치고, 래스터화와
  /// 픽셀 셈은 전용 큐로 넘긴다. 콜백 자리가 둘이고 서로 배타적이다.
  @objc func compare(
    _ args: [String: Any],
    callback: @escaping LynxCallbackBlock
  ) {
    guard let request = Self.parse(args) else {
      callback(Self.payload(status: "invalid-arguments"))
      return
    }

    Self.compareQueue.async {
      callback(Self.measure(request))
    }
  }

  /// 안내 글자를 **그림으로** 돌려준다. 화면이 그것을 그대로 깔면 **보는 것과 재는 것이
  /// 같은 픽셀**이 된다.
  ///
  /// ⭐ **이 메서드가 있는 이유가 그 한 줄이다.** 처음에는 화면이 Lynx `<text>`로 안내를
  /// 그리고 여기서 같은 글자를 UIKit으로 다시 그렸는데, **두 렌더러가 다르게 배치했다** —
  /// 같은 글꼴 이름·같은 크기인데 잉크가 22pt 어긋나고 6% 더 컸다(2026-09-28, 기기에서
  /// 잼). 그래서 화면에 보이는 안내를 완벽하게 따라 써도 `덮음`·`머무름`이 0이 나왔다.
  ///
  /// 보정 상수로 밀어 맞추는 길은 버렸다 — 글꼴·크기·글자가 바뀔 때마다 다시 틀린다.
  /// 그 자리에서 이미 두 번 틀렸다.
  @objc func guide(
    _ args: [String: Any],
    callback: @escaping LynxCallbackBlock
  ) {
    guard let request = Self.parse(args) else {
      callback(Self.guidePayload(status: "invalid-arguments"))
      return
    }

    Self.compareQueue.async {
      callback(Self.renderGuide(request))
    }
  }

  // MARK: - 설정 상수

  /// 견주는 판의 배율. **1이다** — 형제 모듈의 `renderScale: 4`와 갈리는 것이 맞다.
  /// 저쪽은 Vision이 글자 모양을 읽어야 해서 해상도가 품질이지만, 이쪽이 세는 것은
  /// **넓이의 비**라 배율을 올려도 비가 그대로다. 올리면 픽셀 수만 제곱으로 늘어난다.
  private static let compareScale: CGFloat = 1

  /// 래스터화와 셈이 도는 자리. 형제 모듈과 **다른 큐**다 — 같은 큐를 쓰면 인식 하나가
  /// 비교를 막고, 두 모듈이 서로의 지연을 만든다.
  private static let compareQueue = DispatchQueue(
    label: "com.libitum.host.handwriting-trace",
    qos: .userInitiated
  )

  // MARK: - 인자

  /// 견주기 한 번에 필요한 값들.
  private struct CompareRequest {
    let size: CGSize
    let strokeWidth: CGFloat
    let strokes: [[CGPoint]]
    let glyph: String
    let fontSize: CGFloat
    let fontName: String
    /// 팽창 반경(표면 point). 이 값 하나가 「얼마나 빗나가도 따라 쓴 것으로 보는가」다.
    let tolerance: CGFloat
    /// 안내 그림의 잉크 색. `guide`만 쓴다 — `compare`는 마스크만 보므로 색이 무의미하다.
    let guideColor: UIColor
  }

  /// JS가 넘긴 딕셔너리를 `CompareRequest`로 바꾼다. 어느 한 자리라도 어긋나면 `nil`이다.
  /// 수를 `NSNumber`로 받는 근거는 형제 모듈과 같다 — 정수/실수의 브리지 차이를 계약에
  /// 들이지 않는다.
  private static func parse(_ args: [String: Any]) -> CompareRequest? {
    guard
      let width = args["width"] as? NSNumber,
      let height = args["height"] as? NSNumber,
      let strokeWidth = args["strokeWidth"] as? NSNumber,
      let fontSize = args["fontSize"] as? NSNumber,
      let tolerance = args["tolerance"] as? NSNumber,
      let glyph = args["glyph"] as? String,
      let fontName = args["fontName"] as? String,
      let guideColor = args["guideColor"] as? String,
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

    return CompareRequest(
      size: CGSize(width: width.doubleValue, height: height.doubleValue),
      strokeWidth: CGFloat(strokeWidth.doubleValue),
      strokes: strokes,
      glyph: glyph,
      fontSize: CGFloat(fontSize.doubleValue),
      fontName: fontName,
      tolerance: CGFloat(tolerance.doubleValue),
      guideColor: parseColor(guideColor)
    )
  }

  /// `#RRGGBB`를 색으로 바꾼다. 모양이 어긋나면 **검정으로 간다** — 안내가 아예 안 보이는
  /// 것보다 색만 어긋나는 편이 낫고, 색이 틀린 것은 눈에 바로 띈다.
  private static func parseColor(_ text: String) -> UIColor {
    var hex = text
    if hex.hasPrefix("#") { hex.removeFirst() }
    guard hex.count == 6, let value = UInt32(hex, radix: 16) else { return .black }
    return UIColor(
      red: CGFloat((value >> 16) & 0xFF) / 255,
      green: CGFloat((value >> 8) & 0xFF) / 255,
      blue: CGFloat(value & 0xFF) / 255,
      alpha: 1
    )
  }

  // MARK: - 재기

  /// 한 요청의 답을 만든다. **전용 큐에서만 부른다.** 모든 갈래가 값 하나로 모여 나간다.
  private static func measure(_ request: CompareRequest) -> [String: String] {
    let scale = compareScale
    let width = Int((request.size.width * scale).rounded())
    let height = Int((request.size.height * scale).rounded())

    guard width > 0, height > 0 else {
      return payload(status: "failed")
    }

    let font = resolveFont(named: request.fontName, size: request.fontSize * scale)

    guard
      let drawn = renderMask(width: width, height: height, draw: { context in
        strokeInk(request, into: context, scale: scale, height: height)
      }),
      let guide = centeredGuideMask(request, font: font, width: width, height: height)
    else {
      return payload(status: "failed")
    }

    let drawnArea = drawn.reduce(0) { $0 + Int($1) }
    let guideArea = guide.reduce(0) { $0 + Int($1) }

    // 둘 중 하나라도 잉크가 없으면 비가 0으로 나누기가 된다. **비를 지어내지 않고**
    // 그 사실을 사유로 올린다 — 획을 하나도 안 그은 것과 0.0으로 채점된 것은 다른 답이다.
    guard drawnArea > 0 else { return payload(status: "empty-strokes") }
    guard guideArea > 0 else { return payload(status: "empty-glyph") }

    let radius = Int((request.tolerance * scale).rounded())
    let drawnGrown = dilate(drawn, width: width, height: height, radius: radius)
    let guideGrown = dilate(guide, width: width, height: height, radius: radius)

    let covered = intersectionArea(guide, drawnGrown)
    let stayed = intersectionArea(drawn, guideGrown)
    let box = inkBox(guide, width: width, height: height)

    return payload(
      status: "compared",
      coverage: Double(covered) / Double(guideArea),
      stay: Double(stayed) / Double(drawnArea),
      drawnArea: drawnArea,
      guideArea: guideArea,
      font: font.fontName,
      guideBox: box
    )
  }

  /// 안내 글자를 그린 뒤 **잉크가 판 한가운데에 오도록 옮긴** 마스크를 만든다.
  ///
  /// **왜 그려 놓고 옮기는가.** 글꼴 메트릭으로 자리를 계산하려 했더니 틀렸다 —
  /// `boundingRect(.usesDeviceMetrics)`로 잡은 자리가 실제 잉크보다 39pt 아래였다
  /// (2026-09-28, 기기에서 상자를 재서 확인). 줄 높이 · 베이스라인 · 글리프 경계의
  /// 관계는 글꼴마다 다르고, 그것을 맞히려 들면 **글꼴이 바뀔 때마다 다시 틀린다.**
  ///
  /// 그려 놓고 재면 추측이 0이 된다. 마스크를 옮기는 것은 픽셀 복사 한 번이라 두 번째
  /// 래스터화보다도 싸다.
  ///
  /// **화면 쪽과 맞추는 것이 목적이다.** 화면은 이 글자를 판 가운데에 세우고, 여기도
  /// 가운데에 세운다 — 둘이 같은 규칙을 쓰면 글꼴이 갈려도 함께 움직인다.
  private static func centeredGuideMask(
    _ request: CompareRequest,
    font: UIFont,
    width: Int,
    height: Int
  ) -> [UInt8]? {
    guard
      let raw = renderMask(width: width, height: height, draw: { context in
        glyphInk(request, font: font, into: context, width: width, height: height)
      })
    else {
      return nil
    }

    guard let (minX, minY, boxWidth, boxHeight) = inkBounds(raw, width: width, height: height)
    else {
      return raw
    }

    let shiftX = (width - boxWidth) / 2 - minX
    let shiftY = (height - boxHeight) / 2 - minY
    if shiftX == 0 && shiftY == 0 { return raw }

    var moved = [UInt8](repeating: 0, count: raw.count)
    for y in 0..<height {
      let toY = y + shiftY
      if toY < 0 || toY >= height { continue }
      for x in 0..<width where raw[y * width + x] == 1 {
        let toX = x + shiftX
        if toX < 0 || toX >= width { continue }
        moved[toY * width + toX] = 1
      }
    }
    return moved
  }

  /// 안내 마스크를 PNG로 구워 base64로 돌려준다. **`measure`와 같은 마스크를 쓴다** —
  /// 여기서 한 번 더 그리면 그리는 자리가 둘이 되어 다시 갈릴 수 있다.
  ///
  /// 잉크 색은 **JS가 정한다.** 토큰은 CSS 커스텀 프로퍼티로만 소비하는 규약이라(ADR-0014
  /// D1) 색의 정본이 앱 쪽에 있고, 여기서 상수를 박으면 그 정본이 둘이 된다.
  /// `DrawingSurface`가 획 색을 prop으로 받는 것과 같은 자리다.
  private static func renderGuide(_ request: CompareRequest) -> [String: String] {
    let scale = compareScale
    let width = Int((request.size.width * scale).rounded())
    let height = Int((request.size.height * scale).rounded())

    guard width > 0, height > 0 else { return guidePayload(status: "failed") }

    let font = resolveFont(named: request.fontName, size: request.fontSize * scale)
    guard let mask = centeredGuideMask(request, font: font, width: width, height: height) else {
      return guidePayload(status: "failed")
    }
    guard let bounds = inkBounds(mask, width: width, height: height) else {
      return guidePayload(status: "empty-glyph")
    }
    guard let png = maskPNG(mask, width: width, height: height, color: request.guideColor) else {
      return guidePayload(status: "failed")
    }

    return guidePayload(
      status: "rendered",
      image: png.base64EncodedString(),
      box: "\(bounds.0),\(bounds.1),\(bounds.2),\(bounds.3)",
      font: font.fontName
    )
  }

  /// 0/1 마스크를 **잉크만 불투명한** RGBA PNG로 굽는다. 바탕은 완전 투명이라 화면이
  /// 무엇 위에 깔든 그 면이 비친다.
  private static func maskPNG(
    _ mask: [UInt8],
    width: Int,
    height: Int,
    color: UIColor
  ) -> Data? {
    var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
    guard color.getRed(&red, green: &green, blue: &blue, alpha: &alpha) else { return nil }
    let r = UInt8(max(0, min(255, red * 255)))
    let g = UInt8(max(0, min(255, green * 255)))
    let b = UInt8(max(0, min(255, blue * 255)))
    let a = UInt8(max(0, min(255, alpha * 255)))

    var rgba = [UInt8](repeating: 0, count: width * height * 4)
    for index in mask.indices where mask[index] == 1 {
      let base = index * 4
      rgba[base] = r
      rgba[base + 1] = g
      rgba[base + 2] = b
      rgba[base + 3] = a
    }

    var image: CGImage?
    rgba.withUnsafeMutableBytes { raw in
      guard
        let baseAddress = raw.baseAddress,
        let context = CGContext(
          data: baseAddress,
          width: width,
          height: height,
          bitsPerComponent: 8,
          bytesPerRow: width * 4,
          space: CGColorSpaceDeviceRGB(),
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        )
      else {
        return
      }
      image = context.makeImage()
    }

    guard let cgImage = image else { return nil }
    return UIImage(cgImage: cgImage).pngData()
  }

  private static func CGColorSpaceDeviceRGB() -> CGColorSpace {
    CGColorSpaceCreateDeviceRGB()
  }

  /// 요청한 이름의 폰트를 찾고, 없으면 시스템 폰트로 간다. **어느 쪽이 섰는지는 답에
  /// 실어 보낸다** — 디자인이 고른 글꼴이 기기에 없으면 안내 글자의 모양이 달라지고,
  /// 그러면 같은 손글씨가 다른 수를 받는다. 그 사실이 조용히 묻히면 문턱값을 잘못 잡는다.
  private static func resolveFont(named name: String, size: CGFloat) -> UIFont {
    if !name.isEmpty, let font = UIFont(name: name, size: size) {
      return font
    }
    return UIFont.systemFont(ofSize: size, weight: .regular)
  }

  // MARK: - 마스크 만들기

  /// 잉크를 흰색으로 칠한 8비트 그레이스케일 버퍼를 만들어 **0/1 마스크**로 돌려준다.
  ///
  /// 바탕이 검고 잉크가 흰 것은 팽창이 **최댓값 연산**이기 때문이다 — 잉크가 큰 값이어야
  /// 「부풀린다」가 「최댓값을 퍼뜨린다」와 같아진다. 형제 모듈이 흰 바탕에 검은 획을
  /// 그리는 것과 반대인데, 저쪽은 Vision이 인쇄물처럼 보게 하려는 것이라 목적이 다르다.
  private static func renderMask(
    width: Int,
    height: Int,
    draw: (CGContext) -> Void
  ) -> [UInt8]? {
    var buffer = [UInt8](repeating: 0, count: width * height)

    let drawn: Bool = buffer.withUnsafeMutableBytes { raw -> Bool in
      guard
        let base = raw.baseAddress,
        let context = CGContext(
          data: base,
          width: width,
          height: height,
          bitsPerComponent: 8,
          bytesPerRow: width,
          space: CGColorSpaceCreateDeviceGray(),
          bitmapInfo: CGImageAlphaInfo.none.rawValue
        )
      else {
        return false
      }

      context.setFillColor(UIColor.black.cgColor)
      context.fill(CGRect(x: 0, y: 0, width: width, height: height))
      draw(context)
      return true
    }

    guard drawn else { return nil }

    // 반올림 경계를 한 자리에서만 정한다. 0/1로 접어 두면 아래 셈이 전부 정수가 된다.
    for index in buffer.indices {
      buffer[index] = buffer[index] > 127 ? 1 : 0
    }
    return buffer
  }

  /// 그린 획을 마스크 컨텍스트에 칠한다. 좌표 규약은 형제 모듈과 같다 — 화면이 보는 것과
  /// 여기가 보는 것이 갈리면 지표가 오염된다. 점 하나짜리 획도 보이게 자기 자신으로 가는
  /// 선을 붙인다.
  private static func strokeInk(
    _ request: CompareRequest,
    into context: CGContext,
    scale: CGFloat,
    height: Int
  ) {
    // ⭐ **안내 글자와 같은 방향으로 뒤집는다.** `CGContext`의 원점은 좌하단이고 표면
    // 좌표의 원점은 좌상단이다. 안내는 `glyphInk`가 뒤집어 그리는데 획을 그대로 그리면
    // **둘이 상하 반전된 채로 겹친다.**
    //
    // 실제로 그랬다(2026-09-28). 화면에서 안내 위에 정확히 그은 획이 `덮음 0.28`을
    // 받았고, `주`가 위아래로 얼추 대칭이라 점수가 0이 아니어서 **한동안 「솜씨가
    // 나쁘다」로 읽혔다.** 대칭이 덜한 글자였으면 0이 나와 빨리 드러났을 것이다.
    context.saveGState()
    context.translateBy(x: 0, y: CGFloat(height))
    context.scaleBy(x: 1, y: -1)

    context.setStrokeColor(UIColor.white.cgColor)
    context.setLineWidth(request.strokeWidth * scale)
    context.setLineCap(.round)
    context.setLineJoin(.round)

    for stroke in request.strokes {
      guard let first = stroke.first else { continue }

      context.beginPath()
      context.move(to: CGPoint(x: first.x * scale, y: first.y * scale))
      for point in stroke.dropFirst() {
        context.addLine(to: CGPoint(x: point.x * scale, y: point.y * scale))
      }
      if stroke.count == 1 {
        context.addLine(to: CGPoint(x: first.x * scale, y: first.y * scale))
      }
      context.strokePath()
    }

    context.restoreGState()
  }

  /// 안내 글자를 마스크 컨텍스트 **가운데**에 칠한다.
  ///
  /// UIKit 그리기는 좌상단 원점을 가정하는데 `CGContext`는 좌하단이라 뒤집어 놓고
  /// 그린다. 뒤집지 않으면 글자가 상하 반전되어 서고, 그 상태로도 비는 나오므로
  /// **수가 조용히 틀린다.**
  private static func glyphInk(
    _ request: CompareRequest,
    font: UIFont,
    into context: CGContext,
    width: Int,
    height: Int
  ) {
    context.saveGState()
    context.translateBy(x: 0, y: CGFloat(height))
    context.scaleBy(x: 1, y: -1)

    UIGraphicsPushContext(context)
    let attributes: [NSAttributedString.Key: Any] = [
      .font: font,
      .foregroundColor: UIColor.white,
    ]
    let text = request.glyph as NSString

    // **줄 상자가 아니라 잉크를 가운데에 놓는다** ⟨2026-09-28⟩.
    //
    // `size(withAttributes:)`는 줄 높이를 돌려준다 — 글자 위아래의 빈 여백까지 포함한
    // 수다. 그것으로 가운데를 잡으면 **글꼴이 바뀔 때마다 잉크가 위아래로 움직인다.**
    // 실제로 그랬다: 화면(Lynx)과 여기가 다른 글꼴로 그리던 동안 잉크가 12pt 어긋났고,
    // 잘 따라 쓴 획이 낮은 수를 받았다.
    //
    // `.usesDeviceMetrics`를 준 `boundingRect`는 **글리프의 실제 경계**를 돌려준다.
    // 그 상자를 판 가운데에 맞추면 글꼴의 여백 규약이 지표에서 빠진다 — 어느 글꼴을
    // 쓰든 잉크가 판 한가운데에 선다.
    let inkBounds = text.boundingRect(
      with: CGSize(width: CGFloat.greatestFiniteMagnitude, height: CGFloat.greatestFiniteMagnitude),
      options: [.usesLineFragmentOrigin, .usesDeviceMetrics],
      attributes: attributes,
      context: nil
    )

    // `boundingRect`의 원점은 그리기 원점에서 잉크까지의 **치우침**이다. 그만큼 되빼야
    // 잉크의 왼쪽 위가 우리가 계산한 자리에 온다.
    text.draw(
      at: CGPoint(
        x: (CGFloat(width) - inkBounds.width) / 2 - inkBounds.minX,
        y: (CGFloat(height) - inkBounds.height) / 2 - inkBounds.minY
      ),
      withAttributes: attributes
    )
    UIGraphicsPopContext()

    context.restoreGState()
  }

  // MARK: - 픽셀 셈

  /// 마스크를 `radius`만큼 부풀린다. 가로 한 번, 세로 한 번으로 나눠 돈다 — 정사각
  /// 커널의 최댓값은 분리 가능해서, 2차원으로 한 번에 돌 때의 `r²`가 `2r`로 준다.
  /// 표면 300×300에 반경 6이면 90,000 × 12로 끝난다.
  private static func dilate(_ mask: [UInt8], width: Int, height: Int, radius: Int) -> [UInt8] {
    guard radius > 0 else { return mask }

    var horizontal = [UInt8](repeating: 0, count: mask.count)
    for y in 0..<height {
      let row = y * width
      for x in 0..<width {
        var value: UInt8 = 0
        let from = max(0, x - radius)
        let to = min(width - 1, x + radius)
        var index = from
        while index <= to {
          if mask[row + index] == 1 {
            value = 1
            break
          }
          index += 1
        }
        horizontal[row + x] = value
      }
    }

    var result = [UInt8](repeating: 0, count: mask.count)
    for x in 0..<width {
      for y in 0..<height {
        var value: UInt8 = 0
        let from = max(0, y - radius)
        let to = min(height - 1, y + radius)
        var index = from
        while index <= to {
          if horizontal[index * width + x] == 1 {
            value = 1
            break
          }
          index += 1
        }
        result[y * width + x] = value
      }
    }

    return result
  }

  /// 마스크에서 잉크가 실제로 놓인 상자를 `"x,y,w,h"`로 적는다.
  ///
  /// **왜 이 값을 올려 보내는가.** 화면(Lynx)이 그리는 안내와 여기가 그리는 안내는 서로
  /// 다른 엔진이 배치한다. 둘이 어긋나면 잘 따라 쓴 획이 낮은 수를 받는데, 그 어긋남은
  /// 비만 봐서는 **위치 탓인지 솜씨 탓인지 갈리지 않는다.** 상자를 실어 보내면 화면 쪽
  /// 자리를 눈이 아니라 수로 맞출 수 있다.
  private static func inkBox(_ mask: [UInt8], width: Int, height: Int) -> String {
    guard let (x, y, w, h) = inkBounds(mask, width: width, height: height) else { return "" }
    return "\(x),\(y),\(w),\(h)"
  }

  /// 잉크가 놓인 상자를 수로 돌려준다. 잉크가 없으면 `nil`이다.
  private static func inkBounds(
    _ mask: [UInt8],
    width: Int,
    height: Int
  ) -> (Int, Int, Int, Int)? {
    var minX = width, minY = height, maxX = -1, maxY = -1
    for y in 0..<height {
      let row = y * width
      for x in 0..<width where mask[row + x] == 1 {
        if x < minX { minX = x }
        if x > maxX { maxX = x }
        if y < minY { minY = y }
        if y > maxY { maxY = y }
      }
    }
    guard maxX >= 0 else { return nil }
    return (minX, minY, maxX - minX + 1, maxY - minY + 1)
  }

  /// 두 마스크가 함께 잉크인 픽셀 수.
  private static func intersectionArea(_ lhs: [UInt8], _ rhs: [UInt8]) -> Int {
    var count = 0
    for index in lhs.indices where lhs[index] == 1 && rhs[index] == 1 {
      count += 1
    }
    return count
  }

  // MARK: - 콜백 페이로드

  /// 콜백이 실어 보내는 모양을 짓는 **유일한 자리**. 값이 전부 문자열인 것은 형제 모듈과
  /// 같은 규약이고, 비는 소수 넷째 자리까지 적는다 — 문턱값을 기기에서 잡을 때 셋째
  /// 자리가 갈리는 일이 실제로 있다.
  ///
  /// `"compared"`가 아닌 답은 실어 보낼 수가 없으므로 비가 빈 문자열이다. 키를 빼지
  /// 않는 것은 받는 쪽이 모양 하나만 알면 되게 하려는 것이다.
  /// `guide` 한 번의 답을 짓는 **유일한 자리**. `compare`와 키가 달라 페이로드를 나눈다 —
  /// 한 모양에 둘을 욱여넣으면 받는 쪽이 어느 키가 언제 차는지를 외워야 한다.
  private static func guidePayload(
    status: String,
    image: String = "",
    box: String = "",
    font: String = ""
  ) -> [String: String] {
    ["status": status, "image": image, "box": box, "font": font]
  }

  private static func payload(
    status: String,
    coverage: Double? = nil,
    stay: Double? = nil,
    drawnArea: Int? = nil,
    guideArea: Int? = nil,
    font: String = "",
    guideBox: String = ""
  ) -> [String: String] {
    [
      "status": status,
      "coverage": coverage.map { String(format: "%.4f", $0) } ?? "",
      "stay": stay.map { String(format: "%.4f", $0) } ?? "",
      "drawnArea": drawnArea.map(String.init) ?? "",
      "guideArea": guideArea.map(String.init) ?? "",
      "font": font,
      "guideBox": guideBox,
    ]
  }
}
