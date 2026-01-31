import React, { useState } from 'react';
import { UserRole } from '../types';
import { Language } from '../translations';
import { supabase } from '../lib/supabase';

interface LoginModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ 
  lang, 
  isOpen, 
  onClose, 
  onLoginSuccess 
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.TRAINEE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const roleLabels = {
    [UserRole.TRAINEE]: { en: 'Trainee', me: 'Polaznik' },
    [UserRole.INSTRUCTOR]: { en: 'Instructor', me: 'Instruktor' },
    [UserRole.ADMIN]: { en: 'Administrator', me: 'Administrator' },
    [UserRole.INSPECTOR]: { en: 'Inspector', me: 'Inspektor' }
  };

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
        alert(lang === 'en' 
          ? 'Registration successful! Please check your email for verification.' 
          : 'Registracija uspješna! Provjerite e-poštu za potvrdu.'
        );
        setTimeout(() => {
          setIsRegister(false);
          setFormSubmitted(false);
          onClose(); // Zatvori modal nakon registracije
        }, 3000);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Sada kada je login uspješan, pozovi onLoginSuccess
        onLoginSuccess();
        onClose(); // Zatvori modal
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setSelectedRole(UserRole.TRAINEE);
    setError(null);
    setFormSubmitted(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {isRegister 
                  ? (lang === 'en' ? 'Create Account' : 'Kreiraj račun')
                  : (lang === 'en' ? 'Welcome Back' : 'Dobrodošli nazad')
                }
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                {isRegister 
                  ? (lang === 'en' ? 'Join the aviation training platform' : 'Pridružite se platformi za obuku')
                  : (lang === 'en' ? 'Sign in to your account' : 'Prijavite se na svoj račun')
                }
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="p-6 space-y-4">
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

          <div className="p-6 pt-0">
            <button 
              onClick={() => {
                setIsRegister(!isRegister);
                resetForm();
              }}
              className="w-full text-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors py-3 border-t border-gray-200"
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
  );
};

export default LoginModal;