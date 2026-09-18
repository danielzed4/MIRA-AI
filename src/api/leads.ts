import { supabase } from '../lib/supabase'
import type { Lead } from '../types'

export interface LeadWithRelations extends Lead {
  customer?: { id: string; first_name: string | null; last_name: string | null; phone: string | null } | null
  service?: { id: string; name: string; icon: string } | null
  assigned_employee?: { id: string; first_name: string; last_name: string } | null
  phone_number?: { id: string; internal_name: string; sim_label: string | null } | null
}

export async function getLeads(filter?: { status?: string; hotOnly?: boolean; serviceId?: string }): Promise<LeadWithRelations[]> {
  let query = supabase
    .from('leads')
    .select(`
      *,
      customer:customers(id, first_name, last_name, phone),
      service:services(id, name, icon),
      assigned_employee:employees!assigned_employee_id(id, first_name, last_name),
      phone_number:phone_numbers(id, internal_name, sim_label)
    `)
    .order('created_at', { ascending: false })

  if (filter?.status) query = query.eq('status', filter.status)
  if (filter?.hotOnly) query = query.eq('is_hot', true)
  if (filter?.serviceId) query = query.eq('service_id', filter.serviceId)

  const { data, error } = await query
  if (error) throw error
  return data as LeadWithRelations[]
}

export async function createLead(lead: Partial<Lead>): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert(lead)
    .select()
    .single()
  if (error) throw error
  return data as Lead
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Lead
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

export async function addLeadActivity(leadId: string, activityType: string, description?: string): Promise<void> {
  const { error } = await supabase
    .from('lead_activities')
    .insert({ lead_id: leadId, activity_type: activityType, description })
  if (error) throw error
}
