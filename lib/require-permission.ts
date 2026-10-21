import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { checkPermission, type PermissionCode } from '@/lib/permissions'

/**
 * Call at the top of a Server Component page.
 * Redirects to /dashboard if the current user lacks the permission.
 */
export async function requirePermission(code: PermissionCode): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('user_profile')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  // Superadmins bypass all permission checks
  if (profile?.is_platform_admin) return

  const allowed = await checkPermission(code)
  if (!allowed) redirect('/dashboard?error=forbidden')
}
