'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { monitoringApi } from '@/lib/api';
import { 
  AppWindow,
  Search, 
  BarChart3,
  Clock, 
  Loader2,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface AppUsage {
  app_name: string;
  total_seconds: number;
  is_productive: boolean;
  usage_count: number;
}

export default function AppSummarizePage() {
  const [appSummary, setAppSummary] = useState<AppUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    fetchAppData();
  }, [selectedDate]);

  const fetchAppData = async () => {
    try {
      setLoading(true);
      const res = await monitoringApi.getActivities({ date: selectedDate });
      
      const data = res.data || [];
      const stats: Record<string, AppUsage> = {};

      data.forEach((act: any) => {
        const app = act.app_name || 'System Interface';
        const isProductive = act.is_productive === true || act.is_productive === 1;
        
        if (!stats[app]) {
          stats[app] = {
            app_name: app,
            total_seconds: 0,
            usage_count: 0,
            is_productive: isProductive
          };
        }
        stats[app].total_seconds += act.duration_seconds;
        stats[app].usage_count += 1;
      });

      const sortedApps = Object.values(stats).sort((a, b) => b.total_seconds - a.total_seconds);
      setAppSummary(sortedApps);
    } catch (err) {
      toast.error('Failed to fetch tool usage data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAppProductivity = async (appName: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await monitoringApi.updateActivitiesByApp(appName, { is_productive: newStatus });
      
      setAppSummary(prev => prev.map(app => 
        app.app_name === appName ? { ...app, is_productive: newStatus } : app
      ));
      
      toast.success(`All activity for ${appName} marked as ${newStatus ? 'productive' : 'non-productive'}`);
    } catch (err) {
      toast.error('Failed to update app productivity');
    }
  };

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
             <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Stack Audit</span>
           </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Tool Usage Summary
            <LayoutGrid className="w-7 h-7 text-primary" />
          </h1>
          <p className="text-muted-foreground text-sm">Most utilized software tools and their organizational classification</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-1 rounded-lg border shadow-sm">
           <Input 
             type="date" 
             value={selectedDate} 
             onChange={(e) => setSelectedDate(e.target.value)}
             className="w-40 border-none shadow-none h-9 text-xs font-bold focus-visible:ring-0"
           />
           <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={fetchAppData}>
              <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {appSummary.slice(0, 3).map((app, i) => (
           <Card key={app.app_name} className="relative overflow-hidden group">
              <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                 <AppWindow className="w-16 h-16" />
              </div>
              <CardHeader className="pb-2">
                 <CardTitle className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Top Tool #{i+1}</CardTitle>
                 <CardDescription className="text-xl font-black text-slate-800 line-clamp-1">{app.app_name}</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="flex justify-between items-end">
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Usage Session Time</p>
                       <p className="text-lg font-black text-primary">{formatDuration(app.total_seconds)}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                       <span className={`text-xs font-black uppercase ${app.is_productive ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {app.is_productive ? 'Productive' : 'Non-Prod'}
                       </span>
                    </div>
                 </div>
              </CardContent>
           </Card>
         ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
           <div>
              <CardTitle className="text-lg">Full Software Stack</CardTitle>
              <CardDescription>Aggregate session time per application detected</CardDescription>
           </div>
           <div className="flex items-center gap-2 text-xs font-bold text-slate-400 pr-4" onClick={(e) => e.stopPropagation()}>
              <span>Bulk Classify Tool Focus</span>
              <Switch 
                checked={appSummary.length > 0 && appSummary.every(a => a.is_productive)}
                onChange={() => {
                  const allStatus = appSummary.every(a => a.is_productive);
                  appSummary.forEach(a => handleToggleAppProductivity(a.app_name, allStatus));
                }}
              />
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
             <table className="w-full">
                <thead className="bg-slate-50">
                   <tr>
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-slate-500">Application Tool</th>
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-slate-500">Classification</th>
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-slate-500">Interaction Cycles</th>
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-slate-500">Aggregate Duration</th>
                      <th className="text-right py-4 px-6 text-[10px] font-black uppercase text-slate-500">Toggle Class</th>
                   </tr>
                </thead>
                <tbody className="divide-y">
                   {loading ? (
                     <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-20" /></td></tr>
                   ) : appSummary.map(app => (
                      <tr key={`${app.app_name}-${selectedDate}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                           <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm border">
                                 {app.app_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-bold text-slate-700">{app.app_name}</span>
                           </div>
                        </td>
                        <td className="py-4 px-6">
                           <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${
                              app.is_productive 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                           }`}>
                              {app.is_productive ? 'Work Tool' : 'Distraction'}
                           </span>
                        </td>
                        <td className="py-4 px-6 text-xs font-bold text-slate-500">{app.usage_count} sessions</td>
                        <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                               <div className="flex-1 max-w-[100px] bg-slate-100 h-1 rounded-full overflow-hidden">
                                  <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, (app.total_seconds / (appSummary[0]?.total_seconds || 1)) * 100)}%` }}></div>
                               </div>
                               <span className="text-xs font-black text-slate-700">{formatDuration(app.total_seconds)}</span>
                            </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                           <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                              <Switch 
                                 checked={app.is_productive}
                                 onChange={() => handleToggleAppProductivity(app.app_name, app.is_productive)}
                                 onClick={() => handleToggleAppProductivity(app.app_name, app.is_productive)}
                              />
                           </div>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
