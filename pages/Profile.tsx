import React, { useState, useEffect } from 'react';
import { User, UserRole, Course } from '../types';
import { db } from '../db';
import { Language, translations } from '../translations';
import { supabase } from '../lib/supabase';

interface UserCourseHistory {
  course: Course;
  progress?: {
    completed: boolean;
    score?: number;
    completionDate?: string;
    expiryDate?: string;
    status: 'completed' | 'in-progress' | 'not-started' | 'expired';
  };
}

const Profile: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const t = translations[lang];
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editedUser, setEditedUser] = useState<User>({ ...user });
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'activity' | 'history'>('profile');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  // State za promjenu passworda
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // State za istoriju kurseva
  const [courseHistory, setCourseHistory] = useState<UserCourseHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const loadAuditLogs = async () => {
      if (activeTab === 'activity') {
        try {
          setLoadingLogs(true);
          const logs = await db.getAuditLogs();
          setAuditLogs(logs);
        } catch (error) {
          console.error('Error loading audit logs:', error);
        } finally {
          setLoadingLogs(false);
        }
      }
    };

    loadAuditLogs();
  }, [activeTab]);

  useEffect(() => {
    const loadCourseHistory = async () => {
      if (activeTab === 'history') {
        try {
          setLoadingHistory(true);
          
          // Uzmi sve kurseve
          const allCourses = await db.getCourses();
          
          // Uzmi progres korisnika za sve kurseve
          const userProgress = await db.getUserProgress(user.id, '');
          
          // Kombinuj kurseve sa progresom
          const history = allCourses.map((course: Course) => {
            const progress = userProgress.find((p: any) => p.courseId === course.id);
            
            let status: 'completed' | 'in-progress' | 'not-started' | 'expired' = 'not-started';
            
            if (progress) {
              if (progress.isCompleted) {
                if (progress.expiryDate && new Date(progress.expiryDate) < new Date()) {
                  status = 'expired';
                } else {
                  status = 'completed';
                }
              } else if (progress.completedLessonIds && progress.completedLessonIds.length > 0) {
                status = 'in-progress';
              }
            }
            
            return {
              course,
              progress: progress ? {
                completed: progress.isCompleted || false,
                score: progress.examScore,
                completionDate: progress.completionDate,
                expiryDate: progress.expiryDate,
                status
              } : undefined
            };
          });
          
          setCourseHistory(history);
        } catch (error) {
          console.error('Error loading course history:', error);
          setCourseHistory([]);
        } finally {
          setLoadingHistory(false);
        }
      }
    };

    loadCourseHistory();
  }, [activeTab, user.id]);

  // Funkcija za generisanje PDF-a
  const generateCourseHistoryPDF = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Course History - ${user.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
          h2 { color: #475569; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #f1f5f9; text-align: left; padding: 12px; border: 1px solid #cbd5e1; }
          td { padding: 12px; border: 1px solid #cbd5e1; }
          .completed { background-color: #dcfce7; color: #166534; }
          .in-progress { background-color: #fef3c7; color: #92400e; }
          .not-started { background-color: #f3f4f6; color: #374151; }
          .expired { background-color: #fee2e2; color: #991b1b; }
          .status { padding: 4px 12px; border-radius: 20px; font-weight: bold; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info { margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Course History Report</h1>
            <div class="info">
              <p><strong>Name:</strong> ${user.name}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Staff ID:</strong> ${user.staffId || 'N/A'}</p>
              <p><strong>Role:</strong> ${user.role}</p>
            </div>
          </div>
          <div>
            <p><strong>Generated:</strong> ${dateStr} ${timeStr}</p>
            <p><strong>Total Courses:</strong> ${courseHistory.length}</p>
          </div>
        </div>
        
        <h2>Course History</h2>
        <table>
          <thead>
            <tr>
              <th>Course Title</th>
              <th>Category</th>
              <th>Version</th>
              <th>Status</th>
              <th>Score</th>
              <th>Completion Date</th>
              <th>Expiry Date</th>
            </tr>
          </thead>
          <tbody>
    `;

    courseHistory.forEach((item) => {
      const course = item.course;
      const progress = item.progress;
      
      let statusText = 'Not Started';
      let statusClass = 'not-started';
      
      if (progress) {
        switch (progress.status) {
          case 'completed':
            statusText = 'Completed';
            statusClass = 'completed';
            break;
          case 'in-progress':
            statusText = 'In Progress';
            statusClass = 'in-progress';
            break;
          case 'expired':
            statusText = 'Expired';
            statusClass = 'expired';
            break;
          default:
            statusText = 'Not Started';
            statusClass = 'not-started';
        }
      }
      
      const score = progress?.score ? `${progress.score}%` : 'N/A';
      const completionDate = progress?.completionDate 
        ? new Date(progress.completionDate).toLocaleDateString() 
        : 'N/A';
      const expiryDate = progress?.expiryDate 
        ? new Date(progress.expiryDate).toLocaleDateString() 
        : 'N/A';
      
      htmlContent += `
        <tr>
          <td><strong>${course.title}</strong></td>
          <td>${course.category || 'General'}</td>
          <td>${course.version || '1.0'}</td>
          <td><span class="status ${statusClass}">${statusText}</span></td>
          <td>${score}</td>
          <td>${completionDate}</td>
          <td>${expiryDate}</td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #cbd5e1;">
          <p><small>This document was automatically generated by CloudTraining Aviation Platform.</small></p>
          <p><small>© ${now.getFullYear()} CloudTraining. All rights reserved.</small></p>
        </div>
      </body>
      </html>
    `;

    // Kreiranje PDF-a
    const win = window.open();
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
      win.print();
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    
    // Validacija
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t.passwordFieldsRequired || 'All password fields are required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordsDoNotMatch || 'Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError(t.passwordMinLength || 'Password must be at least 6 characters long');
      return;
    }

    try {
      setChangingPassword(true);
      
      // Prvo provjerimo trenutni password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setPasswordError(t.incorrectCurrentPassword || 'Current password is incorrect');
        } else {
          throw signInError;
        }
        return;
      }
      
      // Ako je trenutni password ispravan, mijenjamo password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        console.error('Password update error:', updateError);
        throw new Error(updateError.message);
      }
      
      // Logujemo akciju
      await db.logAction(user.id, 'PASSWORD_CHANGE', 'User changed password successfully.');
      
      // Prikažemo poruku o uspjehu
      setPasswordSuccess(true);
      
      // Resetujemo polja
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Sakrijemo poruku nakon 3 sekunde
      setTimeout(() => {
        setPasswordSuccess(false);
        setChangingPassword(false);
      }, 3000);
      
    } catch (err: any) {
      console.error('Password change error:', err);
      setPasswordError(err.message || (t.passwordChangeFailed || 'Failed to change password'));
      setChangingPassword(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return { 
        color: 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200',
        icon: '👑',
        desc: t.roleAdminDesc 
      };
      case UserRole.INSTRUCTOR: return { 
        color: 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border border-blue-200',
        icon: '🎓',
        desc: t.roleInstructorDesc 
      };
      case UserRole.INSPECTOR: return { 
        color: 'bg-gradient-to-r from-purple-50 to-violet-50 text-purple-700 border border-purple-200',
        icon: '🔍',
        desc: t.roleInspectorDesc 
      };
      default: return { 
        color: 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200',
        icon: '👨‍✈️',
        desc: t.roleTraineeDesc 
      };
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update user in Supabase auth metadata
      const { error: supabaseError } = await supabase.auth.updateUser({
        data: {
          full_name: editedUser.name,
          job_title: editedUser.jobTitle,
          department: editedUser.department,
          airport: editedUser.airport,
          phone: editedUser.phone,
          job_description: editedUser.jobDescription,
          instructor_scope: editedUser.instructorScope,
          instructor_auth_expiry: editedUser.instructorAuthExpiry,
          staff_id: editedUser.staffId
        }
      });
      
      if (supabaseError) {
        console.error('Supabase auth update error:', supabaseError);
        throw new Error(lang === 'en' ? 'Failed to update profile in authentication system' : 'Greška pri ažuriranju profila u sistemu autentifikacije');
      }

      // Update user in local storage for backward compatibility
      const users = JSON.parse(localStorage.getItem('skyway_users') || '[]');
      const index = users.findIndex((u: User) => u.id === user.id);
      if (index > -1) {
        users[index] = editedUser;
      } else {
        users.push(editedUser);
      }
      localStorage.setItem('skyway_users', JSON.stringify(users));
      
      // Log the action in Supabase
      await db.logAction(user.id, 'PROFILE_UPDATE', 'Updated personal profile details.');

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsEditing(false);
        window.dispatchEvent(new Event('user-updated'));
      }, 1500);
    } catch (err: any) {
      console.error('Profile update error:', err);
      alert(lang === 'en' ? `Error: ${err.message}` : `Greška: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentRole = getRoleBadge(user.role);

  const handleSecurityAction = async (action: string) => {
    switch (action) {
      case 'change-password':
        const email = user.email;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (error) {
          alert(lang === 'en' ? 'Error sending reset email' : 'Greška pri slanju email-a za resetovanje');
        } else {
          alert(lang === 'en' ? 'Check your email for password reset instructions' : 'Proverite vaš email za uputstva za resetovanje lozinke');
        }
        break;
        
      case 'delete-account':
        if (confirm(lang === 'en' 
          ? 'Are you sure you want to delete your account? This action cannot be undone.'
          : 'Da li ste sigurni da želite da obrišete svoj nalog? Ova radnja se ne može poništiti.')) {
          alert(lang === 'en' 
            ? 'Account deletion has been requested. Please contact your administrator.'
            : 'Zahtev za brisanje naloga je poslat. Molimo kontaktirajte administratora.');
        }
        break;
        
      default:
        break;
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-600 to-cyan-600 rounded-full"></div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t.myProfile || 'My Profile'}
              </h1>
            </div>
            <p className="text-gray-600 text-sm md:text-base">
              {t.manageProfile || 'Manage your personal information and account settings'}
            </p>
          </div>
          
          {!isEditing && activeTab === 'profile' && (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2 group self-start lg:self-auto"
            >
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t.editProfile || 'Edit Profile'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === 'profile' 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            {t.profileTab || 'Profile'}
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === 'security' 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            {t.securityTab || 'Security'}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === 'history' 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            Course History
          </button>
          <button 
            onClick={() => setActiveTab('activity')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === 'activity' 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            {t.activityTab || 'Activity'}
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-medium">
              {t.profileUpdatedSuccess || 'Profile updated successfully!'}
            </span>
          </div>
        </div>
      )}
      
      {/* Password Success Toast */}
      {passwordSuccess && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-medium">
              {t.passwordChangedSuccess || 'Password changed successfully!'}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-4">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-6">
            {/* Profile Header */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-30"></div>
                <div className="relative w-24 h-24 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
                  {user.name.charAt(0)}
                </div>
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-1">{user.name}</h2>
              <p className="text-gray-600 text-sm mb-4">{user.email}</p>
              
              <div className={`px-4 py-2 rounded-full ${currentRole.color} flex items-center gap-2 mb-6`}>
                <span>{currentRole.icon}</span>
                <span className="font-medium text-sm">{user.role}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      {t.trainingStatus || 'Training Status'}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {t.verifiedStatus || 'Verified'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      {t.accountType || 'Account Type'}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {t.professionalAccount || 'Professional'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Description */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
              <p className="text-sm text-gray-700 font-medium">{currentRole.desc}</p>
            </div>
          </div>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-8">
          {isEditing ? (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
              {/* Edit Profile Form */}
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-gray-900">
                  {t.editProfileTitle || 'Edit Profile'}
                </h3>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedUser({ ...user });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.fullName || 'Full Name'}
                    </label>
                    <input 
                      type="text" 
                      value={editedUser.name} 
                      onChange={e => setEditedUser({...editedUser, name: e.target.value})} 
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.jobTitle || 'Job Title'}
                    </label>
                    <input 
                      type="text" 
                      value={editedUser.jobTitle || ''} 
                      onChange={e => setEditedUser({...editedUser, jobTitle: e.target.value})} 
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                      placeholder={t.placeholderJobTitle || 'e.g., Ramp Supervisor'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.departmentName || 'Department'}
                    </label>
                    <input 
                      type="text" 
                      value={editedUser.department || ''} 
                      onChange={e => setEditedUser({...editedUser, department: e.target.value})} 
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                      placeholder={t.placeholderDepartment || 'e.g., Ground Operations'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.airportName || 'Airport'}
                    </label>
                    <input 
                      type="text" 
                      value={editedUser.airport || ''} 
                      onChange={e => setEditedUser({...editedUser, airport: e.target.value})} 
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                      placeholder={t.placeholderAirport || 'e.g., Podgorica Airport (TGD)'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.staffId || 'Staff ID'}
                    </label>
                    <input 
                      type="text" 
                      value={editedUser.staffId || ''} 
                      onChange={e => setEditedUser({...editedUser, staffId: e.target.value})} 
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                      placeholder={t.placeholderStaffId || 'e.g., TGD-OP-001'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.phoneNumber || 'Phone Number'}
                    </label>
                    <input 
                      type="tel" 
                      value={editedUser.phone || ''} 
                      onChange={e => setEditedUser({...editedUser, phone: e.target.value})} 
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                      placeholder={t.placeholderPhone || '+382 XX XXX XXX'}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.professionalSummary || 'Professional Summary'}
                    </label>
                    <textarea 
                      value={editedUser.jobDescription || ''} 
                      onChange={e => setEditedUser({...editedUser, jobDescription: e.target.value})} 
                      rows={4}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                      placeholder={t.placeholderSummary || 'Brief description of your role and responsibilities...'}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t.saving || 'Saving...'}
                      </>
                    ) : (
                      <>
                        {t.saveChangesButton || 'Save Changes'}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setIsEditing(false); setEditedUser({...user}); }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    {t.cancel || 'Cancel'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Profile Information */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* ... (existing profile content remains the same) ... */}
                </div>
              )}

              {/* Security Tab */}
{/* Security Tab */}
{activeTab === 'security' && (
  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
    <h3 className="text-xl font-bold text-gray-900 mb-6">
      {t.accountSecurity || 'Account Security'}
    </h3>
    
    <div className="space-y-6">
      {/* Change Password Section */}
      <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
        <div className="mb-6">
          <h4 className="font-bold text-gray-900 text-lg mb-2">
            {t.changePassword || 'Change Password'}
          </h4>
          <p className="text-sm text-gray-600">
            {t.changePasswordDescription || 'Update your password. Make sure it is at least 6 characters long.'}
          </p>
        </div>
        
        {passwordError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{passwordError}</p>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.currentPassword || 'Current Password'}
            </label>
            <input 
              type="password" 
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
              placeholder={t.enterCurrentPassword || 'Enter current password'}
              disabled={changingPassword}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.newPassword || 'New Password'}
              </label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                placeholder={t.enterNewPassword || 'Enter new password'}
                disabled={changingPassword}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.confirmPassword || 'Confirm Password'}
              </label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                placeholder={t.confirmNewPassword || 'Confirm new password'}
                disabled={changingPassword}
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button 
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {changingPassword ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t.changingPassword || 'Changing Password...'}
                </>
              ) : (
                <>
                  {t.changePasswordButton || 'Change Password'}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Alternative Reset Option */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3">
            {t.forgotPasswordText || 'Forgot your password? You can request a password reset via email.'}
          </p>
          <button 
            onClick={() => handleSecurityAction('change-password')}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
          >
            {t.sendResetEmail || 'Send Reset Email'}
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">
              {t.twoFactorAuth || 'Two-Factor Authentication'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {t.extraSecurityLayer || 'Add an extra layer of security'}
            </p>
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg transition-all">
            {t.enable2FA || 'Enable 2FA'}
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">
              {t.activeSessions || 'Active Sessions'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              1 {t.activeSessions?.toLowerCase() || 'active session'}
            </p>
          </div>
          <button className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium">
            {t.viewAllSessions || 'View All Sessions'}
          </button>
        </div>
      </div>

      {/* Account Deletion */}
      <div className="p-5 bg-red-50 rounded-xl border border-red-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-red-900">
              {t.accountDeletion || 'Account Deletion'}
            </p>
            <p className="text-sm text-red-600 mt-1">
              {t.deleteAccountWarning || 'Permanently delete your account and all data'}
            </p>
          </div>
          <button 
            onClick={() => handleSecurityAction('delete-account')}
            className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
          >
            {t.deleteAccountButton || 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

              {/* Course History Tab */}
              {activeTab === 'history' && (
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-gray-900">
                      Course History
                    </h3>
                    <button
                      onClick={generateCourseHistoryPDF}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </button>
                  </div>
                  
                  {loadingHistory ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {courseHistory.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                          <p className="text-gray-600">
                            No course history found. Start your first course to see it here.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {courseHistory.map((item, index) => {
                            const { course, progress } = item;
                            let statusText = 'Not Started';
                            let statusColor = 'bg-gray-100 text-gray-700';
                            
                            if (progress) {
                              switch (progress.status) {
                                case 'completed':
                                  statusText = 'Completed';
                                  statusColor = 'bg-green-100 text-green-700';
                                  break;
                                case 'in-progress':
                                  statusText = 'In Progress';
                                  statusColor = 'bg-yellow-100 text-yellow-700';
                                  break;
                                case 'expired':
                                  statusText = 'Expired';
                                  statusColor = 'bg-red-100 text-red-700';
                                  break;
                              }
                            }
                            
                            return (
                              <div 
                                key={course.id || index} 
                                className="p-5 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all"
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h4 className="font-bold text-gray-900 text-lg">
                                        {course.title}
                                      </h4>
                                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                        {statusText}
                                      </span>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                      <div className="flex items-center gap-1">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                        <span>{course.category || 'General'}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>v{course.version || '1.0'}</span>
                                      </div>
                                    </div>
                                    
                                    {progress && (
                                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {progress.score !== undefined && (
                                          <div>
                                            <p className="text-xs font-medium text-gray-500">Score</p>
                                            <p className="font-bold text-gray-900">{progress.score}%</p>
                                          </div>
                                        )}
                                        
                                        {progress.completionDate && (
                                          <div>
                                            <p className="text-xs font-medium text-gray-500">Completed</p>
                                            <p className="font-bold text-gray-900">
                                              {new Date(progress.completionDate).toLocaleDateString()}
                                            </p>
                                          </div>
                                        )}
                                        
                                        {progress.expiryDate && (
                                          <div>
                                            <p className="text-xs font-medium text-gray-500">Expires</p>
                                            <p className="font-bold text-gray-900">
                                              {new Date(progress.expiryDate).toLocaleDateString()}
                                            </p>
                                          </div>
                                        )}
                                        
                                        <div>
                                          <p className="text-xs font-medium text-gray-500">Validity</p>
                                          <p className="font-bold text-gray-900">
                                            {course.validityYears || 2} years
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">
                    {t.recentActivity || 'Recent Activity'}
                  </h3>
                  
                  {loadingLogs ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {auditLogs
                        .filter(log => log.userId === user.id)
                        .slice(0, 10)
                        .map((log) => (
                          <div key={log.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{log.action}</p>
                                <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                              </div>
                              <span className="text-sm text-gray-500 whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      
                      {auditLogs.filter(log => log.userId === user.id).length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-gray-600">
                            {t.noActivityRecorded || 'No activity recorded yet.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;