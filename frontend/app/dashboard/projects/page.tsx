'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { projectApi, userApi } from '@/lib/api';
import { 
  Search, 
  Plus, 
  Filter, 
  Download,
  MoreHorizontal,
  Calendar,
  Users,
  ArrowUpRight,
  Loader2,
  Trash2,
  Edit,
  Clock,
  CheckCircle2,
  Kanban,
  List,
  ChevronRight,
  XCircle
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';

const columns = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-400' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', title: 'Review', color: 'bg-yellow-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
];

interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  progress?: number;
  team_size?: number;
  start_date?: string;
  end_date?: string;
  priority?: string;
  client?: string;
}

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  project_id?: number;
  assignee_names?: string[];
  evidence_file?: string;
}

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<{ [key: string]: Task[] }>({
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('employee');

  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [submitTaskTarget, setSubmitTaskTarget] = useState<{projectId: string, taskId: string} | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [editingTaskTarget, setEditingTaskTarget] = useState<{projectId: string, taskId: string} | null>(null);
  const [evidenceViewTask, setEvidenceViewTask] = useState<Task | null>(null);

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    client: '',
    start_date: '',
    end_date: '',
    member_ids: [] as string[]
  });

  const [newTask, setNewTask] = useState({
    title: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    assigned_to: ''
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
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const projectsRes = await projectApi.getProjects({ limit: 50 });
      const projectsList = Array.isArray(projectsRes.data) ? projectsRes.data : (projectsRes.data.projects || []);
      setProjects(projectsList);
      
      const tasksData: { [key: string]: Task[] } = {
        todo: [],
        in_progress: [],
        review: [],
        done: [],
      };
      
      // Load tasks for all projects to populate the board
      await Promise.all(projectsList.map(async (project: Project) => {
        try {
          const tasksRes = await projectApi.getTasks(project.id.toString());
          const projectTasks = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.tasks || []);
          projectTasks.forEach((task: Task) => {
            const statusKey = task.status?.toLowerCase().replace(' ', '_') || 'todo';
            if (tasksData[statusKey]) {
              tasksData[statusKey].push({ ...task, project_id: project.id });
            } else {
              tasksData.todo.push({ ...task, project_id: project.id });
            }
          });
        } catch (e) {
          console.error(`Failed to load tasks for project ${project.id}`, e);
        }
      }));
      
      setTasks(tasksData);
    } catch (err: any) {
      setError('Failed to load projects and tasks');
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

  const handleCreateProject = async () => {
    if (!newProject.name) return;
    try {
      setSaving(true);
      const payload: any = { ...newProject };
      if (!payload.start_date) delete payload.start_date;
      if (!payload.end_date) delete payload.end_date;
      if (!payload.client) delete payload.client;
      await projectApi.createProject(payload);
      setIsProjectDialogOpen(false);
      setNewProject({
        name: '', description: '', status: 'planning', priority: 'medium',
        client: '', start_date: '', end_date: '', member_ids: []
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !selectedProjectId) return;
    try {
      setSaving(true);
      const payload: any = { ...newTask };
      if (!payload.due_date) delete payload.due_date;
      if (payload.assigned_to) {
        payload.assignee_ids = [payload.assigned_to];
      }
      delete payload.assigned_to;
      payload.project_id = selectedProjectId;

      if (editingTaskTarget) {
        delete payload.project_id;
        delete payload.assignee_ids;
        await projectApi.updateTask(editingTaskTarget.projectId, editingTaskTarget.taskId, payload);
      } else {
        payload.project_id = selectedProjectId;
        await projectApi.createTask(selectedProjectId, payload);
      }

      setIsTaskDialogOpen(false);
      setEditingTaskTarget(null);
      setNewTask({
        title: '', status: 'todo', priority: 'medium', due_date: '', assigned_to: ''
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (projectId: string, taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await projectApi.deleteTask(projectId, taskId);
      fetchData();
    } catch (e) {
      alert('Failed to delete task');
    }
  };

  const handleReviewTask = async (projectId: string, taskId: string, approved: boolean) => {
    try {
      await projectApi.updateTask(projectId, taskId, { status: approved ? 'done' : 'in_progress' });
      fetchData();
    } catch (e) {
      alert('Failed to update review status');
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('Delete this project and all its tasks?')) return;
    try {
      await projectApi.deleteProject(id.toString());
      fetchData();
    } catch (e) {
      alert('Failed to delete project');
    }
  };

  const handleSubmitTask = async () => {
    if (!submitTaskTarget || !evidenceFile) return;
    try {
      setSaving(true);
      await projectApi.submitTaskWithEvidence(submitTaskTarget.projectId, submitTaskTarget.taskId, evidenceFile);
      setIsSubmitDialogOpen(false);
      setEvidenceFile(null);
      setSubmitTaskTarget(null);
      fetchData();
    } catch (err) {
      alert('Failed to submit task with evidence. Ensure your backend is running and matches API signature.');
    } finally {
      setSaving(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-700 bg-red-100';
      case 'medium': return 'text-amber-700 bg-amber-100';
      case 'low': return 'text-emerald-700 bg-emerald-100';
      default: return 'text-slate-700 bg-slate-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-sky-100 text-sky-700';
      case 'on_hold': return 'bg-amber-100 text-amber-700';
      case 'planning': return 'bg-slate-100 text-slate-700';
      case 'done': case 'completed': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage projects and track task progress</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {(userRole === 'admin' || userRole === 'manager') && (
            <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsProjectDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-primary">
            <CardTitle className="text-xs font-bold uppercase tracking-wider">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{projects.filter(p => p.status === 'active').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-amber-500">
            <CardTitle className="text-xs font-bold uppercase tracking-wider">Under Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.filter(p => p.status === 'on_hold').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-emerald-500">
            <CardTitle className="text-xs font-bold uppercase tracking-wider">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.filter(p => p.status === 'done' || p.status === 'completed').length}</div>
          </CardContent>
        </Card>
        <Card className="hidden lg:block">
          <CardHeader className="pb-2 text-red-500">
            <CardTitle className="text-xs font-bold uppercase tracking-wider">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.filter(p => p.priority === 'high').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects or tasks..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <Button 
              variant={viewMode === 'board' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('board')}
              className="h-8 gap-2"
            >
              <Kanban className="w-4 h-4" />
              Board
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 gap-2"
            >
              <List className="w-4 h-4" />
              List
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Syncing work items...</p>
        </div>
      ) : (
        <>
          {viewMode === 'board' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {columns.map((column) => (
                <div key={column.id} className="flex flex-col h-full bg-slate-50/50 rounded-xl p-3 border border-slate-200/50 shadow-sm">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${column.color}`} />
                      <h3 className="font-bold text-sm text-slate-700">{column.title}</h3>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 rounded-full py-0.5">
                        {tasks[column.id]?.length || 0}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    {tasks[column.id]?.map((task) => (
                      <div 
                        key={task.id} 
                        className="group p-4 rounded-xl border bg-white hover:border-primary/50 hover:shadow-md transition-all cursor-pointer relative"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">#{task.id.toString().substring(0,8)}</span>
                        </div>
                        {(userRole === 'admin' || userRole === 'manager') && (
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 p-1 rounded-md backdrop-blur-sm shadow-sm border border-slate-100">
                             {task.status === 'review' && (
                                <>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-green-700 bg-green-100 hover:bg-green-200" onClick={(e) => { e.stopPropagation(); handleReviewTask(task.project_id!.toString(), task.id.toString(), true) }} title="Approve"><CheckCircle2 className="w-3 h-3" /></Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-700 bg-red-100 hover:bg-red-200" onClick={(e) => { e.stopPropagation(); handleReviewTask(task.project_id!.toString(), task.id.toString(), false) }} title="Reject"><XCircle className="w-3 h-3" /></Button>
                                </>
                             )}
                             <Button size="icon" variant="ghost" className="h-6 w-6 bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={(e) => {
                               e.stopPropagation();
                               setSelectedProjectId(task.project_id!.toString());
                               setEditingTaskTarget({projectId: task.project_id!.toString(), taskId: task.id.toString()});
                               setNewTask({
                                 title: task.title,
                                 status: task.status,
                                 priority: task.priority || 'medium',
                                 due_date: task.due_date || '',
                                 assigned_to: '' 
                               });
                               setIsTaskDialogOpen(true);
                             }} title="Edit Task">
                               <Edit className="w-3 h-3" />
                             </Button>
                             <Button size="icon" variant="ghost" className="h-6 w-6 bg-red-50 text-red-600 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.project_id!.toString(), task.id.toString()) }} title="Delete Task">
                               <Trash2 className="w-3 h-3" />
                             </Button>
                          </div>
                        )}
                        <h4 className="font-bold text-sm mb-3 text-slate-800 line-clamp-2 pr-8">{task.title}</h4>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-slate-50 px-2 py-1 rounded-md">
                            <Calendar className="w-3 h-3" />
                            {task.due_date || 'No deadline'}
                          </div>
                          {task.assignee_names && task.assignee_names.length > 0 && (
                            <div className="flex -space-x-2">
                              {task.assignee_names.map((name, i) => (
                                <div key={i} className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold border-2 border-white" title={name}>
                                  {name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {task.status === 'review' && task.evidence_file && (userRole === 'admin' || userRole === 'manager') && (
                          <button
                            className="mt-1 mb-1 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setEvidenceViewTask(task); }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            View Evidence & Approve
                          </button>
                        )}
                        {['todo', 'in_progress'].includes(task.status) && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-3 w-full border-dashed text-xs h-7 text-primary hover:text-primary hover:border-primary/50"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSubmitTaskTarget({projectId: task.project_id!.toString(), taskId: task.id.toString()}); 
                              setIsSubmitDialogOpen(true); 
                            }}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Submit for Approval
                          </Button>
                        )}
                      </div>
                    ))}
                    {(userRole === 'admin' || userRole === 'manager') && (
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-2 h-10 border-2 border-dashed border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-white text-xs font-medium"
                        onClick={() => { 
                          if (projects.length > 0) {
                            setSelectedProjectId(projects[0].id.toString());
                            setNewTask({...newTask, status: column.id});
                            setIsTaskDialogOpen(true); 
                          } else {
                            alert('Create a project first!');
                          }
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Add Task
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="overflow-hidden border-none shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/50 border-b">
                        <th className="text-left py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">Project Profile</th>
                        <th className="text-left py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">Status</th>
                        <th className="text-left py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">Progress</th>
                        <th className="text-left py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">Resources</th>
                        <th className="text-left py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">Priority</th>
                        <th className="text-right py-4 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">Commands</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {projects.map((project) => (
                        <tr key={project.id} className="hover:bg-primary/[0.02] transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
                                {project.name[0]}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{project.name}</p>
                                <p className="text-xs text-muted-foreground">{project.client || 'Internal Resource'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm font-semibold">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(project.status)}`}>
                              {project.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500">{project.progress || 0}%</span>
                              </div>
                              <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(var(--primary),0.4)]" 
                                  style={{ width: `${project.progress || 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 w-fit px-2 py-1 rounded-lg">
                              <Users className="w-3.5 h-3.5" />
                              {project.team_size || 0}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${getPriorityColor(project.priority || 'medium')}`}>
                              {project.priority || 'Medium'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {(userRole === 'admin' || userRole === 'manager') && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 text-red-500" onClick={() => handleDeleteProject(project.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Project Dialog */}
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Project Initiative</DialogTitle>
            <DialogDescription>Define project parameters and resource allocation.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label>Project Identity</Label>
              <Input 
                placeholder="Enterprise CRM Implementation"
                value={newProject.name}
                onChange={(e) => setNewProject({...newProject, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Executive Summary</Label>
              <textarea 
                className="w-full px-3 py-2 border rounded-md min-h-[80px] outline-none font-sans text-sm focus:ring-2 focus:ring-primary/20"
                placeholder="Describe project goals and scope..."
                value={newProject.description}
                onChange={(e) => setNewProject({...newProject, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phase</Label>
                <select 
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={newProject.status}
                  onChange={(e) => setNewProject({...newProject, status: e.target.value})}
                >
                  <option value="planning">Strategic Planning</option>
                  <option value="active">Development Phase (Active)</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Deployment Complete</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Risk Priority</Label>
                <select 
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={newProject.priority}
                  onChange={(e) => setNewProject({...newProject, priority: e.target.value})}
                >
                  <option value="low">Low Impact</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">Critical / High</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kick-off Date</Label>
                <Input 
                  type="date"
                  value={newProject.start_date}
                  onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Finalization</Label>
                <Input 
                  type="date"
                  value={newProject.end_date}
                  onChange={(e) => setNewProject({...newProject, end_date: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assigned Team Members</Label>
              <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-[120px] overflow-y-auto bg-slate-50">
                {employees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors">
                    <input 
                      type="checkbox" 
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                      checked={newProject.member_ids.includes(emp.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setNewProject(prev => ({
                          ...prev, 
                          member_ids: checked 
                            ? [...prev.member_ids, emp.id] 
                            : prev.member_ids.filter(id => id !== emp.id)
                        }));
                      }}
                    />
                    {emp.first_name} {emp.last_name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 px-1">
            <Button variant="outline" onClick={() => setIsProjectDialogOpen(false)}>Abort</Button>
            <Button onClick={handleCreateProject} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Launch Initiative
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={(open) => {
        setIsTaskDialogOpen(open);
        if (!open) {
          setEditingTaskTarget(null);
          setNewTask({title: '', status: 'todo', priority: 'medium', due_date: '', assigned_to: ''});
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTaskTarget ? "Update Task Specification" : "Assemble New Task"}</DialogTitle>
            <DialogDescription>{editingTaskTarget ? "Modify constraints and timeline of the task." : "Assign tasks to relevant project initiatives."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Target Project</Label>
              <select 
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Task Headline</Label>
              <Input 
                placeholder="Finalize API certification logic"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assign Resource</Label>
                <select 
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})}
                >
                  <option value="">Unassigned</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Target Status</Label>
                <select 
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={newTask.status}
                  onChange={(e) => setNewTask({...newTask, status: e.target.value})}
                >
                  {columns.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editingTaskTarget ? "Commit Changes" : "Deploy Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Evidence Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Task for Approval</DialogTitle>
            <DialogDescription>Attach evidence to complete this task and mark it for review.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label>Evidence File Attachment</Label>
              <Input 
                type="file" 
                onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setIsSubmitDialogOpen(false); setEvidenceFile(null); setSubmitTaskTarget(null); }}>Cancel</Button>
            <Button onClick={handleSubmitTask} disabled={saving || !evidenceFile}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Upload & Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evidence Review Dialog */}
      <Dialog open={!!evidenceViewTask} onOpenChange={(open) => { if (!open) setEvidenceViewTask(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Evidence Review
            </DialogTitle>
            <DialogDescription>
              Submitted by employee for task: <strong>{evidenceViewTask?.title}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {evidenceViewTask?.evidence_file ? (() => {
              const filePath = evidenceViewTask.evidence_file!;
              // Strip any leading 'uploads/' or 'uploads\' prefix (old DB format), then get bare filename
              const bareFile = filePath.replace(/^uploads[/\\]/i, '');
              const fileName = bareFile.split(/[/\\]/).pop() || bareFile;
              const ext = fileName.split('.').pop()?.toLowerCase() || '';
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
              const isPdf = ext === 'pdf';
              const fileUrl = `http://localhost:8005/uploads/${fileName}`;
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-slate-50 border rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">{ext || 'FILE'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{fileName}</p>
                      <p className="text-xs text-slate-500">Attached evidence file</p>
                    </div>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      Open
                    </a>
                  </div>
                  {isImage && (
                    <div className="rounded-xl overflow-hidden border bg-slate-100 flex items-center justify-center min-h-[160px]">
                      <img
                        src={fileUrl}
                        alt="Evidence"
                        className="max-w-full max-h-64 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  {isPdf && (
                    <div className="rounded-xl overflow-hidden border h-64">
                      <iframe src={fileUrl} className="w-full h-full" title="Evidence PDF" />
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="text-center py-6 text-slate-400 text-sm">No evidence file attached to this task.</div>
            )}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-800">⚠ Review carefully before approving</p>
              <p className="text-xs text-amber-700 mt-0.5">Approving will mark the task as Done. Rejecting sends it back to In Progress.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
              onClick={() => {
                if (evidenceViewTask) {
                  handleReviewTask(evidenceViewTask.project_id!.toString(), evidenceViewTask.id.toString(), false);
                  setEvidenceViewTask(null);
                }
              }}
            >
              <XCircle className="w-4 h-4" /> Reject — Send Back
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={() => {
                if (evidenceViewTask) {
                  handleReviewTask(evidenceViewTask.project_id!.toString(), evidenceViewTask.id.toString(), true);
                  setEvidenceViewTask(null);
                }
              }}
            >
              <CheckCircle2 className="w-4 h-4" /> Approve — Mark Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RotateCcw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

function Save(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}