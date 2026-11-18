import type { Metadata } from "next";
import { currentUser } from '@/lib/auth';
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "InterviewIQ",
  description: "Adaptive mock interviews powered by AI",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Spectral:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav signedIn={!!user && !user.isAnonymous} guest={!!user?.isAnonymous} />
        {children}
      </body>
    </html>
  );
}
