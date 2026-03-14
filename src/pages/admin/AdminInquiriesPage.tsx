import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSupabase } from '../../lib/supabase'
import type { Inquiry } from '../../lib/types'

export function AdminInquiriesPage() {
  const navigate = useNavigate()
  const [sessionChecked, setSessionChecked] = useState(false)
  const [items, setItems] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | Inquiry['status']>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setItems((data ?? []) as Inquiry[])
    setLoading(false)
  }

  useEffect(() => {
    if (!sessionChecked) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionChecked])

  async function updateStatus(id: string, status: Inquiry['status']) {
    const supabase = getSupabase()
    if (!supabase) {
      setError('未配置 Supabase 环境变量')
      return
    }
    const { error } = await supabase.from('inquiries').update({ status }).eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    await load()
  }

  async function copyContact(id: string, contact: string) {
    try {
      await navigator.clipboard.writeText(contact)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1600)
    } catch {
      setError('复制失败，请手动复制联系方式。')
    }
  }

  const filteredItems =
    statusFilter === 'all' ? items : items.filter((x) => x.status === statusFilter)

  if (!sessionChecked) {
    return <div className="text-sm text-slate-300">检查登录状态…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl font-semibold text-white">留言管理</div>
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
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-semibold text-white">
            {loading ? '加载中…' : `咨询列表（${filteredItems.length}/${items.length}）`}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">状态筛选</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | Inquiry['status'])}
              className="min-h-10 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">全部</option>
              <option value="new">新提交</option>
              <option value="contacted">已联系</option>
              <option value="closed">已完成</option>
            </select>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-slate-300">加载中…</div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-sm text-slate-300">
              当前筛选下暂无咨询记录。
            </div>
          ) : (
            filteredItems.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="text-sm text-slate-200">
                      <span className="text-slate-400">姓名：</span>
                      {item.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
                      <span className="text-slate-400">联系方式：</span>
                      {item.contact}
                      <button
                        type="button"
                        onClick={() => copyContact(item.id, item.contact)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                      >
                        {copiedId === item.id ? '已复制' : '复制'}
                      </button>
                    </div>
                    <div className="text-sm text-slate-200">
                      <span className="text-slate-400">需求：</span>
                      {item.message}
                    </div>
                    <div className="text-xs text-slate-500">
                      提交时间：{new Date(item.created_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        'rounded-full px-2 py-1 text-xs',
                        item.status === 'new'
                          ? 'bg-amber-500/15 text-amber-200'
                          : item.status === 'contacted'
                            ? 'bg-cyan-500/15 text-cyan-200'
                            : 'bg-emerald-500/15 text-emerald-200',
                      ].join(' ')}
                    >
                      {item.status === 'new'
                        ? '新提交'
                        : item.status === 'contacted'
                          ? '已联系'
                          : '已完成'}
                    </span>
                    <select
                      value={item.status}
                      onChange={(e) => updateStatus(item.id, e.target.value as Inquiry['status'])}
                      className="min-h-10 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="new">新提交</option>
                      <option value="contacted">已联系</option>
                      <option value="closed">已完成</option>
                    </select>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

