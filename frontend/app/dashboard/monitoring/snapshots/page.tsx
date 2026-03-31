'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { monitoringApi, userApi } from '@/lib/api';
import { 
  Camera,
  Loader2,
  Calendar,
  Download,
  Maximize2,
  ArrowLeft,
  Search,
  Users,
  Filter,
  RefreshCcw,
  X,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Screenshot {
  id: number;
  user_id: string;
  filename?: string;
  taken_at: string;
  user_name?: string;
  department_name?: string;
  image_url?: string;
}

export default function SnapshotsPage() {
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get('user_id');

  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>(userIdParam || 'all');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Alert Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; description: string; action: () => void }>({
    title: '',
    description: '',
    action: () => {}
  });

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
    fetchScreenshots();

    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        if (userObj.role === 'admin' || userObj.role === 'manager') {
          setIsAdmin(true);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    fetchScreenshots();
    const interval = setInterval(() => {
      // Background poll without showing the loading spinner
      fetchScreenshots(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedDept, selectedUser, selectedDate]);

  const fetchDepartments = async () => {
    try {
      const res = await userApi.getDepartments();
      setDepartments(res.data);
    } catch (err) {
      console.error('Failed to fetch departments', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await userApi.getUsers({ role: 'employee' });
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  const fetchScreenshots = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const params: any = { 
        date: selectedDate,
        _t: new Date().getTime() // Bypass browser cache
      };
      if (selectedDept !== 'all') params.department_id = selectedDept;
      if (selectedUser !== 'all') params.user_id = selectedUser;
      
      const res = await monitoringApi.getScreenshots(params);
      setScreenshots(res.data);
    } catch (err) {
      console.error('Failed to fetch screenshots', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed', error);
    }
  };

  const handleDeleteAll = () => {
    setConfirmConfig({
      title: 'Delete All Screenshots?',
      description: 'Are you absolutely sure? This action will permanently remove every captured screen and cannot be undone.',
      action: async () => {
        try {
          await monitoringApi.deleteAllScreenshots();
          toast.success('All screenshots have been permanently deleted.');
          fetchScreenshots(true);
        } catch (err) {
          toast.error('Failed to delete screenshots.');
        }
      }
    });
    setConfirmOpen(true);
  };

  const handleDeleteActivities = () => {
    setConfirmConfig({
      title: 'Clear Activity Logs?',
      description: 'This will wipe all raw telemetry data. This is an IRREVERSIBLE process.',
      action: async () => {
        try {
          await monitoringApi.deleteAllActivities();
          toast.success('All activity logs have been permanently deleted.');
        } catch (err) {
          toast.error('Failed to delete activity logs.');
        }
      }
    });
    setConfirmOpen(true);
  };

  const handleDeleteEverything = () => {
    setConfirmConfig({
      title: 'NUCLEAR WIPE: Are you sure?',
      description: 'CRITICAL: This will delete ALL screenshots AND all activity logs for everyone. Do you wish to proceed?',
      action: async () => {
        try {
          await monitoringApi.deleteAllTrackingData();
          toast.success('Total tracking data wipe successful.');
          fetchScreenshots(true);
        } catch (err) {
          toast.error('Failed to wipe data.');
        }
      }
    });
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/monitoring">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              Activity Snapshots
              {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            </h1>
            <p className="text-muted-foreground">Detailed visual activity history and productivity verification</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDeleteAll} className="gap-2 text-red-500 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
                Clear Screens
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchScreenshots(true)} className="gap-2">
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Date</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  type="date" 
                  className="h-9 pl-8 w-[160px] text-xs" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Department</label>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="h-9 w-[180px] text-xs">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Employee</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="h-9 w-[200px] text-xs">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              className="self-end h-9 text-xs" 
              onClick={() => {
                setSelectedDept('all');
                setSelectedUser('all');
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                setSelectedDate(`${year}-${month}-${day}`);
              }}
            >
              Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40">
              <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50 mb-4" />
              <p className="text-sm font-medium text-slate-500">Decrypting snapshot vault...</p>
            </div>
          ) : screenshots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {screenshots.map((snap) => (
                <Card key={snap.id} className="overflow-hidden group border-slate-200 hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                  <div className="relative aspect-video bg-slate-100 overflow-hidden">
                    <img 
                      src={snap.image_url 
                        ? `${process.env.NEXT_PUBLIC_API_URL || ''}${snap.image_url}?token=${typeof window !== 'undefined' ? localStorage.getItem('access_token') : ''}` 
                        : 'https://images.unsplash.com/photo-1586717791821-3f44a563eb4c?q=80&w=400&auto=format&fit=crop'
                      } 
                      alt={`Snapshot by ${snap.user_name}`}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586717791821-3f44a563eb4c?q=80&w=400&auto=format&fit=crop';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="h-8 w-8 rounded-full"
                        onClick={() => setFullscreenImage(snap.image_url 
                          ? `${process.env.NEXT_PUBLIC_API_URL || ''}${snap.image_url}?token=${typeof window !== 'undefined' ? localStorage.getItem('access_token') : ''}` 
                          : 'https://images.unsplash.com/photo-1586717791821-3f44a563eb4c?q=80&w=400&auto=format&fit=crop')}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="h-8 w-8 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (snap.image_url) {
                            const url = `${process.env.NEXT_PUBLIC_API_URL || ''}${snap.image_url}?token=${typeof window !== 'undefined' ? localStorage.getItem('access_token') : ''}`;
                            downloadImage(url, snap.filename || `snapshot_${snap.id}.png`);
                          }
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>

                  </div>
                  <CardContent className="p-4 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{snap.user_name}</h4>
                        <p className="text-[10px] font-medium text-slate-400">{snap.department_name}</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {new Date(snap.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400 font-medium">
                      {new Date(snap.taken_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-40 bg-slate-50 rounded-xl border-2 border-dashed">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Camera className="w-8 h-8 text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No snapshots found</h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">No screen activity was captured for the selected criteria. Ensure monitoring agents are active on client machines.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" 
          onClick={() => setFullscreenImage(null)}
        >
          <img 
            src={fullscreenImage} 
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl" 
            alt="Fullscreen snapshot" 
          />
          <Button 
            className="absolute top-4 right-4 text-white hover:bg-white/20" 
            variant="ghost" 
            size="icon"
            onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }}
          >
            <X className="w-8 h-8" />
          </Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmConfig.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmConfig.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmConfig.action(); setConfirmOpen(false); }}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
