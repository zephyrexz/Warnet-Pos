-- Fix SELECT policies for staff to view all data including inactive ones

-- Computers
DROP POLICY IF EXISTS "Anyone can view active computers" ON computers;
CREATE POLICY "Public can view active computers" ON computers 
  FOR SELECT USING (is_active = true);
CREATE POLICY "Staff can view all computers" ON computers 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN')
    )
  );

-- Products
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Public can view active products" ON products 
  FOR SELECT USING (is_active = true);
CREATE POLICY "Staff can view all products" ON products 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('OWNER', 'ADMIN', 'CASHIER')
    )
  );

-- Product Categories
DROP POLICY IF EXISTS "Anyone can view active categories" ON product_categories;
CREATE POLICY "Public can view active categories" ON product_categories 
  FOR SELECT USING (is_active = true);
CREATE POLICY "Staff can view all categories" ON product_categories 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('OWNER', 'ADMIN', 'CASHIER')
    )
  );
