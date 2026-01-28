
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Course, Progress, User } from '../types';
import { Language, translations } from '../translations';

const TrainingRecordView: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const t = translations[lang];
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [instructor, setInstructor] = useState<User | null>(null);

  useEffect(() => {
    if (courseId) {
      const c = db.getCourses().find(x => x.id === courseId);
      if (c) {
        setCourse(c);
        setProgress(db.getUserProgress(user.id, c.id));
        const inst = db.getUsers().find(u => u.id === c.instructorId);
        if (inst) setInstructor(inst);
      }
    }
  }, [courseId, user.id]);

  if (!course || !progress || !progress.isCompleted) return <div className="p-8 text-center text-slate-400 font-bold">Training record unavailable.</div>;

  const totalSecondsSpent = Object.values(progress.lessonTimeSpent || {}).reduce((acc, val) => acc + val, 0);
  const totalMinutes = Math.floor(totalSecondsSpent / 60);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-0">
      <div className="flex justify-between items-center mb-10 no-print">
        <button onClick={() => navigate(`/course/${course.id}`)} className="flex items-center text-slate-500 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition-colors">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {t.returnToCourse}
        </button>
        <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl">
          {t.printCertificate}
        </button>
      </div>

      <div className="bg-white border-2 border-slate-200 p-12 shadow-2xl relative training-record-content">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">{t.trainingRecord}</h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Aviation Personnel Training & Qualification File</p>
          </div>
          <div className="text-right">
             <div className="bg-slate-900 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-[0.2em] mb-3">CloudTraining Aviation</div>
             <p className="text-xs font-mono font-black text-slate-900">{progress.certificateId}</p>
          </div>
        </div>

        {/* User & Course Identity */}
        <div className="grid grid-cols-2 gap-12 mb-12">
           <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.candidate}</label>
                <p className="text-xl font-black text-slate-900 border-b border-slate-100 pb-1">{user.name}</p>
                <p className="text-xs text-slate-500 mt-1">{user.email}</p>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.instructorAssigned}</label>
                <p className="text-lg font-black text-slate-900 border-b border-slate-100 pb-1">{instructor?.name || 'Authorized CloudTraining Instructor'}</p>
                <div className="flex gap-4 mt-1 text-[10px] font-bold text-slate-500">
                  <span>Scope: {instructor?.instructorScope || 'Aviation Safety'}</span>
                  <span>Validity: {instructor?.instructorAuthExpiry ? new Date(instructor.instructorAuthExpiry).toLocaleDateString() : 'Active'}</span>
                </div>
              </div>
           </div>
           <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.course} & {t.version}</label>
                <p className="text-xl font-black text-slate-900 border-b border-slate-100 pb-1">{course.title}</p>
                <p className="text-xs font-mono font-bold text-blue-600 mt-1">v{course.version}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.effectiveDate}</label>
                    <p className="text-lg font-black text-slate-900">{new Date(progress.completionDate!).toLocaleDateString()}</p>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.totalLearningTime}</label>
                    <p className="text-lg font-black text-blue-600">{totalMinutes} Minutes</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Learning History Table */}
        <div className="mb-12">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-blue-600 pl-4 mb-4">Training Syllabus Completion</h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-400 font-black uppercase tracking-widest">
                <th className="px-4 py-3">Lesson Subject</th>
                <th className="px-4 py-3">Completion Date</th>
                <th className="px-4 py-3 text-right">Time Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {course.lessons.map(l => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-bold text-slate-700">{l.title}</td>
                  <td className="px-4 py-3 text-slate-500 font-medium">Completed</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">{Math.floor((progress.lessonTimeSpent?.[l.id] || 0) / 60)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Examination & Assessment Results */}
        <div className="grid grid-cols-2 gap-12 mb-12">
           <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Final Proficiency Exam</h4>
              <div className="flex items-end gap-3 mb-2">
                 <span className="text-4xl font-black text-slate-900">{progress.examScore}%</span>
                 <span className="text-xs font-bold text-green-600 uppercase mb-1">Pass (Threshold {course.exam?.passingScore}%)</span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 italic">Attempted {progress.attempts.length} times. Final record immutable.</p>
           </div>
           {course.requiresPracticalCheck && (
             <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Practical Skills Assessment</h4>
                <div className="mb-4">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${progress.practicalCheckStatus === 'COMPETENT' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {progress.practicalCheckStatus || 'COMPETENT'}
                  </span>
                </div>
                {progress.practicalCheckComment && (
                  <p className="text-xs text-slate-600 border-l-2 border-slate-200 pl-3 italic">"{progress.practicalCheckComment}"</p>
                )}
             </div>
           )}
        </div>

        {/* Authentication Sign-off */}
        <div className="mt-20 flex justify-between items-end">
           <div className="text-center">
              <div className="w-56 border-b-2 border-slate-900 mb-2"></div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trainee Signature</p>
           </div>
           
           <div className="bg-slate-50 p-6 border-2 border-double border-slate-200 rounded-2xl rotate-1">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Quality Assurance Stamp</p>
              <div className="w-20 h-20 border-4 border-blue-600/20 rounded-full flex items-center justify-center text-blue-600 font-black text-[10px] flex-col opacity-50">
                <span className="tracking-tighter">CloudTraining</span>
                <span className="text-[8px]">CERTIFIED</span>
              </div>
           </div>

           <div className="text-center">
              <div className="w-56 border-b-2 border-slate-900 mb-2 font-serif italic text-sm pt-4">/ Signed Electronically /</div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Instructor / Authorized Mentor</p>
           </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="mt-16 pt-6 border-t border-slate-100 text-[8px] text-slate-400 font-bold uppercase tracking-widest text-center leading-relaxed">
          This document is generated by the CloudTraining Learning Management System. It serves as an official training record for regulatory compliance under the jurisdiction of airport authorities and associated civil aviation requirements. All audit logs related to this record are stored securely.
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .max-w-5xl { max-width: 100% !important; padding: 0 !important; }
          .training-record-content { 
            border: 2px solid #000 !important; 
            box-shadow: none !important;
            padding: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TrainingRecordView;
