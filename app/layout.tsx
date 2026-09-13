import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "远野心屋 · 与 Roxy 一起安放念头",
  description: "与 Roxy 一起散步、阅读、写作，在雨蓝色的日常里安放想法、记忆与灵感。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
