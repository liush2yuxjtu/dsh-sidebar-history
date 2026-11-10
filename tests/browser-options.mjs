/** Explicit test-runner transport for managed environments; never modifies product networking. */
export function browserOptions() {
  return {
    headless: true,
    ...(process.env.DSH_CHROMIUM_PATH ? { executablePath: process.env.DSH_CHROMIUM_PATH } : {}),
    ...(process.env.DSH_BROWSER_PROXY ? { proxy: { server: process.env.DSH_BROWSER_PROXY, bypass: 'localhost,127.0.0.1,[::1]' } } : {}),
  };
}
