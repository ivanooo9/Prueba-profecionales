import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import { Toaster } from "sonner"
import { Providers } from "@/components/providers"
import { GoogleAnalytics } from "@next/third-parties/google"
import "./globals.css"

const gilroy = localFont({
  src: [
    {
      path: "../public/fonts/gilroy/Gilroy-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/gilroy/Gilroy-Light.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/gilroy/Gilroy-ExtraBold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/gilroy/Gilroy-ExtraBold.otf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/gilroy/Gilroy-ExtraBold.otf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-gilroy",
})

export const metadata: Metadata = {
  title: "MIAUWUAUF - Fundación para Animales",
  description:
    "Fundación dedicada al cuidado y protección de animales. Vacunación, adopción responsable y tecnología GPS para mascotas.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${gilroy.variable} overflow-x-hidden font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="bottom-center"
            closeButton
            toastOptions={{
              duration: 3000,
              style: {
                background: "#EDE986",
                color: "#000000",
                border: "3px solid #000000",
                boxShadow: "4px 4px 0px 0px #000000",
                fontFamily: 'var(--font-gilroy), ui-sans-serif, system-ui, sans-serif',
                fontWeight: 900,
                fontSize: "1.2rem",
                borderRadius: "16px",
              },
            }}
          />
        </Providers>
        <GoogleAnalytics gaId="G-CZB6CTST2H" />
      </body>
    </html>
  )
}
