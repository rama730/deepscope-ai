import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nb.app'
  const supabase = createSupabaseServerClient()

  // Static Routes
  const staticRoutes = [
    '',
    '/login',
    '/signup',
    '/hub',
    '/explorer',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  try {
    // Dynamic Projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, updated_at')
      .eq('status', 'launched')
      .limit(1000)

    const projectRoutes = (projects || []).map((project) => ({
      url: `${baseUrl}/projects/${project.id}`,
      lastModified: new Date(project.updated_at || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    // Dynamic Profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, updated_at')
      .limit(1000)

    const profileRoutes = (profiles || []).map((profile) => ({
      url: `${baseUrl}/profile/${profile.id}`,
      lastModified: new Date(profile.updated_at || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))

    return [...staticRoutes, ...projectRoutes, ...profileRoutes]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return staticRoutes
  }
}
