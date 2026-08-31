import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

// Forces every route to render per-request instead of being prerendered as
// static HTML. Hostinger's deployment replaces the previous build's
// /_next/static chunks in place (no old-build asset retention like Vercel),
// so a long-cached static page (Cache-Control: s-maxage=31536000) can keep
// referencing chunk hashes that no longer exist after the next deploy. A
// dynamic route gets Cache-Control: private, no-cache, no-store, max-age=0,
// must-revalidate instead, so the HTML is never cached and always reflects
// the current deployment's chunk hashes.
export const dynamic = "force-dynamic";

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

// Backstop for stale-chunk failures that error.tsx's boundary doesn't see --
// a rejected dynamic import() surfaces as an unhandled promise rejection,
// not a thrown render error, when it happens outside a React update (e.g. a
// prefetch). Same self-heal as error.tsx: one automatic reload, guarded by
// the same sessionStorage key so the two mechanisms can't double-trigger.
// Runs as a raw script (not a React effect) so it's active even if React
// itself fails to mount.
const CHUNK_ERROR_RELOAD_SCRIPT = `(function(){
var FLAG='partiva_chunk_reload_attempted';
function isChunkError(e){
  var msg=(e&&(e.message||(e.reason&&e.reason.message)))||'';
  var name=(e&&(e.name||(e.reason&&e.reason.name)))||'';
  return name==='ChunkLoadError'||/Loading chunk [\\w.-]+ failed/i.test(msg);
}
function handle(e){
  if(!isChunkError(e))return;
  try{
    if(sessionStorage.getItem(FLAG))return;
    sessionStorage.setItem(FLAG,'1');
  }catch(err){return;}
  location.reload();
}
window.addEventListener('error',handle);
window.addEventListener('unhandledrejection',handle);
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: CHUNK_ERROR_RELOAD_SCRIPT }} />
      </head>
      <body className="h-full min-h-screen bg-background font-sans text-foreground antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
