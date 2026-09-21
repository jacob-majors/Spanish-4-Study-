import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Verbo — Spanish study",
  description:
    "Flashcards, spaced-repetition learning, practice tests and full conjugation drills for Spanish 4.",
};

export const viewport: Viewport = {
  themeColor: "#0b0e1a",
  width: "device-width",
  initialScale: 1,
};

/** Applies the saved theme before first paint so the page never flashes. */
const THEME_SCRIPT =
  "try{document.documentElement.dataset.theme=localStorage.getItem('verbo.theme')||'dark'}catch(e){}";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-xs muted">
          Verbo — flashcards, spaced repetition, practice tests and conjugation drills. Everything
          you study is stored in this browser.
        </footer>
      </body>
    </html>
  );
}
