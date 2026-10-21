import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { AppFrame } from "@/components/AppFrame";
import { ToastProvider } from "@/components/Toast";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "KodiSalama — Usimamizi wa Wapangaji",
    template: "%s · KodiSalama",
  },
  description:
    "Mfumo wa usimamizi wa vyumba, wapangaji, malipo ya kodi, mikataba na SMS nchini Tanzania.",
  applicationName: "KodiSalama",
  keywords: [
    "kodi",
    "wapangaji",
    "Tanzania",
    "rental",
    "landlord",
    "M-Pesa",
    "mkataba",
  ],
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#064e3b",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="sw"
      className={`${dmSans.variable} ${jakarta.variable} ${sourceSerif.variable}`}
    >
      <body className="ks-app-bg bg-[#f0f4f1] font-sans text-slate-900 antialiased">
        <ToastProvider>
          <AppFrame>{children}</AppFrame>
        </ToastProvider>
      </body>
    </html>
  );
}
