import { createClient } from '@supabase/supabase-js'

// Admin client hanya hidup di server — service_role key TIDAK pernah ke browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  // Parse body — jaga dari body kosong / bukan JSON
  let body: Record<string, string>
  try {
    const text = await request.text()
    if (!text) {
      return Response.json({ error: 'Request body kosong.' }, { status: 400 })
    }
    body = JSON.parse(text)
  } catch {
    return Response.json({ error: 'Format request tidak valid.' }, { status: 400 })
  }

  const { email, password, full_name, username, phone } = body

  if (!email || !password || !full_name) {
    return Response.json(
      { error: 'Email, password, dan nama lengkap wajib diisi.' },
      { status: 400 }
    )
  }
  if (password.length < 6) {
    return Response.json(
      { error: 'Password minimal 6 karakter.' },
      { status: 400 }
    )
  }

  const normalizedEmail = email.trim().toLowerCase()

  // Buat user via Admin API — email_confirm: true → langsung verified
  const { data: createData, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        username: username?.trim() ?? '',
        phone: phone?.trim() ?? '',
      },
    })

  if (createError) {
    const msg = createError.message ?? ''
    if (
      msg.toLowerCase().includes('already registered') ||
      msg.toLowerCase().includes('already been registered') ||
      msg.toLowerCase().includes('user already exists')
    ) {
      return Response.json(
        { error: 'Email sudah terdaftar. Silakan login atau gunakan fitur lupa password.' },
        { status: 409 }
      )
    }
    console.error('[register] createUser error:', createError)
    return Response.json({ error: msg || 'Gagal membuat akun.' }, { status: 400 })
  }

  const userId = createData.user?.id
  if (!userId) {
    return Response.json({ error: 'Gagal membuat akun.' }, { status: 500 })
  }

  // Tunggu trigger handle_new_user() (max 2 detik, 4x500ms)
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

  // Fallback: insert manual jika trigger belum jalan
  if (!profile) {
    console.warn('[register] trigger slow/failed, inserting manually for', userId)
    const memberNum = 'MBR-' + String(Date.now()).slice(-8).padStart(8, '0')

    const { error: profErr } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      email: normalizedEmail,
      full_name: full_name.trim(),
      username: username?.trim() || null,
      phone: phone?.trim() || null,
      role: 'CUSTOMER',
    })

    if (profErr && profErr.code !== '23505') {
      console.error('[register] manual profile insert error:', profErr)
      return Response.json(
        { error: 'Akun dibuat tetapi profil gagal disimpan. Hubungi administrator.' },
        { status: 500 }
      )
    }

    const { error: custErr } = await supabaseAdmin
      .from('customers')
      .insert({ id: userId, member_number: memberNum })
    if (custErr && custErr.code !== '23505') {
      console.error('[register] manual customer insert error:', custErr)
    }
  }

  return Response.json({ success: true, userId }, { status: 201 })
}
