
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Course, Lesson, Material, Exam, Question, User, UserRole, Progress } from '../types';
import { geminiService } from '../geminiService';
import { Language, translations } from '../translations';

const CourseEditor: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = translations[lang];
  const [loadingAI, setLoadingAI] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({ text: '', options: ['', '', '', ''], correctOptionIndex: 0 });
  const [users, setUsers] = useState<User[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);

  const [course, setCourse] = useState<Partial<Course>>({
    title: '',
    description: '',
    version: '1.0.0',
    category: 'Safety',
    thumbnail: 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=400&q=80',
    lessons: [],
    instructorId: user.id,
    isSequential: true,
    validityYears: 2,
    requiresPracticalCheck: false,
    refresherCourseId: undefined
  });

  useEffect(() => {
    if (user.role === UserRole.TRAINEE || user.role === UserRole.INSPECTOR) {
      navigate('/dashboard');
      return;
    }
    setUsers(db.getUsers());
    const courses = db.getCourses();
    setAllCourses(courses);
    if (id) {
      const existing = courses.find(c => c.id === id);
      if (existing) {
        setCourse(existing);
      }
    }
  }, [id, user, navigate]);

  const instructors = useMemo(() => 
    users.filter(u => u.role === UserRole.INSTRUCTOR || u.role === UserRole.ADMIN),
    [users]
  );

  const saveCourse = () => {
    if (!course.title) return alert('Course title is required');
    const coursesList = db.getCourses();
    const finalCourse = {
      ...course,
      id: course.id || `c-${Date.now()}`,
      lessons: course.lessons || []
    } as Course;

    const index = coursesList.findIndex(c => c.id === finalCourse.id);
    if (index > -1) {
      coursesList[index] = finalCourse;
    } else {
      coursesList.push(finalCourse);
    }

    db.saveCourses(coursesList);
    db.logAction(user.id, 'COURSE_SAVE', `Saved course: ${finalCourse.title} (v${finalCourse.version})`);
    navigate('/admin/courses');
  };

  const addLesson = () => {
    const newLesson: Lesson = {
      id: `l-${Date.now()}`,
      courseId: course.id || '',
      title: 'New Lesson',
      description: '',
      order: (course.lessons?.length || 0) + 1,
      materials: [],
      minLearningTimeMinutes: 0
    };
    setCourse({ ...course, lessons: [...(course.lessons || []), newLesson] });
  };

  const updateLesson = (idx: number, updates: Partial<Lesson>) => {
    const lessons = [...(course.lessons || [])];
    lessons[idx] = { ...lessons[idx], ...updates };
    setCourse({ ...course, lessons });
  };

  const addMaterial = (lessonIdx: number, type: 'pdf' | 'video' | 'pptx' | 'text' = 'pdf') => {
    const materials = [...(course.lessons![lessonIdx].materials || [])];
    materials.push({ 
      id: `m-${Date.now()}`, 
      type, 
      title: `New ${type.toUpperCase()}`, 
      url: '',
      content: type === 'text' ? 'Enter content here...' : undefined
    });
    updateLesson(lessonIdx, { materials });
  };

  const deleteMaterial = (lessonIdx: number, materialId: string) => {
    const materials = course.lessons![lessonIdx].materials.filter(m => m.id !== materialId);
    updateLesson(lessonIdx, { materials });
  };

  const handleManualExam = () => {
    setCourse({
      ...course,
      exam: {
        id: `e-${Date.now()}`,
        courseId: course.id || '',
        passingScore: 80,
        timeLimitMinutes: 20, // Default value
        maxAttempts: 3,
        randomizeQuestions: true,
        randomizeAnswers: true,
        questions: []
      }
    });
  };

  const handleGenerateExam = async () => {
    if (!course.title || !course.description) return alert('Please provide a title and description first.');
    setLoadingAI(true);
    try {
      const generatedQuestions = await geminiService.generateQuestions(course.title, course.description);
      setCourse({
        ...course,
        exam: {
          id: `e-${Date.now()}`,
          courseId: course.id || '',
          passingScore: 80,
          timeLimitMinutes: 20,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          questions: generatedQuestions
        }
      });
    } catch (e) {
      alert('Failed to generate questions.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleAddQuestion = () => {
    if (!course.exam) return;
    const q: Question = {
      id: `q-${Date.now()}`,
      text: newQuestion.text || 'New Question',
      options: newQuestion.options || ['', '', '', ''],
      correctOptionIndex: newQuestion.correctOptionIndex || 0
    };
    setCourse({
      ...course,
      exam: {
        ...course.exam,
        questions: [...course.exam.questions, q]
      }
    });
    setEditingQuestionId(null);
    setNewQuestion({ text: '', options: ['', '', '', ''], correctOptionIndex: 0 });
  };

  const deleteQuestion = (qid: string) => {
    if (!course.exam) return;
    setCourse({
      ...course,
      exam: {
        ...course.exam,
        questions: course.exam.questions.filter(q => q.id !== qid)
      }
    });
  };

  const inputStyles = "w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 font-medium placeholder-slate-400 transition-all";
  const labelStyles = "block text-sm font-bold text-slate-800 mb-2";

  const Tooltip = ({ title, text }: { title: string, text: string }) => (
    <div className="group relative inline-block ml-1">
      <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-black cursor-help">?</div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-50 pointer-events-none">
        <p className="font-bold mb-1 uppercase tracking-widest text-blue-400">{title}</p>
        <p className="font-medium leading-relaxed opacity-80">{text}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <header className="flex justify-between items-center mb-8">
        <div>
          <button onClick={() => navigate('/admin/courses')} className="flex items-center text-slate-500 hover:text-slate-900 mb-4 font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {t.backToDashboard}
          </button>
          <h1 className="text-3xl font-bold text-slate-900">{id ? t.editCourse : t.createNewCourse}</h1>
        </div>
        <button onClick={saveCourse} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg transition-all active:scale-95">
          {t.saveChanges}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6">{t.courseDetails}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className={labelStyles}>{t.title}</label>
                  <input type="text" value={course.title} onChange={e => setCourse({...course, title: e.target.value})} className={inputStyles} placeholder="Course Title" />
                </div>
                <div>
                  <label className={labelStyles}>{t.version}</label>
                  <input type="text" value={course.version} onChange={e => setCourse({...course, version: e.target.value})} className={inputStyles} placeholder="1.0.0" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyles}>{t.instructorAssigned}</label>
                  <select value={course.instructorId} onChange={e => setCourse({...course, instructorId: e.target.value})} className={inputStyles}>
                    <option value="">Select Instructor</option>
                    {instructors.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>{t.refresherCourse}</label>
                  <select value={course.refresherCourseId || ''} onChange={e => setCourse({...course, refresherCourseId: e.target.value || undefined})} className={inputStyles}>
                    <option value="">None</option>
                    {allCourses.filter(c => c.id !== id).map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelStyles}>{t.description}</label>
                <textarea rows={3} value={course.description} onChange={e => setCourse({...course, description: e.target.value})} className={inputStyles} placeholder="Overview" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className={labelStyles}>{t.category}</label>
                  <select value={course.category} onChange={e => setCourse({...course, category: e.target.value as any})} className={inputStyles}>
                    <option>Safety</option><option>Security</option><option>Operations</option><option>Customer Service</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>{t.validityYears}</label>
                  <select value={course.validityYears} onChange={e => setCourse({...course, validityYears: parseInt(e.target.value)})} className={inputStyles}>
                    <option value={1}>1 Year</option><option value={2}>2 Years</option><option value={3}>3 Years</option><option value={5}>5 Years</option>
                  </select>
                </div>
                <div className="flex items-end pb-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" checked={course.requiresPracticalCheck} onChange={e => setCourse({...course, requiresPracticalCheck: e.target.checked})} className="w-5 h-5 rounded text-blue-600" />
                    <span className="text-sm font-bold text-slate-700">{t.practicalCheck}</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">{t.curriculum}</h2>
              <button onClick={addLesson} className="text-blue-600 font-bold flex items-center bg-blue-50 px-4 py-2 rounded-xl transition-all border border-blue-100 hover:bg-blue-100">
                {t.addLesson}
              </button>
            </div>
            <div className="space-y-6">
              {(course.lessons || []).map((lesson, idx) => {
                return (
                  <div key={lesson.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="md:col-span-1">
                         <label className="text-[10px] font-black uppercase text-slate-400 px-2">Title</label>
                         <input type="text" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-900" value={lesson.title} onChange={e => updateLesson(idx, { title: e.target.value })} />
                      </div>
                      <div className="md:col-span-1">
                         <label className="text-[10px] font-black uppercase text-slate-400 px-2">Description</label>
                         <input type="text" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-slate-900" value={lesson.description} onChange={e => updateLesson(idx, { description: e.target.value })} />
                      </div>
                      <div className="md:col-span-1">
                         <label className="text-[10px] font-black uppercase text-slate-400 px-2">{t.minLearningTime}</label>
                         <input type="number" min="0" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-blue-600" value={lesson.minLearningTimeMinutes} onChange={e => updateLesson(idx, { minLearningTimeMinutes: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {lesson.materials.map((m) => {
                        const mIdx = lesson.materials.findIndex(orig => orig.id === m.id);
                        return (
                          <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${m.type === 'video' ? 'bg-red-100 text-red-600' : m.type === 'pdf' ? 'bg-orange-100 text-orange-600' : m.type === 'pptx' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>{m.type}</span>
                              <button onClick={() => deleteMaterial(idx, m.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                            <input type="text" className="w-full text-sm font-bold text-slate-900 border-b border-slate-100 focus:border-blue-200 outline-none pb-1" value={m.title} onChange={e => { const mats = [...lesson.materials]; mats[mIdx].title = e.target.value; updateLesson(idx, { materials: mats }); }} placeholder="Material Title" />
                            <input type="text" className="w-full text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg outline-none border border-slate-100" value={m.type === 'text' ? m.content : m.url} onChange={e => { const mats = [...lesson.materials]; if (m.type === 'text') mats[mIdx].content = e.target.value; else mats[mIdx].url = e.target.value; updateLesson(idx, { materials: mats }); }} placeholder={m.type === 'text' ? "Content text..." : "URL Link"} />
                          </div>
                        );
                      })}
                      
                      <div className="flex flex-wrap gap-2 pt-2">
                        {['pdf', 'video', 'pptx', 'text'].map(type => (
                          <button key={type} onClick={() => addMaterial(idx, type as any)} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all uppercase">+ {type}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {course.exam && (
            <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Exam Questions</h2>
                <button onClick={() => setEditingQuestionId('new')} className="text-blue-600 font-bold bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                  {t.addQuestion}
                </button>
              </div>

              {editingQuestionId === 'new' && (
                <div className="mb-8 p-6 bg-slate-50 rounded-2xl border-2 border-blue-100 space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div>
                    <label className={labelStyles}>Question Text</label>
                    <input type="text" value={newQuestion.text} onChange={e => setNewQuestion({...newQuestion, text: e.target.value})} className={inputStyles} placeholder="Enter your question..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {newQuestion.options?.map((opt, oIdx) => (
                      <div key={oIdx} className="relative">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 px-1">Option {String.fromCharCode(65 + oIdx)}</label>
                        <div className="flex gap-2">
                           <input type="text" value={opt} onChange={e => { const opts = [...newQuestion.options!]; opts[oIdx] = e.target.value; setNewQuestion({...newQuestion, options: opts}); }} className={inputStyles} />
                           <button onClick={() => setNewQuestion({...newQuestion, correctOptionIndex: oIdx})} className={`p-3 rounded-xl border-2 transition-all ${newQuestion.correctOptionIndex === oIdx ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-200 text-slate-300'}`}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button onClick={handleAddQuestion} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest">{t.saveQuestion}</button>
                    <button onClick={() => setEditingQuestionId(null)} className="px-6 py-3 bg-slate-200 text-slate-500 rounded-xl font-black text-xs uppercase tracking-widest">Cancel</button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {course.exam.questions.map((q, qIdx) => (
                  <div key={q.id} className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center gap-6 shadow-sm group">
                    <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">{qIdx + 1}</span>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 line-clamp-1">{q.text}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Correct: {String.fromCharCode(65 + q.correctOptionIndex)}</p>
                    </div>
                    <button onClick={() => deleteQuestion(q.id)} className="p-2 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-8">
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 sticky top-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4">{t.integrityRules}</h2>
            {!course.exam ? (
              <div className="space-y-3">
                <button onClick={handleGenerateExam} disabled={loadingAI} className="w-full py-4 bg-blue-50 text-blue-600 rounded-2xl font-bold border border-blue-100 active:scale-95 transition-all">
                  {loadingAI ? t.generating : t.aiGenerate}
                </button>
                <button onClick={handleManualExam} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-100 transition-all active:scale-95 text-xs uppercase tracking-widest">
                  {t.manualSetup}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={labelStyles}>{t.timeLimit}<Tooltip title="Time Limit" text="Number of minutes allowed to complete the exam. Default is 20 minutes." /></label>
                  <input type="number" min="1" value={course.exam.timeLimitMinutes} onChange={e => setCourse({...course, exam: {...course.exam!, timeLimitMinutes: parseInt(e.target.value) || 1}})} className={inputStyles} />
                </div>
                <div>
                  <label className={labelStyles}>{t.passingScore}%<Tooltip title="Passing Score" text="Minimum percentage required to pass the final proficiency exam." /></label>
                  <input type="number" min="1" max="100" value={course.exam.passingScore} onChange={e => setCourse({...course, exam: {...course.exam!, passingScore: parseInt(e.target.value) || 80}})} className={inputStyles} />
                </div>
                <div>
                  <label className={labelStyles}>{t.maxAttempts}<Tooltip title="Max Attempts" text="Maximum tries allowed for this exam profile." /></label>
                  <select value={course.exam.maxAttempts} onChange={e => setCourse({...course, exam: {...course.exam!, maxAttempts: parseInt(e.target.value)}})} className={inputStyles}>
                    {[1,2,3,4,5,10].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>{t.drawFromBank}<Tooltip title="Question Bank" text="Draw a subset of questions from the total pool to make every exam unique. Set to 0 to use all questions." /></label>
                  <input type="number" min="0" value={course.exam.questionBankDrawCount || 0} onChange={e => setCourse({...course, exam: {...course.exam!, questionBankDrawCount: parseInt(e.target.value) || 0}})} className={inputStyles} />
                </div>
                <div className="space-y-2 py-2">
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={course.exam.randomizeQuestions} onChange={e => setCourse({...course, exam: {...course.exam!, randomizeQuestions: e.target.checked}})} className="w-4 h-4 rounded text-blue-600" /><span className="text-xs font-bold text-slate-700">{t.randomizeQuestions}</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={course.exam.randomizeAnswers} onChange={e => setCourse({...course, exam: {...course.exam!, randomizeAnswers: e.target.checked}})} className="w-4 h-4 rounded text-blue-600" /><span className="text-xs font-bold text-slate-700">{t.randomizeAnswers}</span></label>
                </div>
                <button onClick={() => setCourse({...course, exam: undefined})} className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-all">Delete Exam Module</button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default CourseEditor;
