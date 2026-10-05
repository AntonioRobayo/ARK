import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SWRegister } from "./sw-register"
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "ARK Workshop",
  description: "Todo tu taller. En un solo lugar.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ARK Workshop",
  },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

export const viewport = {
  themeColor: "#1F2937",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale()
  const messages = await getMessages()
  return (
    <html lang={locale} className={`${inter.className} h-full antialiased`}>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SWRegister />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
