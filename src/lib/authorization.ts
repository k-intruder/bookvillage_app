type AdminProfile = {
  role?: string | null
  admin_status?: string | null
} | null

export function isApprovedAdmin<T extends AdminProfile>(
  profile: T
): profile is T & { role: 'admin'; admin_status: 'approved' } {
  return profile?.role === 'admin' && profile.admin_status === 'approved'
}
