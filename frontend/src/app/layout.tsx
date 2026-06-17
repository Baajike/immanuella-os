import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ImmanuellaOS",
  description: "Personal life operating system frontend foundation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
