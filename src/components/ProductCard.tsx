import type { Product } from '../lib/types'

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-orange-200 hover:shadow-md">
      <div className="aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-slate-100 to-white p-2">
        {product.image_url ? (
          <img
            alt={product.name}
            src={product.image_url}
            className="h-full w-full rounded-xl bg-slate-100 object-contain transition duration-300 group-hover:scale-[1.01]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
            暂无图片
          </div>
        )}
      </div>
      <div className="flex flex-1 p-4 sm:p-5">
        <div className="flex w-full flex-col items-center">
          {product.category ? (
            <div>
              <span className="rounded-full border border-orange-300 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                {product.category}
              </span>
            </div>
          ) : null}
          <div className="mt-2 w-full text-center">
            <div className="line-clamp-1 text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
              {product.name}
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 sm:text-sm">
            {typeof product.price_cny === 'number'
              ? `¥${product.price_cny.toLocaleString('zh-CN')}`
              : '欢迎咨询'}
          </div>
        </div>
      </div>
    </div>
  )
}

