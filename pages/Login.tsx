import React, { useState } from 'react';
import { UserRole } from '../types';
import { Language, translations } from '../translations';
import { supabase } from '../lib/supabase';

interface LoginProps {
  lang: Language;
  setLang: (l: Language) => void;
}

const Login: React.FC<LoginProps> = ({ lang, setLang }) => {
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
          // DODAJTE OVU LINIJU - koristite vašu produkcijsku URL
          emailRedirectTo: window.location.hostname.includes('localhost') 
            ? `${window.location.origin}/#/auth/callback`
            : 'https://online-training-apm.vercel.app/#/auth/callback'
        }
      });
      if (error) throw error;
      alert(lang === 'en' 
        ? 'Registration successful! Please check your email for verification. You will be redirected to the login page after verification.' 
        : 'Registracija uspješna! Provjerite e-poštu za potvrdu. Bit ćete preusmjereni na stranicu za prijavu nakon verifikacije.');
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
    { 
      title: 'Compliance Ready', 
      desc: 'Designed for EASA/ICAO training standards with automated record keeping.', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      title: 'Immutable Exams', 
      desc: 'Secure, randomized exams that cannot be edited once submitted.', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      color: 'from-purple-500 to-pink-500'
    },
    { 
      title: 'Training Roadmap', 
      desc: 'Automated refresher course linking and certificate validity tracking.', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      color: 'from-green-500 to-emerald-500'
    },
    { 
      title: 'Audit Analytics', 
      desc: 'Real-time performance reports and audit logs for regulatory inspectors.', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'from-orange-500 to-red-500'
    }
  ];

  const roleLabels = {
    [UserRole.TRAINEE]: { en: 'Trainee', hr: 'Polaznik' },
    [UserRole.INSTRUCTOR]: { en: 'Instructor', hr: 'Instruktor' },
    [UserRole.ADMIN]: { en: 'Admin', hr: 'Administrator' },
    [UserRole.INSPECTOR]: { en: 'Inspector', hr: 'Inspektor' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950 font-sans text-gray-100 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 lg:px-12 py-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-70 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-blue-600 to-cyan-600 p-2.5 rounded-xl shadow-2xl shadow-blue-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              CloudTraining
            </span>
            <div className="text-xs font-medium text-gray-400 tracking-wider uppercase">
              Airport Online Training System
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 lg:space-x-6">
          <div className="flex bg-gray-800/50 backdrop-blur-sm p-1 rounded-lg border border-gray-700/50">
            <button 
              onClick={() => setLang('en')} 
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${lang === 'en' ? 'bg-gray-700/50 text-white' : 'text-gray-400 hover:text-gray-300'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLang('hr')} 
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${lang === 'hr' ? 'bg-gray-700/50 text-white' : 'text-gray-400 hover:text-gray-300'}`}
            >
              ME
            </button>
          </div>
          <button 
            onClick={() => { setShowLogin(true); setIsRegister(false); }} 
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 active:scale-95"
          >
            {lang === 'en' ? 'Sign In' : 'Prijavi se'}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-24">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
          {/* Left Content */}
          <div className={`flex-1 transition-all duration-700 ${showLogin ? 'lg:opacity-40 lg:blur-sm lg:scale-95' : ''}`}>
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold tracking-wider uppercase mb-8">
              <span className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mr-2 animate-pulse"></span>
              Industry Standard Compliance
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Digital Aviation{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Training Excellence
              </span>
            </h1>
            
            <p className="text-gray-300 text-lg lg:text-xl font-medium max-w-2xl leading-relaxed mb-10">
              Streamline certificate management, automate compliance tracking, and ensure regulatory readiness with our enterprise-grade aviation training platform.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 p-5 hover:border-gray-600/50 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${feature.color}"></div>
                  <div className="relative">
                    <div className={`inline-flex p-2 rounded-lg bg-gradient-to-r ${feature.color} mb-3`}>
                      <div className="text-white">
                        {feature.icon}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => { setShowLogin(true); setIsRegister(true); }} 
              className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold text-base hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-2xl hover:shadow-3xl hover:shadow-blue-500/30 active:scale-95"
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <span className="relative flex items-center">
                {lang === 'en' ? 'Get Started Free' : 'Započnite besplatno'}
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
          </div>

          {/* Right Panel - Login/Register */}
          <div className="flex-1 w-full max-w-md">
            <div className={`transition-all duration-700 ${showLogin ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/30 shadow-2xl">
                {/* Background Gradient */}
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl"></div>
                
                <div className="relative p-8">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {isRegister 
                          ? (lang === 'en' ? 'Create Account' : 'Kreiraj račun')
                          : (lang === 'en' ? 'Welcome Back' : 'Dobrodošli nazad')
                        }
                      </h2>
                      <p className="text-sm text-gray-400 mt-1">
                        {isRegister 
                          ? (lang === 'en' ? 'Join the aviation training platform' : 'Pridružite se platformi za avijacijsku obuku')
                          : (lang === 'en' ? 'Sign in to your account' : 'Prijavite se na svoj račun')
                        }
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowLogin(false)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleAuth} className="space-y-5">
                    {isRegister && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            {lang === 'en' ? 'Full Name' : 'Puno ime'}
                          </label>
                          <input 
                            type="text" 
                            required 
                            value={fullName} 
                            onChange={e => setFullName(e.target.value)} 
                            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-3 outline-none focus:border-blue-500/50 text-white placeholder-gray-500 font-medium transition-colors"
                            placeholder={lang === 'en' ? 'John Doe' : 'Ivan Horvat'}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            {lang === 'en' ? 'Role' : 'Uloga'}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[UserRole.TRAINEE, UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.INSPECTOR].map(role => (
                              <button 
                                key={role}
                                type="button" 
                                onClick={() => setSelectedRole(role)}
                                className={`py-2.5 rounded-lg border text-xs font-medium transition-all duration-300 ${selectedRole === role 
                                  ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/50 text-white shadow-lg' 
                                  : 'bg-gray-800/30 border-gray-700/50 text-gray-400 hover:border-gray-600/50 hover:text-gray-300'
                                }`}
                              >
                                {roleLabels[role][lang]}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {lang === 'en' ? 'Email Address' : 'Email adresa'}
                      </label>
                      <input 
                        type="email" 
                        required 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-3 outline-none focus:border-blue-500/50 text-white placeholder-gray-500 font-medium transition-colors"
                        placeholder={lang === 'en' ? 'you@company.com' : 'vi@firma.me'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {lang === 'en' ? 'Password' : 'Lozinka'}
                      </label>
                      <input 
                        type="password" 
                        required 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-3 outline-none focus:border-blue-500/50 text-white placeholder-gray-500 font-medium transition-colors"
                        placeholder={lang === 'en' ? '••••••••' : '••••••••'}
                      />
                    </div>

                    {error && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-center text-red-400 text-sm">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {error}
                        </div>
                      </div>
                    )}

                    <button 
                      disabled={loading}
                      type="submit" 
                      className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {lang === 'en' ? 'Processing...' : 'Obrada...'}
                        </>
                      ) : (
                        isRegister 
                          ? (lang === 'en' ? 'Create Account' : 'Kreiraj račun')
                          : (lang === 'en' ? 'Sign In' : 'Prijavi se')
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-gray-700/50">
                    <button 
                      onClick={() => setIsRegister(!isRegister)}
                      className="w-full text-center text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    >
                      {isRegister 
                        ? (lang === 'en' ? 'Already have an account? Sign In' : 'Već imate račun? Prijavite se')
                        : (lang === 'en' ? "Don't have an account? Create one" : 'Nemate račun? Kreirajte ga')
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Login CTA when form is hidden */}
            {!showLogin && (
              <div 
                onClick={() => setShowLogin(true)}
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/30 p-10 text-center cursor-pointer hover:border-gray-600/50 transition-all duration-500 hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative">
                  <div className="inline-flex p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 mb-6">
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {lang === 'en' ? 'Secure Access Portal' : 'Sigurni pristupni portal'}
                  </h3>
                  <p className="text-sm text-gray-400 font-medium">
                    {lang === 'en' ? 'Authorized personnel only' : 'Samo za ovlašteno osoblje'}
                  </p>
                  <div className="mt-6 inline-flex items-center text-blue-400 text-sm font-medium">
                    <span>{lang === 'en' ? 'Click to sign in' : 'Kliknite za prijavu'}</span>
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-8 mt-20 border-t border-gray-800/50">
        <div className="flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
          <div className="mb-4 md:mb-0">
            <span className="font-medium text-gray-400">© 2026 CloudTraining Platform</span>
            <span className="mx-2">•</span>
            <span>EASA/ICAO Compliant</span>
          </div>
          <div className="flex items-center space-x-6">
            <span className="font-medium text-gray-400">Certified by me :)</span>
            <div className="h-4 w-px bg-gray-700/50"></div>
            <span>GDPR Compliant</span>
          </div>
        </div>
      </div>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Login;