import type { Metadata } from 'next'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/600.css'
import './social.css'

// Social posts & department news have their own look (Tailwind), kept separate from the flyer studio.
export const metadata: Metadata = {
  title: 'BOSS Designs',
  description: 'Department news and social media posts for BOSS Consultancy Services',
  robots: { index: false, follow: false },
}

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
