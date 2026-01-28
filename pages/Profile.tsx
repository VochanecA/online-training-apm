
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { db } from '../db';
import { Language, translations } from '../translations';
import { supabase } from '../lib/supabase';

const Profile: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const t = translations[lang];
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editedUser, setEditedUser] = useState<User>({ ...user });
  const [showSuccess, setShowSuccess] = useState(false);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return { color: 'bg-red-50 text-red-600 border-red-100', desc: t.roleAdminDesc };
      case UserRole.INSTRUCTOR: return { color: 'bg-blue-50 text-blue-600 border-blue-100', desc: t.roleInstructorDesc };
      case UserRole.INSPECTOR: return { color: 'bg-purple-50 text-purple-600 border-purple-100', desc: t.roleInspectorDesc };
      default: return { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', desc: t.roleTraineeDesc };
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error: supabaseError } = await supabase.auth.updateUser({
        data: {
          full_name: editedUser.name,
          job_title: editedUser.jobTitle,
          department: editedUser.department,
          airport: editedUser.airport,
          phone: editedUser.phone,
          job_description: editedUser.jobDescription
        }
      });
      if (supabaseError) throw supabaseError;

      db.updateUser(editedUser);
      db.logAction(user.id, 'PROFILE_UPDATE', `Updated personal profile details.`);

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsEditing(false);
        window.location.reload(); 
      }, 1500);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentRole = getRoleBadge(user.role);

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-700 pb-20">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="inline-flex items-center px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-blue-100 shadow-sm">
            Personnel Information File
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">Professional Profile</h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">Manage your digital training identity and authorization credentials.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-slate-900/10 active:scale-95 flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit Account
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Core Identity Card */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden sticky top-8">
            <div className="h-32 bg-slate-900 relative overflow-hidden">
               <div className="absolute inset-0 bg-blue-600 opacity-20 blur-[60px] translate-x-1/2 -translate-y-1/2"></div>
               <div className="absolute inset-0 bg-indigo-900 opacity-20 blur-[60px] -translate-x-1/2 translate-y-1/2"></div>
            </div>
            <div className="px-10 pb-12 -mt-16 relative">
              <div className="w-32 h-32 rounded-[3rem] bg-white p-2 shadow-2xl mx-auto mb-6">
                <div className="w-full h-full rounded-[2.5rem] bg-slate-900 flex items-center justify-center text-4xl font-black text-white relative overflow-hidden group">
                  {user.name.charAt(0)}
                </div>
              </div>
              
              <div className="text-center space-y-2 mb-10">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{user.name}</h2>
                <p className="text-slate-400 font-bold font-mono text-sm">{user.email}</p>
                <div className="flex justify-center pt-4">
                  <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border ${currentRole.color}`}>
                    {user.role}
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-8 border-t border-slate-50">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Training Status</span>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Verified
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auth Scope</span>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Full Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info / Form */}
        <div className="lg:col-span-8">
          {isEditing ? (
            <div className="bg-white rounded-[4rem] p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 animate-in slide-in-from-bottom-10 duration-500">
               <h3 className="text-2xl font-black text-slate-900 mb-10 tracking-tight">Identity Settings</h3>
               <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Display Name</label>
                      <input type="text" value={editedUser.name} onChange={e => setEditedUser({...editedUser, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Job Title</label>
                      <input type="text" value={editedUser.jobTitle || ''} onChange={e => setEditedUser({...editedUser, jobTitle: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold transition-all" placeholder="e.g. Senior Technician" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Department</label>
                      <input type="text" value={editedUser.department || ''} onChange={e => setEditedUser({...editedUser, department: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold transition-all" placeholder="e.g. Ground Ops" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Primary Airport</label>
                      <input type="text" value={editedUser.airport || ''} onChange={e => setEditedUser({...editedUser, airport: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold transition-all" placeholder="e.g. TGD / Podgorica" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Contact Phone</label>
                      <input type="tel" value={editedUser.phone || ''} onChange={e => setEditedUser({...editedUser, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold transition-all" placeholder="+382 ..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Job Description / Professional Summary</label>
                    <textarea value={editedUser.jobDescription || ''} onChange={e => setEditedUser({...editedUser, jobDescription: e.target.value})} rows={4} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-medium transition-all" placeholder="Describe your key responsibilities and expertise..." />
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button type="submit" disabled={loading} className="flex-1 px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                      {loading ? 'Processing...' : 'Commit Changes'}
                    </button>
                    <button type="button" onClick={() => { setIsEditing(false); setEditedUser({...user}); }} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-200 transition-all active:scale-95">
                      Cancel
                    </button>
                  </div>
               </form>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="bg-white rounded-[4rem] p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-[80px] group-hover:bg-blue-50 transition-all duration-1000"></div>
                 <div className="relative z-10">
                    <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 mb-8 border-l-4 border-blue-600 pl-4">Career Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <div className="space-y-6">
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Current Role</p>
                            <p className="text-xl font-black text-slate-900 tracking-tight">{user.jobTitle || 'Unassigned Personnel'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Division / Department</p>
                            <p className="text-xl font-black text-slate-900 tracking-tight">{user.department || 'Awaiting Placement'}</p>
                          </div>
                       </div>
                       <div className="space-y-6">
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Duty Station</p>
                            <p className="text-xl font-black text-slate-900 tracking-tight">{user.airport || 'Network Wide'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Emergency Contact</p>
                            <p className="text-xl font-black text-slate-900 tracking-tight">{user.phone || 'None Registered'}</p>
                          </div>
                       </div>
                    </div>

                    <div className="mt-12 pt-12 border-t border-slate-50">
                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Professional Brief</p>
                       <p className="text-lg text-slate-600 font-medium leading-relaxed">
                         {user.jobDescription || 'No professional bio available in the personnel file.'}
                       </p>
                    </div>
                 </div>
              </div>

              {/* Training Integrity / Auth Status Card */}
              <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-10">
                     <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                     </div>
                     <h3 className="text-2xl font-black tracking-tight uppercase">Authorization Registry</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem]">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Hierarchy Level</p>
                        <p className="text-xl font-black tracking-tighter uppercase">{user.role}</p>
                     </div>
                     <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem]">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Scope of Duty</p>
                        <p className="text-xl font-black tracking-tighter uppercase line-clamp-1">{user.instructorScope || 'Standard Safety'}</p>
                     </div>
                     <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem]">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Auth. Expiry</p>
                        <p className="text-xl font-black tracking-tighter uppercase">{user.instructorAuthExpiry ? new Date(user.instructorAuthExpiry).toLocaleDateString() : 'Active'}</p>
                     </div>
                  </div>
                  
                  <div className="mt-8 p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl flex items-center gap-5">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="text-sm font-bold text-slate-300">Personnel records are audited in real-time. This profile is compliant with EASA Part-145 and ICAO SMS standards.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSuccess && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-20 duration-500">
           <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
           </div>
           <p className="text-sm font-black uppercase tracking-widest">Sertifikat identity updated successfully</p>
        </div>
      )}
    </div>
  );
};

export default Profile;
