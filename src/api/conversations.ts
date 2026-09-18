import { supabase } from '../lib/supabase'
import type { Message, InternalNote } from '../types'

export interface ConversationWithRelations {
  id: string
  customer_id: string | null
  service_id: string | null
  phone_number_id: string | null
  messaging_account_id: string | null
  channel: string
  status: string
  priority: string
  is_unread: boolean
  is_hot: boolean
  customer_identifier: string | null
  customer_name: string | null
  customer_phone: string | null
  assigned_employee_id: string | null
  last_message_at: string | null
  last_message_preview: string | null
  message_count: number
  created_at: string
  updated_at: string
  service?: { id: string; name: string; icon: string } | null
  phone_number?: { id: string; internal_name: string; sim_label: string | null } | null
  assigned_employee?: { id: string; first_name: string; last_name: string } | null
  customer?: { id: string; first_name: string | null; last_name: string | null; phone: string | null } | null
}

export async function getConversations(filter?: {
  status?: string
  channel?: string
  serviceId?: string
  unreadOnly?: boolean
  hotOnly?: boolean
  search?: string
}): Promise<ConversationWithRelations[]> {
  let query = supabase
    .from('conversations')
    .select(`
      *,
      service:services(id, name, icon),
      phone_number:phone_numbers(id, internal_name, sim_label),
      assigned_employee:employees!assigned_employee_id(id, first_name, last_name),
      customer:customers(id, first_name, last_name, phone)
    `)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (filter?.status) query = query.eq('status', filter.status)
  if (filter?.channel) query = query.eq('channel', filter.channel)
  if (filter?.serviceId) query = query.eq('service_id', filter.serviceId)
  if (filter?.unreadOnly) query = query.eq('is_unread', true)
  if (filter?.hotOnly) query = query.eq('is_hot', true)
  if (filter?.search) {
    query = query.or(`customer_name.ilike.%${filter.search}%,customer_phone.ilike.%${filter.search}%,customer_identifier.ilike.%${filter.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data as ConversationWithRelations[]
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Message[]
}

export async function sendMessage(conversationId: string, content: string, channel: string = 'telegram'): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      direction: 'outbound',
      channel,
      content,
      delivery_status: 'pending',
    })
    .select()
    .single()
  if (error) throw error

  // Update conversation
  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content,
      message_count: (await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', conversationId)).count ?? 1,
      is_unread: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  return data as Message
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ is_unread: false, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
  if (error) throw error
}

export async function assignConversation(conversationId: string, employeeId: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ assigned_employee_id: employeeId, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
  if (error) throw error

  await supabase.from('conversation_assignments').insert({
    conversation_id: conversationId,
    employee_id: employeeId,
  })
}

export async function updateConversationStatus(conversationId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
  if (error) throw error
}

export async function getInternalNotes(conversationId: string): Promise<InternalNote[]> {
  const { data, error } = await supabase
    .from('internal_notes')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as InternalNote[]
}

export async function addInternalNote(conversationId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('internal_notes')
    .insert({ conversation_id: conversationId, content })
  if (error) throw error
}

export async function deleteInternalNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('internal_notes').delete().eq('id', noteId)
  if (error) throw error
}
