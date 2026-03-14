import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import type { Product } from '../lib/types'
import { ProductCard } from '../components/ProductCard'

const QUICK_NAVS = [
  { label: '手作有温', icon: '🧵', category: '手工制品' },
  { label: '小院有约', icon: '🏡', category: '活动课程' },
  { label: '好礼有心', icon: '🎁', category: '礼品定制' },
] as const

const ALLOWED_CATEGORIES: string[] = QUICK_NAVS.map((item) => item.category)

export function ProductsPage() {
  const location = useLocation()
  const basePath = location.pathname.startsWith('/dark') ? '/dark' : ''
  const quickNavs = QUICK_NAVS
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showingAllFallback, setShowingAllFallback] = useState(false)

  useEffect(() => {
    const categoryFromUrl = new URLSearchParams(location.search).get('category')
    if (categoryFromUrl && ALLOWED_CATEGORIES.includes(categoryFromUrl)) {
      setCategoryFilter(categoryFromUrl)
      setQuery('')
      return
    }
    setCategoryFilter('all')
  }, [location.search])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)

      const supabase = getSupabase()
      if (!supabase) {
        setError('未配置 Supabase 环境变量')
        setProducts([])
        setLoading(false)
        return
      }

      const activeRes = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (activeRes.error) {
        setError(activeRes.error.message)
        setProducts([])
      } else {
        const activeRows = (activeRes.data ?? []) as Product[]
        if (activeRows.length > 0) {
          setProducts(activeRows)
          setShowingAllFallback(false)
        } else {
          const allRes = await supabase
            .from('products')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false })
          if (cancelled) return
          if (allRes.error) {
            setError(allRes.error.message)
            setProducts([])
          } else {
            setProducts((allRes.data ?? []) as Product[])
            setShowingAllFallback(true)
          }
        }
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (categoryFilter !== 'all') {
        const c = (p.category ?? '').trim()
        if (!c || c !== categoryFilter) return false
      }
      const hay = [p.name, p.short_description, p.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return !q || hay.includes(q)
    })
  }, [products, query, categoryFilter])

  return (
    <div className="container-page py-8 md:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="w-full md:max-w-xl">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {quickNavs.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setCategoryFilter(item.category)
                  setQuery('')
                }}
                className={[
                  'rounded-2xl border px-2 py-2 text-center shadow-sm transition hover:-translate-y-0.5 sm:px-4 sm:py-3',
                  categoryFilter === item.category
                    ? 'border-orange-300 bg-orange-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-orange-300 hover:shadow-md',
                ].join(' ')}
              >
                <div className="text-base leading-none sm:text-xl">{item.icon}</div>
                <div className="mt-1 text-xs font-semibold text-slate-900 sm:mt-2 sm:text-sm">
                  {item.label}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-end">
          <div className="w-full md:w-64">
            <label className="text-xs text-slate-500">搜索</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="输入产品/活动名称或关键词"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 md:mt-8">
        {showingAllFallback ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            当前没有“已上架”产品，已自动展示全部产品（含未上架）用于检查。
          </div>
        ) : null}
        {loading ? (
          <div className="text-sm text-slate-600">加载中…</div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
            无法加载产品：{error}
            <div className="mt-2 text-rose-700/80">
              你需要先配置 <code className="rounded bg-rose-100 px-1">VITE_SUPABASE_URL</code>{' '}
              和 <code className="rounded bg-rose-100 px-1">VITE_SUPABASE_ANON_KEY</code>{' '}
              ，并在 Supabase 建好 <code className="rounded bg-rose-100 px-1">products</code>{' '}
              表。
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
            暂无产品（或没有匹配搜索条件）。
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to={`${basePath}/products/${p.slug || p.id}`}
                className="block h-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <ProductCard product={p} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

