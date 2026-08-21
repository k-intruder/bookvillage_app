import { supabaseAdmin } from '@/lib/supabase/admin'

async function getJellySettingValue(key: string, defaultValue: number): Promise<number> {
  const { data } = await supabaseAdmin
    .from('library_settings')
    .select('value')
    .eq('key', key)
    .single()

  return data ? parseInt(data.value, 10) || defaultValue : defaultValue
}

async function changeJelly(
  userId: string,
  amount: number,
  reason: string,
  description?: string,
  bookId?: string,
  allowPartialDeduction = false
) {
  if (!Number.isInteger(amount) || amount === 0) return

  const { error } = await supabaseAdmin.rpc('change_jelly_balance', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_description: description ?? null,
    p_book_id: bookId ?? null,
    p_allow_partial_deduction: allowPartialDeduction,
  })

  if (error) throw new Error(`젤리 변경 실패: ${error.message}`)
}

export async function awardJellyForCheckout(userId: string, bookTitle: string, bookId: string) {
  const amount = await getJellySettingValue('jelly_checkout', 5)
  if (amount > 0) await changeJelly(userId, amount, 'checkout', bookTitle, bookId)
}

export async function awardJellyForReturn(userId: string, bookTitle: string, bookId: string) {
  const amount = await getJellySettingValue('jelly_return', 5)
  if (amount > 0) await changeJelly(userId, amount, 'return', bookTitle, bookId)
}

export async function awardJellyForCancel(userId: string, bookTitle: string, bookId: string) {
  const amount = await getJellySettingValue('jelly_checkout', 5)
  if (amount > 0) await changeJelly(userId, -amount, 'checkout_cancel', bookTitle, bookId, true)
}

export async function awardJellyForReport(userId: string, bookTitle: string, bookId: string) {
  const amount = await getJellySettingValue('jelly_report', 10)
  if (amount > 0) await changeJelly(userId, amount, 'report', bookTitle, bookId)
}

export async function awardJellyForQuiz(userId: string, bookTitle: string, bookId: string) {
  const amount = await getJellySettingValue('jelly_quiz', 3)
  if (amount > 0) await changeJelly(userId, amount, 'quiz', bookTitle, bookId)
}

export async function changeJellyByAdmin(
  userId: string,
  amount: number,
  reason: 'admin_give' | 'admin_deduct',
  description: string
) {
  await changeJelly(userId, amount, reason, description)
}
