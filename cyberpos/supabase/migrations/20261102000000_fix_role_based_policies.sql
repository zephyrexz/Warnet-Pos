-- Add missing RLS policies for better role-based access control

-- Update product categories policies to restrict CASHIER from managing
DROP POLICY IF EXISTS "Staff can manage categories" ON product_categories;
DROP POLICY IF EXISTS "Staff can update categories" ON product_categories;

CREATE POLICY "Admin can manage categories" ON product_categories 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
  );

CREATE POLICY "Admin can update categories" ON product_categories 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
  );

-- Update products policies to restrict CASHIER from managing
DROP POLICY IF EXISTS "Staff can manage products" ON products;
DROP POLICY IF EXISTS "Staff can update products" ON products;

CREATE POLICY "Admin can manage products" ON products 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
  );

CREATE POLICY "Admin can update products" ON products 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
  );

-- Update computers policies
DROP POLICY IF EXISTS "Staff can manage computers" ON computers;
DROP POLICY IF EXISTS "Staff can update computers" ON computers;

CREATE POLICY "Admin can manage computers" ON computers 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
  );

CREATE POLICY "Admin and tech can update computers" ON computers 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('OWNER', 'ADMIN', 'TECHNICIAN'))
  );

-- Update inventory movements policies to restrict CASHIER
DROP POLICY IF EXISTS "Staff can create movements" ON inventory_movements;

CREATE POLICY "Admin can create movements" ON inventory_movements 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
  );

-- Cashier can only view movements, not create manual adjustments
CREATE POLICY "Cashier can view movements" ON inventory_movements 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CASHIER')
  );

-- Update suppliers policies
DROP POLICY IF EXISTS "Staff can view suppliers" ON suppliers;

CREATE POLICY "Admin and owner can view suppliers" ON suppliers 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
  );

-- Add policy for technicians to view computers
CREATE POLICY "Technicians can view computers" ON computers 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'TECHNICIAN')
  );

-- Ensure cashiers cannot view expenses
DROP POLICY IF EXISTS "Staff can view expenses" ON expenses;

CREATE POLICY "Admin can view expenses" ON expenses 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
  );

CREATE POLICY "Admin can create expenses" ON expenses 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
  );

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_computer_sessions_computer_id ON computer_sessions(computer_id);
CREATE INDEX IF NOT EXISTS idx_computer_sessions_started_at ON computer_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);

-- Add function to prevent negative stock
CREATE OR REPLACE FUNCTION check_stock_not_negative()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock < 0 THEN
    RAISE EXCEPTION 'Stock cannot be negative for product %', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_negative_stock ON products;
CREATE TRIGGER prevent_negative_stock
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_stock_not_negative();
