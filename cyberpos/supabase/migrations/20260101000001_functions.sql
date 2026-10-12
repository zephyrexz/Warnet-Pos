-- Database functions for critical operations

-- Function: Start computer session
create or replace function start_computer_session(
  p_computer_id uuid,
  p_customer_id uuid,
  p_billing_plan_id uuid,
  p_started_by uuid,
  p_planned_duration_minutes integer default null
)
returns jsonb as $$
declare
  v_computer record;
  v_plan record;
  v_session_id uuid;
  v_planned_end timestamptz;
begin
  -- Lock computer row
  select * into v_computer from computers where id = p_computer_id for update;
  
  if not found then
    return jsonb_build_object('success', false, 'error', 'Komputer tidak ditemukan');
  end if;
  
  if v_computer.status != 'AVAILABLE' then
    return jsonb_build_object('success', false, 'error', 'Komputer tidak tersedia');
  end if;
  
  -- Check for active session
  if exists (
    select 1 from computer_sessions 
    where computer_id = p_computer_id and ended_at is null
  ) then
    return jsonb_build_object('success', false, 'error', 'Komputer sudah memiliki sesi aktif');
  end if;
  
  -- Get billing plan
  if p_billing_plan_id is not null then
    select * into v_plan from billing_plans where id = p_billing_plan_id and is_active = true;
    if not found then
      return jsonb_build_object('success', false, 'error', 'Paket billing tidak ditemukan');
    end if;
  end if;
  
  -- Calculate planned end time
  if p_planned_duration_minutes is not null then
    v_planned_end := now() + (p_planned_duration_minutes || ' minutes')::interval;
  elsif v_plan.duration_minutes is not null then
    v_planned_end := now() + (v_plan.duration_minutes || ' minutes')::interval;
  end if;
  
  -- Create session
  insert into computer_sessions (
    computer_id,
    customer_id,
    billing_plan_id,
    started_by,
    planned_end_at,
    hourly_rate
  ) values (
    p_computer_id,
    p_customer_id,
    p_billing_plan_id,
    p_started_by,
    v_planned_end,
    coalesce(v_plan.price / nullif(v_plan.duration_minutes, 0) * 60, v_computer.hourly_rate)
  ) returning id into v_session_id;
  
  -- Update computer status
  update computers set status = 'IN_USE', updated_at = now() where id = p_computer_id;
  
  return jsonb_build_object('success', true, 'session_id', v_session_id);
end;
$$ language plpgsql security definer;

-- Function: Stop computer session
create or replace function stop_computer_session(
  p_session_id uuid,
  p_stopped_by uuid
)
returns jsonb as $$
declare
  v_session record;
  v_duration_minutes numeric;
  v_amount numeric;
begin
  -- Lock session
  select * into v_session from computer_sessions where id = p_session_id for update;
  
  if not found then
    return jsonb_build_object('success', false, 'error', 'Sesi tidak ditemukan');
  end if;
  
  if v_session.ended_at is not null then
    return jsonb_build_object('success', false, 'error', 'Sesi sudah selesai');
  end if;
  
  -- Calculate duration and amount
  v_duration_minutes := extract(epoch from (now() - v_session.started_at)) / 60;
  
  -- Round up to nearest 15 minutes (ponytail: configurable rounding)
  v_duration_minutes := ceil(v_duration_minutes / 15) * 15;
  
  v_amount := (v_session.hourly_rate / 60 * v_duration_minutes) * (1 - v_session.discount_percent / 100);
  
  -- Update session
  update computer_sessions set ended_at = now() where id = p_session_id;
  
  -- Update computer status
  update computers 
  set status = 'AVAILABLE', updated_at = now() 
  where id = v_session.computer_id;
  
  return jsonb_build_object(
    'success', true,
    'duration_minutes', v_duration_minutes,
    'amount', v_amount
  );
end;
$$ language plpgsql security definer;

-- Function: Process POS checkout
create or replace function process_pos_checkout(
  p_cashier_id uuid,
  p_customer_id uuid,
  p_items jsonb,
  p_payment_method payment_method,
  p_discount_percent numeric default 0,
  p_paid_amount numeric default null,
  p_idempotency_key text default null
)
returns jsonb as $$
declare
  v_sale_id uuid;
  v_invoice_number text;
  v_item jsonb;
  v_product record;
  v_subtotal numeric := 0;
  v_discount_amount numeric;
  v_total numeric;
  v_change numeric := 0;
  v_stock_movements jsonb := '[]'::jsonb;
begin
  -- Check idempotency
  if p_idempotency_key is not null then
    if exists (select 1 from sales where notes like '%' || p_idempotency_key || '%') then
      return jsonb_build_object('success', false, 'error', 'Transaksi sudah diproses');
    end if;
  end if;
  
  -- Generate invoice number
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('invoice_seq')::text, 6, '0');
  
  -- Validate and calculate items
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    -- Lock product
    select * into v_product 
    from products 
    where id = (v_item->>'product_id')::uuid 
    for update;
    
    if not found then
      return jsonb_build_object('success', false, 'error', 'Produk tidak ditemukan: ' || (v_item->>'product_id'));
    end if;
    
    if not v_product.is_active then
      return jsonb_build_object('success', false, 'error', 'Produk tidak aktif: ' || v_product.name);
    end if;
    
    if v_product.stock < (v_item->>'quantity')::integer then
      return jsonb_build_object('success', false, 'error', 'Stok tidak cukup: ' || v_product.name);
    end if;
    
    v_subtotal := v_subtotal + (v_product.sell_price * (v_item->>'quantity')::integer);
  end loop;
  
  -- Calculate discount and total
  v_discount_amount := v_subtotal * p_discount_percent / 100;
  v_total := v_subtotal - v_discount_amount;
  
  -- Calculate change
  if p_payment_method = 'CASH' and p_paid_amount is not null then
    if p_paid_amount < v_total then
      return jsonb_build_object('success', false, 'error', 'Pembayaran kurang');
    end if;
    v_change := p_paid_amount - v_total;
  end if;
  
  -- Create sale
  insert into sales (
    invoice_number,
    customer_id,
    cashier_id,
    subtotal,
    discount_percent,
    discount_amount,
    total,
    payment_method,
    payment_status,
    paid_amount,
    change_amount,
    notes
  ) values (
    v_invoice_number,
    p_customer_id,
    p_cashier_id,
    v_subtotal,
    p_discount_percent,
    v_discount_amount,
    v_total,
    p_payment_method,
    'PAID',
    p_paid_amount,
    v_change,
    coalesce('idempotency:' || p_idempotency_key, '')
  ) returning id into v_sale_id;
  
  -- Create sale items and update stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from products where id = (v_item->>'product_id')::uuid;
    
    -- Insert sale item
    insert into sale_items (
      sale_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      subtotal
    ) values (
      v_sale_id,
      v_product.id,
      v_product.name,
      (v_item->>'quantity')::integer,
      v_product.sell_price,
      v_product.sell_price * (v_item->>'quantity')::integer
    );
    
    -- Update stock
    update products 
    set stock = stock - (v_item->>'quantity')::integer,
        updated_at = now()
    where id = v_product.id;
    
    -- Record inventory movement
    insert into inventory_movements (
      product_id,
      movement_type,
      quantity,
      stock_before,
      stock_after,
      reference_id,
      reason,
      created_by
    ) values (
      v_product.id,
      'SALE',
      -(v_item->>'quantity')::integer,
      v_product.stock,
      v_product.stock - (v_item->>'quantity')::integer,
      v_sale_id,
      'Penjualan ' || v_invoice_number,
      p_cashier_id
    );
  end loop;
  
  return jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'invoice_number', v_invoice_number,
    'total', v_total,
    'change', v_change
  );
end;
$$ language plpgsql security definer;

-- Sequence for invoice numbers
create sequence if not exists invoice_seq start 1;

-- Grant execute permissions (ponytail: more granular permissions when needed)
grant execute on function start_computer_session to authenticated;
grant execute on function stop_computer_session to authenticated;
grant execute on function process_pos_checkout to authenticated;
