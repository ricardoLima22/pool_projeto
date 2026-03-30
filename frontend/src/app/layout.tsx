import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "PoolControl",
  description: "Gerenciamento de limpeza de piscinas",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className={inter.variable}>
      <body className={`font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            duration: 4000,
            style: { fontFamily: "var(--font-inter, sans-serif)", fontSize: "14px" },
          }}
        />
      </body>
    </html>
  );
}
