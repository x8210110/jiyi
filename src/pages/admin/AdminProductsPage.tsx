import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSupabase } from '../../lib/supabase'
import type { Product } from '../../lib/types'

type Draft = Pick<
  Product,
  | 'name'
  | 'slug'
  | 'category'
  | 'short_description'
  | 'description'
  | 'price_cny'
  | 'image_url'
  | 'gallery_urls'
  | 'is_active'
  | 'sort_order'
>

const emptyDraft: Draft = {
  name: '',
  slug: '',
  category: '',
  short_description: '',
  description: '',
  price_cny: null,
  image_url: '',
  gallery_urls: [],
  is_active: true,
  sort_order: 0,
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)+/g, '')
}

export function AdminProductsPage() {
  const navigate = useNavigate()
  const [sessionChecked, setSessionChecked] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const categoryOptions = ['手工制品', '活动课程', '礼品定制']

  useEffect(() => {
    let cancelled = false
    async function check() {
      const supabase = getSupabase()
      if (!supabase) {
        setError('未配置 Supabase 环境变量')
        setSessionChecked(true)
        return
      }
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setSessionChecked(true)
      if (!data.session) navigate('/admin/login', { replace: true })
    }
    check()
    return () => {
      cancelled = true
    }
  }, [navigate])

  async function load() {
    const supabase = getSupabase()
    if (!supabase) {
      setError('未配置 Supabase 环境变量')
      setProducts([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setProducts((data ?? []) as Product[])
    setLoading(false)
  }

  useEffect(() => {
    if (!sessionChecked) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionChecked])

  const mode = useMemo(() => (editing ? 'edit' : 'create'), [editing])

  function startCreate() {
    setEditing(null)
    setDraft(emptyDraft)
    setImageFile(null)
    setGalleryFiles([])
  }

  function startEdit(p: Product) {
    setEditing(p)
    setDraft({
      name: p.name,
      slug: p.slug,
      category: p.category ?? '',
      short_description: p.short_description ?? '',
      description: p.description ?? '',
      price_cny: p.price_cny,
      image_url: p.image_url ?? '',
      gallery_urls: Array.isArray(p.gallery_urls)
        ? p.gallery_urls.filter((x) => Boolean(x))
        : [],
      is_active: p.is_active,
      sort_order: p.sort_order,
    })
    setImageFile(null)
    setGalleryFiles([])
  }

  async function save() {
    const supabase = getSupabase()
    if (!supabase) {
      setError('未配置 Supabase 环境变量')
      return
    }
    setSaving(true)
    setError(null)
    const productId = editing?.id ?? crypto.randomUUID()
    let imageUrl =
      draft.image_url?.trim() && !imageFile
        ? draft.image_url.trim()
        : null
    let galleryUrls = (draft.gallery_urls ?? [])
      .map((x) => String(x ?? '').trim())
      .filter(Boolean)

    if (imageFile) {
      const bucket = 'product-images'
      const ext =
        imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `products/${productId}-${Date.now()}.${ext}`
      const uploadRes = await supabase.storage
        .from(bucket)
        .upload(path, imageFile, {
          upsert: true,
        })
      if (uploadRes.error) {
        setError(`图片上传失败：${uploadRes.error.message}`)
        setSaving(false)
        return
      }
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadRes.data.path)
      imageUrl = publicUrlData.publicUrl
    }

    if (galleryFiles.length > 0) {
      const bucket = 'product-images'
      for (let i = 0; i < galleryFiles.length; i += 1) {
        const file = galleryFiles[i]
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `products/gallery-${productId}-${Date.now()}-${i}.${ext}`
        const uploadRes = await supabase.storage.from(bucket).upload(path, file, {
          upsert: true,
        })
        if (uploadRes.error) {
          setError(`图集上传失败：${uploadRes.error.message}`)
          setSaving(false)
          return
        }
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(uploadRes.data.path)
        galleryUrls.push(publicUrlData.publicUrl)
      }
    }
    galleryUrls = Array.from(new Set(galleryUrls))

    const payload = {
      ...draft,
      slug: draft.slug ? slugify(draft.slug) : slugify(draft.name),
      category: draft.category?.trim() ? draft.category.trim() : null,
      image_url: imageUrl,
      gallery_urls: galleryUrls.length > 0 ? galleryUrls : null,
      short_description: draft.short_description?.trim()
        ? draft.short_description.trim()
        : null,
      description: draft.description?.trim() ? draft.description.trim() : null,
      price_cny: draft.price_cny ?? null,
    }

    const res = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert(payload)

    if (res.error) {
      if (res.error.message.includes('gallery_urls')) {
        setError(
          '缺少 products.gallery_urls 字段。请先在 Supabase 执行：alter table public.products add column if not exists gallery_urls text[];',
        )
      } else {
        setError(res.error.message)
      }
      setSaving(false)
      return
    }
    await load()
    startCreate()
    setSaving(false)
  }

  async function remove(id: string) {
    const supabase = getSupabase()
    if (!supabase) {
      setError('未配置 Supabase 环境变量')
      return
    }
    if (!confirm('确定要删除这个产品吗？此操作不可恢复。')) return
    setError(null)
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) setError(error.message)
    await load()
  }

  async function logout() {
    const supabase = getSupabase()
    if (supabase) await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  if (!sessionChecked) {
    return <div className="text-sm text-slate-300">检查登录状态…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl font-semibold text-white">产品管理</div>
          <div className="mt-1 text-sm text-slate-300">
            <Link className="text-indigo-300 hover:text-indigo-200" to="/">
              返回官网
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/about"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            简介管理
          </Link>
          <Link
            to="/admin/inquiries"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            留言管理
          </Link>
          <Link
            to="/admin/news"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            动态管理
          </Link>
          <Link
            to="/admin/craftsmen"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            工匠管理
          </Link>
          <button
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            onClick={startCreate}
          >
            新建产品
          </button>
          <button
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            onClick={logout}
          >
            退出
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold text-white">
              {loading ? '加载中…' : `产品列表（${products.length}）`}
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-slate-300">加载中…</div>
              ) : products.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-sm text-slate-300">
                  还没有产品。右侧先新建一个。
                </div>
              ) : (
                products.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-white">{p.name}</div>
                        {!p.is_active ? (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">
                            未上架
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        slug: {p.slug} · sort: {p.sort_order}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        图集：{Array.isArray(p.gallery_urls) ? p.gallery_urls.length : 0} 张
                      </div>
                      {p.short_description ? (
                        <div className="mt-2 line-clamp-2 text-sm text-slate-300">
                          {p.short_description}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                        onClick={() => startEdit(p)}
                      >
                        编辑
                      </button>
                      <button
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/15"
                        onClick={() => remove(p.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold text-white">
              {mode === 'edit' ? '编辑产品' : '新建产品'}
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-slate-300">名称</label>
                <input
                  value={draft.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setDraft((d) => ({
                      ...d,
                      name,
                      slug: d.slug ? d.slug : slugify(name),
                    }))
                  }}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="例如：企业级路由器 X1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">Slug</label>
                <input
                  value={draft.slug}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, slug: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="用于 URL / 唯一标识（建议英文/数字）"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">分类</label>
                <select
                  value={draft.category ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, category: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">请选择分类</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300">一句话简介</label>
                <input
                  value={draft.short_description ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      short_description: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="用于列表卡片"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">图片</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/20"
                  onChange={(e) =>
                    setImageFile(e.target.files?.[0] ?? null)
                  }
                />
                <input
                  value={draft.image_url ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, image_url: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="或直接粘贴图片 URL（可选）"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">图集（轮播）</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="mt-1 w-full text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/20"
                  onChange={(e) =>
                    setGalleryFiles(Array.from(e.target.files ?? []))
                  }
                />
                <textarea
                  rows={4}
                  value={(draft.gallery_urls ?? []).join('\n')}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      gallery_urls: e.target.value
                        .split(/\r?\n/)
                        .map((x) => x.trim())
                        .filter(Boolean),
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="每行一张图片 URL（用于详情页轮播）"
                />
                <div className="mt-1 text-xs text-slate-400">
                  已配置 {(draft.gallery_urls ?? []).length} 张；待上传 {galleryFiles.length} 张
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300">价格（CNY）</label>
                  <input
                    value={draft.price_cny ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        price_cny: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="可留空"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300">排序</label>
                  <input
                    value={draft.sort_order}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        sort_order: Number(e.target.value || 0),
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-300">详细描述</label>
                <textarea
                  rows={5}
                  value={draft.description ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, description: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="用于产品详情（后续可扩展为富文本）"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, is_active: e.target.checked }))
                  }
                />
                上架（官网可见）
              </label>

              <button
                disabled={saving || !draft.name.trim()}
                onClick={save}
                className="w-full rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? '保存中…' : '保存'}
              </button>
              <div className="text-xs text-slate-400">
                提示：可以直接上传图片（会保存到 Supabase Storage
                的 <code className="rounded bg-black/30 px-1">product-images</code>{' '}
                bucket），也可以手动填写一条外部图片 URL。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

