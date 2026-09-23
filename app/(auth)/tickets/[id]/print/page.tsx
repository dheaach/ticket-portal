import { and, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import TicketPrintView from '@/components/ticket/TicketPrintView'
import { isAdmin } from '@/lib/auth-utils'
import { getCustomerCompanyId } from '@/lib/customer-company'
import { db, teamMembers, teams, tickets } from '@/lib/db'
import { getTicketDetail } from '@/lib/ticket-detail'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ticketId = parseInt(id, 10)
  if (Number.isNaN(ticketId)) return {}
  const [row] = await db.select({ title: tickets.title }).from(tickets).where(eq(tickets.id, ticketId)).limit(1)
  if (!row) return {}
  const now = new Date()
  const ts = now.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\//g, '-').replace(',', '')
  return { title: { absolute: `Print #${ticketId} ${row.title} - DeskTeam360 - ${ts}` } }
}

export default async function TicketPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const ticketId = parseInt(id, 10)
  if (Number.isNaN(ticketId)) redirect('/tickets?ticket_error=invalid')

  const role = (session.user as { role?: string }).role?.toLowerCase()
  const isCustomer = role === 'customer'
  const userId = session.user.id!

  const [ticketExists] = await db.select({ id: tickets.id, teamId: tickets.teamId }).from(tickets).where(eq(tickets.id, ticketId)).limit(1)
  if (!ticketExists) {
    redirect('/tickets?ticket_error=not_found')
  }

  if (!isAdmin(role) && role !== 'customer' && ticketExists.teamId) {
    const [teamRow] = await db
      .select({ type: teams.type })
      .from(teams)
      .where(eq(teams.id, ticketExists.teamId))
      .limit(1)
    if (teamRow?.type !== 'public') {
      const [isMember] = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, ticketExists.teamId)))
        .limit(1)
      if (!isMember) {
        redirect('/tickets?ticket_error=no_access')
      }
    }
  }

  const data = await getTicketDetail(ticketId, {
    screenshotUserId: userId,
    ...(role === 'customer'
      ? { customerPortal: { userId, companyId: await getCustomerCompanyId(userId) } }
      : {}),
  })
  if (!data) redirect('/tickets?ticket_error=no_access')

  return <TicketPrintView ticketData={data.ticketData} comments={data.comments} isAgent={!isCustomer} />
}
