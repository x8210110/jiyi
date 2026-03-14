import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'

export function ContactPage() {
  const location = useLocation()
  const product = new URLSearchParams(location.search).get('product')?.trim() ?? ''
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!product) return
    setMessage((prev) =>
      prev.trim() ? prev : `我想咨询「${product}」，请与我联系。`,
    )
  }, [product])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    const supabase = getSupabase()
    if (!supabase) {
      setSubmitError('未配置 Supabase 环境变量，无法提交。')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('inquiries').insert({
      name: name.trim(),
      contact: contact.trim(),
      message: message.trim(),
      status: 'new',
    })

    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }

    setName('')
    setContact('')
    setMessage('')
    setSubmitSuccess('提交成功，我们会尽快联系你。')
    setSubmitting(false)
  }

  return (
    <div className="container-page py-12">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            联系我们
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            这里可以放电话、邮箱、地址、微信二维码等。页面视觉以温暖的橙色为主，突出手作空间的亲和感。
          </p>
          <div className="mt-6 space-y-3 text-sm text-slate-700">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">邮箱</div>
              <div className="mt-1 font-medium text-slate-900">contact@jiyi-handcraft.com</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">电话</div>
              <div className="mt-1 font-medium text-slate-900">+86 000-0000-0000</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">地址</div>
              <div className="mt-1 font-medium text-slate-900">太仓市沙溪镇归庄花园街100号</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">微信公众号</div>
              <div className="mt-3 flex items-center gap-4">
                <img
                  src="/wechat-official-qr.png"
                  alt="太仓吉益手作文化中心微信公众号二维码"
                  className="h-24 w-24 rounded-lg bg-white p-1 object-contain"
                />
                <div className="text-xs leading-6 text-slate-600">
                  微信扫码关注公众号
                  <br />
                  获取最新活动与产品服务信息
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-base font-semibold text-slate-900">咨询留言</div>
          <p className="mt-2 text-sm text-slate-600">
            直接提交到后台留言管理，工作人员可及时查看并联系你。
          </p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs text-slate-500">姓名</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="怎么称呼你？"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">联系方式</label>
              <input
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="电话/邮箱/微信"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">需求描述</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="简单说下你想要什么产品/方案"
              />
            </div>
            {submitError ? (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
                提交失败：{submitError}
              </div>
            ) : null}
            {submitSuccess ? (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-700">
                {submitSuccess}
              </div>
            ) : null}
            <button
              disabled={submitting}
              className="w-full rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-300/40 transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? '提交中…' : '提交'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

