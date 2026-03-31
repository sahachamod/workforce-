'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { userApi, leaveApi, rosterApi, projectApi } from '@/lib/api';
import { 
  Calendar, 
  FolderKanban, 
  Clock, 
  CheckCircle, 
  Loader2,
  AlertCircle,
  Activity,
  LogOut,
  LogIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function EmployeeDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const userStr = localStorage.getItem('user');
      if (userStr) {
        setUser(JSON.parse(userStr));
      }

      const [leavesRes, projectsRes, attendanceRes] = await Promise.all([
        leaveApi.getMyLeaves().catch(() => ({ data: [] })),
        projectApi.getProjects().catch(() => ({ data: [] })),
        rosterApi.getAttendance({ date: new Date().toISOString().split('T')[0] }).catch(() => ({ data: [] }))
      ]);

      const myLeaves = Array.isArray(leavesRes.data) ? leavesRes.data : [];
      const myProjects = Array.isArray(projectsRes.data) ? projectsRes.data : [];
      const todayAttendance = Array.isArray(attendanceRes.data) ? attendanceRes.data[0] : null;

      setLeaves(myLeaves);
      setProjects(myProjects);
      setAttendance(todayAttendance);

    } catch (err: any) {
      setError('Failed to fetch dashboard data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    // Assuming there's a shift_id for the current day for the user, logic can vary based on actual API
    try {
      await rosterApi.checkIn({ shift_id: attendance?.id || 'sample_shift_id' });
      fetchDashboardData();
    } catch (error) {
      console.error('Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      await rosterApi.checkOut({ shift_id: attendance?.id || 'sample_shift_id' });
      fetchDashboardData();
    } catch (error) {
      console.error('Check-out failed');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 capitalize">
            Welcome, {user?.first_name || 'Employee'}
          </h1>
          <p className="text-muted-foreground font-medium">Here is your daily overview.</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" className="gap-2 border-2">
          <Activity className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border-2 border-rose-100 rounded-xl flex items-center gap-3 text-rose-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {/* Hero Actions (Clock In/Out) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-none shadow-sm h-full bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
              <Clock className="w-4 h-4 text-primary" />
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 flex flex-col gap-4">
            <div className="text-lg font-bold">
              {attendance ? (
                 <span className="text-emerald-400">Status: {attendance.status}</span>
              ) : (
                 <span className="text-amber-400">Status: Not Checked In</span>
              )}
            </div>
            <div className="flex gap-4">
              <Button onClick={handleCheckIn} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={attendance?.status === 'present'}>
                <LogIn className="w-4 h-4 mr-2" /> Check In
              </Button>
              <Button onClick={handleCheckOut} className="flex-1 bg-red-600 hover:bg-red-700" disabled={!attendance || attendance?.status !== 'present'}>
                <LogOut className="w-4 h-4 mr-2" /> Check Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* My Leaves Summary */}
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">My Leaves</CardTitle>
            <div className="p-2.5 rounded-xl bg-blue-50">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-800">{leaves.length}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Requests Submitted</span>
            </div>
          </CardContent>
        </Card>

        {/* My Projects Summary */}
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Active Projects</CardTitle>
            <div className="p-2.5 rounded-xl bg-amber-50">
              <FolderKanban className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-800">{projects.length}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned to you</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Leaves */}
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Recent Leave Requests</CardTitle>
            <CardDescription>Status of your recent applications</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {leaves.length > 0 ? leaves.slice(0, 5).map((leave) => (
                <div key={leave.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 mb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{leave.leave_type?.name || 'Annual Leave'}</p>
                    <p className="text-xs text-slate-500">{new Date(leave.start_date).toLocaleDateString()} to {new Date(leave.end_date).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : leave.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {leave.status}
                  </span>
                </div>
              )) : (
                <div className="text-center py-6">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                  <p className="text-sm font-bold text-slate-400">No recent leaves found</p>
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <Link href="/dashboard/leaves">
                <Button variant="ghost" className="text-primary w-full shadow-sm border border-slate-100">View All Leaves</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Projects */}
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">My Projects</CardTitle>
            <CardDescription>Projects you are currently working on</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {projects.length > 0 ? projects.slice(0, 5).map((project) => (
                <div key={project.id} className="group mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{project.name}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                      project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden group-hover:shadow-sm transition-all shadow-inner">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${project.progress || 0}%` }} />
                  </div>
                </div>
              )) : (
                <div className="text-center py-6">
                   <FolderKanban className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                   <p className="text-sm font-bold text-slate-400">No active projects assigned</p>
                </div>
              )}
            </div>
             <div className="mt-4 text-center">
              <Link href="/dashboard/projects">
                <Button variant="ghost" className="text-primary w-full shadow-sm border border-slate-100">View All Projects</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
