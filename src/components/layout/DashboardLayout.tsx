import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumb } from './Breadcrumb'
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

                {/* 모바일 브레드크럼 */}
                <div className="lg:hidden px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <Breadcrumb />
                </div>

                <main className="flex-1 p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
