import { pluginReactLynx } from "@lynx-js/react-rsbuild-plugin";
import { defineConfig } from "@lynx-js/rspeedy";

export default defineConfig({
  environments: {
    web: {},
  },
  source: {
    entry: {
      button: "./src/lynx/button.tsx",
      "back-header": "./src/lynx/back-header.tsx",
      "status-indicator": "./src/lynx/status-indicator.tsx",
      "round-button": "./src/lynx/round-button.tsx",
      "progress-header": "./src/lynx/progress-header.tsx",
      "page-indicator": "./src/lynx/page-indicator.tsx",
      "bottom-navigator": "./src/lynx/bottom-navigator.tsx",
      "step-indicator": "./src/lynx/step-indicator.tsx",
      card: "./src/lynx/card.tsx",
      "compact-numeric-input": "./src/lynx/compact-numeric-input.tsx",
      "bottom-sheet": "./src/lynx/bottom-sheet.tsx",
      "text-field": "./src/lynx/text-field.tsx",
      "chat-bubble": "./src/lynx/chat-bubble.tsx",
    },
  },
  output: {
    distPath: {
      root: "dist/lynx",
    },
    filename: "[name].[platform].bundle",
  },
  tools: {
    rspack: {
      resolve: {
        mainFields: ["jsnext:source", "lynx", "module", "browser"],
      },
    },
  },
  plugins: [
    pluginReactLynx({
      enableCSSInheritance: true,
      enableCSSSelector: true,
      enableNewGesture: true,
    }),
  ],
});
