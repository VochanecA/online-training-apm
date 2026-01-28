
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole } from './types';
import { db } from './db';
import { Language, translations } from './translations';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CourseDetail from './pages/CourseDetail';
import LessonView from './pages/LessonView';
import ExamView from './pages/ExamView';
import CertificateView from './pages/CertificateView';
import TrainingRecordView from './pages/TrainingRecordView';
import CourseManagement from './pages/CourseManagement';
import CourseEditor from './pages/CourseEditor';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Reports from './pages/Reports';
import PublicCourses from './pages/PublicCourses';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('skyway_lang');
    // Migration: If user had Croatian set previously, upgrade to Montenegrin
    if (saved === 'hr') return 'me';
    return (saved as Language) || 'me';
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.full_name || session.user.email!,
          role: session.user.user_metadata?.role || UserRole.TRAINEE,
          avatar: session.user.user_metadata?.avatar_url,
          instructorScope: session.user.user_metadata?.instructor_scope,
          instructorAuthStartDate: session.user.user_metadata?.instructor_start,
          instructorAuthExpiry: session.user.user_metadata?.instructor_expiry,
          jobTitle: session.user.user_metadata?.job_title,
          department: session.user.user_metadata?.department,
          airport: session.user.user_metadata?.airport,
          phone: session.user.user_metadata?.phone,
          jobDescription: session.user.user_metadata?.job_description
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.full_name || session.user.email!,
          role: session.user.user_metadata?.role || UserRole.TRAINEE,
          avatar: session.user.user_metadata?.avatar_url,
          instructorScope: session.user.user_metadata?.instructor_scope,
          instructorAuthStartDate: session.user.user_metadata?.instructor_start,
          instructorAuthExpiry: session.user.user_metadata?.instructor_expiry,
          jobTitle: session.user.user_metadata?.job_title,
          department: session.user.user_metadata?.department,
          airport: session.user.user_metadata?.airport,
          phone: session.user.user_metadata?.phone,
          jobDescription: session.user.user_metadata?.job_description
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('skyway_lang', lang);
  }, [lang]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
    </div>
  );

  return (
    <Router>
      <Routes>
        {/* Public Catalog - Accessible even if not logged in */}
        <Route path="/public" element={<PublicCourses lang={lang} setLang={setLang} />} />
        
        {/* Auth Protected Routes */}
        <Route path="*" element={
          !user ? (
            <Login lang={lang} setLang={setLang} />
          ) : (
            <Layout user={user} lang={lang} setLang={setLang}>
              <Routes>
                <Route path="/" element={<Dashboard user={user} lang={lang} />} />
                <Route path="/course/:id" element={<CourseDetail user={user} lang={lang} />} />
                <Route path="/lesson/:courseId/:lessonId" element={<LessonView user={user} lang={lang} />} />
                <Route path="/exam/:courseId" element={<ExamView user={user} lang={lang} />} />
                <Route path="/certificate/:courseId" element={<CertificateView user={user} lang={lang} />} />
                <Route path="/training-record/:courseId" element={<TrainingRecordView user={user} lang={lang} />} />
                <Route path="/profile" element={<Profile user={user} lang={lang} />} />
                <Route path="/admin/courses" element={<CourseManagement user={user} lang={lang} />} />
                <Route path="/admin/reports" element={<Reports user={user} lang={lang} />} />
                <Route path="/admin/users" element={<UserManagement user={user} lang={lang} />} />
                <Route path="/admin/course/new" element={<CourseEditor user={user} lang={lang} />} />
                <Route path="/admin/course/edit/:id" element={<CourseEditor user={user} lang={lang} />} />
                {/* Fallback to Dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          )
        } />
      </Routes>
    </Router>
  );
};

export default App;
