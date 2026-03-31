'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { monitoringApi } from '@/lib/api';
import { 
  Search, 
  AlertTriangle,
  Users,
  MoreHorizontal,
  EyeOff,
  Camera,
  Loader2,
  TrendingUp,
  Clock,
  Activity,
  ShieldCheck,
  RefreshCcw,
  ExternalLink,
  Calendar,
  Filter,
  Download,
  Maximize2
} from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { userApi } from '@/lib/api';

const defaultActivityData = [
  { time: '08:00', productive: 45, neutral: 5, unproductive: 2 },
  { time: '10:00', productive: 88, neutral: 8, unproductive: 4 },
  { time: '12:00', productive: 65, neutral: 25, unproductive: 10 },
  { time: '14:00', productive: 92, neutral: 5, unproductive: 3 },
  { time: '16:00', productive: 78, neutral: 12, unproductive: 10 },
  { time: '18:00', productive: 50, neutral: 15, unproductive: 35 },
];

interface EmployeeActivity {
  id: number;
  first_name: string;
  last_name: string;
  department?: string;
  status: string;
  productivity_score?: number;
  idle_time_minutes?: number;
  last_activity_at?: string;
  current_app?: string;
}

interface Screenshot {
  id: string;
  user_id: string;
  filename: string;
  filepath: string;
  taken_at: string;
  productivity_score?: number;
  user_name?: string;
  department_name?: string;
}

interface ActivitySummary {
  total_employees: number;
  active_employees: number;
  idle_employees: number;
  average_productivity: number;
  average_active_hours: number;
}

export default function MonitoringPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activityData, setActivityData] = useState(defaultActivityData);
  const [appUsage, setAppUsage] = useState<any[]>([]);
  const [employees, setEmployees] = useState<EmployeeActivity[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [summaryRes, activitiesRes, appUsageRes] = await Promise.all([
        monitoringApi.getSummary(),
        monitoringApi.getActivities({ limit: 50 }),
        monitoringApi.getAppUsage(),
      ]);
      
      setSummary(summaryRes.data);
      setEmployees(Array.isArray(activitiesRes.data) ? activitiesRes.data : (activitiesRes.data.activities || []));
      setAppUsage(Array.isArray(appUsageRes.data) ? appUsageRes.data : (appUsageRes.data.apps || []));
      
    } catch (err: any) {
      toast.error('Monitoring stream disconnected. Retrying...');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'idle': return 'bg-amber-100 text-amber-700';
      case 'away': return 'bg-slate-100 text-slate-700';
      case 'offline': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || emp.department?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Employee Monitoring
            {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          </h1>
          <p className="text-muted-foreground">Real-time productivity analytics and activity tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </Button>

          <Link href="/dashboard/monitoring/snapshots">
            <Button 
              variant="default" 
              size="sm" 
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              <Camera className="w-4 h-4" />
              Snapshots
            </Button>
          </Link>

          <Link href="/dashboard/monitoring/tracking">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 bg-card font-bold border-primary text-primary"
            >
              <Activity className="w-4 h-4" />
              Tracking Data
            </Button>
          </Link>

          <Button size="sm" className="bg-primary hover:bg-primary/90 gap-2">

            <ShieldCheck className="w-4 h-4" />
            Policy Manager
          </Button>
        </div>
      </div>

      {/* Real-time Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              Pulse: Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.active_employees || 0}</div>
            <p className="text-[10px] text-muted-foreground">Employees currently active</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{summary?.average_productivity || 0}%</div>
            <p className="text-[10px] text-muted-foreground">Average across all teams</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Idle State
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{summary?.idle_employees || 0}</div>
            <p className="text-[10px] text-muted-foreground">Attention may be required</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Headcount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_employees || 0}</div>
            <p className="text-[10px] text-muted-foreground">Total monitored resources</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Productivity Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Productivity Momentum</CardTitle>
            <CardDescription>Visualizing organization-wide output trends today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#64748b'}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#64748b'}}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                    itemStyle={{fontSize: '12px', fontWeight: '600'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="productive" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorProd)" 
                    name="Productive Engagement"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Apps Break-down */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Engagement Hubs</CardTitle>
            <CardDescription>Most utilized software platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {appUsage.length > 0 ? appUsage.slice(0, 6).map((app, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                        {app.app[0]}
                      </div>
                      <span className="text-xs font-bold text-slate-700">{app.app}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{app.hours}h</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${app.percentage || (app.hours / 8) * 100}%` }}
                    />
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 opacity-20" />
                  <p className="text-xs">Analyzing usage packets...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Activity Table */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div>
            <CardTitle className="text-xl">Resource Activity Stream</CardTitle>
            <CardDescription>Live feed of employee digital engagement</CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or department..."
              className="pl-9 bg-slate-50 border-none shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b">
                  <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">Employee Profile</th>
                  <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">Connectivity</th>
                  <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">Efficiency Score</th>
                  <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">Current App</th>
                  <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">Last Pulse</th>
                  <th className="text-right py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">Tactical</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 text-xs font-bold">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{emp.first_name} {emp.last_name}</p>
                          <p className="text-[10px] font-medium text-slate-400">{emp.department || 'General'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${getStatusColor(emp.status)}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              (emp.productivity_score || 0) >= 80 ? 'bg-emerald-500' :
                              (emp.productivity_score || 0) >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${emp.productivity_score || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-slate-700">{emp.productivity_score || 0}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary/40 animate-ping" />
                        <span className="text-xs font-medium text-slate-600 truncate max-w-[120px]">{emp.current_app || 'System Process'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs font-bold text-slate-400">{emp.last_activity_at || 'Just now'}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/dashboard/monitoring/snapshots?user_id=${emp.id}`}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                            title="View Snapshots"
                          >
                            <Camera className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEmployees.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold">No active monitors match your criteria</p>
              <p className="text-xs text-slate-400">Try adjusting your filters or expanding your search scope</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}