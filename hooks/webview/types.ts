import { RefObject } from 'react';
import WebView from 'react-native-webview';

export type WebviewMessageType = {
  mode: string;
  data?: any;
};

export type HandlerContext = {
  sendToWebview: (msg: WebviewMessageType) => void;
  webviewRef: RefObject<WebView | null>;
  // NEW — optional slots; absent until concrete implementations are plugged in (Phase 2.4+)
  auth?: {
    onLogin?: (payload: { provider: string; credential: string }) => void | Promise<void>;
    onLogout?: () => void | Promise<void>;
    onTokenRefresh?: (payload: { refreshToken: string }) => void | Promise<void>;
  };
  navigation?: {
    // Reserved for future router integration (Phase 2.4+)
    push?: (route: string, params?: Record<string, unknown>) => void;
  };
};

export type MessageHandler = (
  data: any,
  ctx: HandlerContext,
  mode: string,
) => Promise<void>;

// Discriminated union for auth message shapes (dispatched via mode field)
export type AuthMessage =
  | { mode: 'AUTH_LOGIN'; data: { provider: string; credential: string } }
  | { mode: 'AUTH_LOGOUT'; data?: undefined }
  | { mode: 'AUTH_TOKEN_REFRESH'; data: { refreshToken: string } };
