import { useCallback } from 'react';
import { Linking } from 'react-native';
import { WebViewMessageEvent } from 'react-native-webview';
import { HandlerContext } from './types';
import { systemHandlers } from './handlers/system-handlers';

const allHandlers: Record<string, any> = {
  ...systemHandlers,
};

export function useWebviewMessage(ctx: HandlerContext) {
  const onMessage = useCallback(
    async (e: WebViewMessageEvent) => {
      const rawData = e.nativeEvent.data;
      let mode = rawData;
      let data: any = null;

      try {
        const parsed = JSON.parse(rawData);
        if (parsed.mode) {
          mode = parsed.mode;
          data = parsed.data;
        }
      } catch {
        // 단순 문자열인 경우 그대로 사용
      }

      // 등록된 핸들러 실행
      const handler = allHandlers[mode];
      if (handler) {
        await handler(data, ctx, mode);
        return;
      }

      // prefix 기반 핸들러: 외부 링크 열기
      if (mode.startsWith('Link: ')) {
        const link = mode.replace('Link: ', '');
        await Linking.openURL(link);
      }
    },
    [ctx],
  );

  return { onMessage };
}
