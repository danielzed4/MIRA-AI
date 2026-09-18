import { supabase } from '../lib/supabase'
import type { Customer, CustomerNote, Tag, Lead } from '../types'

export interface CustomerWithRelations extends Customer {
  tags?: Tag[]
  notes?: CustomerNote[]
  leads?: Lead[]
  assigned_employee?: { id: string; first_name: string; last_name: string } | null
  preferred_service?: { id: string; name: string; icon: string } | null
}

export async function getCustomers(search?: string): Promise<CustomerWithRelations[]> {
  let query = supabase
    .from('customers')
    .select(`
      *,
      tags:customer_tags(tag:tags(*)),
      assigned_employee:employees!assigned_employee_id(id, first_name, last_name),
      preferred_service:services!preferred_service_id(id, name, icon)
    `)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,telegram_username.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((c) => ({
    ...c,
    tags: c.tags?.map((t: { tag: Tag }) => t.tag).filter(Boolean) ?? [],
  })) as CustomerWithRelations[]
}

export async function getCustomer(id: string): Promise<CustomerWithRelations | null> {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      tags:customer_tags(tag:tags(*)),
      notes:customer_notes(*),
      leads:leads(*, service:services(*), assigned_employee:employees!assigned_employee_id(id, first_name, last_name)),
      assigned_employee:employees!assigned_employee_id(id, first_name, last_name),
      preferred_service:services!preferred_service_id(id, name, icon)
    `)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    ...data,
    tags: data.tags?.map((t: { tag: Tag }) => t.tag).filter(Boolean) ?? [],
  } as CustomerWithRelations
}

export async function createCustomer(c: Partial<Customer>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert(c)
    .select()
    .single()
  if (error) throw error
  return data as Customer
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Customer
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw error
}

export async function getTags(): Promise<Tag[]> {
  const { data, error } = await supabase.from('tags').select('*').order('name')
  if (error) throw error
  return data as Tag[]
}

export async function assignTagToCustomer(customerId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('customer_tags')
    .insert({ customer_id: customerId, tag_id: tagId })
  if (error) throw error
}

export async function removeTagFromCustomer(customerId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('customer_tags')
    .delete()
    .eq('customer_id', customerId)
    .eq('tag_id', tagId)
  if (error) throw error
}

export async function addCustomerNote(customerId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('customer_notes')
    .insert({ customer_id: customerId, content })
  if (error) throw error
}

export async function deleteCustomerNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('customer_notes').delete().eq('id', noteId)
  if (error) throw error
}

export async function mergeCustomers(sourceId: string, targetId: string): Promise<void> {
  // Move identifiers, notes, leads from source to target, then delete source
  await supabase.from('customer_identifiers').update({ customer_id: targetId }).eq('customer_id', sourceId)
  await supabase.from('customer_notes').update({ customer_id: targetId }).eq('customer_id', sourceId)
  await supabase.from('leads').update({ customer_id: targetId }).eq('customer_id', sourceId)
  await supabase.from('customer_tags').delete().eq('customer_id', sourceId)
  await supabase.from('customers').delete().eq('id', sourceId)
}
