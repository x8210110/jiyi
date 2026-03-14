import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { FaWeixin } from 'react-icons/fa'
import { SiTiktok, SiXiaohongshu } from 'react-icons/si'
import { Logo } from './Logo'

type SiteLayoutProps = {
  theme?: 'light' | 'dark'
  basePath?: string
}

export function SiteLayout({ theme = 'light', basePath = '' }: SiteLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const isDark = theme === 'dark'
  const rootPath = basePath || '/'
  const path = (segment: string) => {
    if (!basePath) return segment
    return `${basePath}${segment}`
  }

  useEffect(() => {
    const cls = 'theme-dark'
    if (isDark) {
      document.body.classList.add(cls)
    } else {
      document.body.classList.remove(cls)
    }
    return () => {
      document.body.classList.remove(cls)
    }
  }, [isDark])

  const menuItems = [
    { label: '首页', href: path('/#hero') },
    { label: '吉益简介', href: path('/about') },
    { label: '产品服务', href: path('/products') },
    { label: '吉益工匠', href: path('/craftsmen') },
    { label: '联系我们', href: path('/contact') },
  ]

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="container-page flex h-14 items-center justify-between md:h-16">
          <a href={rootPath} className="rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400">
            <Logo />
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </a>
            ))}
            <a
              href={isDark ? '/' : '/dark'}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-orange-600 transition hover:bg-orange-50 hover:text-orange-500"
            >
              {isDark ? '浅色版' : '深色版'}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={path('/contact')}
              className="hidden min-h-11 items-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-300/40 transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400 md:inline-flex"
            >
              立即咨询
            </a>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-slate-700 md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="打开导航菜单"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
        {mobileOpen ? (
          <div className="border-t border-slate-200 bg-white px-4 pb-5 pt-4 md:hidden">
            <nav className="grid gap-2">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        ) : null}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 md:py-10">
        <div className="container-page flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:justify-between md:text-left">
          <div>
            <div className="text-sm font-semibold text-slate-700">吉益手作文化中心</div>
            <div className="mt-1 text-xs text-slate-500">
              © {new Date().getFullYear()} 吉益手作文化中心 · 公益 + 文创
            </div>
          </div>
          <div className="flex items-end gap-4 md:gap-6">
            <div className="text-right md:text-right">
              <div className="text-xs text-slate-500">关注我们</div>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href="/contact"
                  aria-label="微信客服"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-base text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <FaWeixin />
                </a>
                <a
                  href="https://www.douyin.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="抖音"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-base text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  <SiTiktok />
                </a>
                <a
                  href="https://www.xiaohongshu.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="小红书"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-base text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                >
                  <SiXiaohongshu />
                </a>
              </div>
            </div>
            <div className="text-center">
              <img
                src="/wechat-official-qr.png"
                alt="太仓吉益手作文化中心微信公众号二维码"
                className="mx-auto h-20 w-20 rounded-md bg-white p-1 object-contain md:h-16 md:w-16"
              />
              <div className="mt-1 text-xs text-slate-500">公众号</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

