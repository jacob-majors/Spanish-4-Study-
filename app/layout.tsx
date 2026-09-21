import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Colophon from "@/components/Colophon";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
  style: "normal",
  variable: "--font-fraunces",
});

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  variable: "--font-plex",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "SA Spanish 4 — Study Tool",
  description:
    "Vocabulary, conjugation drills and practice tests built from the SA Spanish 4 review packets.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/** Applies the saved theme before first paint so the page never flashes. */
const THEME_SCRIPT =
  "try{var t=localStorage.getItem('sa.theme');if(t==='night')document.documentElement.dataset.theme='night'}catch(e){}";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plex.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Nav />
        <main
          className="mx-auto w-full"
          style={{
            maxWidth: "74rem",
            paddingInline: "var(--page-gutter)",
            paddingBlock: "var(--space-xl) var(--space-3xl)",
          }}
        >
          {children}
        </main>
        <Colophon />
      </body>
    </html>
  );
}
