import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { NavBar } from "@/components/layout/NavBar"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CRM Dashboard",
  description: "Suivi des prospects et clients",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <div className="min-h-screen bg-background">
            <NavBar />
            <main className="container py-6">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
