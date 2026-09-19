import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    chat: { id: number; type: string; first_name?: string; last_name?: string; username?: string };
    from?: { id: number; is_bot: boolean; first_name?: string; last_name?: string; username?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    data: string;
    from: { id: number; username?: string; first_name?: string; last_name?: string };
    message: { chat: { id: number } };
  };
}

async function getTelegramToken(): Promise<string | null> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "telegram_bot_token")
    .maybeSingle();
  return data?.value ?? null;
}

async function ensureCustomer(chat: TelegramUpdate["message"] extends infer M ? M extends { chat: infer C } ? C : never : never, from: TelegramUpdate["message"] extends infer M ? M extends { from: infer F } ? F : never : never) {
  const tgId = String(from.id);
  const username = from.username ?? "";

  const { data: existing } = await supabase
    .from("customer_identifiers")
    .select("customer_id")
    .eq("type", "telegram")
    .eq("value", tgId)
    .maybeSingle();

  if (existing) return existing.customer_id;

  const fullName = [from.first_name, from.last_name].filter(Boolean).join(" ").trim();
  const { data: customer } = await supabase
    .from("customers")
    .insert({
      first_name: from.first_name ?? null,
      last_name: from.last_name ?? null,
      telegram_username: username || null,
      source: "telegram",
      first_contact_at: new Date().toISOString(),
      last_contact_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  await supabase
    .from("customer_identifiers")
    .insert({ customer_id: customer.id, type: "telegram", value: tgId, is_verified: true });

  if (username) {
    await supabase
      .from("customer_identifiers")
      .insert({ customer_id: customer.id, type: "telegram", value: `@${username}`, is_verified: false });
  }

  return customer.id;
}

async function findOrCreateConversation(customerId: string, chatId: number) {
  const externalId = `tg_${chatId}`;
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("customer_identifier", externalId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: conv } = await supabase
    .from("conversations")
    .insert({
      customer_id: customerId,
      channel: "telegram",
      status: "open",
      is_unread: true,
      customer_identifier: externalId,
      customer_name: "",
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return conv.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const token = await getTelegramToken();
    if (!token) {
      return new Response(JSON.stringify({ error: "Telegram bot token not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update: TelegramUpdate = await req.json();

    // Handle webhook setup verification
    if (req.headers.get("X-Telegram-Bot-Api-Secret-Token")) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const msg = update.message;
    if (!msg || !msg.from) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = await ensureCustomer(msg.chat, msg.from);
    const convId = await findOrCreateConversation(customerId, msg.chat.id);

    const text = msg.text ?? "";
    const { data: messageRow } = await supabase
      .from("messages")
      .insert({
        conversation_id: convId,
        direction: "inbound",
        channel: "telegram",
        content: text,
        external_id: String(msg.message_id),
        sender_name: msg.from.username ? `@${msg.from.username}` : (msg.from.first_name ?? "Unknown"),
        delivery_status: "delivered",
      })
      .select("id")
      .single();

    await supabase
      .from("conversations")
      .update({
        is_unread: true,
        last_message_at: new Date().toISOString(),
        last_message_preview: text.slice(0, 200),
        message_count: 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", convId);

    // Increment message_count properly
    await supabase.rpc("increment_conversation_message_count", { conv_id: convId }).then(() => {}, () => {});

    return new Response(JSON.stringify({ ok: true, message_id: messageRow?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
