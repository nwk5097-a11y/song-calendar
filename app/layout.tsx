import type { Metadata } from "next";
import "./globals.css";
import { ErrorBoundary } from "./error-boundary";

export const metadata: Metadata = {
  title: "2026 달력 - 러블리 일정 관리",
  description: "핑크 톤의 러블리한 디자인의 2026년 달력으로 일정을 관리하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
