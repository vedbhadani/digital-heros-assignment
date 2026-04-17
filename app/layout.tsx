import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Fair Chance Club",
  description:
    "A charity-led subscription platform for golf score tracking, monthly prize draws, and modern community-first storytelling."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

