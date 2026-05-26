import {
  actorRoleFromSession,
  diffRecordFields,
  logSystemActivity,
  type SystemEntityType,
} from '@/lib/system-activity-log'

export async function logSettingsCreated(params: {
  session: { user?: { id?: string; role?: string | null } | null }
  entityType: SystemEntityType
  entityId: string
  label?: string
  snapshot: Record<string, unknown>
}): Promise<void> {
  await logSystemActivity({
    category: 'settings',
    action: 'settings_created',
    entityType: params.entityType,
    entityId: params.entityId,
    actorUserId: params.session.user?.id ?? null,
    actorRole: actorRoleFromSession(params.session),
    metadata: {
      label: params.label,
      created: params.snapshot,
    },
  })
}

export async function logSettingsUpdated(params: {
  session: { user?: { id?: string; role?: string | null } | null }
  entityType: SystemEntityType
  entityId: string
  label?: string
  before: Record<string, unknown>
  after: Record<string, unknown>
  keys: string[]
}): Promise<void> {
  const changes = diffRecordFields(params.before, params.after, params.keys)
  if (Object.keys(changes).length === 0) return
  await logSystemActivity({
    category: 'settings',
    action: 'settings_updated',
    entityType: params.entityType,
    entityId: params.entityId,
    actorUserId: params.session.user?.id ?? null,
    actorRole: actorRoleFromSession(params.session),
    metadata: {
      label: params.label,
      changes,
      changed_keys: Object.keys(changes),
    },
  })
}

export async function logSettingsDeleted(params: {
  session: { user?: { id?: string; role?: string | null } | null }
  entityType: SystemEntityType
  entityId: string
  label?: string
  snapshot: Record<string, unknown>
}): Promise<void> {
  await logSystemActivity({
    category: 'settings',
    action: 'settings_deleted',
    entityType: params.entityType,
    entityId: params.entityId,
    actorUserId: params.session.user?.id ?? null,
    actorRole: actorRoleFromSession(params.session),
    metadata: {
      label: params.label,
      deleted: params.snapshot,
    },
  })
}
