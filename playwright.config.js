// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.PORT) || 8080;
// Headless Chromium heeft geen GPU; SwiftShader levert software-WebGL.
const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
// Optioneel: een al geinstalleerde Chromium gebruiken in plaats van `npm run setup`.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const chromium = { launchOptions: { args: GL_ARGS, executablePath } };

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  retries: 0, // een herkansing verbergt timingfouten; tests wachten op speltijd, niet op de wandklok
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: `http://localhost:${PORT}/` },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...chromium } },
    { name: 'mobiel', use: { ...devices['Pixel 7'], ...chromium } },
    // WebKit (iPhone-emulatie): de kerntests (laden, starten, tikken, foutscherm).
    { name: 'iphone', use: { ...devices['iPhone 13'] }, grep: /@kern/ },
    // Headless Firefox kan in CI geen WebGL-context maken (gemeten op 27-9-2026). Daarom alleen:
    // het script draait in Gecko zonder fouten en valt netjes terug op het foutscherm.
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grep: /@firefox/ },
  ],
  webServer: {
    command: 'node tests/server.mjs',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT), ...(process.env.SITE_DIR ? { SITE_DIR: process.env.SITE_DIR } : {}) },
  },
});
