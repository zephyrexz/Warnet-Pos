'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/permissions'

export async function getDashboardStats() {
  await requireRole(['OWNER', 'ADMIN'])
  const supabase = await createClient()

  // Get computers stats
  const { data: computers } = await supabase
    .from('computers')
    .select('status')
    .eq('is_active', true)

  const computerStats = {
    total: computers?.length || 0,
    available: computers?.filter(c => c.status === 'AVAILABLE').length || 0,
    in_use: computers?.filter(c => c.status === 'IN_USE').length || 0,
    reserved: computers?.filter(c => c.status === 'RESERVED').length || 0,
    maintenance: computers?.filter(c => c.status === 'MAINTENANCE').length || 0,
  }

  // Get active sessions
  const { data: activeSessions } = await supabase
    .from('computer_sessions')
    .select('id')
    .is('ended_at', null)

  // Get today's reservations
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: todayReservations } = await supabase
    .from('reservations')
    .select('id')
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())
    .in('status', ['PENDING', 'CONFIRMED', 'CHECKED_IN'])

  // Get today's revenue
  const { data: todaySales } = await supabase
    .from('sales')
    .select('total, payment_status')
    .gte('created_at', today.toISOString())
    .eq('payment_status', 'PAID')

  const todayRevenue = todaySales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0

  // Get today's billing sessions
  const { data: todaySessions } = await supabase
    .from('computer_sessions')
    .select('*')
    .gte('started_at', today.toISOString())

  // Calculate billing revenue (approximate for active sessions)
  let billingRevenue = 0
  todaySessions?.forEach(session => {
    const startTime = new Date(session.started_at)
    const endTime = session.ended_at ? new Date(session.ended_at) : new Date()
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
    billingRevenue += hours * Number(session.hourly_rate)
  })

  // Get product sales
  const { data: productSales } = await supabase
    .from('sale_items')
    .select(`
      subtotal,
      sales!inner (created_at, payment_status)
    `)
    .gte('sales.created_at', today.toISOString())
    .eq('sales.payment_status', 'PAID')

  const productRevenue = productSales?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0

  // Get low stock products
  const { data: lowStock } = await supabase
    .from('products')
    .select('id, name, stock, min_stock')
    .eq('is_active', true)
    .filter('stock', 'lte', 'min_stock')
    .order('stock', { ascending: true })
    .limit(10)

  // Get recent transactions
  const { data: recentTransactions } = await supabase
    .from('sales')
    .select(`
      *,
      profiles!sales_cashier_id_fkey (full_name),
      customers (profiles!inner(full_name))
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  return {
    computers: computerStats,
    active_sessions: activeSessions?.length || 0,
    today_reservations: todayReservations?.length || 0,
    today_revenue: Math.round(todayRevenue),
    billing_revenue: Math.round(billingRevenue),
    product_revenue: Math.round(productRevenue),
    total_transactions: todaySales?.length || 0,
    low_stock_products: lowStock || [],
    recent_transactions: recentTransactions || [],
  }
}

export async function getCashierDashboardStats() {
  await requireRole(['CASHIER'])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get current shift
  const { data: currentShift } = await supabase
    .from('cashier_shifts')
    .select('*')
    .eq('cashier_id', user!.id)
    .is('closed_at', null)
    .single()

  if (!currentShift) {
    return { shift: null }
  }

  // Get shift sales
  const { data: shiftSales } = await supabase
    .from('sales')
    .select('*')
    .eq('cashier_id', user!.id)
    .gte('created_at', currentShift.opened_at)
    .eq('payment_status', 'PAID')

  const total_transactions = shiftSales?.length || 0
  const total_revenue = shiftSales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0
  const cash_sales = shiftSales?.filter(s => s.payment_method === 'CASH').length || 0

  // Get available computers
  const { data: computers } = await supabase
    .from('computers')
    .select('id, code, name, status')
    .eq('is_active', true)
    .eq('status', 'AVAILABLE')

  return {
    shift: currentShift,
    stats: {
      total_transactions,
      total_revenue: Math.round(total_revenue),
      cash_sales,
    },
    available_computers: computers || [],
  }
}

export async function getReports(filters: {
  start_date: string
  end_date: string
  report_type: 'revenue' | 'billing' | 'products' | 'inventory'
}) {
  await requireRole(['OWNER', 'ADMIN'])
  const supabase = await createClient()

  if (filters.report_type === 'revenue') {
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .gte('created_at', filters.start_date)
      .lte('created_at', filters.end_date)
      .eq('payment_status', 'PAID')

    const total_revenue = sales?.reduce((sum, s) => sum + Number(s.total), 0) || 0
    const cash_revenue = sales?.filter(s => s.payment_method === 'CASH').reduce((sum, s) => sum + Number(s.total), 0) || 0
    const non_cash_revenue = total_revenue - cash_revenue

    return {
      total_revenue,
      cash_revenue,
      non_cash_revenue,
      total_transactions: sales?.length || 0,
      sales: sales || [],
    }
  }

  if (filters.report_type === 'billing') {
    const { data: sessions } = await supabase
      .from('computer_sessions')
      .select(`
        *,
        computers (code, name)
      `)
      .gte('started_at', filters.start_date)
      .lte('started_at', filters.end_date)

    let total_revenue = 0
    let total_duration = 0

    sessions?.forEach(session => {
      const startTime = new Date(session.started_at)
      const endTime = session.ended_at ? new Date(session.ended_at) : new Date()
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      total_duration += hours
      total_revenue += hours * Number(session.hourly_rate)
    })

    return {
      total_sessions: sessions?.length || 0,
      total_duration: Math.round(total_duration * 100) / 100,
      total_revenue: Math.round(total_revenue),
      sessions: sessions || [],
    }
  }

  if (filters.report_type === 'products') {
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select(`
        *,
        products (name, sku),
        sales!inner (created_at, payment_status)
      `)
      .gte('sales.created_at', filters.start_date)
      .lte('sales.created_at', filters.end_date)
      .eq('sales.payment_status', 'PAID')

    // Group by product
    const productMap = new Map()
    saleItems?.forEach(item => {
      const key = item.product_id
      if (!productMap.has(key)) {
        productMap.set(key, {
          product_id: item.product_id,
          product_name: item.product_name,
          total_quantity: 0,
          total_revenue: 0,
        })
      }
      const product = productMap.get(key)
      product.total_quantity += item.quantity
      product.total_revenue += Number(item.subtotal)
    })

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue)

    return {
      top_products: topProducts,
      total_items_sold: saleItems?.reduce((sum, i) => sum + i.quantity, 0) || 0,
    }
  }

  return null
}
