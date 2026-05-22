import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Kentic to track your personal finances.',
  robots: {
    index: true,
    follow: true,
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
