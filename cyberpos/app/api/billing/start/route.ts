import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { computer_id, customer_id, billing_plan_id, started_by, planned_duration_minutes } = body
    
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('start_computer_session', {
      p_computer_id: computer_id,
      p_customer_id: customer_id,
      p_billing_plan_id: billing_plan_id,
      p_started_by: started_by,
      p_planned_duration_minutes: planned_duration_minutes,
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
