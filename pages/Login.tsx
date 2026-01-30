import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Language, translations } from '../translations';
import LoginModal from '../components/LoginModal';

// Import slike za Vite
import groundHandlingImage from '/GROUNDHANDLING.jpg';

interface LoginProps {
  lang: Language;
  setLang: (l: Language) => void;
  onLoginSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ lang, setLang, onLoginSuccess }) => {
  const navigate = useNavigate();
  const t = translations[lang];
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalType, setModalType] = useState<'login' | 'register'>('login');

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

  const testimonials = [
    {
      name: 'Marko Petrović',
      role: 'Head of Training',
      company: 'Airport Podgorica',
      content: lang === 'en' 
        ? 'This platform revolutionized our training process. Compliance tracking is now automated and accurate.'
        : 'Ova platforma je revolucionirala naš proces obuke. Praćenje usklađenosti je sada automatizovano i precizno.',
      avatar: 'MP'
    },
    {
      name: 'Ana Kovačević',
      role: 'Safety Inspector',
      company: 'EASA Certified',
      content: lang === 'en'
        ? 'The audit trail features are exceptional. Makes regulatory compliance inspections much smoother.'
        : 'Funkcije praćenja revizije su izuzetne. Čini inspekcije regulatorne usklađenosti mnogo jednostavnijim.',
      avatar: 'AK'
    },
    {
      name: 'Ivan Nikolić',
      role: 'Ground Operations Manager',
      company: 'Tivat Airport',
      content: lang === 'en'
        ? 'Real-time progress tracking helped us reduce training time by 30% while improving quality.'
        : 'Praćenje napretka u realnom vremenu nam je pomoglo da smanjimo vrijeme obuke za 30% uz poboljšanje kvaliteta.',
      avatar: 'IN'
    }
  ];

// U Login.tsx, promijeni handleLoginSuccess funkciju:
const handleLoginSuccess = () => {
  setShowLoginModal(false);
  if (onLoginSuccess) {
    onLoginSuccess();
  }
  navigate('/app'); // Dodaj ovu liniju
};

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white">
      {/* Login Modal */}
      <LoginModal
        lang={lang}
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

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
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Aviation Training Platform</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
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
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg"
              >
                {lang === 'en' ? 'Sign In' : 'Prijavi se'}
              </button>
              <button 
                onClick={() => {
                  setModalType('register');
                  setShowLoginModal(true);
                }}
                className="hidden sm:inline-block px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:border-gray-400 transition-all"
              >
                {lang === 'en' ? 'Get Started' : 'Započnite'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 rounded-full text-xs font-semibold mb-6">
              <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {lang === 'en' ? 'Trusted by myself' : 'Pouzdano od mene'}
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              {lang === 'en' ? 'Professional' : 'Profesionalna'}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                {lang === 'en' ? 'Aviation Training Platform' : 'Platforma za obuku'}
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
              {lang === 'en' 
                ? 'Streamline airport personnel training, automate compliance tracking, and ensure regulatory readiness with our enterprise-grade aviation training solution.'
                : 'Optimizirajte obuku aerodromskog osoblja, automatizirajte praćenje usklađenosti i osigurajte regulatornu spremnost s našim poslovnim rješenjem za obuku.'}
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => {
                  setModalType('register');
                  setShowLoginModal(true);
                }}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center group text-base"
              >
                <span>{lang === 'en' ? 'Start Free Trial' : 'Započnite besplatnu probu'}</span>
                <svg className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button 
                onClick={() => navigate('/public')}
                className="px-8 py-4 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-300 text-base"
              >
                {lang === 'en' ? 'Browse Public Courses' : 'Pregledajte javne kurseve'}
              </button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-12 border border-gray-200">
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
                      ? 'Comprehensive Ground Handling Training'
                      : 'Sveobuhvatna obuka zemaljskog opsluživanja'}
                  </h2>
                  <p className="text-lg sm:text-xl text-blue-100/90 font-medium drop-shadow">
                    {lang === 'en'
                      ? 'Baggage handling, aircraft marshalling, de-icing, and ramp operations training'
                      : 'Obuka za rukovanje prtljagom, marshalling aviona, uklanjanje leda i ramp operacije'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {lang === 'en' ? 'Everything You Need' : 'Sve što vam treba'}
            </h2>
            <p className="text-lg text-gray-600">
              {lang === 'en' 
                ? 'A complete platform designed specifically for aviation training management'
                : 'Kompletna platforma dizajnirana specijalno za upravljanje avijacijskom obukom'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 bg-gradient-to-b from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex flex-col h-full">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed flex-1">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gradient-to-b from-white to-blue-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {lang === 'en' ? 'Trusted by Professionals' : 'Pouzdano od profesionalaca'}
            </h2>
            <p className="text-lg text-gray-600">
              {lang === 'en' 
                ? 'See what aviation training managers are saying'
                : 'Pogledajte šta kažu menadžeri avijacijske obuke'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center font-bold text-white">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-xs text-gray-500">{testimonial.role} • {testimonial.company}</div>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed italic">
                  "{testimonial.content}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {lang === 'en' ? 'Ready to Transform Your Training?' : 'Spremni da transformišete svoju obuku?'}
          </h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            {lang === 'en' 
              ? 'Join hundreds of aviation companies that trust our platform for their training needs.'
              : 'Pridružite se stotinama avijacijskih kompanija koje povjeravaju našoj platformi svoje potrebe za obukom.'}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => {
                setModalType('register');
                setShowLoginModal(true);
              }}
              className="px-8 py-4 bg-white text-blue-600 hover:bg-blue-50 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 text-base"
            >
              {lang === 'en' ? 'Start Free 30-Day Trial' : 'Započnite besplatnu 30-dnevnu probu'}
            </button>
            <button 
              onClick={() => navigate('/public')}
              className="px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white/10 font-semibold rounded-lg transition-all duration-300 text-base"
            >
              {lang === 'en' ? 'View Demo Courses' : 'Pogledaj demo kurseve'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <span className="font-bold text-gray-900">CloudTraining</span>
              </div>
              <p className="text-gray-500 text-sm">
                {lang === 'en' 
                  ? 'Professional Aviation Training Platform'
                  : 'Profesionalna platforma za obuku'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-gray-500 text-sm">
              <span>EASA Compliant</span>
              <span className="hidden sm:inline">•</span>
              <span>GDPR Certified</span>
              <span className="hidden sm:inline">•</span>
              <span>24/7 Support</span>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setLang('en')}
                className={`text-xs font-medium px-3 py-1 rounded ${lang === 'en' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >EN</button>
              <button 
                onClick={() => setLang('me')}
                className={`text-xs font-medium px-3 py-1 rounded ${lang === 'me' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >ME</button>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <p className="text-gray-500 text-xs">
              © {new Date().getFullYear()} CloudTraining Aviation Platform. {lang === 'en' ? 'All rights reserved.' : 'Sva prava zadržana.'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;