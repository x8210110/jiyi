export type Product = {
  id: string
  name: string
  slug: string
  category: string | null
  short_description: string | null
  description: string | null
  price_cny: number | null
  image_url: string | null
  gallery_urls: string[] | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type SpaceEnvironmentItem = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type SpaceEnvironmentContent = {
  id: string
  intro_1: string
  intro_2: string
  intro_3: string
  created_at: string
  updated_at: string
}

export type Inquiry = {
  id: string
  name: string
  contact: string
  message: string
  status: 'new' | 'contacted' | 'closed'
  created_at: string
  updated_at: string
}

export type NewsArticle = {
  id: string
  title: string
  summary: string
  image_url: string | null
  publish_date: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type HeroBanner = {
  id: string
  title: string
  image_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type CraftsmanProfile = {
  id: string
  name: string
  role: string | null
  focus: string | null
  years: string | null
  story: string
  works: string[] | null
  avatar_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

