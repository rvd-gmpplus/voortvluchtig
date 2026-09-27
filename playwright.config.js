// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.PORT) || 8080;
// Headless Chromium heeft geen GPU; SwiftShader levert software-WebGL.
const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
// Optioneel: een al geinstalleerde Chromium gebruiken in plaats van `npx playwright install`.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    launchOptions: { args: GL_ARGS, executablePath },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions: { args: GL_ARGS, executablePath } } },
    { name: 'mobiel', use: { ...devices['Pixel 7'], launchOptions: { args: GL_ARGS, executablePath } } },
  ],
  webServer: {
    command: 'node tests/server.mjs',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT) },
  },
});
