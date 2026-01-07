import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/app/components/auth/AuthProvider";
import { MuiProvider } from "@/lib/MuiProvider";
import { DeleteConfirmProvider } from "@/app/components/DeleteConfirmProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Boss Mode - Your Accountability Partner",
  description: "Stay on track with your personal productivity boss. Add tasks, get things done, and receive stern motivation when you slack off.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <MuiProvider>
            <DeleteConfirmProvider>
              {children}
            </DeleteConfirmProvider>
          </MuiProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

