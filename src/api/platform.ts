import { supabase } from '../lib/supabase'
import type { Content, Campaign, KnowledgeBase, KnowledgeBaseItem, Notification, AiAction, TelegramGroup, TelegramChannel } from '../types'

// Content
export async function getContent(): Promise<Content[]> {
  const { data, error } = await supabase.from('content').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data as Content[]
}

export async function createContent(c: Partial<Content>): Promise<Content> {
  const { data, error } = await supabase.from('content').insert(c).select().single()
  if (error) throw error
  return data as Content
}

export async function updateContent(id: string, updates: Partial<Content>): Promise<void> {
  const { error } = await supabase.from('content').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteContent(id: string): Promise<void> {
  const { error } = await supabase.from('content').delete().eq('id', id)
  if (error) throw error
}

// Campaigns
export async function getCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data as Campaign[]
}

export async function createCampaign(c: Partial<Campaign>): Promise<Campaign> {
  const { data, error } = await supabase.from('campaigns').insert(c).select().single()
  if (error) throw error
  return data as Campaign
}

export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<void> {
  const { error } = await supabase.from('campaigns').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from('campaigns').delete().eq('id', id)
  if (error) throw error
}

// Knowledge Base
export async function getKnowledgeBases(): Promise<KnowledgeBase[]> {
  const { data, error } = await supabase.from('knowledge_bases').select('*, service:services(id, name, icon)').order('created_at')
  if (error) throw error
  return data as KnowledgeBase[]
}

export async function getKnowledgeBaseItems(kbId: string): Promise<KnowledgeBaseItem[]> {
  const { data, error } = await supabase.from('knowledge_base_items').select('*').eq('knowledge_base_id', kbId).order('sort_order')
  if (error) throw error
  return data as KnowledgeBaseItem[]
}

export async function createKnowledgeBaseItem(item: Partial<KnowledgeBaseItem>): Promise<void> {
  const { error } = await supabase.from('knowledge_base_items').insert(item)
  if (error) throw error
}

export async function updateKnowledgeBaseItem(id: string, updates: Partial<KnowledgeBaseItem>): Promise<void> {
  const { error } = await supabase.from('knowledge_base_items').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteKnowledgeBaseItem(id: string): Promise<void> {
  const { error } = await supabase.from('knowledge_base_items').delete().eq('id', id)
  if (error) throw error
}

// Notifications
export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)
  if (error) throw error
  return data as Notification[]
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).neq('is_read', true)
  if (error) throw error
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) throw error
}

// AI Actions
export async function getAiActions(limit = 50): Promise<AiAction[]> {
  const { data, error } = await supabase.from('ai_actions').select('*').order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return data as AiAction[]
}

export async function createAiAction(action: Partial<AiAction>): Promise<void> {
  const { error } = await supabase.from('ai_actions').insert(action)
  if (error) throw error
}

// Telegram groups/channels
export async function getTelegramGroups(): Promise<TelegramGroup[]> {
  const { data, error } = await supabase.from('telegram_groups').select('*, service:services(id, name, icon)').order('name')
  if (error) throw error
  return data as TelegramGroup[]
}

export async function getTelegramChannels(): Promise<TelegramChannel[]> {
  const { data, error } = await supabase.from('telegram_channels').select('*, service:services(id, name, icon)').order('name')
  if (error) throw error
  return data as TelegramChannel[]
}

export async function createTelegramGroup(g: Partial<TelegramGroup>): Promise<void> {
  const { error } = await supabase.from('telegram_groups').insert(g)
  if (error) throw error
}

export async function createTelegramChannel(c: Partial<TelegramChannel>): Promise<void> {
  const { error } = await supabase.from('telegram_channels').insert(c)
  if (error) throw error
}

export async function deleteTelegramGroup(id: string): Promise<void> {
  const { error } = await supabase.from('telegram_groups').delete().eq('id', id)
  if (error) throw error
}

export async function deleteTelegramChannel(id: string): Promise<void> {
  const { error } = await supabase.from('telegram_channels').delete().eq('id', id)
  if (error) throw error
}
