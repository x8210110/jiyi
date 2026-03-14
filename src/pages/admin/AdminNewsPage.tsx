import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSupabase } from '../../lib/supabase'
import type { NewsArticle } from '../../lib/types'

type Draft = Pick<
  NewsArticle,
  'title' | 'summary' | 'image_url' | 'publish_date' | 'is_active' | 'sort_order'
>

const emptyDraft: Draft = {
  title: '',
  summary: '',
  image_url: '',
  publish_date: new Date().toISOString().slice(0, 10),
  is_active: true,
  sort_order: 0,
}

export function AdminNewsPage() {
  const navigate = useNavigate()
  const [sessionChecked, setSessionChecked] = useState(false)
  const [items, setItems] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<NewsArticle | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)

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
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('publish_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setItems((data ?? []) as NewsArticle[])
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
  }

  function startEdit(item: NewsArticle) {
    setEditing(item)
    setDraft({
      title: item.title,
      summary: item.summary,
      image_url: item.image_url ?? '',
      publish_date: item.publish_date,
      is_active: item.is_active,
      sort_order: item.sort_order,
    })
    setImageFile(null)
  }

  async function save() {
    const supabase = getSupabase()
    if (!supabase) {
      setError('未配置 Supabase 环境变量')
      return
    }
    setSaving(true)
    setError(null)

    const articleId = editing?.id ?? crypto.randomUUID()
    let imageUrl = draft.image_url?.trim() && !imageFile ? draft.image_url.trim() : null
    if (imageFile) {
      const bucket = 'news-images'
      const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `news/${articleId}-${Date.now()}.${ext}`
      const uploadRes = await supabase.storage.from(bucket).upload(path, imageFile, {
        upsert: true,
      })
      if (uploadRes.error) {
        if (uploadRes.error.message.includes('row-level security')) {
          setError('图片上传失败：未配置 news-images 上传策略，请执行 README 中的“最新动态”SQL。')
        } else {
          setError(`图片上传失败：${uploadRes.error.message}`)
        }
        setSaving(false)
        return
      }
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(uploadRes.data.path)
      imageUrl = publicUrlData.publicUrl
    }

    const payload = {
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      image_url: imageUrl,
      publish_date: draft.publish_date,
      is_active: draft.is_active,
      sort_order: draft.sort_order,
    }

    const res = editing
      ? await supabase.from('news_articles').update(payload).eq('id', editing.id)
      : await supabase.from('news_articles').insert(payload)

    if (res.error) {
      if (res.error.message.includes('image_url')) {
        setError(
          '缺少 news_articles.image_url 字段。请先执行 SQL：alter table public.news_articles add column if not exists image_url text;',
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
    if (!confirm('确定要删除这条动态吗？此操作不可恢复。')) return
    const { error } = await supabase.from('news_articles').delete().eq('id', id)
    if (error) setError(error.message)
    await load()
  }

  if (!sessionChecked) return <div className="text-sm text-slate-300">检查登录状态…</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl font-semibold text-white">动态管理</div>
          <div className="mt-1 text-sm text-slate-300">
            <Link className="text-indigo-300 hover:text-indigo-200" to="/">
              返回官网
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/products"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            产品管理
          </Link>
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
            to="/admin/craftsmen"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            工匠管理
          </Link>
          <button
            onClick={startCreate}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            新建动态
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
              {loading ? '加载中…' : `动态列表（${items.length}）`}
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-slate-300">加载中…</div>
              ) : items.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-sm text-slate-300">
                  还没有动态，请先新建一条。
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-white">{item.title}</div>
                        {!item.is_active ? (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">
                            未发布
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        日期：{item.publish_date} · sort: {item.sort_order}
                      </div>
                      {item.image_url ? (
                        <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
                          <img
                            src={item.image_url}
                            alt={`${item.title} 封面图`}
                            className="h-24 w-36 bg-slate-900/40 object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : null}
                      <div className="mt-2 line-clamp-2 text-sm text-slate-300">{item.summary}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => remove(item.id)}
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/15"
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
            <div className="text-sm font-semibold text-white">{mode === 'edit' ? '编辑动态' : '新建动态'}</div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-slate-300">标题</label>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="例如：春季课程排期发布"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">发布日期</label>
                <input
                  type="date"
                  value={draft.publish_date}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, publish_date: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">动态摘要</label>
                <textarea
                  rows={4}
                  value={draft.summary}
                  onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="用于关于吉益页面展示"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">封面图片</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  className="mt-1 w-full text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/20"
                />
                <input
                  value={draft.image_url ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="或粘贴图片 URL（可选）"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300">排序</label>
                  <input
                    value={draft.sort_order}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, sort_order: Number(e.target.value || 0) }))
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    inputMode="numeric"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={draft.is_active}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, is_active: e.target.checked }))
                      }
                    />
                    发布
                  </label>
                </div>
              </div>
              <button
                disabled={saving || !draft.title.trim() || !draft.summary.trim()}
                onClick={save}
                className="w-full rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

