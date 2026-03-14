import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import type {
  NewsArticle,
  SpaceEnvironmentContent,
  SpaceEnvironmentItem,
} from '../lib/types'

export function AboutPage() {
  const defaultPhotos = [
    { alt: '手作教室环境展示', src: '/space-1.jpg' },
    { alt: '活动现场互动照片', src: '/activity-1.jpg' },
    { alt: '手作作品陈列区', src: '/work-showcase.jpg' },
  ]
  const [spacePhotos, setSpacePhotos] = useState(defaultPhotos)
  const [spaceIntro, setSpaceIntro] = useState(
    '吉益手作文化中心是一家深耕“公益+文创”的温暖空间，秉持“指尖赋能、爱心联结”的核心使命，让每一件手作都承载故事与希望，在传承手工艺术的同时，为特殊群体搭建成长与增收的桥梁。',
  )
  const [slideIndex, setSlideIndex] = useState(0)
  const [news, setNews] = useState<NewsArticle[]>([])

  useEffect(() => {
    let cancelled = false
    async function loadSpaceData() {
      const supabase = getSupabase()
      if (!supabase) return

      const [spaceRes, contentRes, newsRes] = await Promise.all([
        supabase
          .from('space_environment')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('space_environment_content')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('news_articles')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('publish_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(9),
      ])

      if (cancelled) return

      if (!spaceRes.error && spaceRes.data && spaceRes.data.length > 0) {
        const mapped = (spaceRes.data as SpaceEnvironmentItem[])
          .filter((x) => Boolean(x.image_url))
          .map((x) => ({
            alt: x.title || '空间环境照片',
            src: x.image_url as string,
          }))
        if (mapped.length > 0) setSpacePhotos(mapped)
      }

      if (!contentRes.error && contentRes.data) {
        const row = contentRes.data as SpaceEnvironmentContent
        const intro = row.intro_1 || row.intro_2 || row.intro_3
        if (intro) setSpaceIntro(intro)
      }

      if (!newsRes.error && newsRes.data) {
        setNews((newsRes.data ?? []) as NewsArticle[])
      }
    }

    loadSpaceData()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (spacePhotos.length <= 1) return
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % spacePhotos.length)
    }, 3200)
    return () => window.clearInterval(timer)
  }, [spacePhotos])

  useEffect(() => {
    if (slideIndex <= spacePhotos.length - 1) return
    setSlideIndex(0)
  }, [slideIndex, spacePhotos.length])

  return (
    <div className="container-page py-12 md:py-14">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-600">News</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          最新动态
        </h1>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {news.length > 0 ? (
            news.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-orange-300 hover:bg-white"
              >
                {item.image_url ? (
                  <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <img
                      src={item.image_url}
                      alt={`${item.title} 动态图片`}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <div className="text-xs font-medium text-orange-600">{item.publish_date}</div>
                <h3 className="mt-2 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 md:col-span-3">
              暂无动态，可在后台“动态管理”中新增后自动展示。
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-600">Gallery</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          空间展示
        </h2>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="relative overflow-hidden rounded-xl">
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${slideIndex * 100}%)` }}
            >
              {spacePhotos.map((photo) => (
                <img
                  key={`${photo.alt}-${photo.src}`}
                  src={photo.src}
                  alt={photo.alt}
                  className="h-56 w-full shrink-0 rounded-xl object-cover md:h-[26rem]"
                />
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            {spacePhotos.map((photo, idx) => (
              <button
                key={`${photo.alt}-${idx}`}
                type="button"
                aria-label={`切换到第${idx + 1}张图片`}
                onClick={() => setSlideIndex(idx)}
                className={[
                  'h-2.5 rounded-full transition-all',
                  idx === slideIndex
                    ? 'w-6 bg-orange-400'
                    : 'w-2.5 bg-slate-300 hover:bg-slate-400',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-600">About JiYi</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          吉益简介
        </h2>
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">{spaceIntro}</p>
      </section>
    </div>
  )
}

