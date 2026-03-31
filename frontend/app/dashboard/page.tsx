'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { userApi, leaveApi, rosterApi, projectApi, monitoringApi } from '@/lib/api';
import {
  Users,
  Calendar,
  FolderKanban,
  TrendingUp,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  Activity,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface DashboardStats {
  total_employees: number;
  active_projects: number;
  pending_leaves: number;
  today_attendance: number;
  productivity_score: number;
}

interface AttendanceDay {
  date: string;
  present: number;
  absent: number;
  late: number;
}

interface PendingLeave {
  id: string;
  user_name: string;
  leave_type: string;
  start_date: string;
  days: number;
}

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  progress: number;
}

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [projectStats, setProjectStats] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceDay[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingLeave[]>([]);
  const [activeProjects, setActiveProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productivitySummary, setProductivitySummary] = useState({ productive: 0, nonProductive: 0 });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserRole(user.role);
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const role = user?.role;

      if (role === 'admin' || role === 'manager') {
        const [usersRes, leavesRes, rosterRes, projectsRes] = await Promise.all([
          userApi.getUsers().catch(() => ({ data: [] })),
          leaveApi.getPending().catch(() => ({ data: [] })),
          rosterApi.getAttendance({ date: new Date().toISOString().split('T')[0] }).catch(() => ({ data: [] })),
          projectApi.getProjects({ status_filter: 'active' }).catch(() => ({ data: [] }))
        ]);

        const employees = Array.isArray(usersRes.data) ? usersRes.data : [];
        const pending = Array.isArray(leavesRes.data) ? leavesRes.data : [];
        const attendance = Array.isArray(rosterRes.data) ? rosterRes.data : [];
        const projectList = Array.isArray(projectsRes.data) ? projectsRes.data : [];

        setStats({
          total_employees: employees.length || 0,
          active_projects: projectList.length || 0,
          pending_leaves: pending.length || 0,
          today_attendance: attendance.length > 0
            ? Math.round((attendance.filter((a: any) => a.status === 'present').length / attendance.length) * 100)
            : 0,
          productivity_score: 84
        });

        // Set other state for admin...
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        setAttendanceTrend(days.map(day => ({
          date: day,
          present: 70 + Math.floor(Math.random() * 25),
          absent: Math.floor(Math.random() * 5),
          late: Math.floor(Math.random() * 10)
        })));

        setPendingApprovals(pending.slice(0, 4).map((l: any) => ({
          id: l.id.toString(),
          user_name: l.user ? `${l.user.first_name} ${l.user.last_name}` : 'Employee',
          leave_type: l.leave_type?.name || 'Annual Leave',
          start_date: l.start_date,
          days: 1
        })));

        setActiveProjects(projectList.slice(0, 4).map((p: any) => ({
          id: p.id.toString(),
          name: p.name,
          status: p.status,
          progress: p.progress || 65
        })));
      } else {
        // Employee specific data
        const [rosterStats, projStats, myProjects] = await Promise.all([
          rosterApi.getMyStats().catch(() => ({ data: null })),
          projectApi.getMyStats().catch(() => ({ data: null })),
          projectApi.getProjects({ my_projects: true }).catch(() => ({ data: [] }))
        ]);

        setUserStats(rosterStats.data);
        setProjectStats(projStats.data);
        setActiveProjects(myProjects.data?.slice(0, 4).map((p: any) => ({
          id: p.id.toString(),
          name: p.name,
          status: p.status,
          progress: p.progress || 75
        })) || []);

        // Fetch Today's Productivity Summary
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        try {
          const monitoringRes = await monitoringApi.getActivities({ date: todayStr });
          const activities = monitoringRes.data || [];
          const productive = activities.filter((a: any) => a.is_productive).reduce((acc: number, curr: any) => acc + curr.duration_seconds, 0);
          const nonProductive = activities.filter((a: any) => !a.is_productive).reduce((acc: number, curr: any) => acc + curr.duration_seconds, 0);
          setProductivitySummary({ 
            productive: Math.round(productive / 3600 * 10) / 10, 
            nonProductive: Math.round(nonProductive / 3600 * 10) / 10 
          });
          
          // Force fix the clock-in time: prioritize activities if roster is missing OR from different day
          const rosterCheckIn = rosterStats.data?.today_check_in;
          const isCheckInToday = rosterCheckIn && rosterCheckIn.split('T')[0] === todayStr;
          
          if ((!isCheckInToday || !rosterCheckIn) && activities.length > 0) {
             const firstActivity = [...activities].sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
             setUserStats((prev: any) => ({ ...prev, today_check_in: firstActivity.start_time }));
          }
        } catch (e) {
          console.error("Failed to fetch productivity for dashboard", e);
        }
      }

    } catch (err: any) {
      setError('System out of sync. Please refresh.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = userRole === 'admin' || userRole === 'manager';

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Force comparison between client's today and backend's received check-in
  const checkInDate = userStats?.today_check_in ? new Date(userStats.today_check_in).toISOString().split('T')[0] : null;
  const isCheckInAccurate = checkInDate === todayStr;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">Aggregating Intelligence...</p>
      </div>
    );
  }

  const adminCards = [
    { title: 'Fleet Size', value: stats?.total_employees, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Operations', value: stats?.active_projects, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Open Requests', value: stats?.pending_leaves, icon: Calendar, color: 'text-rose-600', bg: 'bg-rose-50' },
    { title: 'Efficiency', value: `${stats?.productivity_score}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const displayClockIn = (userStats?.today_check_in && isCheckInAccurate)
    ? new Date(userStats.today_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const userCards = [
    { title: 'Clock-In Time', value: displayClockIn, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Productive Hours', value: `${productivitySummary.productive}h`, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Non-Prod Hours', value: `${productivitySummary.nonProductive}h`, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { title: 'Daily Hours', value: `${userStats?.today_hours || 0}h`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const cards = isAdmin ? adminCards : userCards;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
            {isAdmin ? 'Command Center' : 'Unit Identity'}
          </h1>
          <p className="text-muted-foreground font-medium">
            {isAdmin ? 'Strategic overview of organizational resources.' : 'Your personal productivity and performance intelligence.'}
          </p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" className="gap-2 border-2">
          <Activity className="w-4 h-4" />
          Refresh Pulse
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border-2 border-rose-100 rounded-xl flex items-center gap-3 text-rose-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.title}</CardTitle>
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-800">{stat.value}</div>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Live Stream</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Primary Visualization */}
        {isAdmin ? (
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Attendance Flux</CardTitle>
              <CardDescription>Visual distribution of resource connectivity</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-5">
                {attendanceTrend.map((day, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-tighter">
                      <span>{day.date}</span>
                      <span>{day.present}% Present</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                      <div className="bg-emerald-500 transition-all duration-1000" style={{ width: `${day.present}%` }} />
                      <div className="bg-amber-400" style={{ width: `${day.late}%` }} />
                      <div className="bg-rose-500" style={{ width: `${day.absent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-6 mt-6 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                  <span className="text-[10px] font-black text-slate-400 uppercase">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                  <span className="text-[10px] font-black text-slate-400 uppercase">Delayed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                  <span className="text-[10px] font-black text-slate-400 uppercase">Offline</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-sm h-full bg-slate-900 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4 text-primary" />
                Productivity Velocity
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 pt-4">
              <div className="space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center text-primary border border-white/10">
                    <Activity className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight text-slate-400">Monthly Yield</p>
                    <p className="text-4xl font-black text-white uppercase tracking-tighter">{userStats?.monthly_hours || 0} <span className="text-sm text-primary">Hours</span></p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Completion Rate</p>
                    <p className="text-xl font-black">{projectStats?.completed_tasks_count || 0}</p>
                    <p className="text-[9px] font-bold text-emerald-400 uppercase">Tasks Syncronized</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Pending Sync</p>
                    <p className="text-xl font-black">{projectStats?.pending_tasks_count || 0}</p>
                    <p className="text-[9px] font-bold text-amber-400 uppercase">Awaiting Action</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Progress</span>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">75% Complete</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-3/4 rounded-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Initiatives */}
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">{isAdmin ? 'Project Momentum' : 'Active Initiatives'}</CardTitle>
            <CardDescription>{isAdmin ? 'Execution progress of active initiatives' : 'Ongoing work streams and project milestones'}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {activeProjects.length > 0 ? activeProjects.map((project) => (
                <div key={project.id} className="group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{project.name}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden group-hover:shadow-sm transition-all shadow-inner">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${project.progress}%` }} />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficiency Phase</span>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{project.progress}%</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 flex flex-col items-center">
                  <FolderKanban className="w-12 h-12 text-slate-200 mb-2" />
                  <p className="text-sm font-bold text-slate-400">Zero active initiatives found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Secondary View */}
        {isAdmin ? (
          <Card className="border-none shadow-sm bg-slate-50/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Approval Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingApprovals.length > 0 ? (
                <div className="space-y-4">
                  {pendingApprovals.map((leave) => (
                    <div key={leave.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-primary/30 transition-all cursor-pointer">
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{leave.user_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{leave.leave_type}</p>
                      </div>
                      <Link href="/dashboard/leaves">
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-primary">Process</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-50" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Queue Empty</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-sm bg-slate-50/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                Current Focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-xl border-l-4 border-l-primary shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Critical Task</p>
                  <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Synchronize Cloud Vector</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Due in 2 Hours</p>
                </div>
                <div className="p-4 bg-white rounded-xl border-l-4 border-l-amber-400 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Standard Task</p>
                  <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Audit Operations Log</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Due Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connectivity / Intelligence */}
        <Card className={`border-none shadow-sm h-full overflow-hidden relative ${isAdmin ? 'bg-slate-900 text-white' : 'bg-primary text-white'}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-white/80">
              <Zap className="w-4 h-4 text-white" />
              Pulse Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tight">System Status</p>
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Hyper-Operational</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tight">Next Sync</p>
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">In 14 Minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tight">Efficiency</p>
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">92% Operational</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rapid Metrics */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Quick Diagnostics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-1">
              {[
                { label: 'Attendance Velocity', value: isAdmin ? `${stats?.today_attendance}%` : '100%', trend: 'up' },
                { label: 'Pending Decisions', value: isAdmin ? stats?.pending_leaves : '0', trend: 'neutral' },
                { label: 'Active Channels', value: isAdmin ? stats?.active_projects : projectStats?.active_projects_count || 0, trend: 'up' },
                { label: 'System Health', value: 'Prime', trend: 'neutral' },
              ].map((metric) => (
                <div key={metric.label} className="flex items-center justify-between group">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">{metric.label}</span>
                  <span className="font-black text-sm text-slate-800">{metric.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}