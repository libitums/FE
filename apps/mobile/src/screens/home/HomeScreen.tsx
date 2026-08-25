import './home-screen.css'

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사 (ADR-0003 D6).
export function HomeScreen() {
  return (
    <view className="home-screen">
      <text className="home-screen-title">홈</text>
    </view>
  )
}
