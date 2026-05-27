import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { QueryProvider } from "@/providers/QueryProvider";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Kentic — Personal Finance Tracker",
    template: "%s | Kentic",
  },
  description:
    "Track your income and expenses, manage budgets, and visualise your personal finances with Kentic.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Kentic — Personal Finance Tracker",
    description:
      "Track your income and expenses, manage budgets, and visualise your personal finances.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <QueryProvider>
          <ThemeProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
