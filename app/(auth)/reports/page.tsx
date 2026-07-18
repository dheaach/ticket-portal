import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import CrossRefReportContent from '@/components/content/reports/CrossRefReportContent'
import { isAdminOrManager } from '@/lib/auth-utils'

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  const role = (session.user as { role?: string }).role
  if (!isAdminOrManager(role)) {
    redirect('/dashboard')
  }
  return <CrossRefReportContent user={session.user} />
}
