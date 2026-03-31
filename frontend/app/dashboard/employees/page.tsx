'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { userApi } from '@/lib/api';
import { 
  Search, 
  Plus, 
  Edit,
  Trash2,
  Loader2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  department_id?: string;
  job_title?: string;
  role: string;
  is_active: boolean;
  hire_date?: string;
}

interface Department {
  id: string;
  name: string;
}

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'employee',
    department_id: '',
    job_title: ''
  });
  
  const [editEmployee, setEditEmployee] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: '',
    department_id: '',
    job_title: '',
    is_active: true
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await userApi.getUsers();
      setEmployees(response.data || []);
    } catch (err: any) {
      setError('Failed to load employees');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await userApi.getDepartments();
      setDepartments(response.data || []);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const handleAddEmployee = async () => {
    try {
      setSaving(true);
      await userApi.createUser(newEmployee);
      setIsAddDialogOpen(false);
      setNewEmployee({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'employee',
        department_id: '',
        job_title: ''
      });
      fetchEmployees();
      toast.success('Employee added successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;
    try {
      setSaving(true);
      await userApi.updateUser(selectedEmployee.id, {
        first_name: editEmployee.first_name,
        last_name: editEmployee.last_name,
        email: editEmployee.email,
        phone: editEmployee.phone,
        role: editEmployee.role,
        department_id: editEmployee.department_id || null,
        job_title: editEmployee.job_title,
        is_active: editEmployee.is_active
      });
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      fetchEmployees();
      toast.success('Employee updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditEmployee({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone || '',
      role: employee.role,
      department_id: employee.department_id || '',
      job_title: employee.job_title || '',
      is_active: employee.is_active
    });
    setIsEditDialogOpen(true);
  };

  const confirmDelete = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteConfirm(true);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      await userApi.deleteUser(employeeToDelete.id);
      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
      fetchEmployees();
      toast.success('Employee deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete employee');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
                          emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    return matchesSearch && matchesDept && matchesRole;
  });

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-700' 
      : 'bg-red-100 text-red-700';
  };

  const getStatus = (isActive: boolean) => isActive ? 'Active' : 'Inactive';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your team members and their roles</p>
        </div>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {employees.filter(e => e.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {employees.filter(e => !e.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 border rounded-md"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
            <select
              className="px-3 py-2 border rounded-md"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>{filteredEmployees.length} employees found</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-3">{error}</p>
              <button
                onClick={fetchEmployees}
                className="text-sm text-indigo-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium mb-1">No employees found</p>
              <p className="text-sm">{employees.length === 0 ? 'Add your first employee to get started.' : 'Try adjusting your search or filters.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Employee</th>
                    <th className="text-left py-3 px-4 font-medium">Department</th>
                    <th className="text-left py-3 px-4 font-medium">Job Title</th>
                    <th className="text-left py-3 px-4 font-medium">Role</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {employee.first_name[0]}{employee.last_name[0]}
                          </div>
                          <div>
                            <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                            <p className="text-sm text-muted-foreground">{employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{employee.department || 'N/A'}</td>
                      <td className="py-3 px-4">{employee.job_title || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          employee.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          employee.role === 'manager' ? 'bg-blue-100 text-blue-700' : 
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {employee.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(employee.is_active)}`}>
                          {getStatus(employee.is_active)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openEditDialog(employee)}
                            className="p-2 hover:bg-slate-100 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => confirmDelete(employee)}
                            className="p-2 hover:bg-red-50 text-red-500 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Add Employee Modal */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>Create a new employee record and assign their role and department.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input 
                  id="first_name" 
                  value={newEmployee.first_name}
                  onChange={(e) => setNewEmployee({...newEmployee, first_name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input 
                  id="last_name" 
                  value={newEmployee.last_name}
                  onChange={(e) => setNewEmployee({...newEmployee, last_name: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_email">Email</Label>
              <Input 
                id="add_email" 
                type="email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_password">Password</Label>
              <Input 
                id="add_password" 
                type="password"
                value={newEmployee.password}
                onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_phone">Phone</Label>
              <Input 
                id="add_phone" 
                value={newEmployee.phone}
                onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <select 
                className="w-full px-3 py-2 border rounded-md"
                value={newEmployee.job_title}
                onChange={(e) => setNewEmployee({...newEmployee, job_title: e.target.value})}
              >
                <option value="">Select job title</option>
                <option value="Department Head">Department Head</option>
                <option value="Team Lead">Team Lead</option>
                <option value="Senior">Senior</option>
                <option value="Associate">Associate</option>
                <option value="Trainee">Trainee</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <select 
                  className="w-full px-3 py-2 border rounded-md"
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <select 
                  className="w-full px-3 py-2 border rounded-md"
                  value={newEmployee.department_id}
                  onChange={(e) => setNewEmployee({...newEmployee, department_id: e.target.value})}
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddEmployee} 
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Modal */}
      <Dialog open={isEditDialogOpen && !!selectedEmployee} onOpenChange={(open) => !open && setIsEditDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information and status.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_first_name">First Name</Label>
                <Input 
                  id="edit_first_name"
                  value={editEmployee.first_name}
                  onChange={(e) => setEditEmployee({...editEmployee, first_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_last_name">Last Name</Label>
                <Input 
                  id="edit_last_name"
                  value={editEmployee.last_name}
                  onChange={(e) => setEditEmployee({...editEmployee, last_name: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input 
                id="edit_email"
                value={editEmployee.email}
                onChange={(e) => setEditEmployee({...editEmployee, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Phone</Label>
              <Input 
                id="edit_phone"
                value={editEmployee.phone}
                onChange={(e) => setEditEmployee({...editEmployee, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <select 
                className="w-full px-3 py-2 border rounded-md"
                value={editEmployee.job_title}
                onChange={(e) => setEditEmployee({...editEmployee, job_title: e.target.value})}
              >
                <option value="">Select job title</option>
                <option value="Department Head">Department Head</option>
                <option value="Team Lead">Team Lead</option>
                <option value="Senior">Senior</option>
                <option value="Associate">Associate</option>
                <option value="Trainee">Trainee</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <select 
                  className="w-full px-3 py-2 border rounded-md"
                  value={editEmployee.role}
                  onChange={(e) => setEditEmployee({...editEmployee, role: e.target.value})}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <select 
                  className="w-full px-3 py-2 border rounded-md"
                  value={editEmployee.department_id}
                  onChange={(e) => setEditEmployee({...editEmployee, department_id: e.target.value})}
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox"
                id="edit_is_active"
                checked={editEmployee.is_active}
                onChange={(e) => setEditEmployee({...editEmployee, is_active: e.target.checked})}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="edit_is_active" className="cursor-pointer">Active</Label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleEditEmployee} 
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {employeeToDelete?.first_name} {employeeToDelete?.last_name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteEmployee}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}