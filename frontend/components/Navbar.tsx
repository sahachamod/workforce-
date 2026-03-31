'use client';

import { Bell, Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';

export function Navbar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

  return (
    <header className="flex h-16 items-center gap-2 md:gap-4 border-b bg-card pl-14 pr-4 md:px-6">
      <div className="flex-1">
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-8"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative rounded-full p-2 hover:bg-accent">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
        </button>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary p-2">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="text-sm">
            <p className="font-medium">{user ? `${user.first_name} ${user.last_name}` : 'Loading...'}</p>
            <p className="text-muted-foreground capitalize">{user ? user.role : ''}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
