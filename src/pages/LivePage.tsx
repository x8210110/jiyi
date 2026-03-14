import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import type { CraftsmanProfile } from '../lib/types'

type Craftsman = {
  name: string
  role: string
  focus: string
  story: string
  years: string
  works: string[]
  avatar_url?: string | null
}

export function LivePage() {
  const location = useLocation()
  const basePath = location.pathname.startsWith('/dark') ? '/dark' : ''

  const fallbackCraftsmen: Craftsman[] = [
    {
      name: '王阿姨',
      role: '布艺手作师',
      focus: '香囊、布包、拼布挂饰',
      years: '7年手作经验',
      story:
        '她用针线把生活中的细碎温暖缝进作品，擅长把传统纹样和现代日用结合。每一件作品都细腻耐看，也承载着她重新建立自信的成长历程。',
      works: ['手工香囊', '拼布零钱包', '节气主题挂饰'],
      avatar_url: '/work-1.jpg',
    },
    {
      name: '陈师傅',
      role: '木作工艺师',
      focus: '木雕摆件、文创笔座、桌面收纳',
      years: '10年手作经验',
      story:
        '他在打磨与雕刻中找到稳定节奏，把耐心与专注变成可触摸的温度。作品结构扎实，兼顾实用与美感，常参与企业定制礼盒项目。',
      works: ['木作书签', '雕刻笔座', '企业礼赠套装'],
      avatar_url: '/work-2.jpg',
    },
    {
      name: '李姐姐',
      role: '编织工艺师',
      focus: '钩针玩偶、编织杯垫、节日礼品',
      years: '6年手作经验',
      story:
        '她善于用色彩表达情绪，作品风格温柔明快。通过持续创作与教学互助，她不仅提升了个人收入，也成为团队里带动新伙伴的重要力量。',
      works: ['钩针玩偶', '手工杯垫', '节庆礼盒配件'],
      avatar_url: '/work-3.jpg',
    },
    {
      name: '赵老师',
      role: '综合课程导师',
      focus: '入门教学、社群陪伴、作品打样',
      years: '公益教学负责人',
      story:
        '她长期负责学员训练与课程设计，帮助不同能力阶段的伙伴找到适合自己的工艺方向。她相信“被看见”本身就是改变发生的起点。',
      works: ['新手训练营', '小组协作工坊', '公益市集展示'],
      avatar_url: '/space-1.jpg',
    },
  ]
  const [craftsmen, setCraftsmen] = useState<Craftsman[]>(fallbackCraftsmen)

  useEffect(() => {
    let cancelled = false
    async function loadCraftsmen() {
      const supabase = getSupabase()
      if (!supabase) return
      const { data, error } = await supabase
        .from('craftsman_profiles')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(24)
      if (cancelled || error || !data || data.length === 0) return

      const mapped = (data as CraftsmanProfile[]).map((item) => ({
        name: item.name,
        role: item.role?.trim() || '手作工匠',
        focus: item.focus?.trim() || '手作创作',
        years: item.years?.trim() || '吉益工匠',
        story: item.story,
        works:
          Array.isArray(item.works) && item.works.length > 0
            ? item.works.filter((x) => Boolean(x?.trim()))
            : ['手作作品', '公益共创', '文创实践'],
        avatar_url: item.avatar_url,
      }))
      if (mapped.length > 0) setCraftsmen(mapped)
    }
    loadCraftsmen()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="container-page py-8 md:py-12">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="absolute -top-20 right-0 h-56 w-56 rounded-full bg-orange-200/60 blur-3xl" />
        <div className="absolute -bottom-16 left-8 h-48 w-48 rounded-full bg-cyan-200/60 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs text-orange-700">
            <span className="h-2 w-2 rounded-full bg-orange-300" />
            吉益工匠
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            残疾手作人个人介绍
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            这里记录每位手作人的专长与成长故事。每一件作品背后，不只是工艺本身，更是自立、尊严与被看见的过程。
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={`${basePath}/products`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-400"
            >
              查看工匠作品
            </a>
            <a
              href={`${basePath}/contact`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              联系我们支持工匠
            </a>
          </div>
        </div>
      </section>

      <section className="mt-8 md:mt-10">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">工匠档案</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {craftsmen.map((item) => (
            <article
              key={item.name}
              className="mx-auto w-full max-w-[17.5rem] rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
            >
              <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-white p-2">
                <div className="mx-auto w-20 sm:w-24 md:w-24">
                  {item.avatar_url ? (
                    <img
                      src={item.avatar_url}
                      alt={`${item.name} 个人照片`}
                      className="aspect-[3/4] w-full rounded-lg bg-slate-100 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
                      暂无照片
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-600">{item.role}</p>
                </div>
                <span className="rounded-full border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs text-cyan-700">
                  {item.years}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-orange-700">专长方向：{item.focus}</p>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{item.story}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.works.slice(0, 3).map((work) => (
                  <span
                    key={`${item.name}-${work}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                  >
                    {work}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

