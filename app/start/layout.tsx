import { ClientOnly, Toaster } from '@/components/rc/ui'

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
        <ClientOnly>{children}</ClientOnly>
      </div>
      <Toaster />
    </div>
  )
}
