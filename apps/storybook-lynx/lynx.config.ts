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
