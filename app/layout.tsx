// app/layout.tsx

import type { Metadata } from "next";
import StyledComponentsRegistry from "@/lib/registry"; 
import { ViewProvider } from "./view-context"; // ✅ ViewProvider import 필수
import "@/app/globals.css";
import ClientLayoutWrapper from "./layout-client";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";

export const metadata: Metadata = {
  title: "GOMOTEC AI 管制センター",
  description: "DXS Osaka · Local Exhibition",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body suppressHydrationWarning={true}>
        <StyledComponentsRegistry>
          {/* ✅ ViewProvider가 가장 바깥에 있어야 합니다 */}
          <LocaleProvider>
          <ViewProvider>
          {/* ✅ 여기서 한 번만 감싸줍니다. */}
            <ClientLayoutWrapper>
              {children} 
            </ClientLayoutWrapper>
          </ViewProvider>
          </LocaleProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
