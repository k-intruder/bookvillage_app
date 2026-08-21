'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/app/actions/auth'
import { changeJellyByAdmin } from '@/lib/jelly'
import { isApprovedAdmin } from '@/lib/authorization'
import type { ActionResult } from '@/types'

export async function getMyJelly() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { balance: 0, total_earned: 0 }

  const { data } = await supabase
    .from('jelly_balances')
    .select('balance, total_earned')
    .eq('user_id', user.id)
    .single()

  return data ?? { balance: 0, total_earned: 0 }
}

export async function getMyJellyHistory(limit = 30) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('jelly_history')
    .select('id, amount, reason, description, book_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!data || data.length === 0) return []

  // book_id가 있는 항목의 도서 제목 조회
  const bookIds = [...new Set(data.filter((h) => h.book_id).map((h) => h.book_id!))]
  let bookMap: Record<string, string> = {}

  if (bookIds.length > 0) {
    const { data: books } = await supabase
      .from('books')
      .select('id, title')
      .in('id', bookIds)

    if (books) {
      bookMap = Object.fromEntries(books.map((b) => [b.id, b.title]))
    }
  }

  return data.map((h) => ({
    id: h.id,
    amount: h.amount,
    reason: h.reason,
    description: h.description,
    book_title: h.book_id ? bookMap[h.book_id] ?? null : null,
    created_at: h.created_at,
  }))
}
export async function getJellyRanking(limit = 10) {
  const user = await getCurrentUser()
  if (!isApprovedAdmin(user)) return []

  const { data } = await supabaseAdmin
    .from('jelly_balances')
    .select('user_id, balance, total_earned')
    .order('total_earned', { ascending: false })
    .limit(limit)

  if (!data || data.length === 0) return []

  const userIds = data.map((d) => d.user_id)
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name, dong_ho')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

  return data.map((d) => ({
    user_id: d.user_id,
    name: profileMap[d.user_id]?.name ?? '알 수 없음',
    dong_ho: profileMap[d.user_id]?.dong_ho ?? '',
    balance: d.balance,
    total_earned: d.total_earned,
  }))
}
export async function getJellyRankingByPeriod(startDate: string, endDate: string, limit = 50) {
  const user = await getCurrentUser()
  if (!isApprovedAdmin(user)) return []

  const { data } = await supabaseAdmin
    .from('jelly_history')
    .select('user_id, amount')
    .gt('amount', 0)
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59')

  if (!data || data.length === 0) return []

  const userTotals = new Map<string, number>()
  for (const h of data) {
    userTotals.set(h.user_id, (userTotals.get(h.user_id) ?? 0) + h.amount)
  }

  const sorted = [...userTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  const userIds = sorted.map(([id]) => id)
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name, dong_ho')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

  return sorted.map(([userId, total]) => ({
    user_id: userId,
    name: profileMap[userId]?.name ?? '알 수 없음',
    dong_ho: profileMap[userId]?.dong_ho ?? '',
    earned: total,
  }))
}

export async function adminGiveJelly(userId: string, amount: number, description: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!isApprovedAdmin(user)) return { success: false, error: '권한이 없습니다.' }

  if (amount <= 0) return { success: false, error: '지급 수량은 1 이상이어야 합니다.' }

  await changeJellyByAdmin(userId, amount, 'admin_give', description)
  return { success: true }
}

export async function adminDeductJelly(userId: string, amount: number, description: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!isApprovedAdmin(user)) return { success: false, error: '권한이 없습니다.' }

  if (amount <= 0) return { success: false, error: '차감 수량은 1 이상이어야 합니다.' }

  // 현재 잔액 확인
  const { data: balance } = await supabaseAdmin
    .from('jelly_balances')
    .select('balance')
    .eq('user_id', userId)
    .single()

  if (!balance || balance.balance < amount) {
    return { success: false, error: '잔액이 부족합니다.' }
  }

  await changeJellyByAdmin(userId, -amount, 'admin_deduct', description)
  return { success: true }
}

export async function getUserJellyHistory(userId: string, limit = 30) {
  const user = await getCurrentUser()
  if (!isApprovedAdmin(user)) return []

  const { data } = await supabaseAdmin
    .from('jelly_history')
    .select('id, amount, reason, description, book_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!data || data.length === 0) return []

  const bookIds = [...new Set(data.filter((h) => h.book_id).map((h) => h.book_id!))]
  let bookMap: Record<string, string> = {}

  if (bookIds.length > 0) {
    const { data: books } = await supabaseAdmin
      .from('books')
      .select('id, title')
      .in('id', bookIds)

    if (books) {
      bookMap = Object.fromEntries(books.map((b) => [b.id, b.title]))
    }
  }

  return data.map((h) => ({
    id: h.id,
    amount: h.amount,
    reason: h.reason,
    description: h.description,
    book_title: h.book_id ? bookMap[h.book_id] ?? null : null,
    created_at: h.created_at,
  }))
}
