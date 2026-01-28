
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db';
import { User, UserRole } from '../types';
import { Language, translations } from '../translations';
import { useNavigate } from 'react-router-dom';

const UserManagement: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const navigate = useNavigate();
  const t = translations[lang];
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user.role !== UserRole.ADMIN) {
      navigate('/dashboard');
      return;
    }
    setUsers(db.getUsers());
  }, [user, navigate]);

  const stats = useMemo(() => ({
    total: users.length,
    trainees: users.filter(u => u.role === UserRole.TRAINEE).length,
    instructors: users.filter(u => u.role === UserRole.INSTRUCTOR).length,
    admins: users.filter(u => u.role === UserRole.ADMIN).length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.staffId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleEdit = (u: User) => {
    setEditingUser({ ...u });
    setIsCreating(false);
  };

  const handleCreateNew = () => {
    const newUser: User = {
      id: `u-${Date.now()}`,
      email: '',
      name: '',
      role: UserRole.TRAINEE,
      staffId: '',
      airport: '',
      department: '',
      jobTitle: '',
      jobDescription: '',
      phone: ''
    };
    setEditingUser(newUser);
    setIsCreating(true);
  };

  const handleSave = () => {
    if (editingUser) {
      if (!editingUser.name || !editingUser.email) {
        alert("Name and Email are required.");
        return;
      }
      db.updateUser(editingUser);
      db.logAction(user.id, isCreating ? 'USER_CREATE' : 'USER_UPDATE', `${isCreating ? 'Created' : 'Updated'} user: ${editingUser.name} (${editingUser.email}), Role: ${editingUser.role}`);
      setUsers(db.getUsers());
      setEditingUser(null);
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">Personnel Directory</h1>
          <p className="text-slate-500 mt-1 font-medium text-lg">Central administrative control for airport staff and authorization tiers.</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-slate-900/20 active:scale-95 flex items-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          {t.addNewStaff}
        </button>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Personnel', val: stats.total, color: 'text-slate-900', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
          { label: 'Instructors', val: stats.instructors, color: 'text-blue-600', icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222' },
          { label: 'Administrators', val: stats.admins, color: 'text-red-600', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
          { label: 'Trainees', val: stats.trainees, color: 'text-emerald-600', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
            <div className={`w-14 h-14 rounded-2xl bg-slate-50 ${s.color} flex items-center justify-center shrink-0`}>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              <p className={`text-3xl font-black ${s.color} tracking-tighter`}>{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Side: Directory List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative group mb-8">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter by name, email, or staff ID..."
              className="w-full pl-16 pr-8 py-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold text-slate-900 text-lg transition-all"
            />
          </div>

          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="p-20 text-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100">
                <svg className="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No personnel matches found.</p>
              </div>
            ) : filteredUsers.map(u => (
              <div 
                key={u.id} 
                onClick={() => handleEdit(u)}
                className={`bg-white p-6 rounded-[2.5rem] border transition-all cursor-pointer group flex items-center gap-6 shadow-sm hover:shadow-xl hover:translate-x-1 ${editingUser?.id === u.id ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-blue-500/5' : 'border-slate-100'}`}
              >
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-slate-900/10 group-hover:scale-110 transition-transform">
                    {u.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-black text-slate-900 text-lg tracking-tight truncate">{u.name}</h3>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${
                      u.role === UserRole.ADMIN ? 'bg-red-50 text-red-600 border border-red-100' :
                      u.role === UserRole.INSTRUCTOR ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      u.role === UserRole.INSPECTOR ? 'bg-purple-50 text-purple-600 border border-purple-100' : 
                      'bg-slate-50 text-slate-500 border border-slate-100'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-400 font-bold text-xs">
                    <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>{u.email}</span>
                    <span className="flex items-center gap-1 uppercase tracking-widest text-[10px]"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" /></svg>{u.airport || 'Net-Authorized'}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <div className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Personnel File / Editor */}
        <div className="lg:col-span-5">
          {editingUser ? (
            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 sticky top-8 animate-in fade-in slide-in-from-right-8 duration-500 overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
              <div className="p-10 bg-slate-950 text-white relative">
                <div className="absolute top-0 right-0 p-8">
                  <button onClick={() => setEditingUser(null)} className="text-white/40 hover:text-white transition-colors">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-[2rem] bg-blue-600 flex items-center justify-center font-black text-3xl shadow-2xl shadow-blue-500/30">
                    {editingUser.name.charAt(0) || '?'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">{isCreating ? t.createNewStaff : 'Personnel File'}</h2>
                    <p className="text-blue-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">{isCreating ? 'Awaiting Data Entry' : `Internal ID: ${editingUser.staffId || 'Not Assigned'}`}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
                {/* Identity Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Personal Identity</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Full Name</label>
                        <input type="text" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold transition-all text-sm" placeholder="e.g. John Doe" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Staff ID</label>
                        <input type="text" value={editingUser.staffId || ''} onChange={e => setEditingUser({...editingUser, staffId: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold transition-all text-sm uppercase" placeholder="AP-XXXX" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Email Address</label>
                      <input type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold transition-all text-sm" placeholder="user@airport.com" />
                    </div>
                  </div>
                </div>

                {/* Role Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Tier Authorization</h3>
                  </div>
                  <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[1.5rem] border border-slate-200">
                    {[UserRole.TRAINEE, UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.INSPECTOR].map(r => (
                      <button 
                        key={r} 
                        onClick={() => setEditingUser({...editingUser, role: r})}
                        className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${editingUser.role === r ? 'bg-white text-blue-600 shadow-xl shadow-blue-600/5' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Job Profile Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" /></svg></div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Employment Profile</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Job Title</label>
                      <input type="text" value={editingUser.jobTitle || ''} onChange={e => setEditingUser({...editingUser, jobTitle: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Department</label>
                      <input type="text" value={editingUser.department || ''} onChange={e => setEditingUser({...editingUser, department: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Assigned Airport</label>
                      <input type="text" value={editingUser.airport || ''} onChange={e => setEditingUser({...editingUser, airport: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm" placeholder="e.g. ZAG, LDZA" />
                    </div>
                  </div>
                </div>

                {(editingUser.role === UserRole.INSTRUCTOR || editingUser.role === UserRole.ADMIN) && (
                  <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div>
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">Administrative Auth</h3>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 px-1">{t.authScope}</label>
                      <input type="text" value={editingUser.instructorScope || ''} onChange={e => setEditingUser({...editingUser, instructorScope: e.target.value})} className="w-full px-5 py-3 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 font-bold text-sm" placeholder="Safety, Operations, etc." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 px-1">Validity Expiry</label>
                        <input type="date" value={editingUser.instructorAuthExpiry || ''} onChange={e => setEditingUser({...editingUser, instructorAuthExpiry: e.target.value})} className="w-full px-5 py-3 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 font-bold text-xs" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95">Commit Changes</button>
                <button onClick={() => setEditingUser(null)} className="px-8 bg-white text-slate-500 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest border border-slate-200 hover:bg-slate-50 transition-all">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-16 rounded-[4rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center sticky top-8 animate-in fade-in duration-700 h-[600px] shadow-sm">
              <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                 <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h4 className="text-xl font-black text-slate-900 mb-2">Personnel Selection</h4>
              <p className="text-sm font-bold text-slate-400 max-w-xs leading-relaxed uppercase tracking-widest">Select a staff member from the directory to manage their authorization tiers and credentials.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
