import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_TELEGRAM_ID = "8797676989";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramChat = {
  id: number;
  type: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramMessage = {
  message_id: number;
  date: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
  caption?: string;
  photo?: { file_id: string; file_size: number; width: number; height: number }[];
  video?: { file_id: string; file_size?: number; duration?: number };
  voice?: { file_id: string; duration?: number };
  audio?: { file_id: string; duration?: number; title?: string; performer?: string };
  document?: { file_id: string; file_name?: string; file_size?: number; mime_type?: string };
  sticker?: { file_id: string; emoji?: string; set_name?: string };
  animation?: { file_id: string; file_size?: number };
  location?: { latitude: number; longitude: number };
  contact?: { phone_number: string; first_name: string; last_name?: string };
  new_chat_members?: TelegramUser[];
  left_chat_member?: TelegramUser;
  new_chat_title?: string;
  pinned_message?: unknown;
  reply_to_message?: TelegramMessage;
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChat;
};

type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getTelegramToken() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "telegram_bot_token")
    .maybeSingle();
  if (error) throw error;
  return data?.value?.trim() || null;
}

async function telegramApi(token: string, method: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data;
}

function chatDisplayName(chat: TelegramChat): string {
  if (chat.type === "private") {
    return [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || "Telegram User";
  }
  return chat.title || chat.username || `Group ${chat.id}`;
}

function chatIdentifier(chat: TelegramChat): string {
  return `tg_${chat.id}`;
}

function extractContent(msg: TelegramMessage): { text: string; mediaType: string | null } {
  if (msg.text) return { text: msg.text, mediaType: null };
  if (msg.photo && msg.photo.length > 0) return { text: msg.caption || "[عکس]", mediaType: "photo" };
  if (msg.video) return { text: msg.caption || "[ویدیو]", mediaType: "video" };
  if (msg.voice) return { text: msg.caption || "[پیام صوتی]", mediaType: "voice" };
  if (msg.audio) return { text: msg.caption || `[آهنگ: ${msg.audio.title ?? ""}]`, mediaType: "audio" };
  if (msg.document) return { text: msg.caption || `[فایل: ${msg.document.file_name ?? ""}]`, mediaType: "document" };
  if (msg.sticker) return { text: `[استیکر ${msg.sticker.emoji ?? ""}]`, mediaType: "sticker" };
  if (msg.animation) return { text: msg.caption || "[گیف]", mediaType: "animation" };
  if (msg.location) return { text: `[موقعیت: ${msg.location.latitude}, ${msg.location.longitude}]`, mediaType: "location" };
  if (msg.contact) return { text: `[مخاطب: ${msg.contact.first_name} ${msg.contact.phone_number}]`, mediaType: "contact" };
  if (msg.new_chat_members?.length) return { text: "[کاربر جدید به گروه پیوست]", mediaType: null };
  if (msg.left_chat_member) return { text: "[کاربر گروه را ترک کرد]", mediaType: null };
  if (msg.new_chat_title) return { text: `[عنوان گروه تغییر کرد: ${msg.new_chat_title}]`, mediaType: null };
  return { text: "[پیام]", mediaType: null };
}

function extractMediaUrl(msg: TelegramMessage): { url: string | null; type: string | null } {
  let fileId: string | null = null;
  let type: string | null = null;
  if (msg.photo?.length) { fileId = msg.photo[msg.photo.length - 1].file_id; type = "photo"; }
  else if (msg.video) { fileId = msg.video.file_id; type = "video"; }
  else if (msg.voice) { fileId = msg.voice.file_id; type = "voice"; }
  else if (msg.audio) { fileId = msg.audio.file_id; type = "audio"; }
  else if (msg.document) { fileId = msg.document.file_id; type = "document"; }
  else if (msg.sticker) { fileId = msg.sticker.file_id; type = "sticker"; }
  else if (msg.animation) { fileId = msg.animation.file_id; type = "animation"; }
  return { url: fileId, type };
}

async function ensureCustomer(user: TelegramUser, chat: TelegramChat) {
  const telegramId = String(user.id);
  const { data: existing, error: lookupError } = await supabase
    .from("customer_identifiers")
    .select("customer_id")
    .eq("type", "telegram")
    .eq("value", telegramId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.customer_id) return existing.customer_id;

  const now = new Date().toISOString();
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      telegram_username: user.username ?? null,
      source: "telegram",
      first_contact_at: now,
      last_contact_at: now,
    })
    .select("id")
    .single();
  if (customerError || !customer) throw customerError ?? new Error("Customer was not created");

  const { error: idError } = await supabase.from("customer_identifiers").insert({
    customer_id: customer.id,
    type: "telegram",
    value: telegramId,
    is_verified: true,
  });
  if (idError) throw idError;
  return customer.id;
}

async function findOrCreateConversation(customerId: string, chat: TelegramChat, user: TelegramUser) {
  const externalId = chatIdentifier(chat);
  const { data: existing, error: lookupError } = await supabase
    .from("conversations")
    .select("id")
    .eq("customer_identifier", externalId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.id) return existing.id;

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({
      customer_id: customerId,
      channel: "telegram",
      status: "open",
      is_unread: true,
      customer_identifier: externalId,
      customer_name: chatDisplayName(chat),
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !conv) throw error ?? new Error("Conversation was not created");
  return conv.id;
}

async function processMessage(msg: TelegramMessage, token: string, externalIdPrefix: string) {
  if (!msg.from || msg.from.is_bot) return;

  const user = msg.from;
  const chat = msg.chat;
  const telegramId = String(user.id);
  const { text, mediaType } = extractContent(msg);
  const { url: mediaFileId, type: mediaTypeResolved } = extractMediaUrl(msg);

  const customerId = await ensureCustomer(user, chat);
  const conversationId = await findOrCreateConversation(customerId, chat, user);

  const messageIdStr = `${externalIdPrefix}_${msg.message_id}`;
  const { data: duplicate } = await supabase
    .from("messages")
    .select("id")
    .eq("external_id", messageIdStr)
    .maybeSingle();
  if (duplicate) return;

  const isGroup = chat.type !== "private";
  const senderName = isGroup
    ? `${chatDisplayName(chat)} — ${user.username ? `@${user.username}` : (user.first_name ?? "Unknown")}`
    : telegramId === ADMIN_TELEGRAM_ID
      ? "مدیر سیستم"
      : (user.username ? `@${user.username}` : (user.first_name ?? "Telegram"));

  const { data: saved, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      direction: "inbound",
      channel: "telegram",
      content: text,
      media_url: mediaFileId,
      media_type: mediaTypeResolved ?? mediaType,
      external_id: messageIdStr,
      sender_name: senderName,
      delivery_status: "delivered",
    })
    .select("id")
    .single();
  if (msgError || !saved) throw msgError ?? new Error("Message was not saved");

  const { error: convError } = await supabase
    .from("conversations")
    .update({
      is_unread: true,
      last_message_at: new Date().toISOString(),
      last_message_preview: text.slice(0, 200),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
  if (convError) throw convError;

  await supabase.rpc("increment_conversation_message_count", { conv_id: conversationId });

  if (text === "/start" && chat.type === "private") {
    await telegramApi(token, "sendMessage", {
      chat_id: chat.id,
      text: telegramId === ADMIN_TELEGRAM_ID
        ? "MIRA AI فعال است. پیام‌های شما در صندوق ورودی ثبت می‌شود."
        : "پیام شما دریافت شد. کارشناسان MIRA AI به‌زودی پاسخ می‌دهند.",
    });
  }

  if (text === "/status" && chat.type === "private") {
    await telegramApi(token, "sendMessage", {
      chat_id: chat.id,
      text: "وضعیت: متصل\nصندوق ورودی: فعال\nنوع پیام‌های قابل دریافت: متن، عکس، ویدیو، صدا، فایل، استیکر",
    });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const token = await getTelegramToken();
    if (!token) return json({ error: "Telegram bot token not configured" }, 503);

    if (req.method === "GET") return json({ ok: true, service: "telegram-webhook" });

    const update: TelegramUpdate = await req.json();

    if (update.message) {
      await processMessage(update.message, token, "msg");
    } else if (update.edited_message) {
      await processMessage(update.edited_message, token, "edit");
    } else if (update.channel_post) {
      await processMessage(update.channel_post, token, "post");
    } else if (update.edited_channel_post) {
      await processMessage(update.edited_channel_post, token, "epost");
    }

    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram webhook failed";
    return json({ error: message }, 500);
  }
});
