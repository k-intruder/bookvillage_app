import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { DEFAULT_BRANDING } from '@/lib/branding'

function hasValidSetupSecret(request: Request, expectedSecret: string) {
  const authorization = request.headers.get('authorization')
  const providedSecret = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''

  const expected = Buffer.from(expectedSecret)
  const provided = Buffer.from(providedSecret)

  return expected.length === provided.length && timingSafeEqual(expected, provided)
}

/**
 * POST /api/setup
 *
 * 최초 설치 시 기본 관리자 계정과 도서관 설정을 생성합니다.
 * 이미 관리자가 존재하면 실행되지 않습니다.
 *
 * Body: { username, password, name }
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const setupSecret = process.env.SETUP_SECRET

  if (!supabaseUrl || !serviceRoleKey || !setupSecret) {
    return NextResponse.json(
      { error: '초기 설정 기능이 비활성화되어 있습니다.' },
      { status: 503 }
    )
  }

  if (!hasValidSetupSecret(request, setupSecret)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  }

  // Vercel에서 request body stream을 나중에 읽을 경우 소실되는
  // 케이스를 피하기 위해 외부 I/O보다 먼저 문자열로 복사한다.
  const rawBody = (await request.text()).replace(/^\uFEFF/, '')
  let body: { username?: string; password?: string; name?: string }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json(
      {
        error: '요청 본문이 올바르지 않습니다.',
        receivedBytes: Buffer.byteLength(rawBody, 'utf8'),
      },
      { status: 400 }
    )
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 이미 관리자가 존재하는지 확인
  const { data: existingAdmins } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('admin_status', 'approved')
    .limit(1)

  if (existingAdmins && existingAdmins.length > 0) {
    return NextResponse.json(
      { error: '이미 관리자가 존재합니다. 초기 설정은 1회만 가능합니다.' },
      { status: 409 }
    )
  }

  const username = body.username?.trim()
  const password = body.password
  const name = body.name?.trim()

  if (!username || !password || !name) {
    return NextResponse.json(
      { error: 'username, password, name은 모두 필수입니다.' },
      { status: 400 }
    )
  }

  if (!/^[a-zA-Z0-9_-]{3,50}$/.test(username)) {
    return NextResponse.json(
      { error: '아이디는 영문, 숫자, 밑줄, 하이픈을 사용해 3~50자로 입력해주세요.' },
      { status: 400 }
    )
  }

  if (password.length < 12) {
    return NextResponse.json(
      { error: '초기 관리자 비밀번호는 12자 이상이어야 합니다.' },
      { status: 400 }
    )
  }

  const email = `${username}@admin.bookvillage.local`

  // 1. Auth 유저 생성
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json(
      { error: `관리자 계정 생성 실패: ${authError.message}` },
      { status: 500 }
    )
  }

  // 2. 프로필 생성 (approved 상태)
  if (authData.user) {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        phone_number: `admin_${username}`,
        name,
        dong_ho: '관리자',
        role: 'admin',
        admin_status: 'approved',
      })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `프로필 생성 실패: ${profileError.message}` },
        { status: 500 }
      )
    }
  }

  // 3. 기본 도서관 설정 확인 및 생성
  const { data: existingSettings } = await supabaseAdmin
    .from('library_settings')
    .select('key')
    .in('key', ['max_rentals', 'rental_days', 'apartment_name', 'logo_url', 'site_type', 'color_theme', 'barcode_prefix'])

  const existingKeys = new Set((existingSettings ?? []).map((s: { key: string }) => s.key))
  const defaultSettings = [
    { key: 'max_rentals', value: '5', description: '1인당 최대 대출 권수' },
    { key: 'rental_days', value: '14', description: '기본 대출 기간 (일)' },
    { key: 'apartment_name', value: DEFAULT_BRANDING.apartmentName, description: '아파트 이름' },
    { key: 'logo_url', value: DEFAULT_BRANDING.logoUrl, description: '도서관 로고 URL' },
    { key: 'site_type', value: 'apartment', description: '사이트 유형 (apartment/school/village)' },
    { key: 'color_theme', value: DEFAULT_BRANDING.themeId, description: '컬러 테마' },
    { key: 'barcode_prefix', value: 'BV', description: '자체 바코드 접두사' },
  ].filter((s) => !existingKeys.has(s.key))

  if (defaultSettings.length > 0) {
    await supabaseAdmin.from('library_settings').insert(defaultSettings)
  }

  return NextResponse.json({
    success: true,
    message: `관리자 '${username}' 계정이 생성되었습니다. /admin/login 에서 로그인하세요.`,
    admin: { username, name },
  })
}
