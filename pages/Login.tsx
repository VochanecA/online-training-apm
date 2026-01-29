import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { User, UserRole } from '../types';
import { Language, translations } from '../translations';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// Import slike za Vite
import groundHandlingImage from '/GROUNDHANDLING.jpg';

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
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    // Reset form submission state after delay
    if (formSubmitted) {
      const timer = setTimeout(() => setFormSubmitted(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [formSubmitted]);

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
        setFormSubmitted(true);
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
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    { 
      title: 'Automated Certification', 
      desc: 'Smart certificate management with expiry tracking and renewal automation.', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      title: 'Secure Examination', 
      desc: 'Tamper-proof exams with biometric verification and randomization.', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    { 
      title: 'Real-time Analytics', 
      desc: 'Comprehensive dashboards for training progress and compliance metrics.', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/50">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div 
                onClick={() => navigate('/')}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur opacity-60"></div>
                  <div className="relative w-8 h-8 bg-gradient-to-r from-blue-700 to-cyan-700 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">CLOUDTRAINING</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Online Training Platform</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center bg-gray-100/80 rounded-lg p-1">
                <button 
                  onClick={() => setLang('en')} 
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${lang === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLang('me')} 
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${lang === 'me' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  ME
                </button>
              </div>
              <button 
                onClick={() => { setShowLogin(true); setIsRegister(false); }} 
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg"
              >
                {lang === 'en' ? 'Sign In' : 'Prijavi se'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16">
            {/* Left Content */}
            <div className={`flex-1 w-full transition-all duration-500 ${showLogin ? 'lg:opacity-40 lg:blur-sm lg:scale-95' : ''}`}>
              {/* Hero Image Section */}
              <div className="relative rounded-2xl overflow-hidden shadow-xl mb-8 border border-gray-200">
                <div className="relative aspect-[21/9] overflow-hidden">
                  <img 
                    src={groundHandlingImage}
                    alt={lang === 'en' ? 'Ground Handling Training at Airport' : 'Obuka zemaljskog opsluživanja na aerodromu'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-cyan-900/60 flex items-center justify-center p-8">
                    <div className="text-center text-white max-w-3xl">
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 drop-shadow-lg">
                        {lang === 'en' 
                          ? 'Professional Ground Handling Training'
                          : 'Profesionalna obuka zemaljskog opsluživanja'}
                      </h2>
                      <p className="text-lg sm:text-xl text-blue-100/90 font-medium drop-shadow">
                        {lang === 'en'
                          ? 'Comprehensive training for baggage handling, aircraft marshalling, de-icing, and ramp operations'
                          : 'Sveobuhvatna obuka za rukovanje prtljagom, marshalling aviona, uklanjanje leda i ramp operacije'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Training Badge Overlay */}
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-900">ICAO Compliant</div>
                        <div className="text-[10px] text-gray-600">Ground Handling Module</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 rounded-full text-xs font-semibold mb-6">
                <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {lang === 'en' ? 'Industry Standard' : 'Industrijski standard'}
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
                Professional Aviation
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                  Training Management
                </span>
              </h1>
              
              <p className="text-gray-600 text-base sm:text-lg font-medium max-w-2xl leading-relaxed mb-8">
                {lang === 'en' 
                  ? 'Streamline airport personnel training, automate compliance tracking, and ensure regulatory readiness with our enterprise-grade aviation training platform.'
                  : 'Optimizirajte obuku aerodromskog osoblja, automatizirajte praćenje usklađenosti i osigurajte regulatornu spremnost s našom platformom za avijacijsku obuku.'}
              </p>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg flex items-center justify-center text-blue-600">
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{feature.title}</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">{feature.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => { setShowLogin(true); setIsRegister(true); }} 
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center group"
                >
                  <span className="text-sm">{lang === 'en' ? 'Get Started Free' : 'Započnite besplatno'}</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                <button 
                  onClick={() => navigate('/public')}
                  className="px-6 py-3 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-300 text-sm"
                >
                  {lang === 'en' ? 'Browse Catalog' : 'Pregledaj katalog'}
                </button>
              </div>
            </div>

            {/* Right Panel - Login/Register */}
            <div className="flex-1 w-full max-w-md">
              <div className={`transition-all duration-500 transform ${showLogin ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                  <div className="p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                          {isRegister 
                            ? (lang === 'en' ? 'Create Account' : 'Kreiraj račun')
                            : (lang === 'en' ? 'Welcome Back' : 'Dobrodošli nazad')
                          }
                        </h2>
                        <p className="text-gray-500 text-xs sm:text-sm mt-1">
                          {isRegister 
                            ? (lang === 'en' ? 'Join the aviation training platform' : 'Pridružite se platformi za avijacijsku obuku')
                            : (lang === 'en' ? 'Sign in to your account' : 'Prijavite se na svoj račun')
                          }
                        </p>
                      </div>
                      <button 
                        onClick={() => setShowLogin(false)}
                        className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleAuth} className="space-y-4">
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
                              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900 placeholder-gray-500 text-sm"
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
                                    ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300 text-blue-700' 
                                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
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
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900 placeholder-gray-500 text-sm"
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
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900 placeholder-gray-500 text-sm"
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

                      {formSubmitted && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center text-green-700 text-sm">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {lang === 'en' 
                              ? 'Registration successful! Check your email.' 
                              : 'Registracija uspješna! Provjerite email.'}
                          </div>
                        </div>
                      )}

                      <button 
                        disabled={loading}
                        type="submit" 
                        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
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
                  className="group bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 text-center cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="mb-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:from-blue-100 group-hover:to-cyan-100 transition-colors">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                      {lang === 'en' ? 'Secure Access Portal' : 'Sigurni pristupni portal'}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">
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
          <div className="mt-12 sm:mt-16 pt-8 border-t border-gray-200/50">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500 font-medium mb-4">
                {lang === 'en' ? 'TRUSTED BY AVIATION PROFESSIONALS WORLDWIDE' : 'POUZDANO OD STRANE AVIJACIJSKIH PROFESIONALACA ŠIROM SVIJETA'}
              </p>
              <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 opacity-60">
                <div className="text-xs sm:text-sm font-semibold text-gray-700">EASA</div>
                <div className="text-xs sm:text-sm font-semibold text-gray-700">ICAO</div>
                <div className="text-xs sm:text-sm font-semibold text-gray-700">FAA</div>
                <div className="text-xs sm:text-sm font-semibold text-gray-700">IATA</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200/50 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-gray-500 text-xs sm:text-sm">
            <div className="text-center sm:text-left">
              <span className="font-semibold text-gray-700">© 2026 CLOUDTRAINING Aviation Platform</span>
              <span className="mx-2 hidden sm:inline">•</span>
              <span className="block sm:inline mt-1 sm:mt-0">GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700 font-medium">Certified by me:)</span>
              <div className="h-4 w-px bg-gray-300"></div>
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;