import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import type { Product } from '../lib/types'

export function ProductDetailPage() {
  const { slug = '' } = useParams()
  const location = useLocation()
  const basePath = location.pathname.startsWith('/dark/') ? '/dark' : ''
  const productsPath = `${basePath}/products`
  const contactPath = `${basePath}/contact`
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [orderedProducts, setOrderedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [inactivePreview, setInactivePreview] = useState(false)

  useEffect(() => {
    let cancelled = false
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    async function load() {
      setLoading(true)
      setError(null)
      setCopied(false)
      setInactivePreview(false)

      const supabase = getSupabase()
      if (!supabase) {
        setError('未配置 Supabase 环境变量')
        setLoading(false)
        return
      }

      const bySlug = await supabase
        .from('products')
        .select('*')
        .ilike('slug', slug)
        .eq('is_active', true)
        .limit(1)

      if (cancelled) return

      if (bySlug.error) {
        setError(bySlug.error.message)
        setLoading(false)
        return
      }

      let current = ((bySlug.data ?? [])[0] as Product | undefined) ?? null
      if (!current) {
        const bySlugAny = await supabase
          .from('products')
          .select('*')
          .ilike('slug', slug)
          .limit(1)
        if (cancelled) return
        if (bySlugAny.error) {
          setError(bySlugAny.error.message)
          setLoading(false)
          return
        }
        current = ((bySlugAny.data ?? [])[0] as Product | undefined) ?? null
        if (current && !current.is_active) {
          setInactivePreview(true)
        }
      }

      if (current) {
        setProduct(current)
        const relatedQuery = supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .neq('id', current.id)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(3)
        const relatedRes = current.category
          ? await relatedQuery.eq('category', current.category)
          : await relatedQuery
        if (!cancelled) {
          setRelatedProducts((relatedRes.data ?? []) as Product[])
        }
        const orderedRes = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false })
        if (!cancelled) {
          setOrderedProducts((orderedRes.data ?? []) as Product[])
          setActiveImageIndex(0)
        }
        setLoading(false)
        return
      }

      // Only fallback to ID lookup when param is a UUID.
      if (!uuidPattern.test(slug)) {
        setProduct(null)
        setRelatedProducts([])
        setOrderedProducts([])
        setLoading(false)
        return
      }

      const byId = await supabase
        .from('products')
        .select('*')
        .eq('id', slug)
        .eq('is_active', true)
        .maybeSingle()

      if (cancelled) return

      if (byId.error) {
        setError(byId.error.message)
      } else {
        let currentById = (byId.data as Product | null) ?? null
        if (!currentById) {
          const byIdAny = await supabase
            .from('products')
            .select('*')
            .eq('id', slug)
            .maybeSingle()
          if (cancelled) return
          if (byIdAny.error) {
            setError(byIdAny.error.message)
            setLoading(false)
            return
          }
          currentById = (byIdAny.data as Product | null) ?? null
          if (currentById && !currentById.is_active) {
            setInactivePreview(true)
          }
        }

        setProduct(currentById)
        if (currentById) {
          const relatedQuery = supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .neq('id', currentById.id)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false })
            .limit(3)
          const relatedRes = currentById.category
            ? await relatedQuery.eq('category', currentById.category)
            : await relatedQuery
          if (!cancelled) {
            setRelatedProducts((relatedRes.data ?? []) as Product[])
          }
          const orderedRes = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false })
          if (!cancelled) {
            setOrderedProducts((orderedRes.data ?? []) as Product[])
            setActiveImageIndex(0)
          }
        } else {
          setRelatedProducts([])
          setOrderedProducts([])
        }
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  const contactWithProductPath = `${contactPath}?product=${encodeURIComponent(
    product?.name ?? '',
  )}`

  const gallery = useMemo(() => {
    if (!product) return []
    const list: string[] = []
    if (product.image_url?.trim()) list.push(product.image_url.trim())
    const extras = Array.isArray(product.gallery_urls) ? product.gallery_urls : []
    for (const item of extras) {
      const url = String(item ?? '').trim()
      if (!url) continue
      if (!list.includes(url)) list.push(url)
    }
    return list
  }, [product])

  useEffect(() => {
    if (activeImageIndex < gallery.length) return
    setActiveImageIndex(0)
  }, [activeImageIndex, gallery.length])

  const currentOrderIndex = product
    ? orderedProducts.findIndex((item) => item.id === product.id)
    : -1
  const prevProduct = currentOrderIndex > 0 ? orderedProducts[currentOrderIndex - 1] : null
  const nextProduct =
    currentOrderIndex >= 0 && currentOrderIndex < orderedProducts.length - 1
      ? orderedProducts[currentOrderIndex + 1]
      : null

  if (loading) {
    return (
      <div className="container-page py-10 md:py-12">
        <div className="text-sm text-slate-600">加载详情中…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container-page py-10 md:py-12">
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
          详情加载失败：{error}
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container-page py-10 md:py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          未找到该产品，可能已下架或链接无效。
        </div>
      </div>
    )
  }

  async function copyCurrentUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  function goPrevImage() {
    if (gallery.length <= 1) return
    setActiveImageIndex((idx) => (idx - 1 + gallery.length) % gallery.length)
  }

  function goNextImage() {
    if (gallery.length <= 1) return
    setActiveImageIndex((idx) => (idx + 1) % gallery.length)
  }

  return (
    <div className="container-page py-10 md:py-12">
      <div className="mb-6">
        <Link
          to={productsPath}
          className="inline-flex items-center text-sm font-semibold text-orange-600 transition hover:text-orange-500"
        >
          ← 返回产品服务
        </Link>
      </div>

      {inactivePreview ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          当前展示的是“未上架产品预览”，仅用于后台调试检查。
        </div>
      ) : null}

      <article className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 md:gap-8 md:p-8">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {gallery.length > 0 ? (
            <>
              <div className="relative">
                <img
                  src={gallery[activeImageIndex]}
                  alt={`${product.name} 图集图片 ${activeImageIndex + 1}`}
                  className="aspect-[4/3] w-full rounded-xl object-contain"
                />
                {gallery.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={goPrevImage}
                      className="absolute left-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/60"
                      aria-label="上一张图片"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={goNextImage}
                      className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/60"
                      aria-label="下一张图片"
                    >
                      ›
                    </button>
                  </>
                ) : null}
              </div>
              {gallery.length > 1 ? (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {gallery.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={[
                        'overflow-hidden rounded-lg border bg-white',
                        idx === activeImageIndex
                          ? 'border-orange-300 ring-2 ring-orange-200'
                          : 'border-slate-200',
                      ].join(' ')}
                    >
                      <img
                        src={url}
                        alt={`${product.name} 缩略图 ${idx + 1}`}
                        className="aspect-square w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
              暂无图片
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.category ? (
              <span className="rounded-full border border-orange-300 bg-orange-50 px-2.5 py-1 text-xs text-orange-700">
                {product.category}
              </span>
            ) : null}
            {typeof product.price_cny === 'number' ? (
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                参考价 ¥{product.price_cny.toLocaleString('zh-CN')}
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            {product.name}
          </h1>

          {product.short_description ? (
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {product.short_description}
            </p>
          ) : null}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold text-slate-900">产品详细介绍</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
              {product.description?.trim() || '暂无详细介绍，欢迎联系客服获取更多信息。'}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={contactWithProductPath}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-300/40 transition hover:bg-orange-400"
            >
              咨询这个产品
            </a>
            <button
              type="button"
              onClick={copyCurrentUrl}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {copied ? '链接已复制' : '复制详情链接'}
            </button>
            <Link
              to={productsPath}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              继续浏览
            </Link>
          </div>
        </div>
      </article>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-slate-900">产品导航</div>
          <div className="flex flex-wrap gap-2">
            {prevProduct ? (
              <Link
                to={`${productsPath}/${prevProduct.slug || prevProduct.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                ← 上一个：{prevProduct.name}
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                已是第一个产品
              </span>
            )}
            {nextProduct ? (
              <Link
                to={`${productsPath}/${nextProduct.slug || nextProduct.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                下一个：{nextProduct.name} →
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                已是最后一个产品
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold text-slate-900">相关推荐</h2>
        {relatedProducts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">暂无相关推荐，可返回列表查看更多产品。</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                to={`${productsPath}/${item.slug || item.id}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-orange-300 hover:bg-white"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-xl bg-white">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">
                      暂无图片
                    </div>
                  )}
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-900">{item.name}</div>
                {item.short_description ? (
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                    {item.short_description}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

