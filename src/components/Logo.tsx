export function Logo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 md:gap-3">
        <img
          src="/jiyi-logo.png"
          alt="太仓吉益手作文化中心 LOGO"
          className="h-9 w-auto md:h-10"
        />
        <div className="hidden leading-tight sm:block">
          <div className="text-lg font-semibold tracking-[0.06em] text-slate-900 [font-family:'STKaiti','KaiTi','DFKai-SB',serif] [text-shadow:0_1px_0_rgba(255,255,255,0.75),0_2px_0_rgba(251,146,60,0.28),0_8px_18px_rgba(15,23,42,0.22)] md:text-2xl">
            吉益手作文化中心
          </div>
        </div>
      </div>
    </div>
  )
}

