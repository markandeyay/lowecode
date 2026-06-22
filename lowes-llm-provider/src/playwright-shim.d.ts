declare module "playwright" {
  export const chromium: {
    launchPersistentContext(
      userDataDir: string,
      opts?: Record<string, unknown>,
    ): Promise<unknown>
  }
}
