import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SA Spanish 4 — Study Tool",
  description:
    "Vocabulary, conjugation drills and practice tests built from the SA Spanish 4 review packets.",
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
          SA Spanish 4 — Study Tool. Vocabulary and tests come from the class packets; your progress
          is stored in this browser.
        </footer>
      </body>
    </html>
  );
}
