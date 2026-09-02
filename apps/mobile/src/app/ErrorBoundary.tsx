import { Component, Fragment, type ReactNode } from "@lynx-js/react";

import "./error-boundary.css";

// 에러 경계는 루트에 하나만 둔다 (ADR-0007 D4).
// 여기 올라오는 것은 **예상하지 못한 렌더 예외**뿐이다.
// 네트워크 실패는 예상된 실패이므로 화면 로컬 상태로 처리한다 — 여기로 올리지 않는다.

type Props = { children: ReactNode };
type State = { error: Error | null; generation: number };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, generation: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  // 재시도 = 루트 화면 상태를 초기값으로 리셋. generation을 올려 하위 트리를 다시 마운트한다.
  private retry = () => {
    this.setState((prev) => ({ error: null, generation: prev.generation + 1 }));
  };

  render() {
    if (this.state.error) {
      return (
        <view className="error-boundary">
          <text
            className="error-boundary-title"
            data-testid="error-boundary-title"
            accessibility-traits="header"
          >
            문제가 생겼어요
          </text>
          <text className="error-boundary-message">{this.state.error.message}</text>
          <view
            className="error-boundary-retry"
            data-testid="error-boundary-retry"
            accessibility-element={true}
            accessibility-label="다시 시도"
            accessibility-traits="button"
            bindtap={this.retry}
          >
            <text className="error-boundary-retry-label">다시 시도</text>
          </view>
        </view>
      );
    }

    return <Fragment key={this.state.generation}>{this.props.children}</Fragment>;
  }
}
