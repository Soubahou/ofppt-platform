import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem('sidebar-collapsed', String(collapsed)) } catch {}
  }, [collapsed])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 min-h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
