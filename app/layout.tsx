import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "مكتب وليد الكثيري للمحاماة",
  description: "نظام إدارة مكتب المحاماة",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
