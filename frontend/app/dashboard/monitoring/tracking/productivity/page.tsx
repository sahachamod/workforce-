'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { monitoringApi } from '@/lib/api';
import { 
  Activity as ActivitySquare, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface ActivityLog {
  id: number;
  user_id: string;
  activity_type: string;
  app_name: string;
  window_title: string;
  url: string;
  duration_seconds: number;
  is_productive: boolean;
  start_time: string;
}

export default function ProductivityViewPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [activeTab, setActiveTab] = useState<'productive' | 'unproductive'>('productive');

  useEffect(() => {
    fetchActivities();
  }, [selectedDate]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await monitoringApi.getActivities({ date: selectedDate });
      
      // Ensure we explicitly cast values to match our interface
      const data = (res.data || []).map((act: any) => ({
        ...act,
        is_productive: act.is_productive === true || act.is_productive === 1 // Handle both boolean and integer states from DB
      }));
      setActivities(data);
    } catch (err) {
      toast.error('Failed to fetch tracking data');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = activities.filter(act => 
    activeTab === 'productive' ? act.is_productive : !act.is_productive
  );

  const totalProductiveSecs = activities.filter(a => a.is_productive).reduce((acc, curr) => acc + curr.duration_seconds, 0);
  const totalNonProductiveSecs = activities.filter(a => !a.is_productive).reduce((acc, curr) => acc + curr.duration_seconds, 0);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <Link href="/dashboard/monitoring/tracking">
               <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-slate-100">
                  <ChevronLeft className="w-4 h-4" />
               </Button>
             </Link>
             <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Efficiency Intelligence</span>
           </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Productivity Analytics
            <BarChart3 className="w-7 h-7 text-primary" />
          </h1>
          <p className="text-muted-foreground text-sm">Deep inspection of classified work sessions and idle interactions</p>
        </div>

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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card className="border-l-4 border-l-emerald-500 overflow-hidden relative group">
           <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                 <div>
                    <CardTitle className="text-xs font-black uppercase text-emerald-600 tracking-widest mb-1">Productive Time</CardTitle>
                    <CardDescription className="text-2xl font-black text-slate-800">{formatDuration(totalProductiveSecs)}</CardDescription>
                 </div>
                 <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                 </div>
              </div>
           </CardHeader>
           <div className="px-6 pb-4">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                 <div className="bg-emerald-500 h-full" style={{ width: `${(totalProductiveSecs / (totalProductiveSecs + totalNonProductiveSecs || 1)) * 100}%` }}></div>
              </div>
           </div>
         </Card>

         <Card className="border-l-4 border-l-rose-500 overflow-hidden relative group">
           <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                 <div>
                    <CardTitle className="text-xs font-black uppercase text-rose-600 tracking-widest mb-1">Non-Productive</CardTitle>
                    <CardDescription className="text-2xl font-black text-slate-800">{formatDuration(totalNonProductiveSecs)}</CardDescription>
                 </div>
                 <div className="p-3 bg-rose-50 rounded-xl group-hover:scale-110 transition-transform">
                    <TrendingDown className="w-6 h-6 text-rose-500" />
                 </div>
              </div>
           </CardHeader>
           <div className="px-6 pb-4">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                 <div className="bg-rose-500 h-full" style={{ width: `${(totalNonProductiveSecs / (totalProductiveSecs + totalNonProductiveSecs || 1)) * 100}%` }}></div>
              </div>
           </div>
         </Card>
      </div>

      <Card>
        <CardHeader className="p-0 border-b">
           <div className="flex">
              <button 
                onClick={() => setActiveTab('productive')}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === 'productive' 
                  ? 'border-b-4 border-b-emerald-500 bg-emerald-50 text-emerald-700' 
                  : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                   <CheckCircle2 className="w-3.5 h-3.5" />
                   Approved Productive Data ({activities.filter(a => a.is_productive).length})
                </div>
              </button>
              <button 
                onClick={() => setActiveTab('unproductive')}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === 'unproductive' 
                  ? 'border-b-4 border-b-rose-500 bg-rose-50 text-rose-700' 
                  : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                   <XCircle className="w-3.5 h-3.5" />
                   Captured Distractions ({activities.filter(a => !a.is_productive).length})
                </div>
              </button>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
               <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-slate-500">Resource / App</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-slate-500">Engagement</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-slate-500">Duration</th>
                    <th className="text-right py-4 px-6 text-[10px] font-black uppercase text-slate-500">Reference Time</th>
                  </tr>
               </thead>
               <tbody className="divide-y">
                  {loading ? (
                    <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-20" /></td></tr>
                  ) : filteredData.length === 0 ? (
                    <tr><td colSpan={4} className="py-20 text-center text-xs font-bold text-slate-400 uppercase">Empty Data Set</td></tr>
                  ) : (
                    filteredData.map(act => (
                      <tr key={act.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                           <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm ${
                                act.is_productive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                              }`}>
                                 {act.app_name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-slate-800 leading-none">{act.app_name}</p>
                                 <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[250px]">{act.window_title || act.url}</p>
                              </div>
                           </div>
                        </td>
                        <td className="py-4 px-6">
                           <div className="flex items-center gap-1.5 antialiased">
                              <div className={`w-2.5 h-2.5 rounded-full ${act.is_productive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                              <span className="text-[10px] font-black uppercase tracking-tighter text-slate-600">
                                {act.is_productive ? 'High Value' : 'Low Efficiency'}
                              </span>
                           </div>
                        </td>
                        <td className="py-4 px-6 font-mono text-xs font-bold text-slate-700">{formatDuration(act.duration_seconds)}</td>
                        <td className="py-4 px-6 text-right font-bold text-sm text-slate-500">{new Date(act.start_time).toLocaleTimeString()}</td>
                      </tr>
                    ))
                  )}
               </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
