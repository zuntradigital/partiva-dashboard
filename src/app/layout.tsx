import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Partiva | لوحة تحكم المحتوى",
  description: "لوحة تحكم إدارة المحتوى لموقع Partiva التعريفي",
};

// Applies the saved theme and language to <html> before React hydrates, so
// the page never flashes the wrong theme/direction and React never sees a
// DOM attribute it didn't render itself (avoided via suppressHydrationWarning
// on <html> below).
const INIT_SCRIPT = `try{
if(localStorage.getItem('partiva_theme')==='light')document.documentElement.setAttribute('data-theme','light');
if(localStorage.getItem('partiva_lang')==='en'){document.documentElement.lang='en';document.documentElement.dir='ltr';}
}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
      </head>
      <body className="h-full min-h-screen bg-background font-sans text-foreground antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
