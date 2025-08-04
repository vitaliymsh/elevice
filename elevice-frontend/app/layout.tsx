import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "@/components/common/ReactQueryProvider";
import { GlobalLayoutWrapper } from "@/components/providers/GlobalLayoutWrapper";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elevice",
  description: "Your personal interview helper",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistMono.variable} ${geistSans.variable}  antialiased`}
      >
        <ReactQueryProvider>
          <GlobalLayoutWrapper>
            {children}
          </GlobalLayoutWrapper>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
