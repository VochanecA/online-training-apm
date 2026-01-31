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

import LessonExamView from './pages/LessonExamView';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('skyway_lang');
    if (saved === 'hr') return 'me';
    return (saved as Language) || 'me';
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        updateUserFromSession(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        updateUserFromSession(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('skyway_lang', lang);
  }, [lang]);

  const updateUserFromSession = (userData: any) => {
    setUser({
      id: userData.id,
      email: userData.email!,
      name: userData.user_metadata?.full_name || userData.email!,
      role: userData.user_metadata?.role || UserRole.TRAINEE,
      avatar: userData.user_metadata?.avatar_url,
      instructorScope: userData.user_metadata?.instructor_scope,
      instructorAuthStartDate: userData.user_metadata?.instructor_start,
      instructorAuthExpiry: userData.user_metadata?.instructor_expiry,
      jobTitle: userData.user_metadata?.job_title,
      department: userData.user_metadata?.department,
      airport: userData.user_metadata?.airport,
      phone: userData.user_metadata?.phone,
      jobDescription: userData.user_metadata?.job_description
    });
  };

const handleLoginSuccess = () => {
  console.log('Login success called');
  // Ovdje možete dodati osvježavanje sesije
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      console.log('Session found after login', session.user);
      updateUserFromSession(session.user);
    }
  });
};

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">
          Loading...
        </p>
      </div>
    </div>
  );

  return (
    <Router>
      <Routes>
        {/* Landing Page (Public) */}
        <Route path="/" element={
          <Login 
            lang={lang} 
            setLang={setLang}
            onLoginSuccess={handleLoginSuccess}
          />
        } />
        
        {/* Public Catalog - Accessible without login */}
        <Route path="/public" element={<PublicCourses lang={lang} setLang={setLang} />} />
        
        {/* Auth Protected Routes */}
        <Route path="/app/*" element={
          !user ? (
            <Navigate to="/" replace />
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
                <Route path="/lesson-exam/:courseId/:lessonId" element={<LessonExamView user={user} lang={lang} />} />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Routes>
            </Layout>
          )
        } />
        
        {/* Redirect old routes */}
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="/course/*" element={<Navigate to="/app/course/*" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;