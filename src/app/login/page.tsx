'use client'

import { createClient } from '@/lib/supabase/client'
import { Chrome } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.replace('/upload')
      } else {
        setLoading(false)
      }
    }
    checkUser()
  }, [supabase, router])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
          <div className="text-center mb-8">
            <Image 
              src="/kentic.png" 
              alt="Kentic" 
              width={280} 
              height={80}
              className="w-full h-auto object-contain mb-4"
            />
            <p className="text-gray-500">Track your income and expenses</p>
          </div>
          
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Chrome aria-hidden="true" className="w-5 h-5" />
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}
