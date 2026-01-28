
import React, { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole } from '../types';
import { db } from '../db';
import { Language, translations } from '../translations';
import { supabase } from '../lib/supabase';

const Icon = ({ name, className }: { name: string, className?: string }) => {
  switch (name) {
    case 'dashboard': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
    case 'courses': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
    case 'users': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
    case 'management': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    case 'reports': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    case 'logout': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
    case 'profile': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
    default: return null;
  }
};

interface LayoutProps {
  children: ReactNode;
  user: User;
  lang: Language;
  setLang: (l: Language) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, lang, setLang }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const t = translations[lang];

  const menuItems = [
    { label: t.dashboard, icon: 'dashboard', path: '/dashboard' },
    { label: t.myCourses, icon: 'courses', path: '/courses' },
    { label: t.profile, icon: 'profile', path: '/profile' },
  ];

  if (user.role === UserRole.ADMIN || user.role === UserRole.INSTRUCTOR) {
    menuItems.push({ label: t.courseManagement, icon: 'management', path: '/admin/courses' });
    menuItems.push({ label: t.reports, icon: 'reports', path: '/admin/reports' });
  }

  if (user.role === UserRole.ADMIN) {
    menuItems.push({ label: t.userManagement, icon: 'users', path: '/admin/users' });
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <span className="text-xl font-black tracking-tight uppercase">AeroCert</span>
          </div>
          
          <div className="flex gap-1">
            <button 
              onClick={() => setLang('en')}
              className={`text-[10px] font-black px-1 rounded transition-colors ${lang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >EN</button>
            <button 
              onClick={() => setLang('hr')}
              className={`text-[10px] font-black px-1 rounded transition-colors ${lang === 'hr' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >ME</button>
          </div>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                location.pathname.startsWith(item.path) 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon name={item.icon} className="w-5 h-5" />
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div onClick={() => navigate('/profile')} className="flex items-center space-x-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 cursor-pointer rounded-xl mb-4 transition-all">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-black text-xs shrink-0 shadow-lg">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-black truncate tracking-tight">{user.name}</p>
              <p className="text-[10px] text-slate-500 capitalize font-black uppercase tracking-widest">{user.role.toLowerCase()}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all font-black text-xs uppercase tracking-widest"
          >
            <Icon name="logout" className="w-5 h-5" />
            <span>{t.signOut}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-6xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
