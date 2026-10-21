import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Admin client hanya hidup di server — service_role key TIDAK pernah ke browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    const { email, password, full_name, username, phone } = await request.json()

    // --- Validasi input minimal ---
    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, password, dan nama lengkap wajib diisi.' },
        { status: 400 }
      )
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter.' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    // --- Buat user via Admin API ---
    // email_confirm: true → langsung verified, tidak perlu klik link
    const { data: createData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,           // ← auto-verifikasi
        user_metadata: {
          full_name: full_name.trim(),
          username: username?.trim() ?? '',
          phone: phone?.trim() ?? '',
        },
      })

    if (createError) {
      // Email sudah terdaftar → pesan ramah
      if (
        createError.message?.toLowerCase().includes('already registered') ||
        createError.message?.toLowerCase().includes('already been registered') ||
        createError.message?.toLowerCase().includes('user already exists')
      ) {
        return NextResponse.json(
          { error: 'Email sudah terdaftar. Silakan login atau gunakan fitur lupa password.' },
          { status: 409 }
        )
      }
      console.error('[register] createUser error:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    const userId = createData.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Gagal membuat akun.' }, { status: 500 })
    }

    // --- Tunggu trigger handle_new_user() selesai (max 2 detik) ---
    // Trigger berjalan async setelah insert di auth.users.
    let profile = null
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 500))
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle()
      if (data) { profile = data; break }
    }

    // Jika trigger gagal, buat profil manual via admin (bypass RLS)
    if (!profile) {
      console.warn('[register] Trigger did not create profile, inserting manually for', userId)

      const memberNum = 'MBR-' + String(Date.now()).slice(-8).padStart(8, '0')

      const { error: profErr } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: normalizedEmail,
          full_name: full_name.trim(),
          username: username?.trim() || null,
          phone: phone?.trim() || null,
          role: 'CUSTOMER',
        })

      if (profErr && profErr.code !== '23505') {
        console.error('[register] manual profile insert error:', profErr)
        return NextResponse.json(
          { error: 'Akun dibuat tetapi profil gagal disimpan. Hubungi administrator.' },
          { status: 500 }
        )
      }

      await supabaseAdmin
        .from('customers')
        .insert({ id: userId, member_number: memberNum })
        .then(({ error }) => {
          if (error && error.code !== '23505')
            console.error('[register] manual customer insert error:', error)
        })
    }

    return NextResponse.json({ success: true, userId }, { status: 201 })
  } catch (err: any) {
    console.error('[register] unexpected error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
