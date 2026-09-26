import type { ButtonHTMLAttributes } from 'react'

export default function PrimaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-sun-dark bg-sun py-4 font-bold text-ink
        shadow-md transition active:translate-y-0.5 active:border-b-0
        disabled:border-sand disabled:bg-butter disabled:text-ink/40 disabled:shadow-none ${className}`}
    />
  )
}
