import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '@/lib/utils'

export function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
    const toggleSidebarCollapse = () => setSidebarCollapsed(!sidebarCollapsed)

    return (
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
            <Sidebar 
                isOpen={sidebarOpen} 
                onToggle={toggleSidebar}
                isCollapsed={sidebarCollapsed}
                onCollapseToggle={toggleSidebarCollapse}
            />

            {/* Main content area */}
            <div className={cn(
                'min-h-screen flex flex-col transition-all duration-300',
                sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
            )}>
                <Header onSidebarToggle={toggleSidebar} />

                <main className="flex-1 p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
