import type { Metadata } from "next";
import "./globals.scss";
import logo from '@/assets/logo.png';

export const metadata: Metadata = {
  title: "Peremoney — Личный кабинет",
  description: "Личный кабинет лидогенерации Peremoney",
  icons: { icon: logo.src, apple: logo.src },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
