import { Component, Fragment, type ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../lib/ui-copy";

import "./error-boundary.css";

// 에러 경계는 루트에 하나만 둡니다(ADR-0007 D4).
// 여기 올라오는 것은 **예상하지 못한 렌더 예외**뿐입니다.
// 네트워크 실패는 예상된 실패이므로 화면 로컬 상태로 처리합니다 — 여기로 올리지 않습니다.

type Props = { children: ReactNode };
type State = { error: Error | null; generation: number };

// 클래스는 context를 hook으로 못 읽으므로 에러 화면만 함수 컴포넌트로 뺍니다.
function ErrorFallback({ message, onRetry }: { message: string; onRetry: () => void }): ReactNode {
  const copy = useUiCopy();
  return (
    <view className="error-boundary">
      <text
        className="error-boundary-title"
        data-testid="error-boundary-title"
        accessibility-traits="header"
      >
        {copy.shell.errorBoundary.title}
      </text>
      <text className="error-boundary-message">{message}</text>
      <view
        className="error-boundary-retry"
        data-testid="error-boundary-retry"
        accessibility-element={true}
        accessibility-label={copy.shell.errorBoundary.retry}
        accessibility-traits="button"
        bindtap={onRetry}
      >
        <text className="error-boundary-retry-label">{copy.shell.errorBoundary.retry}</text>
      </view>
    </view>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, generation: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  // 재시도 = 루트 화면 상태를 초기값으로 리셋합니다. generation을 올려 하위
  // 트리를 다시 마운트합니다.
  private retry = () => {
    this.setState((prev) => ({ error: null, generation: prev.generation + 1 }));
  };

  render() {
    if (this.state.error) {
      return <ErrorFallback message={this.state.error.message} onRetry={this.retry} />;
    }

    return <Fragment key={this.state.generation}>{this.props.children}</Fragment>;
  }
}
