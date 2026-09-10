'use client'

import { FormEvent, useState } from 'react'

export default function InitialSetupPage() {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')

    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const setupSecret = String(form.get('setupSecret') ?? '')
    const payload = {
      username: String(form.get('username') ?? ''),
      password: String(form.get('password') ?? ''),
      name: String(form.get('name') ?? ''),
    }

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${setupSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? `HTTP ${response.status}`)
      }

      setMessage(result.message ?? '관리자 계정이 생성되었습니다.')
      formElement.reset()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '초기 설정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
      <section className="w-full rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">최초 관리자 설정</h1>
        <p className="mt-2 text-sm text-gray-600">
          계정 생성 후 Vercel에서 SETUP_SECRET을 삭제하세요.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            SETUP_SECRET
            <input className="mt-1 w-full rounded-lg border px-3 py-2" name="setupSecret" type="password" required />
          </label>
          <label className="block text-sm font-medium">
            관리자 아이디
            <input className="mt-1 w-full rounded-lg border px-3 py-2" name="username" defaultValue="admin" required />
          </label>
          <label className="block text-sm font-medium">
            관리자 이름
            <input className="mt-1 w-full rounded-lg border px-3 py-2" name="name" defaultValue="관리자" required />
          </label>
          <label className="block text-sm font-medium">
            비밀번호 (12자 이상)
            <input className="mt-1 w-full rounded-lg border px-3 py-2" name="password" type="password" minLength={12} required />
          </label>
          <button
            className="w-full rounded-lg bg-[#553F1C] px-4 py-2 font-semibold text-white disabled:opacity-50"
            type="submit"
            disabled={submitting}
          >
            {submitting ? '생성 중…' : '관리자 생성'}
          </button>
        </form>

        {message && <p className="mt-4 rounded-lg bg-gray-100 p-3 text-sm">{message}</p>}
      </section>
    </main>
  )
}
