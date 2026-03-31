'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { payrollApi, userApi } from '@/lib/api';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
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

interface PayrollRecord {
  id: string;
  user_id: string;
  user_name: string;
  month: number;
  year: number;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: string;
  payment_date?: string;
  notes?: string;
  created_at: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = [2023, 2024, 2025, 2026];

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Confirmation state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    user_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basic_salary: 0,
    allowances: 0,
    deductions: 0,
    notes: '',
    status: 'draft'
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    let currentUserId = '';
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        setIsAdmin(userObj.role === 'admin' || userObj.role === 'manager');
        currentUserId = userObj.id;
      } catch (e) {}
    }
    fetchPayrolls(currentUserId);
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchPayrolls();
  }, [selectedMonth, selectedYear]);

  const fetchUsers = async () => {
    try {
      const res = await userApi.getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchPayrolls = async (forceUserId?: string) => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedMonth !== 'all') params.month = parseInt(selectedMonth);
      if (selectedYear !== 'all') params.year = parseInt(selectedYear);
      
      // Role-based filtering
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.role !== 'admin' && userObj.role !== 'manager') {
          params.user_id = userObj.id;
        }
      }
      if (forceUserId) params.user_id = forceUserId;

      const res = await payrollApi.getAll(params);
      setPayrolls(res.data);
    } catch (err) {
      console.error('Failed to fetch payrolls', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayroll = async () => {
    console.log('Sending formData:', formData);
    if (!formData.user_id) {
      toast.error('Selection error: user_id is empty. Please try selecting the employee again.');
      return;
    }
    try {
      setSaving(true);
      await payrollApi.create(formData);
      setIsAddOpen(false);
      resetForm();
      fetchPayrolls();
      toast.success('Payroll record created successfully!');
    } catch (err: any) {
      console.error('Create error:', err);
      toast.error(err.response?.data?.detail || 'Failed to create payroll record');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadSlip = (p: PayrollRecord) => {
    toast.info(`Generating salary slip for ${p.user_name}...`);
    
    // Create a temporary print window for the payslip
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Salary Slip - ${p.user_name} - ${MONTHS[p.month-1]} ${p.year}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 50px; color: #1e293b; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4f46e5; padding-bottom: 25px; margin-bottom: 40px; }
            .company-info { text-align: left; }
            .company-name { font-size: 28px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
            .company-tag { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; }
            .slip-title { text-align: right; }
            .slip-text { font-size: 20px; font-weight: 800; color: #1e293b; }
            .slip-id { font-size: 12px; color: #64748b; font-family: monospace; }
            
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
            .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; rounded-lg: 12px; }
            .stat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 5px; }
            .stat-value { font-size: 16px; font-weight: 700; color: #1e293b; }

            .details-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .details-table th { text-align: left; padding: 12px 0; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; }
            .details-table td { padding: 15px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .row-label { font-weight: 600; color: #334155; }
            .row-value { text-align: right; font-family: monospace; font-weight: 700; }
            
            .summary-box { background: #4f46e5; color: white; padding: 25px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
            .summary-label { font-size: 12px; font-weight: 700; text-transform: uppercase; opacity: 0.8; }
            .summary-total { font-size: 32px; font-weight: 800; }

            .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <div class="company-name">WorkforceHub™</div>
              <div class="company-tag">Precision Management Platform</div>
            </div>
            <div class="slip-title">
              <div class="slip-text">PAYSLIP</div>
              <div class="slip-id">REF: PY-${p.id.substring(0, 12).toUpperCase()}</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Employee Member</div>
              <div class="stat-value">${p.user_name}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Statement Period</div>
              <div class="stat-value">${MONTHS[p.month-1]} ${p.year}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Payment Status</div>
              <div class="stat-value" style="color: ${p.status === 'paid' ? '#10b981' : '#f59e0b'}">${p.status.toUpperCase()}</div>
            </div>
          </div>

          <table class="details-table">
            <thead>
              <tr>
                <th>Earnings & Deductions</th>
                <th style="text-align: right">Amount (USD)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="row-label">Base Monthly Salary</td>
                <td class="row-value">$${p.basic_salary.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="row-label">Performance & Role Allowances</td>
                <td class="row-value">$${p.allowances.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="row-label">Internal Deductions / Adjustments</td>
                <td class="row-value" style="color: #ef4444">-$${p.deductions.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="summary-box">
             <div class="summary-label">Total Net Disbursed</div>
             <div class="summary-total">$${p.net_salary.toLocaleString()}</div>
          </div>

          <div class="footer">
            <div>Verification Code: WH-PAY-${Math.random().toString(36).substring(7).toUpperCase()}</div>
            <div>Generated on ${new Date().toLocaleDateString()} • WorkforceHub Security Compliance</div>
          </div>

          <script>
            window.onload = function() { 
              setTimeout(() => {
                window.print(); 
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleUpdatePayroll = async () => {
    if (!selectedPayroll) return;
    try {
      if (!formData.user_id) {
        toast.error('Please select an employee first');
        return;
      }
      setSaving(true);
      await payrollApi.update(selectedPayroll.id, formData);
      setIsEditOpen(false);
      fetchPayrolls();
      toast.success('Payroll record updated!');
    } catch (err: any) {
      console.error('Update error:', err);
      toast.error(err.response?.data?.detail || 'Failed to update payroll record');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteTargetId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await payrollApi.delete(deleteTargetId);
      toast.success('Payroll record deleted');
      fetchPayrolls();
    } catch (err) {
      toast.error('Failed to delete payroll record');
    } finally {
      setConfirmOpen(false);
      setDeleteTargetId(null);
    }
  };

  const openEdit = (p: PayrollRecord) => {
    setSelectedPayroll(p);
    setFormData({
      user_id: p.user_id,
      month: p.month,
      year: p.year,
      basic_salary: p.basic_salary,
      allowances: p.allowances,
      deductions: p.deductions,
      notes: p.notes || '',
      status: p.status
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      basic_salary: 0,
      allowances: 0,
      deductions: 0,
      notes: '',
      status: 'draft'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <span className="flex items-center gap-1 text-[10px] font-bold uppercase py-0.5 px-2 bg-emerald-100 text-emerald-700 rounded-full"><CheckCircle2 className="w-3 h-3" /> Paid</span>;
      case 'processed': return <span className="flex items-center gap-1 text-[10px] font-bold uppercase py-0.5 px-2 bg-blue-100 text-blue-700 rounded-full"><Clock className="w-3 h-3" /> Processed</span>;
      case 'draft': return <span className="flex items-center gap-1 text-[10px] font-bold uppercase py-0.5 px-2 bg-slate-100 text-slate-600 rounded-full">Draft</span>;
      default: return <span className="flex items-center gap-1 text-[10px] font-bold uppercase py-0.5 px-2 bg-rose-100 text-rose-700 rounded-full"><AlertCircle className="w-3 h-3" /> {status}</span>;
    }
  };

  const filteredPayrolls = payrolls.filter(p => 
    p.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Payroll Management
            <CreditCard className="w-7 h-7 text-primary" />
          </h1>
          <p className="text-muted-foreground">Manage employee compensation, allowances, and salary disbursement</p>
        </div>
        
        {isAdmin && (
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Generate Payroll
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full text-xs h-8" onClick={() => {
                setSelectedMonth(String(new Date().getMonth() + 1));
                setSelectedYear(String(new Date().getFullYear()));
              }}>
                Current Period
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <div>
              <CardTitle className="text-lg">Payroll Records</CardTitle>
              <CardDescription>Records for {MONTHS[parseInt(selectedMonth)-1]} {selectedYear}</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Search employee..." 
                className="pl-9 h-9 text-xs" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20 mb-4" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading Payroll Data...</p>
              </div>
            ) : filteredPayrolls.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left py-3 px-4 text-[10px] font-black uppercase text-slate-500">Employee</th>
                      <th className="text-left py-3 px-4 text-[10px] font-black uppercase text-slate-500">Basic</th>
                      <th className="text-left py-3 px-4 text-[10px] font-black uppercase text-slate-500">Allowances</th>
                      <th className="text-left py-3 px-4 text-[10px] font-black uppercase text-slate-500">Net Salary</th>
                      <th className="text-left py-3 px-4 text-[10px] font-black uppercase text-slate-500">Status</th>
                      <th className="text-right py-3 px-4 text-[10px] font-black uppercase text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPayrolls.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                {p.user_name.split(' ').map(n => n[0]).join('')}
                             </div>
                             <p className="text-sm font-bold text-slate-700">{p.user_name}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-bold">${p.basic_salary.toLocaleString()}</td>
                        <td className="py-3 px-4 text-xs font-bold text-emerald-600">+${p.allowances.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm font-black text-primary">${p.net_salary.toLocaleString()}</td>
                        <td className="py-3 px-4">{getStatusBadge(p.status)}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1 transition-opacity">
                            {isAdmin && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(p)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDeleteRequest(p.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                              onClick={() => handleDownloadSlip(p)}
                              title="Download Salary Slip"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-20 text-center bg-slate-50 border-y border-dashed">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">No payroll records found for this period</p>
                {isAdmin && (
                  <Button variant="link" className="text-xs text-primary" onClick={() => setIsAddOpen(true)}>Generate new record</Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => { if(!open) { setIsAddOpen(false); setIsEditOpen(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditOpen ? 'Edit Payroll Record' : 'Generate New Payroll'}</DialogTitle>
            <DialogDescription>
              {isEditOpen ? 'Update the compensation details for this period.' : 'Enter employee salary and allowance details for the current period.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.user_id} 
                onChange={(e) => setFormData({...formData, user_id: e.target.value})}
              >
                <option value="">Select Employee</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.role === 'admin' ? '[Admin] ' : ''}{u.first_name} {u.last_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payroll Month</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={String(formData.month)} 
                  onChange={(e) => setFormData({...formData, month: parseInt(e.target.value)})}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Payroll Year</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={String(formData.year)} 
                  onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                >
                  {YEARS.map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Basic Salary ($)</Label>
                <Input 
                  type="number" 
                  value={formData.basic_salary} 
                  onChange={(e) => setFormData({...formData, basic_salary: parseFloat(e.target.value) || 0})} 
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Allowances ($)</Label>
                <Input 
                  type="number" 
                  value={formData.allowances} 
                  onChange={(e) => setFormData({...formData, allowances: parseFloat(e.target.value) || 0})} 
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
               <Label>Extra Deductions ($)</Label>
               <Input 
                  type="number" 
                  value={formData.deductions} 
                  onChange={(e) => setFormData({...formData, deductions: parseFloat(e.target.value) || 0})} 
                />
            </div>

            <div className="space-y-2">
              <Label>Payment Status</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.status} 
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value="draft">Draft</option>
                <option value="processed">Processed</option>
                <option value="paid">Paid (Disbursed)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Notes (Internal)</Label>
              <Input 
                value={formData.notes} 
                onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                placeholder="e.g. Performance bonus included"
              />
            </div>

            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
               <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Projected Net Payout</span>
                  <span className="text-xl font-black text-primary">${(formData.basic_salary + formData.allowances - formData.deductions).toLocaleString()}</span>
               </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}>Cancel</Button>
            <Button 
              onClick={isEditOpen ? handleUpdatePayroll : handleCreatePayroll} 
              disabled={saving}
              className="gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditOpen ? 'Save Changes' : 'Generate Record'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this payroll record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
