import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "远野心屋 · 让念头慢慢生长",
  description: "一处用来安放想法、记忆与灵感的私人精神空间。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
