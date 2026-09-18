import { supabase } from '../lib/supabase'
import type { AuditLog } from '../types'

export async function getAuditLogs(limit = 50): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as AuditLog[]
}

export async function logAudit(entry: {
  action: string
  entity_type?: string
  entity_id?: string
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  result?: string
}): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    ...entry,
    entity_id: entry.entity_id ?? undefined,
  })
  if (error) throw error
}
