export type Environment = 'develop' | 'beta' | 'production';

type EnvConfig = {
  CLIENT_URL: string;
  API_BASE_URL: string;
};

const envConfigs: Record<Environment, EnvConfig> = {
  develop: {
    CLIENT_URL: 'https://dev.example.com', // TODO: 실제 개발 웹앱 URL로 변경
    API_BASE_URL: 'https://dev-api.example.com', // TODO: 실제 개발 API URL로 변경
  },
  beta: {
    CLIENT_URL: 'https://beta.example.com', // TODO: 실제 베타 웹앱 URL로 변경
    API_BASE_URL: 'https://beta-api.example.com', // TODO: 실제 베타 API URL로 변경
  },
  production: {
    CLIENT_URL: 'https://example.com', // TODO: 실제 운영 웹앱 URL로 변경
    API_BASE_URL: 'https://api.example.com', // TODO: 실제 운영 API URL로 변경
  },
};

// 현재 환경 설정 - Expo 환경변수 또는 기본값 사용
const CURRENT_ENV: Environment =
  (process.env.EXPO_PUBLIC_APP_ENV as Environment) || 'develop';

export const ENV = {
  ...envConfigs[CURRENT_ENV],
  CURRENT_ENV,
  isDevelopment: CURRENT_ENV === 'develop',
  isBeta: CURRENT_ENV === 'beta',
  isProduction: CURRENT_ENV === 'production',
} as const;
