import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "냉장고 매니저",
  description: "스마트 냉장고 식재료 관리 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-pretendard">
        {children}
      </body>
    </html>
  );
}
