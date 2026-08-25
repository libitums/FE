import { defineConfig } from 'vitest/config'
import { vitestTestingLibraryPlugin } from '@lynx-js/react/testing-library/plugins'

// ADR-0006 D4: 러너는 vitest. `createVitestConfig`는 deprecated이므로 플러그인을 쓴다.
export default defineConfig({
  plugins: [vitestTestingLibraryPlugin()],
})
