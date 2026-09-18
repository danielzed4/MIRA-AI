import { supabase } from '../lib/supabase'
import type { PhoneNumber, Service } from '../types'

export async function getPhoneNumbers(): Promise<PhoneNumber[]> {
  const { data, error } = await supabase
    .from('phone_numbers')
    .select('*, services:phone_number_services(service:services(*))')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((pn) => ({
    ...pn,
    services: pn.services?.map((s: { service: Service }) => s.service).filter(Boolean) ?? [],
  })) as PhoneNumber[]
}

export async function createPhoneNumber(pn: Partial<PhoneNumber>): Promise<PhoneNumber> {
  const { data, error } = await supabase
    .from('phone_numbers')
    .insert(pn)
    .select()
    .single()
  if (error) throw error
  return data as PhoneNumber
}

export async function updatePhoneNumber(id: string, updates: Partial<PhoneNumber>): Promise<PhoneNumber> {
  const { data, error } = await supabase
    .from('phone_numbers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as PhoneNumber
}

export async function deletePhoneNumber(id: string): Promise<void> {
  const { error } = await supabase.from('phone_numbers').delete().eq('id', id)
  if (error) throw error
}

export async function assignServiceToPhone(phoneNumberId: string, serviceId: string): Promise<void> {
  const { error } = await supabase
    .from('phone_number_services')
    .insert({ phone_number_id: phoneNumberId, service_id: serviceId })
  if (error) throw error
}

export async function removeServiceFromPhone(phoneNumberId: string, serviceId: string): Promise<void> {
  const { error } = await supabase
    .from('phone_number_services')
    .delete()
    .eq('phone_number_id', phoneNumberId)
    .eq('service_id', serviceId)
  if (error) throw error
}
