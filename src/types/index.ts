export interface Service {
  id: string
  name: string
  slug: string
  icon: string
  description: string | null
  color: string
  is_active: boolean
  is_archived: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PhoneNumber {
  id: string
  internal_name: string
  phone_number: string | null
  sim_label: string | null
  description: string | null
  status: string
  is_primary: boolean
  working_hours: Record<string, unknown>
  created_at: string
  updated_at: string
  services?: Service[]
}

export interface MessagingAccount {
  id: string
  name: string
  account_type: 'phone' | 'telegram' | 'telegram_business' | 'telegram_bot' | 'whatsapp_business'
  identifier: string | null
  phone_number_id: string | null
  status: string
  metadata: Record<string, unknown>
  working_hours: Record<string, unknown>
  last_connected_at: string | null
  health_status: string
  created_at: string
  updated_at: string
  phone_number?: PhoneNumber | null
  services?: Service[]
}

export interface PhoneNumberService {
  id: string
  phone_number_id: string
  service_id: string
  created_at: string
}

export interface MessagingAccountService {
  id: string
  messaging_account_id: string
  service_id: string
  created_at: string
}

export interface Team {
  id: string
  name: string
  description: string | null
  service_id: string | null
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  user_id: string | null
  team_id: string | null
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  language: string
  status: string
  working_hours: Record<string, unknown>
  capacity: number
  current_workload: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: string
  description: string | null
  is_system: boolean
  created_at: string
}

export interface Permission {
  id: string
  key: string
  label: string
  category: string
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  user_email: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  result: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface Customer {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  email: string | null
  telegram_username: string | null
  whatsapp_number: string | null
  language: string
  country: string | null
  city: string | null
  status: string
  source: string | null
  preferred_service_id: string | null
  assigned_employee_id: string | null
  first_contact_at: string | null
  last_contact_at: string | null
  created_at: string
  updated_at: string
}

export interface CustomerIdentifier {
  id: string
  customer_id: string
  type: string
  value: string
  is_verified: boolean
  created_at: string
}

export interface Tag {
  id: string
  name: string
  color: string
  created_at: string
}

export interface CustomerNote {
  id: string
  customer_id: string
  author_id: string | null
  content: string
  created_at: string
}

export interface Lead {
  id: string
  customer_id: string
  service_id: string | null
  phone_number_id: string | null
  messaging_account_id: string | null
  source: string | null
  status: string
  priority: string
  score: number
  is_hot: boolean
  assigned_employee_id: string | null
  title: string | null
  notes: string | null
  next_follow_up: string | null
  created_at: string
  updated_at: string
  service?: { id: string; name: string; icon: string } | null
  assigned_employee?: { id: string; first_name: string; last_name: string } | null
}

export interface LeadActivity {
  id: string
  lead_id: string
  employee_id: string | null
  activity_type: string
  description: string | null
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  direction: string
  channel: string
  content: string | null
  media_url: string | null
  media_type: string | null
  delivery_status: string
  read_status: string
  external_id: string | null
  sender_name: string | null
  created_at: string
}

export interface InternalNote {
  id: string
  conversation_id: string
  author_id: string | null
  content: string
  created_at: string
}

export interface Content {
  id: string
  title: string
  body: string | null
  media_url: string | null
  media_type: string | null
  service_id: string | null
  language: string
  tags: string[] | null
  content_type: string
  status: string
  created_by: string | null
  scheduled_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  service?: { id: string; name: string; icon: string } | null
}

export interface Campaign {
  id: string
  name: string
  service_id: string | null
  content_id: string | null
  status: string
  start_at: string | null
  end_at: string | null
  results: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
  service?: { id: string; name: string; icon: string } | null
}

export interface KnowledgeBase {
  id: string
  service_id: string
  description: string | null
  created_at: string
  updated_at: string
  service?: { id: string; name: string; icon: string } | null
}

export interface KnowledgeBaseItem {
  id: string
  knowledge_base_id: string
  item_type: string
  question: string | null
  answer: string | null
  data: Record<string, unknown>
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string | null
  type: string
  title: string
  body: string | null
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  created_at: string
}

export interface AiAction {
  id: string
  conversation_id: string | null
  message_id: string | null
  customer_id: string | null
  action_type: string
  result: Record<string, unknown>
  confidence: number
  reasoning: string | null
  action_level: string
  created_at: string
}

export interface TelegramGroup {
  id: string
  name: string
  group_type: string
  link: string | null
  connected_account_id: string | null
  service_id: string | null
  can_send: boolean
  can_send_media: boolean
  connection_status: string
  last_checked_at: string | null
  rules: Record<string, unknown>
  created_at: string
  updated_at: string
  service?: { id: string; name: string; icon: string } | null
}

export interface TelegramChannel {
  id: string
  name: string
  link: string | null
  connected_account_id: string | null
  service_id: string | null
  can_publish: boolean
  connection_status: string
  last_checked_at: string | null
  rules: Record<string, unknown>
  created_at: string
  updated_at: string
  service?: { id: string; name: string; icon: string } | null
}
