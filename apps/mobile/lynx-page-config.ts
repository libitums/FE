import type { RsbuildPlugin } from "@lynx-js/rspeedy";

// 번들의 page config에 더하는 값입니다(ADR-0112 개정 ⟨여러 손가락⟩). 템플릿 플러그인은 정해진 키만 내고 이 둘은
// 옵션으로 열지 않아, 인코딩 직전(`beforeEncode`)에 `sourceContent.config`에 씁니다. 호스트(iOS `LynxTouchHandler` ·
// Android `TouchEventDispatcher`)는 page config에 값이 없으면 둘 다 꺼진 것으로 봅니다.
//
// - `enableMultiTouch`: 꺼져 있으면 한 손가락이 닿아 있는 동안 둘째 손가락의 touchstart · touchend · tap을 JS에 보내지
//   않습니다. 두 엄지로 빠르게 치면 앞 키를 떼기 전에 누른 다음 키가 통째로 사라졌습니다(자판 빠른 입력 누락).
// - `enableMultiTouchParamsCompatible`: 호스트가 여러 손가락을 켤 때 함께 켜는 짝입니다. touchend의 `touches`에 막 뗀
//   손가락을 남겨 한 손가락 때의 모양을 지킵니다.
export const LYNX_PAGE_CONFIG = {
  enableMultiTouch: true,
  enableMultiTouchParamsCompatible: true,
} as const;

type TemplateHooks = {
  readonly beforeEncode: {
    tap(name: string, fn: (args: EncodeArgs) => EncodeArgs): void;
  };
};
type EncodeArgs = { readonly encodeData: { readonly sourceContent: { config: object } } };
type Exposed = {
  readonly LynxTemplatePlugin: { getLynxTemplatePluginHooks(compilation: unknown): TemplateHooks };
};
type Compiler = {
  readonly hooks: {
    readonly thisCompilation: { tap(name: string, fn: (c: unknown) => void): void };
  };
};

const PLUGIN_NAME = "libitum:page-config";

/** 템플릿의 page config에 값을 더합니다. 같은 키가 있으면 이 값이 이깁니다. */
export function withPageConfig<T extends object>(
  config: T,
  extra: Readonly<Record<string, unknown>> = LYNX_PAGE_CONFIG,
): T {
  return Object.assign(config, extra);
}

// 설정 파일은 Node가 타입만 지우고 읽어(strip-only) 생성자 매개변수 속성을 쓰지 않습니다.
class PageConfigPlugin {
  readonly exposed: Exposed;

  constructor(exposed: Exposed) {
    this.exposed = exposed;
  }

  apply(compiler: Compiler): void {
    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      const hooks = this.exposed.LynxTemplatePlugin.getLynxTemplatePluginHooks(compilation);
      hooks.beforeEncode.tap(PLUGIN_NAME, (args) => {
        withPageConfig(args.encodeData.sourceContent.config);
        return args;
      });
    });
  }
}

/** ReactLynx 플러그인이 내보인 템플릿 훅으로 page config를 고칩니다. 훅이 없으면(웹 등) 아무것도 하지 않습니다. */
export function pluginPageConfig(): RsbuildPlugin {
  return {
    name: PLUGIN_NAME,
    pre: ["lynx:react"],
    setup(api) {
      api.modifyBundlerChain((chain) => {
        const exposed = api.useExposed<Exposed>(Symbol.for("LynxTemplatePlugin"));
        if (exposed === undefined) return;
        chain.plugin(PLUGIN_NAME).use(PageConfigPlugin, [exposed]);
      });
    },
  };
}
