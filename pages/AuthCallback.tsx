// pages/AuthCallback.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Language } from '../translations';

interface AuthCallbackProps {
  lang: Language;
}

const AuthCallback: React.FC<AuthCallbackProps> = ({ lang }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Proveri da li postoji sesija
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          // Uspješna verifikacija
          setStatus('success');
          setMessage(lang === 'en' 
            ? 'Email successfully verified! Redirecting to dashboard...' 
            : 'Email uspješno verificiran! Preusmjeravam na kontrolnu ploču...');
          
          // Sačekaj 3 sekunde pa preusmjeri
          setTimeout(() => {
            navigate('/');
          }, 3000);
        } else {
          // Nema sesije - možda token nije validan
          setStatus('error');
          setMessage(lang === 'en' 
            ? 'Unable to verify email. Please try logging in.' 
            : 'Nije moguće verificirati email. Pokušajte se prijaviti.');
          
          setTimeout(() => {
            navigate('/');
          }, 5000);
        }
      } catch (error: any) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(lang === 'en' 
          ? 'An error occurred during verification.' 
          : 'Došlo je do greške prilikom verifikacije.');
        
        setTimeout(() => {
          navigate('/');
        }, 5000);
      }
    };

    verifyEmail();
  }, [navigate, lang]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950 font-sans text-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/30 shadow-2xl p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
              {status === 'verifying' ? (
                <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : status === 'success' ? (
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">
            {status === 'verifying' 
              ? (lang === 'en' ? 'Verifying your email...' : 'Verificiram vaš email...')
              : status === 'success'
              ? (lang === 'en' ? 'Email Verified!' : 'Email Verificiran!')
              : (lang === 'en' ? 'Verification Failed' : 'Verifikacija nije uspjela')
            }
          </h2>
          
          <p className="text-gray-300 mb-6">
            {message}
          </p>
          
          {status === 'verifying' && (
            <div className="w-full bg-gray-700/30 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full animate-pulse"></div>
            </div>
          )}
          
          <div className="mt-8">
            <button
              onClick={() => navigate('/')}
              className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center"
            >
              {lang === 'en' ? 'Go to Dashboard' : 'Idi na Kontrolnu Ploču'}
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          {lang === 'en' 
            ? 'This page will automatically redirect you shortly.'
            : 'Ova stranica će se automatski preusmjeriti uskoro.'
          }
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;