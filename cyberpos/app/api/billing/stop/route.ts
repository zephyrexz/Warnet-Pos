import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { session_id, stopped_by } = body
    
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('stop_computer_session', {
      p_session_id: session_id,
      p_stopped_by: stopped_by,
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
