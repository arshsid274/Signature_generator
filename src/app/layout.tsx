import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Animated Signature Studio",
  description:
    "Create animated email-signature GIFs — pick a layout, fill in your details, choose an animation, export a looping GIF.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
