import { Outlet } from 'react-router-dom'

export function AdminLayout() {
  return (
    <div className="min-h-dvh bg-slate-950">
      <div className="container-page py-10">
        <Outlet />
      </div>
    </div>
  )
}

