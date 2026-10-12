import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { cashier_id, customer_id, items, payment_method, discount_percent, paid_amount, idempotency_key } = body
    
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('process_pos_checkout', {
      p_cashier_id: cashier_id,
      p_customer_id: customer_id,
      p_items: items,
      p_payment_method: payment_method,
      p_discount_percent: discount_percent || 0,
      p_paid_amount: paid_amount,
      p_idempotency_key: idempotency_key,
    })
    
    if (error) throw error
    
    if (!data.success) {
      return NextResponse.json(data, { status: 400 })
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
