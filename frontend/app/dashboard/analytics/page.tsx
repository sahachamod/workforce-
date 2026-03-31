'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { analyticsApi } from '@/lib/api';
import { 
  Download,
  TrendingUp,
  TrendingDown,
  Clock,
  Loader2,
  Calendar,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  Target
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell, AreaChart, Area 
} from 'recharts';

const defaultProductivityTrend = [
  { month: 'Jan', score: 72 },
  { month: 'Feb', score: 75 },
  { month: 'Mar', score: 78 },
  { month: 'Apr', score: 74 },
  { month: 'May', score: 82 },
  { month: 'Jun', score: 85 },
];

const defaultAttendanceData = [
  { name: 'Present', value: 85, color: '#10b981' },
  { name: 'Absent', value: 5, color: '#f43f5e' },
  { name: 'Late', value: 7, color: '#f59e0b' },
  { name: 'Leave', value: 3, color: '#6366f1' },
];

const defaultDepartmentPerformance = [
  { department: 'Engineering', productivity: 88, attendance: 92, projects: 12 },
  { department: 'Design', productivity: 85, attendance: 88, projects: 8 },
  { department: 'Marketing', productivity: 78, attendance: 85, projects: 6 },
  { department: 'HR', productivity: 82, attendance: 95, projects: 4 },
  { department: 'Finance', productivity: 90, attendance: 94, projects: 3 },
];

interface DashboardData {
  total_employees?: number;
  average_productivity?: number;
  attendance_rate?: number;
  total_hours?: number;
  leave_utilization?: number;
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('This Month');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [productivityTrend, setProductivityTrend] = useState(defaultProductivityTrend);
  const [attendanceData, setAttendanceData] = useState(defaultAttendanceData);
  const [departmentPerformance, setDepartmentPerformance] = useState(defaultDepartmentPerformance);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [dashboardRes, productivityRes, attendanceRes, deptRes] = await Promise.all([
        analyticsApi.getDashboard(),
        analyticsApi.getProductivityTrend({ range: dateRange }),
        analyticsApi.getAttendanceInsights({ range: dateRange }),
        analyticsApi.getDepartmentPerformance(),
      ]);
      
      setDashboard(dashboardRes.data);
      if (productivityRes.data?.trend) setProductivityTrend(productivityRes.data.trend);
      if (attendanceRes.data) {
        setAttendanceData([
          { name: 'Present', value: attendanceRes.data.present_rate || 85, color: '#10b981' },
          { name: 'Absent', value: attendanceRes.data.absent_rate || 5, color: '#f43f5e' },
          { name: 'Late', value: attendanceRes.data.late_rate || 7, color: '#f59e0b' },
          { name: 'Leave', value: attendanceRes.data.leave_rate || 3, color: '#6366f1' },
        ]);
      }
      if (deptRes.data?.departments) setDepartmentPerformance(deptRes.data.departments);
      
    } catch (err: any) {
      setError('Data synchronization failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Analytics Dashboard
            <BarChart3 className="w-8 h-8 text-primary" />
          </h1>
          <p className="text-muted-foreground">Strategic insights and organizational performance metrics</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select 
              className="pl-9 pr-4 py-2 border rounded-md bg-white text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option>This Week</option>
              <option>This Month</option>
              <option>This Quarter</option>
              <option>This Year</option>
            </select>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4 font-bold" />
            Export Data
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px]">Processing data cubes...</p>
        </div>
      ) : (
        <>
          {/* Key Performance Indicators */}
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
            <Card className="bg-primary text-primary-foreground border-none shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <Target className="w-5 h-5 opacity-70" />
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">Global Score</span>
                </div>
                <div className="text-3xl font-black">{dashboard?.average_productivity || 82}%</div>
                <p className="text-[10px] opacity-70 font-bold mt-2">Avg Productivity</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4 text-emerald-500">
                  <Users className="w-5 h-5" />
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-3xl font-black text-slate-800">{dashboard?.attendance_rate || 95}%</div>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2">Attendance</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4 text-blue-500">
                  <Clock className="w-5 h-5" />
                  <span className="text-[10px] font-black text-blue-500/50">H/MONTH</span>
                </div>
                <div className="text-3xl font-black text-slate-800">{dashboard?.total_hours?.toLocaleString() || '12,450'}</div>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2">Operational Hours</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4 text-amber-500">
                  <Filter className="w-5 h-5" />
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div className="text-3xl font-black text-slate-800">{dashboard?.leave_utilization || 45}%</div>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2">Resource Churn</p>
              </CardContent>
            </Card>

            <Card className="hidden lg:block bg-slate-900 text-white border-none">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <Target className="w-5 h-5 text-indigo-400" />
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                </div>
                <div className="text-3xl font-black">{dashboard?.total_employees || 156}</div>
                <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mt-2">Force Size</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Efficiency Vectors Chart */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div>
                  <CardTitle className="text-lg">Efficiency Vectors</CardTitle>
                  <CardDescription>Longitudinal productivity analysis</CardDescription>
                </div>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={productivityTrend}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}}
                      />
                      <Tooltip 
                         contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}
                         itemStyle={{fontSize: '12px', fontWeight: 'bold', color: '#6366f1'}}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#6366f1" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorScore)" 
                        name="Productivity Index"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Mix Chart */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div>
                  <CardTitle className="text-lg">Attendance Equilibrium</CardTitle>
                  <CardDescription>Distribution of resource connectivity</CardDescription>
                </div>
                <PieChartIcon className="w-5 h-5 text-indigo-500" />
              </CardHeader>
              <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-8">
                <div className="h-[250px] w-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={attendanceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        animationDuration={1500}
                        stroke="none"
                      >
                        {attendanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{borderRadius: '8px', border: 'none'}}
                         itemStyle={{fontSize: '11px', fontWeight: 'bold'}}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-4 w-full">
                  {attendanceData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs font-bold text-slate-600 tracking-tight">{item.name}</span>
                      </div>
                      <span className="text-xs font-black text-slate-800">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Unit Performance */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="border-b pb-6">
              <CardTitle className="text-xl">Tactical Unit Performance</CardTitle>
              <CardDescription>Comparative metrics across organizational departments</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left py-4 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Department Unit</th>
                      <th className="text-left py-4 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Efficiency Index</th>
                      <th className="text-left py-4 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Connectivity Rate</th>
                      <th className="text-right py-4 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Active Pipeline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {departmentPerformance.map((dept) => (
                      <tr key={dept.department} className="hover:bg-primary/[0.02] transition-colors group">
                        <td className="py-5 px-8 font-black text-slate-800 text-sm">{dept.department}</td>
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                              <div 
                                className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-1000"
                                style={{ width: `${dept.productivity}%` }}
                              />
                            </div>
                            <span className="text-xs font-black text-slate-700">{dept.productivity}%</span>
                          </div>
                        </td>
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                              <div 
                                className="h-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.3)] transition-all duration-1000"
                                style={{ width: `${dept.attendance}%` }}
                              />
                            </div>
                            <span className="text-xs font-black text-slate-700">{dept.attendance}%</span>
                          </div>
                        </td>
                        <td className="py-5 px-8 text-right">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black">
                            {dept.projects} OPS
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}