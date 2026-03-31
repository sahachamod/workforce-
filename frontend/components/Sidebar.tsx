'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Menu,
  X,
  Users,
  Calendar,
  CalendarClock,
  FolderKanban,
  Monitor,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  CreditCard,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Employees', href: '/dashboard/employees', icon: Users },
  { name: 'Payroll', href: '/dashboard/payroll', icon: CreditCard },
  { name: 'Leaves', href: '/dashboard/leaves', icon: Calendar },
  { name: 'Roster', href: '/dashboard/roster', icon: CalendarClock },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
  { name: 'Monitoring', href: '/dashboard/monitoring', icon: Monitor },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>('employee');
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || 'employee');
      } catch (e) {}
    }
  }, []);

  const filteredNavigation = navigation.filter((item) => {
    if (userRole === 'admin' || userRole === 'manager') return true;
    // Employee sees Dashboard, Leaves, Roster, Projects
    return ['Dashboard', 'Payroll', 'Leaves', 'Roster', 'Projects'].includes(item.name);
  });

  return (
    <>
      <button 
        className="md:hidden fixed top-3 left-4 z-[60] p-2 rounded-md bg-card border shadow-sm text-primary transition-all duration-300 hover:bg-accent"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col transition-transform duration-300 md:relative md:translate-x-0 overflow-y-auto w-full max-w-[16rem]",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-center border-b px-4">
          <h1 className="text-xl font-bold text-primary">Workforce</h1>
        </div>
        <nav className="flex-1 space-y-1 p-4">
        {filteredNavigation.map((item) => {
          const isActive = item.href === '/dashboard' 
            ? pathname === '/dashboard' 
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/dashboard/settings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
    </>
  );
}
