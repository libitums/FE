import { createRequire } from "node:module";
import path from "node:path";

import { defineMain } from "storybook-lynx-rsbuild/node";

const require = createRequire(import.meta.url);
const getAbsolutePath = (packageName: string) =>
  path.dirname(require.resolve(`${packageName}/package.json`));

export default defineMain({
  stories: ["../src/**/*.stories.ts"],
  staticDirs: [
    {
      from: "../dist/lynx",
      to: "/lynx",
    },
  ],
  framework: {
    name: getAbsolutePath("storybook-lynx-rsbuild") as "storybook-lynx-rsbuild",
    options: {},
  },
  rsbuildFinal: (config) => ({
    ...config,
    dev: {
      ...config.dev,
      assetPrefix: "/",
    },
    output: {
      ...config.output,
      assetPrefix: "/",
    },
  }),
});
