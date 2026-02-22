'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'
import { loginAction, signupAction } from './actions'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

export function LoginForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [isPending, startTransition] = useTransition()

  const emailInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    emailInputRef.current?.focus()
  }, [mode])

  function switchMode() {
    setMode(m => (m === 'login' ? 'signup' : 'login'))
    setServerError('')
    setSignupSuccess(false)
    reset()
  }

  function onSubmit(data: FormValues) {
    setServerError('')
    startTransition(async () => {
      if (mode === 'login') {
        const error = await loginAction(data.email, data.password)
        if (error) setServerError(error)
      } else {
        const error = await signupAction(data.email, data.password)
        if (error) {
          setServerError(error)
        } else {
          setSubmittedEmail(data.email)
          setSignupSuccess(true)
        }
      }
    })
  }

  const { ref: emailRhfRef, ...emailRest } = register('email')

  if (signupSuccess) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-sm opacity-60">
          We sent a confirmation link to <strong>{submittedEmail}</strong>.
          Click it to activate your account.
        </p>
        <button onClick={switchMode} className="text-sm underline opacity-60 hover:opacity-100">
          Back to login
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-center">
        {mode === 'login' ? 'Welcome back' : 'Create account'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          disabled={isPending}
          error={errors.email?.message}
          {...emailRest}
          ref={(el) => {
            emailRhfRef(el)
            emailInputRef.current = el
          }}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          disabled={isPending}
          error={errors.password?.message}
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="text-xs opacity-60 hover:opacity-100"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          }
          {...register('password')}
        />

        {serverError && (
          <p role="alert" className="text-sm text-red-500">
            {serverError}
          </p>
        )}

        <Button type="submit" loading={isPending}>
          {mode === 'login' ? 'Log in' : 'Sign up'}
        </Button>
      </form>

      <p className="text-sm text-center opacity-60">
        {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button onClick={switchMode} className="underline hover:opacity-100">
          {mode === 'login' ? 'Sign up' : 'Log in'}
        </button>
      </p>
    </div>
  )
}
