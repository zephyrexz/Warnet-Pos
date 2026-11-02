# Langkah Manual Supabase untuk Perbaikan CRUD

## PENTING: Jalankan Migration SQL Ini di Supabase SQL Editor

Migration file sudah dibuat di `supabase/migrations/20261102000001_fix_computers_select_policy.sql`

Jika auto-migration tidak berjalan, jalankan SQL berikut secara manual di Supabase Dashboard > SQL Editor:

```sql
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
```

## Verifikasi Setelah Migration

1. Login sebagai ADMIN atau OWNER
2. Buka halaman `/admin/computers`
3. Pastikan daftar komputer muncul
4. Buka halaman `/admin/products`
5. Pastikan daftar produk muncul
6. Buka halaman `/admin/categories`
7. Pastikan daftar kategori muncul

## Masalah yang Diperbaiki

### Root Cause
RLS policy sebelumnya:
- `"Anyone can view active computers"` hanya mengizinkan SELECT jika `is_active = true`
- Tidak ada policy khusus untuk staff melihat semua data (termasuk inactive)
- Query dari admin/owner tetap dibatasi oleh RLS meskipun mereka authenticated

### Solusi
- Split policy menjadi 2: 
  - Public (unauthenticated) hanya lihat data active
  - Staff (authenticated dengan role tertentu) lihat semua data
- Memisahkan concerns: public vs internal operations

## Policy Lain yang Sudah Benar

Policy INSERT, UPDATE, DELETE sudah benar dari migration sebelumnya (20261102000000_fix_role_based_policies.sql):
- OWNER dan ADMIN bisa manage computers, products, categories
- CASHIER tidak bisa manage data master (sudah benar)
- TECHNICIAN bisa update computers untuk maintenance

## Jika Masih Bermasalah

Periksa dengan query berikut di SQL Editor:

```sql
-- Cek policy computers
SELECT * FROM pg_policies WHERE tablename = 'computers';

-- Cek policy products  
SELECT * FROM pg_policies WHERE tablename = 'products';

-- Cek policy product_categories
SELECT * FROM pg_policies WHERE tablename = 'product_categories';

-- Test sebagai staff
SELECT * FROM computers LIMIT 5;
SELECT * FROM products LIMIT 5;
SELECT * FROM product_categories LIMIT 5;
```

Jika query manual berhasil tapi aplikasi tidak:
1. Clear cache Next.js: hapus folder `.next`
2. Restart dev server
3. Hard refresh browser (Ctrl+Shift+R)
4. Cek Network tab untuk error response dari Supabase
