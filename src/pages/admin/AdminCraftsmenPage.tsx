import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSupabase } from '../../lib/supabase'
import type { CraftsmanProfile } from '../../lib/types'

type Draft = Pick<
  CraftsmanProfile,
  | 'name'
  | 'role'
  | 'focus'
  | 'years'
  | 'story'
  | 'works'
  | 'avatar_url'
  | 'is_active'
  | 'sort_order'
>

const emptyDraft: Draft = {
  name: '',
  role: '',
  focus: '',
  years: '',
  story: '',
  works: [],
  avatar_url: '',
  is_active: true,
  sort_order: 0,
}

export function AdminCraftsmenPage() {
  const navigate = useNavigate()
  const [sessionChecked, setSessionChecked] = useState(false)
  const [items, setItems] = useState<CraftsmanProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<CraftsmanProfile | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

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
      .from('craftsman_profiles')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setItems((data ?? []) as CraftsmanProfile[])
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
    setAvatarFile(null)
  }

  function startEdit(item: CraftsmanProfile) {
    setEditing(item)
    setDraft({
      name: item.name,
      role: item.role ?? '',
      focus: item.focus ?? '',
      years: item.years ?? '',
      story: item.story,
      works: Array.isArray(item.works) ? item.works.filter((x) => Boolean(x)) : [],
      avatar_url: item.avatar_url ?? '',
      is_active: item.is_active,
      sort_order: item.sort_order,
    })
    setAvatarFile(null)
  }

  async function save() {
    const supabase = getSupabase()
    if (!supabase) {
      setError('未配置 Supabase 环境变量')
      return
    }
    setSaving(true)
    setError(null)

    const id = editing?.id ?? crypto.randomUUID()
    let avatarUrl = draft.avatar_url?.trim() && !avatarFile ? draft.avatar_url.trim() : null
    if (avatarFile) {
      const bucket = 'craftsman-images'
      const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `craftsmen/${id}-${Date.now()}.${ext}`
      const uploadRes = await supabase.storage.from(bucket).upload(path, avatarFile, {
        upsert: true,
      })
      if (uploadRes.error) {
        setError(`头像上传失败：${uploadRes.error.message}`)
        setSaving(false)
        return
      }
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(uploadRes.data.path)
      avatarUrl = publicUrlData.publicUrl
    }

    const payload = {
      name: draft.name.trim(),
      role: draft.role?.trim() ? draft.role.trim() : null,
      focus: draft.focus?.trim() ? draft.focus.trim() : null,
      years: draft.years?.trim() ? draft.years.trim() : null,
      story: draft.story.trim(),
      works:
        Array.isArray(draft.works) && draft.works.length > 0
          ? draft.works.map((x) => x.trim()).filter(Boolean)
          : null,
      avatar_url: avatarUrl,
      is_active: draft.is_active,
      sort_order: draft.sort_order,
    }

    const res = editing
      ? await supabase.from('craftsman_profiles').update(payload).eq('id', editing.id)
      : await supabase.from('craftsman_profiles').insert(payload)

    if (res.error) {
      setError(res.error.message)
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
    if (!confirm('确定要删除该工匠档案吗？此操作不可恢复。')) return
    const { error } = await supabase.from('craftsman_profiles').delete().eq('id', id)
    if (error) setError(error.message)
    await load()
  }

  if (!sessionChecked) return <div className="text-sm text-slate-300">检查登录状态…</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl font-semibold text-white">工匠管理</div>
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
            to="/admin/news"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            动态管理
          </Link>
          <button
            onClick={startCreate}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            新建工匠
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
              {loading ? '加载中…' : `工匠档案（${items.length}）`}
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-slate-300">加载中…</div>
              ) : items.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-sm text-slate-300">
                  还没有工匠档案，请先新建。
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-white">{item.name}</div>
                        {!item.is_active ? (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">
                            未展示
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {item.role || '手作工匠'} · sort: {item.sort_order}
                      </div>
                      {item.focus ? (
                        <div className="mt-1 text-xs text-cyan-200">专长：{item.focus}</div>
                      ) : null}
                      <div className="mt-2 line-clamp-2 text-sm text-slate-300">{item.story}</div>
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
            <div className="text-sm font-semibold text-white">
              {mode === 'edit' ? '编辑工匠档案' : '新建工匠档案'}
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-slate-300">姓名</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="例如：王阿姨"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300">角色</label>
                  <input
                    value={draft.role ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="例如：布艺手作师"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300">年限/标签</label>
                  <input
                    value={draft.years ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, years: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="例如：7年手作经验"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-300">专长方向</label>
                <input
                  value={draft.focus ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, focus: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="例如：香囊、布包、拼布挂饰"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">个人介绍</label>
                <textarea
                  rows={4}
                  value={draft.story}
                  onChange={(e) => setDraft((d) => ({ ...d, story: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="介绍工匠经历、风格与成长故事"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">代表作品（每行一项）</label>
                <textarea
                  rows={3}
                  value={(draft.works ?? []).join('\n')}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      works: e.target.value
                        .split(/\r?\n/)
                        .map((x) => x.trim())
                        .filter(Boolean),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="例如：手工香囊"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">头像</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/20"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                />
                <input
                  value={draft.avatar_url ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, avatar_url: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="或粘贴头像 URL（可选）"
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
                disabled={saving || !draft.name.trim() || !draft.story.trim()}
                onClick={save}
                className="w-full rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? '保存中…' : '保存'}
              </button>
              <div className="text-xs text-slate-400">
                头像上传会保存到 Supabase Storage 的{' '}
                <code className="rounded bg-black/30 px-1">craftsman-images</code> bucket 下 craftsman
                目录。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
