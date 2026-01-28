
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Course, Progress, User } from '../types';
import { Language, translations } from '../translations';

// Component for rendering a certificate of completion
const CertificateView: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const t = translations[lang];
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    if (courseId) {
      const c = db.getCourses().find(x => x.id === courseId);
      if (c) {
        setCourse(c);
        setProgress(db.getUserProgress(user.id, c.id));
      }
    }
  }, [courseId, user.id]);

  if (!course || !progress || !progress.isCompleted) return <div>Access Denied or Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8 no-print">
        <button 
          onClick={() => navigate(`/course/${course.id}`)}
          className="flex items-center text-slate-500 hover:text-slate-900 font-bold text-sm tracking-tight"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t.returnToCourse}
        </button>
        <div className="flex items-center gap-4">
          <p className="text-xs text-slate-400 font-bold uppercase hidden md:block">Hint: Select 'Save as PDF' in print destination</p>
          <button 
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all flex items-center shadow-xl shadow-blue-500/20"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {t.printCertificate}
          </button>
        </div>
      </div>

      <div className="bg-white border-[24px] border-double border-slate-900 p-16 text-center relative overflow-hidden certificate-content shadow-2xl">
        {/* Ornate Background elements */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-blue-50 rounded-full opacity-40"></div>
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-slate-50 rounded-full opacity-40"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-slate-50 rounded-full opacity-5 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-center mb-12">
            <div className="bg-slate-900 p-6 rounded-3xl rotate-45 flex items-center justify-center shadow-xl">
              <svg className="w-16 h-16 text-white -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
          </div>

          <p className="text-sm font-black tracking-[0.4em] uppercase text-slate-400 mb-8">{t.certificateOfCompletion}</p>
          
          <h1 className="text-slate-500 text-xl mb-4 font-medium">{t.certifyThat}</h1>
          <h2 className="text-6xl font-serif text-slate-900 italic font-black mb-10 tracking-tight">{user.name}</h2>
          
          <h1 className="text-slate-500 text-xl mb-4 font-medium">{t.completedCourse}</h1>
          <h2 className="text-4xl font-black text-blue-700 mb-14 tracking-tight uppercase">{course.title}</h2>
          
          <p className="text-slate-600 max-w-xl mx-auto mb-20 leading-loose text-lg font-medium">
            {t.requirementsMet.replace('{score}', (progress.examScore || 0).toString())}
          </p>

          <div className="flex justify-between items-end mt-24 max-w-3xl mx-auto">
            <div className="text-left">
              <div className="border-b-2 border-slate-200 w-56 mb-3"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{t.trainingDirector}</p>
              <p className="text-sm text-slate-900 font-black">CloudTraining Aviation Academy</p>
            </div>
            
            <div className="text-center bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 shadow-inner">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.verifyId}</p>
               <p className="text-sm font-mono font-black text-slate-900">{progress.certificateId}</p>
            </div>

            <div className="text-right">
              <p className="text-lg text-slate-900 font-black mb-1">{new Date(progress.completionDate!).toLocaleDateString()}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.issueDate}</p>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .max-w-4xl { max-width: 100% !important; padding: 0 !important; }
          .certificate-content { 
            border-width: 20px !important; 
            margin: 0 !important; 
            box-shadow: none !important;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default CertificateView;
