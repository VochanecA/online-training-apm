
import React, { useState } from 'react';
import { db } from '../db';
import { User, UserRole } from '../types';
import { Language, translations } from '../translations';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  lang: Language;
  setLang: (l: Language) => void;
}

const Login: React.FC<LoginProps> = ({ lang, setLang }) => {
  const navigate = useNavigate();
  const t = translations[lang];
  const [showLogin, setShowLogin] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.TRAINEE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: selectedRole,
            },
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        alert(lang === 'en' ? 'Registration successful! Please check your email for verification.' : 'Registracija uspješna! Provjerite e-poštu za potvrdu.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { title: 'Compliance Ready', desc: 'Designed for EASA/ICAO training standards with automated record keeping.', icon: '🛡️' },
    { title: 'Immutable Exams', desc: 'Secure, randomized exams that cannot be edited once submitted.', icon: '📜' },
    { title: 'Training Roadmap', desc: 'Automated refresher course linking and certificate validity tracking.', icon: '🗺️' },
    { title: 'Audit Analytics', desc: 'Real-time performance reports and audit logs for regulatory inspectors.', icon: '📊' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 overflow-x-hidden selection:bg-blue-500/30">
      {/* Dynamic Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600 rounded-full blur-[160px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-900 rounded-full blur-[160px]"></div>
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-8 max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-2xl shadow-xl shadow-blue-500/40">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <span className="text-3xl font-black text-white tracking-tight uppercase">CloudTraining</span>
        </div>
        
        <div className="flex items-center space-x-8">
          <div className="hidden md:flex bg-slate-900/60 p-1.5 rounded-full border border-slate-800 shadow-inner">
            <button onClick={() => setLang('en')} className={`px-4 py-1 rounded-full text-[10px] font-black tracking-tighter transition-all ${lang === 'en' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>EN</button>
            <button onClick={() => setLang('me')} className={`px-4 py-1 rounded-full text-[10px] font-black tracking-tighter transition-all ${lang === 'me' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>ME</button>
          </div>
          <button onClick={() => { setShowLogin(true); setIsRegister(false); }} className="bg-white text-slate-950 px-8 py-3 rounded-2xl font-black text-sm hover:scale-105 transition-all active:scale-95">{lang === 'en' ? 'Sign In' : 'Prijavi se'}</button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-20 lg:py-32 flex flex-col lg:flex-row items-center justify-between gap-16">
        <div className={`flex-1 transition-all duration-1000 ${showLogin ? 'lg:opacity-40 blur-sm' : ''}`}>
          <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-[10px] font-black tracking-[0.2em] uppercase mb-10">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-ping"></span>
            Aviation Personnel Portal
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.95] mb-8 tracking-tighter">
            Cloud<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Training</span> LMS.
          </h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl leading-relaxed mb-12">
            Automate certificate validity, exam randomness, and instructor sign-offs with a production-ready LMS built for airport safety and personnel compliance.
          </p>
          <div className="grid grid-cols-2 gap-6 mb-12">
             {features.map((f, i) => (
               <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all">
                  <div className="text-2xl mb-2">{f.icon}</div>
                  <h4 className="text-sm font-black text-white mb-1 uppercase tracking-tight">{f.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{f.desc}</p>
               </div>
             ))}
          </div>
          <div className="flex gap-4">
            <button onClick={() => { setShowLogin(true); setIsRegister(true); }} className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 shadow-2xl shadow-blue-500/30 transition-all active:scale-95 flex items-center">
               Get Started
               <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
            <button onClick={() => navigate('/public')} className="px-10 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-lg hover:bg-white/10 transition-all active:scale-95 flex items-center">
               Browse Catalog
            </button>
          </div>
        </div>

        <div className="flex-1 w-full max-w-lg">
           <div className={`transition-all duration-700 ${showLogin ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
              <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] shadow-2xl">
                 <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-black text-white tracking-tighter">{isRegister ? 'Register' : 'Login'}</h2>
                    <button onClick={() => setShowLogin(false)} className="text-slate-500 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                 </div>
                 <form onSubmit={handleAuth} className="space-y-4">
                    {isRegister && (
                      <>
                        <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-blue-500 text-white font-medium" placeholder="Full Name" />
                        <div className="flex gap-2">
                           {[UserRole.TRAINEE, UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.INSPECTOR].map(r => (
                             <button key={r} type="button" onClick={() => setSelectedRole(r)} className={`flex-1 py-3 rounded-xl border text-[9px] font-black uppercase tracking-tighter transition-all ${selectedRole === r ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'}`}>{r}</button>
                           ))}
                        </div>
                      </>
                    )}
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-blue-500 text-white font-medium" placeholder="Email Address" />
                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-blue-500 text-white font-medium" placeholder="Password" />
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl">{error}</div>}
                    <button disabled={loading} type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50">{loading ? 'Processing...' : (isRegister ? 'Register' : 'Sign In')}</button>
                 </form>
                 <button onClick={() => setIsRegister(!isRegister)} className="w-full mt-6 text-sm font-bold text-slate-500 hover:text-white transition-colors">{isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}</button>
              </div>
           </div>
           
           {!showLogin && (
              <div className="relative group cursor-pointer h-96 flex items-center justify-center" onClick={() => setShowLogin(true)}>
                 <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full animate-pulse"></div>
                 <div className="relative bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-12 rounded-[4rem] text-center group-hover:scale-105 transition-all duration-700">
                    <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/40 animate-bounce"><svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg></div>
                    <div className="text-2xl font-black text-white">Secure Portal</div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-2">Staff Only</p>
                 </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Login;
