'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { leaveApi } from '@/lib/api';
import { 
  Search, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Trash2,
  CalendarDays,
  UserCheck,
  History
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';

interface LeaveRequest {
  id: string;
  user_id: string;
  user_name?: string;
  leave_type_id: string;
  leave_type_name?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  created_at: string;
}

export default function LeavesPage() {
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const [newRequest, setNewRequest] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    // Check if user is admin/manager
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setIsAdmin(user.role === 'admin' || user.role === 'manager');
      if (user.role === 'admin' || user.role === 'manager') {
        setActiveTab('all');
      }
    }
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const promises: any[] = [
        leaveApi.getTypes(),
        leaveApi.getBalances()
      ];

      if (activeTab === 'my') {
        promises.push(leaveApi.getMyLeaves());
      } else {
        promises.push(leaveApi.getAll());
      }

      const [typesRes, balancesRes, leavesRes] = await Promise.all(promises);
      
      setLeaveTypes(typesRes.data || []);
      setLeaveBalances(balancesRes.data || []);
      setLeaveRequests(Array.isArray(leavesRes.data) ? leavesRes.data : []);
    } catch (err: any) {
      setError('Connection disrupted. Please refresh the command node.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLeave = async () => {
    if (!newRequest.leave_type_id || !newRequest.start_date || !newRequest.end_date) {
      alert('Parameters incomplete. Please define all vector bounds.');
      return;
    }
    try {
      setRequestSaving(true);
      await leaveApi.apply(newRequest);
      setIsRequestDialogOpen(false);
      setNewRequest({
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: ''
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Request failed to transmit.');
    } finally {
      setRequestSaving(false);
    }
  };

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    const comments = action === 'rejected' ? (prompt('Enter rejection vector details:') || '') : '';
    if (action === 'rejected' && !comments) return;

    try {
      setLoading(true);
      await leaveApi.approve(id, { action, comments });
      fetchData();
    } catch (err) {
      console.error(err);
      alert(`Failed to ${action} leave request.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Abort this leave request?')) return;
    try {
      await leaveApi.cancel(id);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to abort request.');
    }
  };

  const filteredLeaves = leaveRequests.filter(leave => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (leave.user_name?.toLowerCase().includes(searchLower)) || 
      (leave.reason?.toLowerCase().includes(searchLower)) ||
      (leave.leave_type_name?.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'rejected': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'cancelled': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Operational Absence Mgmt</h1>
          <p className="text-muted-foreground font-medium">Control and monitor personnel availability across all units.</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <div className="bg-slate-100 p-1 rounded-lg flex border-2 border-slate-200">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 rounded-md text-xs font-black uppercase transition-all ${activeTab === 'all' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Fleet Control
              </button>
              <button 
                onClick={() => setActiveTab('my')}
                className={`px-4 py-1.5 rounded-md text-xs font-black uppercase transition-all ${activeTab === 'my' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Personal Log
              </button>
            </div>
          )}
          {!isAdmin && (
            <Button onClick={() => setIsRequestDialogOpen(true)} className="bg-primary hover:bg-primary/90 gap-2 border-2 border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          )}
        </div>
      </div>

      {/* Leave Balances - Only show on My tab */}
      {activeTab === 'my' && leaveBalances.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          {leaveBalances.map((item, index) => (
            <Card key={index} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.leave_type_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-slate-800">{parseFloat(item.available_days).toFixed(1)}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Available Units</div>
                <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${(item.used_days / item.total_days) * 100}%` }} 
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Control Panel */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              {activeTab === 'all' ? <UserCheck className="w-5 h-5 text-primary" /> : <History className="w-5 h-5 text-primary" />}
              <CardTitle className="text-sm font-black uppercase tracking-widest">{activeTab === 'all' ? 'Fleet Leave Stream' : 'Absence History'}</CardTitle>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search personnel or reason..."
                  className="pl-9 h-9 border-2"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="h-9 px-3 py-1 border-2 rounded-md text-xs font-bold uppercase outline-none focus:border-primary transition-colors"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Global Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
            </div>
          ) : error ? (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 text-rose-500 mb-4 border-2 border-rose-100">
                <XCircle className="w-6 h-6" />
              </div>
              <p className="text-rose-500 font-bold">{error}</p>
              <Button variant="ghost" onClick={fetchData} className="mt-2 text-primary uppercase font-black text-xs tracking-widest">Retry Pulse</Button>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
               <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-300 mb-4 border-2 border-slate-100 border-dashed">
                <CalendarDays className="w-6 h-6" />
              </div>
              <p className="font-bold">Zero active absence nodes found</p>
              <p className="text-xs uppercase tracking-widest mt-1">Expanding search scope required</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50/30">
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Personnel / Context</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Absence Type</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Duration Vector</th>
                    <th className="text-center py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Token Cost</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Sync Status</th>
                    <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Tactical Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLeaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                            {activeTab === 'all' ? (leave.user_name || 'System Unit') : 'Personnel Log Entry'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 line-clamp-1">{leave.reason || 'No narrative provided.'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-bold text-slate-600">{leave.leave_type_name || 'General Absence'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-500">
                          <span className="text-slate-800">{leave.start_date}</span>
                          <span className="opacity-30">→</span>
                          <span>{leave.end_date}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="text-sm font-black text-slate-800">{leave.total_days}D</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${getStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {activeTab === 'all' && leave.status === 'pending' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-emerald-500 hover:bg-emerald-50 border-2 border-transparent hover:border-emerald-100"
                                onClick={() => handleAction(leave.id, 'approved')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-rose-500 hover:bg-rose-50 border-2 border-transparent hover:border-rose-100"
                                onClick={() => handleAction(leave.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-slate-100"
                            onClick={() => handleCancel(leave.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Request Modal */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="max-w-md border-t-4 border-t-primary">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Request Absence Vector</DialogTitle>
            <DialogDescription className="font-bold">Define the parameters for your operational downtime.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Absence Classifier</Label>
              <select 
                className="w-full px-3 py-2 border-2 rounded-lg font-bold text-sm outline-none focus:border-primary transition-colors"
                value={newRequest.leave_type_id}
                onChange={(e) => setNewRequest({...newRequest, leave_type_id: e.target.value})}
              >
                <option value="">Select Protocol</option>
                {leaveTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initiation Date</Label>
                <Input 
                  type="date"
                  className="border-2 font-bold"
                  value={newRequest.start_date}
                  onChange={(e) => setNewRequest({...newRequest, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Return Date</Label>
                <Input 
                  type="date"
                  className="border-2 font-bold"
                  value={newRequest.end_date}
                  onChange={(e) => setNewRequest({...newRequest, end_date: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Strategic Narrative</Label>
              <textarea 
                className="w-full px-3 py-2 border-2 rounded-lg min-h-[100px] outline-none focus:border-primary transition-colors font-bold text-sm"
                placeholder="Briefly describe the operational constraints necessitating this absence..."
                value={newRequest.reason}
                onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)} className="border-2 font-black uppercase text-xs">Abort</Button>
            <Button 
              onClick={handleRequestLeave} 
              disabled={requestSaving}
              className="gap-2 font-black uppercase text-xs px-6"
            >
              {requestSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
              Submit Vector
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}