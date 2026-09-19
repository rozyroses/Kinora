import type { Metadata } from "next";
import "./globals.css";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = {
  title: "Kinora — AI Creative Studio",
  description: "A private AI creative studio for image, video, characters, and visual projects.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthShell>{children}</AuthShell>
      </body>
    </html>
  );
}
