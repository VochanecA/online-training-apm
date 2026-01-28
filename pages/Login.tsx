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
    { 
      title: 'EASA/ICAO Compliant', 
      desc: 'Full regulatory compliance with automated record-keeping and audit trails.', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    { 
      title: 'Automated Certification', 
      desc: 'Smart certificate management with expiry tracking and renewal automation.', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      title: 'Secure Examination', 
      desc: 'Tamper-proof exams with biometric verification and randomization.', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    { 
      title: 'Real-time Analytics', 
      desc: 'Comprehensive dashboards for training progress and compliance metrics.', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  const roleLabels = {
    [UserRole.TRAINEE]: { en: 'Trainee', me: 'Polaznik' },
    [UserRole.INSTRUCTOR]: { en: 'Instructor', me: 'Instruktor' },
    [UserRole.ADMIN]: { en: 'Administrator', me: 'Administrator' },
    [UserRole.INSPECTOR]: { en: 'Inspector', me: 'Inspektor' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50 font-['Inter'] text-gray-800 overflow-x-hidden">
      {/* Navigation Bar */}
      <nav className="relative z-50 px-6 py-5 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-60"></div>
              <div className="relative bg-gradient-to-r from-blue-700 to-cyan-700 p-2.5 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">CLOUDTRAINING by Alen</div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Aviation Training Platform</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-2 bg-gray-100/80 rounded-lg p-1">
              <button 
                onClick={() => setLang('en')} 
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${lang === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                EN
              </button>
              <button 
                onClick={() => setLang('me')} 
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${lang === 'me' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                ME
              </button>
            </div>
            <button 
              onClick={() => { setShowLogin(true); setIsRegister(false); }} 
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg"
            >
              {lang === 'en' ? 'Sign In' : 'Prijavi se'}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-24">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
          <div className="absolute top-1/2 -right-32 w-96 h-96 bg-cyan-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-24">
          {/* Left Content */}
          <div className={`flex-1 transition-all duration-700 ${showLogin ? 'lg:opacity-50 lg:blur-sm' : ''}`}>
            <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 rounded-full text-xs font-semibold mb-8">
              <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {lang === 'en' ? 'Industry Standard' : 'Industrijski standard'}
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
              Professional Aviation
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                Training Management
              </span>
            </h1>
            
            <p className="text-gray-600 text-lg font-medium max-w-2xl leading-relaxed mb-10">
              {lang === 'en' 
                ? 'Streamline airport personnel training, automate compliance tracking, and ensure regulatory readiness with our enterprise-grade aviation training platform.'
                : 'Optimizirajte obuku aerodromskog osoblja, automatizirajte praćenje usklađenosti i osigurajte regulatornu spremnost s našom platformom za avijacijsku obuku.'}
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="group p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:from-blue-100 group-hover:to-cyan-100 transition-colors">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => { setShowLogin(true); setIsRegister(true); }} 
                className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center group"
              >
                <span>{lang === 'en' ? 'Get Started Free' : 'Započnite besplatno'}</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button 
                onClick={() => navigate('/public')}
                className="px-8 py-3.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-300"
              >
                {lang === 'en' ? 'Browse Catalog' : 'Pregledaj katalog'}
              </button>
            </div>
          </div>

          {/* Right Panel - Login/Register */}
          <div className="flex-1 w-full max-w-md">
            <div className={`transition-all duration-700 ${showLogin ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="p-8">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {isRegister 
                          ? (lang === 'en' ? 'Create Account' : 'Kreiraj račun')
                          : (lang === 'en' ? 'Welcome Back' : 'Dobrodošli nazad')
                        }
                      </h2>
                      <p className="text-gray-500 text-sm mt-1">
                        {isRegister 
                          ? (lang === 'en' ? 'Join the aviation training platform' : 'Pridružite se platformi za avijacijsku obuku')
                          : (lang === 'en' ? 'Sign in to your account' : 'Prijavite se na svoj račun')
                        }
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowLogin(false)}
                      className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {lang === 'en' ? 'Full Name' : 'Puno ime'}
                          </label>
                          <input 
                            type="text" 
                            required 
                            value={fullName} 
                            onChange={e => setFullName(e.target.value)} 
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900 placeholder-gray-500 font-medium"
                            placeholder={lang === 'en' ? 'John Doe' : 'Ivan Horvat'}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {lang === 'en' ? 'Role' : 'Uloga'}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[UserRole.TRAINEE, UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.INSPECTOR].map(role => (
                              <button 
                                key={role}
                                type="button" 
                                onClick={() => setSelectedRole(role)}
                                className={`py-2.5 rounded-lg border text-xs font-medium transition-all duration-300 ${selectedRole === role 
                                  ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300 text-blue-700 shadow-sm' 
                                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {lang === 'en' ? 'Email Address' : 'Email adresa'}
                      </label>
                      <input 
                        type="email" 
                        required 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900 placeholder-gray-500 font-medium"
                        placeholder={lang === 'en' ? 'you@company.com' : 'vi@firma.me'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {lang === 'en' ? 'Password' : 'Lozinka'}
                      </label>
                      <input 
                        type="password" 
                        required 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900 placeholder-gray-500 font-medium"
                        placeholder={lang === 'en' ? '••••••••' : '••••••••'}
                      />
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center text-red-700 text-sm">
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
                      className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button 
                      onClick={() => setIsRegister(!isRegister)}
                      className="w-full text-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
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
                className="group bg-white rounded-2xl border border-gray-200 p-10 text-center cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:from-blue-100 group-hover:to-cyan-100 transition-colors">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {lang === 'en' ? 'Secure Access Portal' : 'Sigurni pristupni portal'}
                  </h3>
                  <p className="text-sm text-gray-600 font-medium">
                    {lang === 'en' ? 'Authorized personnel only' : 'Samo za ovlašteno osoblje'}
                  </p>
                </div>
                <div className="inline-flex items-center text-blue-600 text-sm font-semibold group-hover:text-blue-700">
                  <span>{lang === 'en' ? 'Click to sign in' : 'Kliknite za prijavu'}</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Partners/Compliance Badges */}
        <div className="mt-24 pt-12 border-t border-gray-200/50">
          <div className="text-center mb-8">
            <p className="text-sm text-gray-500 font-medium mb-2">
              {lang === 'en' ? 'TRUSTED BY AVIATION PROFESSIONALS WORLDWIDE' : 'POUZDANO OD STRANE AVIJACIJSKIH PROFESIONALACA ŠIROM SVIJETA'}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="text-sm font-semibold text-gray-700">EASA</div>
              <div className="text-sm font-semibold text-gray-700">ICAO</div>
              <div className="text-sm font-semibold text-gray-700">FAA</div>
              <div className="text-sm font-semibold text-gray-700">IATA</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-b from-white to-gray-50 border-t border-gray-200/50 mt-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
            <div className="mb-4 md:mb-0">
              <span className="font-semibold text-gray-700">© 2026 CLOUDTRAINING Aviation Platform</span>
              <span className="mx-2">•</span>
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-gray-700 font-medium">Certified by me :)</span>
              <div className="h-4 w-px bg-gray-300"></div>
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;