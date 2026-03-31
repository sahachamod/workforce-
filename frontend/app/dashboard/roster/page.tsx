'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { rosterApi, userApi } from '@/lib/api';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock,
  Users,
  Calendar as CalendarIcon,
  RotateCcw,
  Loader2,
  Trash2,
  Edit,
  Save,
  CheckCircle2
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color?: string;
}

interface ScheduleEmployee {
  id: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  shift_name?: string;
  work_mode?: string;
  schedule?: boolean[];
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  shift_name: string;
  check_in?: string;
  status: string;
  user?: {
    first_name: string;
    last_name: string;
  };
}

export default function RosterPage() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEmployee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('employee');

  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  
  const [newShift, setNewShift] = useState({
    name: '',
    start_time: '09:00',
    end_time: '17:00'
  });

  const [newAssignment, setNewAssignment] = useState({
    user_id: '',
    shift_id: '',
    date: new Date().toISOString().split('T')[0],
    work_mode: 'office'
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || 'employee');
      } catch (e) {}
    }
    fetchData();
    fetchEmployees();
  }, [currentWeek]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [shiftsRes, scheduleRes, attendanceRes] = await Promise.all([
        rosterApi.getShifts(),
        rosterApi.getSchedule({ week: currentWeek }),
        rosterApi.getAttendance({ date: new Date().toISOString().split('T')[0] }),
      ]);
      setShifts(Array.isArray(shiftsRes.data) ? shiftsRes.data : (shiftsRes.data.shifts || []));
      setSchedule(Array.isArray(scheduleRes.data) ? scheduleRes.data : (scheduleRes.data.schedule || []));
      setAttendance(Array.isArray(attendanceRes.data) ? attendanceRes.data : (attendanceRes.data.attendance || []));
    } catch (err: any) {
      setError('Failed to load roster data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await userApi.getUsers();
      setEmployees(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveShift = async () => {
    if (!newShift.name) return;
    try {
      setShiftSaving(true);
      if (editingShift) {
        await rosterApi.updateShift(editingShift.id.toString(), newShift);
      } else {
        await rosterApi.createShift(newShift);
      }
      setIsShiftDialogOpen(false);
      setEditingShift(null);
      setNewShift({ name: '', start_time: '09:00', end_time: '17:00' });
      fetchData();
    } catch (err) {
      alert('Failed to save shift');
    } finally {
      setShiftSaving(false);
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await rosterApi.deleteShift(id.toString());
      fetchData();
    } catch (err) {
      alert('Failed to delete shift');
    }
  };

  const handleAssignShift = async () => {
    if (!newAssignment.user_id || !newAssignment.shift_id) return;
    try {
      setShiftSaving(true);
      await rosterApi.createAssignment(newAssignment);
      setIsAssignDialogOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to assign shift');
    } finally {
      setShiftSaving(false);
    }
  };

  const getShiftColor = (input: number | string) => {
    const colors = ['bg-blue-500', 'bg-orange-500', 'bg-purple-500', 'bg-green-500', 'bg-indigo-500', 'bg-red-500'];
    const index = typeof input === 'number' ? input : input.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roster & Schedule</h1>
          <p className="text-muted-foreground">Manage employee shifts and weekly schedules</p>
        </div>
        {(userRole === 'admin' || userRole === 'manager') && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(true)}>
              <CalendarIcon className="w-4 h-4 mr-2" />
              Assign Shift
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => { setEditingShift(null); setNewShift({name:'', start_time:'09:00', end_time:'17:00'}); setIsShiftDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Shift
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription>Visual overview of employee assignments</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentWeek(w => Math.max(1, w - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold px-2">Week {currentWeek}</span>
                <Button variant="outline" size="icon" onClick={() => setCurrentWeek(w => w + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium sticky left-0 bg-white z-10">Employee</th>
                      {weekDays.map((day) => (
                        <th key={day} className="text-center py-3 px-4 font-medium">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-muted-foreground">
                          No schedule found for this week.
                        </td>
                      </tr>
                    ) : (
                      schedule.map((row) => (
                        <tr key={row.id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                {row.first_name[0]}{row.last_name[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{row.first_name} {row.last_name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">{row.shift_name || 'Not assigned'}</p>
                              </div>
                            </div>
                          </td>
                          {weekDays.map((_, i) => (
                            <td key={i} className="text-center py-3 px-2">
                              {row.schedule?.[i] ? (
                                <div 
                                  className="w-8 h-8 mx-auto rounded-md bg-primary/10 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/20 transition-all group/cell"
                                  title={row.work_mode === 'home' ? 'Work From Home' : 'Work From Office'}
                                >
                                  <div className={`w-3 h-3 rounded-full ${getShiftColor(row.id)} animation-pulse`} />
                                  {row.work_mode === 'home' && (
                                    <div className="text-[6px] font-bold text-primary mt-0.5">WFH</div>
                                  )}
                                </div>
                              ) : (
                                <div 
                                  className="w-8 h-8 mx-auto rounded-md border border-dashed text-slate-200 flex items-center justify-center cursor-pointer hover:border-primary hover:text-primary transition-all group/empty"
                                  onClick={() => {
                                    const date = new Date();
                                    // Basic date calc for the week view
                                    const diff = i - (date.getDay() === 0 ? 6 : date.getDay() - 1);
                                    date.setDate(date.getDate() + diff);
                                    setNewAssignment({
                                      ...newAssignment,
                                      user_id: row.id,
                                      date: date.toISOString().split('T')[0]
                                    });
                                    setIsAssignDialogOpen(true);
                                  }}
                                >
                                  <Plus className="w-3 h-3 opacity-20 group-hover/empty:opacity-100" />
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance & Shift Management */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Today&apos;s Attendance</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {attendance.length === 0 ? (
                <p className="text-center py-4 text-sm text-muted-foreground">No check-ins yet today</p>
              ) : (
                <div className="space-y-4">
                  {attendance.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 rounded-md bg-accent/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                          {record.user?.first_name[0]}{record.user?.last_name[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{record.user?.first_name} {record.user?.last_name}</p>
                          <p className="text-[10px] text-muted-foreground">{record.shift_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold">{record.check_in || '--:--'}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${record.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {record.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {attendance.length > 5 && (
                    <Button variant="link" className="w-full text-xs text-primary">View all attendance</Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Shift Templates</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {shifts.map((shift, i) => (
                  <div key={shift.id} className="group flex items-center justify-between p-3 border rounded-md hover:border-primary transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${shift.color || getShiftColor(i)}`} />
                      <div>
                        <p className="text-xs font-bold">{shift.name}</p>
                        <p className="text-[10px] text-muted-foreground">{shift.start_time} - {shift.end_time}</p>
                      </div>
                    </div>
                    {(userRole === 'admin' || userRole === 'manager') && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => { setEditingShift(shift); setNewShift(shift); setIsShiftDialogOpen(true); }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteShift(shift.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Shift Dialog */}
      <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingShift ? 'Edit Shift' : 'Create New Shift'}</DialogTitle>
            <DialogDescription>Define shift name and timing boundaries.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Shift Name</Label>
              <Input 
                placeholder="e.g. Morning Shift"
                value={newShift.name}
                onChange={(e) => setNewShift({...newShift, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input 
                  type="time"
                  value={newShift.start_time}
                  onChange={(e) => setNewShift({...newShift, start_time: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input 
                  type="time"
                  value={newShift.end_time}
                  onChange={(e) => setNewShift({...newShift, end_time: e.target.value})}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsShiftDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveShift} disabled={shiftSaving}>
              {shiftSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Shift</DialogTitle>
            <DialogDescription>Select employee and shift template to assign.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <select 
                className="w-full px-3 py-2 border rounded-md"
                value={newAssignment.user_id}
                onChange={(e) => setNewAssignment({...newAssignment, user_id: e.target.value})}
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Shift Template</Label>
              <select 
                className="w-full px-3 py-2 border rounded-md"
                value={newAssignment.shift_id}
                onChange={(e) => setNewAssignment({...newAssignment, shift_id: e.target.value})}
              >
                <option value="">Select Shift</option>
                {shifts.map(shift => (
                  <option key={shift.id} value={shift.id}>{shift.name} ({shift.start_time}-{shift.end_time})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input 
                type="date"
                value={newAssignment.date}
                onChange={(e) => setNewAssignment({...newAssignment, date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Work Mode</Label>
              <select 
                className="w-full px-3 py-2 border rounded-md"
                value={newAssignment.work_mode}
                onChange={(e) => setNewAssignment({...newAssignment, work_mode: e.target.value})}
              >
                <option value="office">Work From Office (WFO)</option>
                <option value="home">Work From Home (WFH)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignShift} disabled={shiftSaving}>
              {shiftSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Assign Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}