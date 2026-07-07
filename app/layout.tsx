import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Livo AI — Pronunciation Coach",
  description:
    "Get AI-powered pronunciation feedback on your English speech. Record or upload audio and receive detailed word-level analysis with actionable tips.",
  keywords: ["pronunciation", "English", "AI", "speech analysis", "language learning"],
  openGraph: {
    title: "Livo AI — Pronunciation Coach",
    description: "AI-powered pronunciation analysis for English learners",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[#080c14] text-white`}>
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          toastOptions={{
            style: {
              background: "#0d1117",
              border: "1px solid rgba(255,255,255,0.1)",
            },
          }}
        />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
