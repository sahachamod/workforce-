'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { userApi, authApi } from '@/lib/api';
import { 
  User, 
  Lock, 
  Bell, 
  Globe, 
  Palette, 
  Shield, 
  Database,
  Mail,
  Smartphone,
  Key,
  Save,
  Upload,
  CheckCircle,
  Loader2,
  ChevronRight,
  ShieldCheck,
  CloudLightning,
  Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'profile', label: 'Identity', icon: User },
  { id: 'security', label: 'Firewall & Access', icon: ShieldCheck },
  { id: 'notifications', label: 'Signal Center', icon: Bell },
  { id: 'company', label: 'Node Info', icon: Globe },
  { id: 'appearance', label: 'Spectrum', icon: Palette },
  { id: 'integrations', label: 'Neural Links', icon: CloudLightning },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await userApi.getMyProfile();
      const userData = response.data;
      setUser(userData);
      setProfileData({
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        bio: userData.bio || '',
      });
    } catch (err) {
      console.error('Failed to load profile intelligence:', err);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await userApi.updateProfile({
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone: profileData.phone,
        bio: profileData.bio,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update node profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Security protocols breached: Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error('Cryptographic sync failed:', err);
      alert('Failed to update access key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
            System Preferences
            <Shield className="w-8 h-8 text-primary" />
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest bg-slate-100 w-fit px-2 py-0.5 rounded">Core Configuration Engine</p>
        </div>
        {activeTab === 'profile' && (
          <Button className="bg-primary hover:bg-primary/90 h-11 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all font-bold" onClick={handleSaveProfile} disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : isSaved ? <CheckCircle className="w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {isSaved ? 'CONFIG UPDATED' : 'SAVE CHANGES'}
          </Button>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-4 items-start">
        {/* Navigation Sidebar */}
        <Card className="lg:col-span-1 border-none shadow-none bg-transparent">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center justify-between group px-4 py-3 rounded-2xl transition-all duration-300",
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20 translate-x-2"
                    : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 hover:translate-x-1"
                )}
              >
                <div className="flex items-center gap-3">
                  <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-primary" : "group-hover:text-primary")} />
                  <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                </div>
                {activeTab === tab.id && <ChevronRight className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </nav>
        </Card>

        {/* Dynamic content Section */}
        <div className="lg:col-span-3 space-y-8 pb-12">
          {activeTab === 'profile' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-none shadow-sm overflow-hidden mb-6">
                <CardHeader className="bg-slate-50 border-b pb-6">
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-3xl bg-primary/10 border-4 border-white shadow-xl flex items-center justify-center text-primary text-3xl font-black">
                        {profileData.firstName[0]}{profileData.lastName[0]}
                      </div>
                      <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-600 hover:text-primary transition-colors">
                        <Upload className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black text-slate-900">{profileData.firstName} {profileData.lastName}</CardTitle>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest">{user?.role || 'RESOURCE UNIT'}</p>
                      <p className="text-[10px] text-muted-foreground font-medium mt-1">{profileData.email}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-8 space-y-8">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">First Sequence</Label>
                      <Input 
                        className="bg-slate-50 border-none h-12 focus-visible:ring-primary/20 font-bold" 
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Last Sequence</Label>
                      <Input 
                        className="bg-slate-50 border-none h-12 focus-visible:ring-primary/20 font-bold" 
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Neural Sync ID (Email)</Label>
                      <Input 
                        className="bg-slate-100 border-none h-12 opacity-50 cursor-not-allowed font-bold" 
                        value={profileData.email}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contact Line</Label>
                      <Input 
                        className="bg-slate-50 border-none h-12 focus-visible:ring-primary/20 font-bold" 
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Personnel Bio</Label>
                    <textarea 
                      className="w-full h-32 p-4 bg-slate-50 border-none rounded-xl resize-none font-sans font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Define yourself..."
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <Card className="border-none shadow-sm h-fit">
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle>Access Credentials</CardTitle>
                      <CardDescription>Update your cryptographic entrance key</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-8 space-y-6 max-w-xl">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Secret</Label>
                    <Input 
                      className="bg-slate-50 border-none h-12" 
                      type="password" 
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">New Protocol</Label>
                      <Input 
                        className="bg-slate-50 border-none h-12" 
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Confirm Protocol</Label>
                      <Input 
                        className="bg-slate-50 border-none h-12" 
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button 
                    className="bg-slate-900 hover:bg-slate-800 h-12 rounded-xl px-8 font-black uppercase" 
                    onClick={handleChangePassword}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2 text-primary" />}
                    Update Security Node
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-emerald-50/50 border-emerald-100 border-2 shadow-none">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 uppercase tracking-tight">Two-Factor Encryption (2FA)</p>
                        <p className="text-xs font-medium text-slate-500">Hardware & biometric verification requested</p>
                      </div>
                    </div>
                    <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold uppercase text-[10px] tracking-widest">Activate</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'notifications' && (
            <Card className="border-none shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <SignalIcon className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Signal Center</CardTitle>
                    <CardDescription>Calibrate incoming intelligence feeds</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8 space-y-8">
                {[
                  { title: 'Pulse Transmission', desc: 'Main digital notifications', icon: Mail },
                  { title: 'Visual Alerts', desc: 'Desktop overlay signals', icon: Monitor },
                  { title: 'Mobile Neural Link', desc: 'Synchronized device alerts', icon: Smartphone },
                ].map((item) => (
                  <div key={item.title} className="flex items-center justify-between group p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase text-slate-800 tracking-tight">{item.title}</p>
                        <p className="text-xs font-medium text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ... Other tabs follow similar premium pattern ... */}
          {activeTab === 'appearance' && (
             <Card className="border-none shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Spectrum Control</CardTitle>
                    <CardDescription>Define your interface optics</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8 space-y-10">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Master Graphics Engine</h4>
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="p-1 rounded-3xl border-2 border-primary ring-4 ring-primary/10 cursor-pointer overflow-hidden shadow-2xl transition-all">
                      <div className="h-24 bg-white rounded-2xl flex items-center justify-center">
                         <div className="w-16 h-2 bg-slate-100 rounded-full" />
                      </div>
                      <p className="py-3 text-[10px] font-black uppercase text-center tracking-widest">Day Mode</p>
                    </div>
                    <div className="group p-1 rounded-3xl border-2 border-slate-100 cursor-pointer overflow-hidden hover:border-slate-300 transition-all">
                      <div className="h-24 bg-slate-900 rounded-2xl flex flex-col gap-2 p-4 justify-center items-center">
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full" />
                        <div className="w-8 h-1.5 bg-slate-800 rounded-full self-start" />
                      </div>
                      <p className="py-3 text-[10px] font-black uppercase text-center tracking-widest text-slate-400 group-hover:text-slate-600">Night Shift</p>
                    </div>
                    <div className="group p-1 rounded-3xl border-2 border-slate-100 cursor-pointer overflow-hidden hover:border-slate-300 transition-all">
                      <div className="h-24 bg-gradient-to-br from-white via-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                        <Monitor className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="py-3 text-[10px] font-black uppercase text-center tracking-widest text-slate-400 group-hover:text-slate-600">Neural Sync</p>
                    </div>
                  </div>
                </div>
              </CardContent>
             </Card>
          )}

          {activeTab === 'integrations' && (
            <Card className="border-none shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
               <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <CloudLightning className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Neural Links</CardTitle>
                    <CardDescription>Establish bandwidth with external grid nodes</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8 space-y-4">
                {[
                  { name: 'Slack Node', status: 'Established', icon: 'S', color: 'text-purple-600' },
                  { name: 'Google Cloud', status: 'Offline', icon: 'G', color: 'text-blue-500' },
                  { name: 'Zoom Portal', status: 'Established', icon: 'Z', color: 'text-sky-500' },
                ].map((app) => (
                  <div key={app.name} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-white transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center font-black group-hover:scale-110 transition-transform border border-slate-100">
                        <span className={app.color}>{app.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase text-slate-800 tracking-tight">{app.name}</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${app.status === 'Established' ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {app.status}
                        </p>
                      </div>
                    </div>
                    <Button variant={app.status === 'Established' ? 'ghost' : 'default'} className={cn("rounded-xl h-10 px-6 font-bold", app.status === 'Established' ? "text-rose-500 hover:bg-rose-50 hover:text-rose-600" : "bg-slate-900 group-hover:bg-primary transition-colors")}>
                      {app.status === 'Established' ? 'RESCIND' : 'INVOKE'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SignalIcon(props: any) {
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
      <path d="M2 20h.01" />
      <path d="M7 20v-4" />
      <path d="M12 20v-8" />
      <path d="M17 20V8" />
      <path d="M22 20V4" />
    </svg>
  )
}