import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

// e2e는 항상 로컬 supabase(`pnpm db:start`)를 사용. 로컬 키도 시크릿 형식이라
// 저장소에 두지 않고 gitignore된 `.env.test`에서 로드한다(.env.example 참고).
loadEnv({ path: '.env.test' });

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[playwright] 환경변수 ${name} 누락 — apps/web/.env.test에 로컬 supabase 키를 설정하세요 (.env.example 참고).`,
    );
  }
  return value;
}

export default defineConfig({
  testDir: './e2e',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'PORT=3100 pnpm dev',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // e2e는 항상 로컬 supabase(`pnpm db:start`)를 사용하도록 강제 — `.env.local`이
    // 원격을 가리켜도 분리 보장. 로컬 키는 supabase CLI 데모 키(`supabase status`).
    env: {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: requiredEnv(
        'E2E_SUPABASE_PUBLISHABLE_KEY',
      ),
      SUPABASE_SECRET_KEY: requiredEnv('E2E_SUPABASE_SECRET_KEY'),
      NEXT_PUBLIC_COUPANG_ENABLED: 'true',
      NEXT_PUBLIC_KURLY_ENABLED: 'true',
      NEXT_PUBLIC_BAEMIN_ENABLED: 'false',
    },
  },
  use: {
    baseURL: 'http://localhost:3100',
  },
});
