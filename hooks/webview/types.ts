import { RefObject } from 'react';
import WebView from 'react-native-webview';

export type WebviewMessageType = {
  mode: string;
  data?: any;
};

export type HandlerContext = {
  sendToWebview: (msg: WebviewMessageType) => void;
  webviewRef: RefObject<WebView | null>;
};

export type MessageHandler = (
  data: any,
  ctx: HandlerContext,
  mode: string,
) => Promise<void>;
