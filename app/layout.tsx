import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Humming Melody Transcriber",
  description: "音階判定・鼻歌録音ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
