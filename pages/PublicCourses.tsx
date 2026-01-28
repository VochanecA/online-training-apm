
import React, { useState, useMemo } from 'react';
import { db } from '../db';
import { Language, translations } from '../translations';
import { useNavigate } from 'react-router-dom';

interface PublicCoursesProps {
  lang: Language;
  setLang: (l: Language) => void;
}

const PublicCourses: React.FC<PublicCoursesProps> = ({ lang, setLang }) => {
  const navigate = useNavigate();
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  
  const courses = useMemo(() => db.getCourses(), []);

  const filteredCourses = useMemo(() => {
    if (!searchTerm) return courses;
    const lowerSearch = searchTerm.toLowerCase();
    return courses.filter(c => 
      c.title.toLowerCase().includes(lowerSearch) || 
      c.category.toLowerCase().includes(lowerSearch)
    );
  }, [courses, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight uppercase">CloudTraining</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
              <button onClick={() => setLang('en')} className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${lang === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>EN</button>
              <button onClick={() => setLang('me')} className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${lang === 'me' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>ME</button>
            </div>
            <button 
              onClick={() => navigate('/')} 
              className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95"
            >
              Portal Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-20 bg-slate-900 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600 rounded-full blur-[160px]"></div>
        </div>
        <div className="max-w-7xl mx-auto px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 uppercase">{t.publicCatalog}</h1>
          <p className="text-slate-400 text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
            {t.browseCourses}
          </p>
          
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
              type="text" 
              placeholder={t.searchCourses}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-8 py-5 bg-white border-0 rounded-[2rem] shadow-2xl shadow-blue-500/10 outline-none font-bold text-slate-900 text-lg transition-all"
            />
          </div>
        </div>
      </section>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredCourses.length > 0 ? (
            filteredCourses.map(course => (
              <div 
                key={course.id}
                className="group bg-white rounded-[3.5rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col"
              >
                <div className="h-56 relative overflow-hidden">
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-6 left-6 flex gap-2">
                    <span className="px-4 py-1.5 bg-white/95 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-xl border border-white">{course.category}</span>
                  </div>
                </div>
                <div className="p-10 flex-1 flex flex-col">
                  <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight leading-tight group-hover:text-blue-600 transition-colors uppercase">{course.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed line-clamp-3 mb-8">{course.description}</p>
                  <div className="mt-auto pt-8 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{course.lessons.length} {t.lessons}</span>
                    <button 
                      onClick={() => navigate('/')}
                      className="bg-blue-50 text-blue-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                    >
                      Enroll Now
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100">
               <svg className="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
               <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No programs found matching your search.</p>
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em]">© 2025 CloudTraining Aviation Personnel Portal</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicCourses;
