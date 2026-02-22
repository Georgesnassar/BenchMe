'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/app/lib/supabase-server'

const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password.',
  'Email not confirmed': 'Please confirm your email address before logging in.',
  'User already registered': 'An account with this email already exists. Try logging in.',
  'Email rate limit exceeded': 'Too many attempts. Please wait before trying again.',
  'over_email_send_rate_limit': 'Too many emails sent. Please wait before trying again.',
  'Password should be at least 6 characters': 'Password must be at least 8 characters.',
}

function friendly(raw: string): string {
  return ERROR_MAP[raw] ?? 'Something went wrong. Please try again.'
}

export async function loginAction(email: string, password: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return friendly(error.message)
  redirect('/')
}

export async function signupAction(email: string, password: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) return friendly(error.message)
  return null
}
