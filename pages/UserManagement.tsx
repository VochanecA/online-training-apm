
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (user.role !== UserRole.ADMIN) {
      navigate('/dashboard');
      return;
    }
    setUsers(db.getUsers());
  }, [user, navigate]);

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
    <div className="max-w-6xl mx-auto animate-in fade-in duration-700">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t.userManagement}</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage staff roles and personnel authorization profiles.</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          {t.addNewStaff}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Personnel</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.airportName}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.role}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic font-medium">No personnel records found.</td>
                    </tr>
                  ) : users.map(u => (
                    <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                             {u.name.charAt(0)}
                           </div>
                           <div>
                              <p className="font-black text-slate-900 tracking-tight">{u.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 font-mono">{u.email}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                         <p className="text-xs font-black text-slate-600 uppercase tracking-widest">{u.airport || '—'}</p>
                         <p className="text-[10px] text-slate-400 font-bold">{u.department || 'Unassigned Dept'}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                          u.role === UserRole.ADMIN ? 'bg-red-100 text-red-700' :
                          u.role === UserRole.INSTRUCTOR ? 'bg-blue-100 text-blue-700' :
                          u.role === UserRole.INSPECTOR ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => handleEdit(u)}
                          className="p-3 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-100"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          {editingUser ? (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 sticky top-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-blue-600/5 rounded-full"></div>
              
              <h2 className="text-xl font-black text-slate-900 mb-8 uppercase tracking-tight flex items-center gap-3">
                 <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                 {isCreating ? t.createNewStaff : 'Update Personnel File'}
              </h2>
              
              <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Name</label>
                    <input 
                      type="text" 
                      value={editingUser.name} 
                      onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold transition-all text-sm"
                      placeholder="Full Name"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Email</label>
                    <input 
                      type="email" 
                      value={editingUser.email} 
                      onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold transition-all text-sm"
                      placeholder="email@airport.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t.role}</label>
                    <select 
                      value={editingUser.role}
                      onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold transition-all text-sm appearance-none"
                    >
                      <option value={UserRole.TRAINEE}>Trainee</option>
                      <option value={UserRole.INSTRUCTOR}>Instructor</option>
                      <option value={UserRole.ADMIN}>Admin</option>
                      <option value={UserRole.INSPECTOR}>Inspector</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t.staffId}</label>
                    <input 
                      type="text" 
                      value={editingUser.staffId || ''} 
                      onChange={e => setEditingUser({...editingUser, staffId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold transition-all text-sm"
                      placeholder="ID CODE"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                   <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Employment Details</h3>
                   <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t.airportName}</label>
                        <input 
                          type="text" 
                          value={editingUser.airport || ''} 
                          onChange={e => setEditingUser({...editingUser, airport: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 font-bold text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t.departmentName}</label>
                        <input 
                          type="text" 
                          value={editingUser.department || ''} 
                          onChange={e => setEditingUser({...editingUser, department: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 font-bold text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t.jobTitle}</label>
                        <input 
                          type="text" 
                          value={editingUser.jobTitle || ''} 
                          onChange={e => setEditingUser({...editingUser, jobTitle: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 font-bold text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t.jobDescription}</label>
                        <textarea 
                          value={editingUser.jobDescription || ''} 
                          onChange={e => setEditingUser({...editingUser, jobDescription: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 font-bold text-sm"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t.phoneNumber}</label>
                        <input 
                          type="tel" 
                          value={editingUser.phone || ''} 
                          onChange={e => setEditingUser({...editingUser, phone: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 font-bold text-sm"
                        />
                      </div>
                   </div>
                </div>
                
                {(editingUser.role === UserRole.INSTRUCTOR || editingUser.role === UserRole.ADMIN) && (
                  <div className="pt-4 border-t border-slate-100">
                       <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Authorization Profile</h3>
                       <div className="space-y-4 p-5 bg-blue-50/50 rounded-[2rem] border border-blue-100">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.authScope}</label>
                            <input 
                              type="text" 
                              value={editingUser.instructorScope || ''} 
                              onChange={e => setEditingUser({...editingUser, instructorScope: e.target.value})}
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600/20 text-sm font-bold"
                              placeholder="e.g. Flight Safety, Security"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.authStartDate}</label>
                              <input 
                                type="date" 
                                value={editingUser.instructorAuthStartDate || ''} 
                                onChange={e => setEditingUser({...editingUser, instructorAuthStartDate: e.target.value})}
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600/20 text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.authEndDate}</label>
                              <input 
                                type="date" 
                                value={editingUser.instructorAuthExpiry || ''} 
                                onChange={e => setEditingUser({...editingUser, instructorAuthExpiry: e.target.value})}
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600/20 text-xs font-bold"
                              />
                            </div>
                          </div>
                       </div>
                  </div>
                )}
              </div>

              <div className="pt-8 flex gap-3 border-t border-slate-100 mt-6">
                <button onClick={handleSave} className="flex-1 bg-slate-900 text-white py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all active:scale-95">{t.saveUser}</button>
                <button onClick={() => setEditingUser(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all active:scale-95">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-12 rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center sticky top-8 animate-in fade-in zoom-in-95 duration-700">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-slate-100">
                 <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed">Select a personnel file to manage authorization tiers or create a new staff profile.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
