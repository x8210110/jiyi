import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSupabase } from '../../lib/supabase'
import type {
  HeroBanner,
  SpaceEnvironmentContent,
  SpaceEnvironmentItem,
} from '../../lib/types'

type Draft = Pick<
  SpaceEnvironmentItem,
  'title' | 'description' | 'image_url' | 'is_active' | 'sort_order'
>

const emptyDraft: Draft = {
  title: '',
  description: '',
  image_url: '',
  is_active: true,
  sort_order: 0,
}

type IntroDraft = {
  intro_text: string
}

type HeroDraft = Pick<HeroBanner, 'title' | 'image_url' | 'is_active' | 'sort_order'>

const defaultIntroDraft: IntroDraft = {
  intro_text:
    '吉益手作文化中心是一家深耕“公益+文创”的温暖空间，秉持“指尖赋能、爱心联结”的核心使命，让每一件手作都承载故事与希望，在传承手工艺术的同时，为特殊群体搭建成长与增收的桥梁。',
}

const emptyHeroDraft: HeroDraft = {
  title: '',
  image_url: '',
  is_active: true,
  sort_order: 0,
}

export function AdminSpacePage() {
  const navigate = useNavigate()
  const [sessionChecked, setSessionChecked] = useState(false)
  const [items, setItems] = useState<SpaceEnvironmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<SpaceEnvironmentItem | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [contentId, setContentId] = useState<string | null>(null)
  const [introDraft, setIntroDraft] = useState<IntroDraft>(defaultIntroDraft)
  const [introSaving, setIntroSaving] = useState(false)
  const [heroItems, setHeroItems] = useState<HeroBanner[]>([])
  const [heroEditing, setHeroEditing] = useState<HeroBanner | null>(null)
  const [heroDraft, setHeroDraft] = useState<HeroDraft>(emptyHeroDraft)
  const [heroSaving, setHeroSaving] = useState(false)
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null)

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
      .from('space_environment')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setItems((data ?? []) as SpaceEnvironmentItem[])

    const contentRes = await supabase
      .from('space_environment_content')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!contentRes.error && contentRes.data) {
      const row = contentRes.data as SpaceEnvironmentContent
      setContentId(row.id)
      setIntroDraft({
        intro_text: row.intro_1 || row.intro_2 || row.intro_3 || '',
      })
    } else {
      setContentId(null)
      setIntroDraft(defaultIntroDraft)
    }

    const heroRes = await supabase
      .from('hero_banners')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (!heroRes.error && heroRes.data) {
      setHeroItems((heroRes.data ?? []) as HeroBanner[])
    } else {
      setHeroItems([])
    }
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

  function startEdit(item: SpaceEnvironmentItem) {
    setEditing(item)
    setDraft({
      title: item.title,
      description: item.description ?? '',
      image_url: item.image_url ?? '',
      is_active: item.is_active,
      sort_order: item.sort_order,
    })
    setImageFile(null)
  }

  function startHeroCreate() {
    setHeroEditing(null)
    setHeroDraft(emptyHeroDraft)
    setHeroImageFile(null)
  }

  function startHeroEdit(item: HeroBanner) {
    setHeroEditing(item)
    setHeroDraft({
      title: item.title,
      image_url: item.image_url ?? '',
      is_active: item.is_active,
      sort_order: item.sort_order,
    })
    setHeroImageFile(null)
  }

  async function save() {
    const supabase = getSupabase()
    if (!supabase) {
      setError('未配置 Supabase 环境变量')
      return
    }
    setSaving(true)
    setError(null)

    let imageUrl = draft.image_url?.trim() && !imageFile ? draft.image_url.trim() : null
    if (imageFile) {
      const bucket = 'space-images'
      const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const id = editing?.id ?? crypto.randomUUID()
      const path = `space/${id}-${Date.now()}.${ext}`
      const uploadRes = await supabase.storage.from(bucket).upload(path, imageFile, {
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

    const payload = {
      ...draft,
      image_url: imageUrl,
      description: draft.description?.trim() ? draft.description.trim() : null,
    }

    const res = editing
      ? await supabase.from('space_environment').update(payload).eq('id', editing.id)
      : await supabase.from('space_environment').insert(payload)

    if (res.error) {
      setError(res.error.message)
      setSaving(false)
      return
    }

    await load()
    startCreate()
    setSaving(false)
  }

  async function saveHero() {
    const supabase = getSupabase()
    if (!supabase) {
      setError('未配置 Supabase 环境变量')
      return
    }
    setHeroSaving(true)
    setError(null)

    let imageUrl =
      heroDraft.image_url?.trim() && !heroImageFile
        ? heroDraft.image_url.trim()
        : null

    if (heroImageFile) {
      const bucket = 'space-images'
      const ext = heroImageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const id = heroEditing?.id ?? crypto.randomUUID()
      const path = `hero/${id}-${Date.now()}.${ext}`
      const uploadRes = await supabase.storage.from(bucket).upload(path, heroImageFile, {
        upsert: true,
      })
      if (uploadRes.error) {
        setError(`首页背景上传失败：${uploadRes.error.message}`)
        setHeroSaving(false)
        return
      }
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadRes.data.path)
      imageUrl = publicUrlData.publicUrl
    }

    const payload = {
      title: heroDraft.title.trim(),
      image_url: imageUrl,
      is_active: heroDraft.is_active,
      sort_order: heroDraft.sort_order,
    }

    const res = heroEditing
      ? await supabase.from('hero_banners').update(payload).eq('id', heroEditing.id)
      : await supabase.from('hero_banners').insert(payload)

    if (res.error) {
      setError(res.error.message)
      setHeroSaving(false)
      return
    }

    await load()
    startHeroCreate()
    setHeroSaving(false)
  }

  async function remove(id: string) {
    const supabase = getSupabase()
    if (!supabase) {
      setError('未配置 Supabase 环境变量')
      return
    }
    if (!confirm('确定要删除这条空间环境内容吗？')) return
    const { error } = await supabase.from('space_environment').delete().eq('id', id)
    if (error) setError(error.message)
    await load()
  }

  async function removeHero(id: string) {
    const supabase = getSupabase()
    if (!supabase) {
      setError('未配置 Supabase 环境变量')
      return
    }
    if (!confirm('确定要删除这张首页背景图吗？')) return
    const { error } = await supabase.from('hero_banners').delete().eq('id', id)
    if (error) setError(error.message)
    await load()
  }

  async function saveIntro() {
    const supabase = getSupabase()
    if (!supabase) {
      setError('未配置 Supabase 环境变量')
      return
    }
    setIntroSaving(true)
    setError(null)
    const payload = {
      intro_1: introDraft.intro_text.trim(),
      intro_2: '',
      intro_3: '',
    }
    const res = contentId
      ? await supabase
          .from('space_environment_content')
          .update(payload)
          .eq('id', contentId)
      : await supabase.from('space_environment_content').insert(payload)
    if (res.error) {
      setError(res.error.message)
      setIntroSaving(false)
      return
    }
    await load()
    setIntroSaving(false)
  }

  if (!sessionChecked) {
    return <div className="text-sm text-slate-300">检查登录状态…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl font-semibold text-white">简介管理</div>
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
            新建条目
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm font-semibold text-white">吉益简介文案</div>
        <div className="mt-4">
          <label className="text-xs text-slate-300">简介内容</label>
          <textarea
            rows={4}
            value={introDraft.intro_text}
            onChange={(e) =>
              setIntroDraft((d) => ({ ...d, intro_text: e.target.value }))
            }
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="mt-4">
          <button
            onClick={saveIntro}
            disabled={
              introSaving ||
              !introDraft.intro_text.trim()
            }
            className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {introSaving ? '保存中…' : '保存简介'}
          </button>
        </div>
        <div className="mt-3 text-xs text-slate-400">
          该内容会展示在“关于吉益”页面的“吉益简介”部分。
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold text-white">
              首页背景轮播（{heroItems.length}）
            </div>
            <div className="mt-4 space-y-3">
              {heroItems.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-sm text-slate-300">
                  还没有首页背景图，请先新增。
                </div>
              ) : (
                heroItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-white">{item.title}</div>
                        {!item.is_active ? (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">
                            未启用
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">sort: {item.sort_order}</div>
                      {item.image_url ? (
                        <div className="mt-2 text-xs text-slate-500">{item.image_url}</div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                        onClick={() => startHeroEdit(item)}
                      >
                        编辑
                      </button>
                      <button
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/15"
                        onClick={() => removeHero(item.id)}
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
              {heroEditing ? '编辑首页背景图' : '新建首页背景图'}
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-slate-300">标题</label>
                <input
                  value={heroDraft.title}
                  onChange={(e) => setHeroDraft((d) => ({ ...d, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="例如：庭院正门"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">背景图</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/20"
                  onChange={(e) => setHeroImageFile(e.target.files?.[0] ?? null)}
                />
                <input
                  value={heroDraft.image_url ?? ''}
                  onChange={(e) => setHeroDraft((d) => ({ ...d, image_url: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="或粘贴图片 URL（可选）"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300">排序</label>
                  <input
                    value={heroDraft.sort_order}
                    onChange={(e) =>
                      setHeroDraft((d) => ({ ...d, sort_order: Number(e.target.value || 0) }))
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    inputMode="numeric"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={heroDraft.is_active}
                      onChange={(e) =>
                        setHeroDraft((d) => ({ ...d, is_active: e.target.checked }))
                      }
                    />
                    启用
                  </label>
                </div>
              </div>
              <button
                disabled={heroSaving || !heroDraft.title.trim()}
                onClick={saveHero}
                className="w-full rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {heroSaving ? '保存中…' : '保存背景图'}
              </button>
              <button
                onClick={startHeroCreate}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                新建一张
              </button>
            </div>
          </div>
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
              {loading ? '加载中…' : `图片轮播列表（${items.length}）`}
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-slate-300">加载中…</div>
              ) : items.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-sm text-slate-300">
                  还没有轮播图片条目，请先新建。
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
                            未展示
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">sort: {item.sort_order}</div>
                      {item.description ? (
                        <div className="mt-2 line-clamp-2 text-sm text-slate-300">
                          {item.description}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                        onClick={() => startEdit(item)}
                      >
                        编辑
                      </button>
                      <button
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/15"
                        onClick={() => remove(item.id)}
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
              {mode === 'edit' ? '编辑轮播图片' : '新建轮播图片'}
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-slate-300">图片标题</label>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="例如：吉益手作空间展示"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">说明文字</label>
                <textarea
                  rows={3}
                  value={draft.description ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="用于前台轮播图片 alt 与说明"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">图片</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/20"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
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
                      onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
                    />
                    展示
                  </label>
                </div>
              </div>
              <button
                disabled={saving || !draft.title.trim()}
                onClick={save}
                className="w-full rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? '保存中…' : '保存'}
              </button>
              <div className="text-xs text-slate-400">
                上传图片会保存到 Supabase Storage 的{' '}
                <code className="rounded bg-black/30 px-1">space-images</code> bucket。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

