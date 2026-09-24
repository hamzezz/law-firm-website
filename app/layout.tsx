import type { Metadata } from "next";
import "./globals.css";
import StructuredData from "./components/structured-data";

export const metadata: Metadata = {
  metadataBase: new URL("https://kathirilaw.com"),
  title: "مكتب وليد الكثيري للمحاماة",
  description: "مكتب وليد الكثيري للمحاماة والاستشارات القانونية في محافظة إب، يقدّم خدماته للأفراد والشركات في القضايا التجارية والمدنية والجنائية والإدارية والأحوال الشخصية، بدقة ومهنية وسرية تامة.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "مكتب وليد الكثيري للمحاماة",
    description: "مكتب وليد الكثيري للمحاماة والاستشارات القانونية في محافظة إب، يقدّم خدماته للأفراد والشركات في القضايا التجارية والمدنية والجنائية والإدارية والأحوال الشخصية، بدقة ومهنية وسرية تامة.",
    url: "https://kathirilaw.com",
    siteName: "مكتب وليد الكثيري للمحاماة",
    locale: "ar_YE",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "مكتب وليد الكثيري للمحاماة" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "مكتب وليد الكثيري للمحاماة",
    description: "مكتب وليد الكثيري للمحاماة والاستشارات القانونية في محافظة إب، يقدّم خدماته للأفراد والشركات في القضايا التجارية والمدنية والجنائية والإدارية والأحوال الشخصية، بدقة ومهنية وسرية تامة.",
    images: ["/og-image.png"],
  },
};

export const viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <head>
        <StructuredData />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
