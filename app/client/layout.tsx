import DevFooter from '@/app/components/dev-footer'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">{children}</div>
      <DevFooter />
    </div>
  )
}
