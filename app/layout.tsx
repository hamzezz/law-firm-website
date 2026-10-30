import type { Metadata } from "next";
import PwaInit from './components/pwa-init'
import DevFooter from './components/dev-footer'
import "./globals.css";
import StructuredData from "./components/structured-data";

export const metadata: Metadata = {
  metadataBase: new URL("https://kathirilaw.com"),
  title: "مكتب وليد الكثيري للمحاماة",
  description: "مكتب وليد الكثيري للمحاماة والاستشارات القانونية في محافظة إب، يقدّم خدماته للأفراد والشركات في القضايا التجارية والمدنية والجنائية والإدارية والأحوال الشخصية، بدقة ومهنية وسرية تامة.",
  alternates: { canonical: "https://kathirilaw.com" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "الكثيري",
    statusBarStyle: "black-translucent",
  },
  /**
   * أيقونة الاختصار على الشاشة الرئيسية.
   *
   * iOS لا يقرأ أيقونات manifest حين يُضاف الموقع من Safari، بل يقرأ
   * apple-touch-icon وحدها، ومقاسها ١٨٠×١٨٠ مربّعة بلا شفافية. وكانت
   * المشار إليها ١٤٨×١٩٢ — غير مربّعة — فظهرت على غير وجهها.
   */
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-7GSB9XKT43"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-7GSB9XKT43');`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}<DevFooter /><PwaInit /></body>
    </html>
  );
}
