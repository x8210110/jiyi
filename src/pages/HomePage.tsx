import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import type { HeroBanner } from '../lib/types'

export function HomePage() {
  const location = useLocation()
  const basePath = location.pathname.startsWith('/dark') ? '/dark' : ''
  const defaultHeroImages = ['/hero-bg.png', '/space-1.jpg', '/work-showcase.jpg']
  const [heroImages, setHeroImages] = useState(defaultHeroImages)
  const [heroIndex, setHeroIndex] = useState(0)

  const highlights = [
    {
      title: '手作有温',
      desc: '用心制作的文创好物，不只是一份礼物，更是一段真实而温暖的故事，等待有缘人静静聆听。',
      bg: '/shouzuo-bg-2.png',
      category: '手工制品',
    },
    {
      title: '小院有约',
      desc: '青砖黛瓦间，我们一起慢下来，做一些温暖的小事，让彼此的心靠得更近一些。',
      bg: '/xiaoyuan-bg.png',
      category: '活动课程',
    },
    {
      title: '好礼有心',
      desc: '一份礼物，两份心意。送给最珍视的伙伴。让每一次福利的传递，都带着爱的回响。',
      bg: '/haoli-bg.png',
      category: '礼品定制',
    },
  ]

  useEffect(() => {
    let cancelled = false
    async function loadHeroBanners() {
      const supabase = getSupabase()
      if (!supabase) return
      const { data, error } = await supabase
        .from('hero_banners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(12)

      if (cancelled) return
      if (!error && data && data.length > 0) {
        const images = (data as HeroBanner[])
          .map((x) => x.image_url?.trim())
          .filter(Boolean) as string[]
        if (images.length > 0) setHeroImages(images)
      }
    }
    loadHeroBanners()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (heroImages.length <= 1) return
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length)
    }, 3800)
    return () => window.clearInterval(timer)
  }, [heroImages.length])

  useEffect(() => {
    if (heroIndex <= heroImages.length - 1) return
    setHeroIndex(0)
  }, [heroImages.length, heroIndex])

  return (
    <>
      <section
        className="relative isolate min-h-[52vh] overflow-hidden border-b border-white/10 md:min-h-0"
        id="hero"
        style={{
          backgroundImage: `url('${heroImages[heroIndex]}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="container-page relative z-10 py-10 md:py-28">
          <div className="min-h-[230px] md:min-h-[320px]"></div>
          <div className="absolute bottom-3 left-4 flex items-center gap-2 md:bottom-8 md:left-8">
            {heroImages.map((img, idx) => (
              <button
                key={`${img}-${idx}`}
                type="button"
                aria-label={`切换到第${idx + 1}张背景图`}
                onClick={() => setHeroIndex(idx)}
                className={[
                  'h-2 rounded-full transition-all md:h-2.5',
                  idx === heroIndex
                    ? 'w-5 bg-orange-400 md:w-6'
                    : 'w-2 bg-white/80 hover:bg-white md:w-2.5',
                ].join(' ')}
              />
            ))}
          </div>
          <div className="absolute bottom-3 right-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/55 px-3 py-1.5 text-[11px] text-slate-200 md:bottom-8 md:right-8 md:px-4 md:py-2 md:text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
            公益 + 文创 · 温暖与创造同行
          </div>
        </div>
      </section>

      <section className="container-page py-10 md:py-14" id="highlights">
        <div className="grid gap-4 md:grid-cols-3 md:gap-6">
          {highlights.map((f) => (
            <Link
              key={f.title}
              to={`${basePath}/products?category=${encodeURIComponent(f.category)}`}
              className={[
                'rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md md:p-6',
                f.bg
                  ? 'relative overflow-hidden border-slate-200 bg-cover bg-center'
                  : 'border-slate-200 bg-white hover:border-orange-300',
              ].join(' ')}
              style={f.bg ? { backgroundImage: `url(${f.bg})` } : undefined}
              aria-label={`${f.title}，查看${f.category}`}
            >
              {f.bg ? (
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.32)_0%,rgba(2,6,23,0.58)_58%,rgba(2,6,23,0.72)_100%)]" />
              ) : null}
              <div className="absolute left-1/2 top-2 z-20 -translate-x-1/2 text-center md:top-3">
                <span
                  className={[
                    "inline-flex px-2 py-1 text-xl font-semibold tracking-wide text-orange-100 [font-family:'STKaiti','KaiTi','DFKai-SB',serif] [text-shadow:0_1px_8px_rgba(2,6,23,0.75)] md:text-3xl",
                  ].join(' ')}
                >
                  {f.title}
                </span>
              </div>
              <div
                className={[
                  'relative z-10 mt-10 text-sm leading-6 indent-[2em] md:mt-12 md:leading-7',
                  f.bg ? 'text-slate-50 [text-shadow:0_1px_4px_rgba(2,6,23,0.65)]' : 'text-slate-600',
                ].join(' ')}
              >
                {f.desc}
              </div>
            </Link>
          ))}
        </div>
      </section>

    </>
  )
}

