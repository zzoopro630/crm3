import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

    return (
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
            <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

            {/* Main content area */}
            <div className="lg:ml-64 min-h-screen flex flex-col">
                <Header onSidebarToggle={toggleSidebar} />

                <main className="flex-1 p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
