import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getNextServiceTicketNo(): Promise<string> {
  const { data: lastTickets } = await supabase
    .from("services")
    .select("ticket_no")
    .order("created_at", { ascending: false })
    .limit(1);

  let nextNumber = 1;

  if (lastTickets && lastTickets.length > 0 && lastTickets[0].ticket_no) {
    const lastNo = lastTickets[0].ticket_no;
    const currentNum = parseInt(lastNo.replace(/\D/g, ""), 10);
    if (!isNaN(currentNum)) {
      nextNumber = currentNum + 1;
    }
  }

  const currentYear = new Date().getFullYear();
  return `SVC-${currentYear}-${String(nextNumber).padStart(4, "0")}`;
}