import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SenSei — Your money, clearly",
  description: "A private, detailed view of your SenSei finances.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
