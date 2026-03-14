import { Navigate, Route, Routes } from 'react-router-dom'
import { SiteLayout } from './components/SiteLayout'
import { HomePage } from './pages/HomePage'
import { ProductsPage } from './pages/ProductsPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { LivePage } from './pages/LivePage'
import { AdminLayout } from './components/admin/AdminLayout'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminProductsPage } from './pages/admin/AdminProductsPage'
import { AdminSpacePage } from './pages/admin/AdminSpacePage'
import { AdminInquiriesPage } from './pages/admin/AdminInquiriesPage'
import { AdminNewsPage } from './pages/admin/AdminNewsPage'
import { AdminCraftsmenPage } from './pages/admin/AdminCraftsmenPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SiteLayout theme="light" basePath="" />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:slug" element={<ProductDetailPage />} />
        <Route path="craftsmen" element={<LivePage />} />
        <Route path="live" element={<Navigate to="/craftsmen" replace />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
      </Route>

      <Route path="/dark" element={<SiteLayout theme="dark" basePath="/dark" />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:slug" element={<ProductDetailPage />} />
        <Route path="craftsmen" element={<LivePage />} />
        <Route path="live" element={<Navigate to="/dark/craftsmen" replace />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/login" replace />} />
        <Route path="login" element={<AdminLoginPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="about" element={<AdminSpacePage />} />
        <Route path="space" element={<Navigate to="/admin/about" replace />} />
        <Route path="inquiries" element={<AdminInquiriesPage />} />
        <Route path="news" element={<AdminNewsPage />} />
        <Route path="craftsmen" element={<AdminCraftsmenPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
