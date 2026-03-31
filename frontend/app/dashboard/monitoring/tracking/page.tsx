'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { monitoringApi } from '@/lib/api';
import { 
  ArrowLeft,
  Search,
  Loader2,
  Calendar,
  ActivitySquare,
  RefreshCcw,
  MousePointer2,
  Keyboard,
  Clock,
  Trash2,
  CheckCircle2,
  XCircle,
  BarChart3,
  LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { userApi } from '@/lib/api';

interface ActivityLog {
  id: number;
  user_id: string;
  activity_type: string;
  app_name: string | null;
  window_title: string | null;
  url: string | null;
  duration_seconds: number;
  keystrokes: number;
  mouse_clicks: number;
  is_productive: boolean;
  start_time: string;
  end_time: string;
}

export default function TrackingDataPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Dialog States
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchActivities();
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        if (userObj.role === 'admin' || userObj.role === 'manager') {
          setIsAdmin(true);
        }
      } catch (e) {}
    }
  }, [selectedDate]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await monitoringApi.getActivities({ date: selectedDate });
      const data = Array.isArray(res.data) ? res.data : (res.data.activities || []);
      setActivities(data);
    } catch (error) {
      console.error('Failed to fetch tracking data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProductivity = async (act: ActivityLog, e: React.MouseEvent | React.ChangeEvent) => {
    if (e && e.stopPropagation) e.stopPropagation(); // Don't open detail dialog
    try {
      const newStatus = !act.is_productive;
      await monitoringApi.updateActivity(String(act.id), { is_productive: newStatus });
      
      // Update local state
      setActivities(prev => prev.map(a => 
        a.id === act.id ? { ...a, is_productive: newStatus } : a
      ));
      
      toast.success(newStatus ? 'Activity marked as productive' : 'Activity marked as non-productive');
    } catch (err) {
      toast.error('Failed to update productivity status');
    }
  };

  const handleRowClick = (act: ActivityLog) => {
    setSelectedActivity(act);
    setIsDetailOpen(true);
  };

  const handleDeleteActivities = () => {
    setConfirmOpen(true);
  };

  const proceedWithDeletion = async () => {
    try {
      await monitoringApi.deleteAllActivities();
      toast.success('All activity logs have been permanently deleted.');
      fetchActivities();
    } catch (err) {
      toast.error('Failed to delete activity logs.');
    }
  };

  const filteredActivities = activities.filter(act => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (act.app_name && act.app_name.toLowerCase().includes(searchLower)) ||
      (act.window_title && act.window_title.toLowerCase().includes(searchLower)) ||
      (act.activity_type.toLowerCase().includes(searchLower))
    );
  });

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
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
              Raw Tracking Data
              {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            </h1>
            <p className="text-muted-foreground">Deep inspection of individual activity telemetry</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-3 bg-white p-1 rounded-lg border shadow-sm">
            <Input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40 border-none shadow-none h-9 text-xs font-bold focus-visible:ring-0"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={fetchActivities}>
              <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Link href="/dashboard/monitoring/tracking/productivity">
              <Button variant="default" size="sm" className="h-8 gap-2 bg-indigo-600 hover:bg-indigo-700">
                <BarChart3 className="w-3.5 h-3.5" />
                Productivity Metrics
              </Button>
            </Link>
            <Link href="/dashboard/monitoring/tracking/apps">
              <Button variant="outline" size="sm" className="h-8 gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                <LayoutGrid className="w-3.5 h-3.5" />
                App Breakdown
              </Button>
            </Link>
          </div>
          {isAdmin && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteActivities} 
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Tracking Data
            </Button>
          )}
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <CardTitle className="text-lg">Activity Packets</CardTitle>
            <CardDescription>Granular logs of application usage and input frequency</CardDescription>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by app, title or type..."
              className="pl-9 h-9 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b">
                  <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Telemetry Data</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Status Vector</th>
                  <th className="text-left py-3 px-6 text-[10px] font-black uppercase text-slate-500">Duration</th>
                  <th className="text-left py-3 px-6 text-[10px] font-black uppercase text-slate-500">Input Heat</th>
                  <th className="text-left py-3 px-6 text-[10px] font-black uppercase text-slate-500">Productivity</th>
                  <th className="text-left py-3 px-6 text-[10px] font-black uppercase text-slate-500">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y relative">
                {loading && activities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50 mb-4" />
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Querying database...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed">
                        <ActivitySquare className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-bold">No telemetry packets found</p>
                      <p className="text-xs text-slate-400">Try modifying the date search parameters</p>
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((act) => (
                    <tr 
                      key={act.id} 
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(act)}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                            {act.app_name ? act.app_name[0].toUpperCase() : '?'}
                          </div>
                          <div className="max-w-[200px] md:max-w-xs xl:max-w-sm">
                            <p className="text-sm font-black text-slate-800 truncate">{act.app_name || 'System Interface'}</p>
                            <p className="text-[10px] font-bold text-slate-400 truncate">{act.window_title || act.url || 'No context'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${
                          act.activity_type.toLowerCase() === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {act.activity_type}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatDuration(act.duration_seconds)}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5" title="Keystrokes">
                            <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-black text-slate-600">{act.keystrokes}</span>
                          </div>
                          <div className="flex items-center gap-1.5" title="Mouse Clicks">
                            <MousePointer2 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-black text-slate-600">{act.mouse_clicks}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={act.is_productive}
                            onChange={(e) => handleToggleProductivity(act, e)}
                          />
                          <span className={`text-[10px] font-bold uppercase tracking-tighter ${act.is_productive ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {act.is_productive ? 'Productive' : 'Non-Prod'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div>
                          <p className="text-xs font-black text-slate-700">{new Date(act.start_time).toLocaleTimeString()}</p>
                          <p className="text-[10px] font-bold text-slate-400">{new Date(act.start_time).toLocaleDateString()}</p>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all tracking activity logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { proceedWithDeletion(); setConfirmOpen(false); }}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <ActivitySquare className="w-5 h-5 text-primary" />
              Activity Packet Details
            </DialogTitle>
            <DialogDescription>Full telemetry dump for the selected interaction</DialogDescription>
          </DialogHeader>

          {selectedActivity && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Application</p>
                  <p className="text-lg font-black text-slate-800">{selectedActivity.app_name || 'System Interface'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Activity Class</p>
                  <p className={`text-sm font-black uppercase tracking-tighter ${selectedActivity.is_productive ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {selectedActivity.is_productive ? '✓ Productive' : '✗ Non-Productive'}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400">Status Vector</p>
                <div className="flex">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${
                    selectedActivity.activity_type.toLowerCase() === 'active' 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                    {selectedActivity.activity_type}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400">Window / URL Context</p>
                <div className="p-3 bg-slate-50 rounded-md border text-sm font-medium text-slate-700 break-all leading-relaxed shadow-inner">
                  {selectedActivity.window_title || selectedActivity.url || 'No active context captured'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border text-center">
                  <Clock className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Duration</p>
                  <p className="text-xl font-black text-slate-800">{formatDuration(selectedActivity.duration_seconds)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border text-center">
                  <Keyboard className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Keystrokes</p>
                  <p className="text-xl font-black text-slate-800">{selectedActivity.keystrokes || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border text-center">
                  <MousePointer2 className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Clicks</p>
                  <p className="text-xl font-black text-slate-800">{selectedActivity.mouse_clicks || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Started: {new Date(selectedActivity.start_time).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Ended: {new Date(selectedActivity.end_time).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
