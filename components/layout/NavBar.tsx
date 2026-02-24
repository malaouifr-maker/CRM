"use client"

import Link from "next/link"
import { BarChart2, Home, TrendingUp, Megaphone, List } from "lucide-react"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { useLanguageStore } from "@/lib/language-store"
import { useTranslation } from "@/lib/use-translation"
import { Button } from "@/components/ui/button"
import type { Lang } from "@/lib/i18n"

const navLinks = [
  { href: "/", labelKey: "nav.home" as const, icon: Home },
  { href: "/pipeline", labelKey: "nav.pipeline" as const, icon: BarChart2 },
  { href: "/marketing", labelKey: "nav.marketing" as const, icon: Megaphone },
  { href: "/forecast", labelKey: "nav.forecast" as const, icon: TrendingUp },
  { href: "/deals", labelKey: "nav.deals" as const, icon: List },
]

export function NavBar() {
  const { t, lang } = useTranslation()
  const setLang = useLanguageStore((s) => s.setLang)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
            <BarChart2 className="h-5 w-5 text-primary" />
            <span>CRM Dashboard</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, labelKey, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Icon className="h-4 w-4" />
                {t(labelKey)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs w-10"
            onClick={() => setLang((lang === "fr" ? "en" : "fr") as Lang)}
          >
            {lang === "fr" ? "EN" : "FR"}
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
