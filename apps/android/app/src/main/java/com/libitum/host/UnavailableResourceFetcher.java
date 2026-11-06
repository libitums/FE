package com.libitum.host;

import com.lynx.tasm.resourceprovider.LynxResourceCallback;
import com.lynx.tasm.resourceprovider.LynxResourceRequest;
import com.lynx.tasm.resourceprovider.LynxResourceResponse;
import com.lynx.tasm.resourceprovider.generic.LynxGenericResourceFetcher;
import java.io.IOException;

/**
 * 배포 빌드의 일반 자원 가져오기(ADR-0107). 이 앱은 템플릿 · 그림 · 소리를 다른 길로 읽어 여기로 오는 요청이 없다 —
 * 오면 실패로 돌려준다. 그래도 반드시 등록한다: Lynx Android(4.0.1)는 `setEnableGenericResourceFetcher(TRUE)`인데
 * 가져오기가 없으면 `@font-face`의 `local(file://…)` 글꼴을 그리지 않는다(Debug는 `DevResourceFetcher`가 있어 그렸고,
 * 배포 빌드는 Jost · League Spartan까지 Roboto로 떨어졌다 — 2026-11-06 에뮬레이터 대조). Debug는 `DebugSupport`가
 * 이것을 `DevResourceFetcher`로 바꾼다.
 */
final class UnavailableResourceFetcher extends LynxGenericResourceFetcher {
  @Override public void fetchResource(
      LynxResourceRequest request, LynxResourceCallback<byte[]> callback) {
    callback.onResponse(LynxResourceResponse.onFailed(unavailable(request)));
  }

  @Override public void fetchResourcePath(
      LynxResourceRequest request, LynxResourceCallback<String> callback) {
    callback.onResponse(LynxResourceResponse.onFailed(unavailable(request)));
  }

  private static IOException unavailable(LynxResourceRequest request) {
    return new IOException("No generic resource fetcher in this build: " + request.getUrl());
  }
}
