import type { MessageHandler, HandlerContext, AuthMessage } from '../types';

// Generic auth handlers — SCAFFOLD ONLY.
// No SDK glue, no token field names beyond the generic AuthMessage shape.
// Concrete implementation (storage, API calls) plugged in a later phase.

export function createAuthHandlers(ctx: HandlerContext): Record<string, MessageHandler> {
  return {
    AUTH_LOGIN: async (data) => {
      const msg = data as Extract<AuthMessage, { mode: 'AUTH_LOGIN' }>['data'];
      if (!msg?.provider || !msg?.credential) {
        console.warn('[auth-handlers] AUTH_LOGIN missing provider/credential');
        return;
      }
      await ctx.auth?.onLogin?.(msg);
    },

    AUTH_LOGOUT: async () => {
      await ctx.auth?.onLogout?.();
    },

    AUTH_TOKEN_REFRESH: async (data) => {
      const msg = data as Extract<AuthMessage, { mode: 'AUTH_TOKEN_REFRESH' }>['data'];
      if (!msg?.refreshToken) {
        console.warn('[auth-handlers] AUTH_TOKEN_REFRESH missing refreshToken');
        return;
      }
      await ctx.auth?.onTokenRefresh?.(msg);
    },
  };
}
