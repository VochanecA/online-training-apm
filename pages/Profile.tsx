import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { db } from '../db';
import { Language, translations } from '../translations';
import { supabase } from '../lib/supabase';

const Profile: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const t = translations[lang];
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editedUser, setEditedUser] = useState<User>({ ...user });
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'activity'>('profile');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

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
      db.updateUser(editedUser);
      
      // Log the action in Supabase
      await db.logAction(user.id, 'PROFILE_UPDATE', 'Updated personal profile details.');

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsEditing(false);
        // Instead of reloading the page, update the parent component
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
        // Reset password flow
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
          // In a real app, you would call an API to delete the account
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
          
          {!isEditing && (
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
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">
                      {t.professionalInformation || 'Professional Information'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">
                          {t.jobTitle || 'Job Title'}
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {user.jobTitle || <span className="text-gray-400">{t.notSpecified || 'Not specified'}</span>}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">
                          {t.departmentName || 'Department'}
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {user.department || <span className="text-gray-400">{t.notSpecified || 'Not specified'}</span>}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">
                          {t.airportName || 'Airport'}
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {user.airport || <span className="text-gray-400">{t.notSpecified || 'Not specified'}</span>}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">
                          {t.staffId || 'Staff ID'}
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {user.staffId || <span className="text-gray-400">{t.notSpecified || 'Not specified'}</span>}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">
                          {t.phoneNumber || 'Phone Number'}
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {user.phone || <span className="text-gray-400">{t.notSpecified || 'Not specified'}</span>}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">
                          {t.email || 'Email'}
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-3">
                        {t.professionalSummary || 'Professional Summary'}
                      </p>
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-gray-700">
                          {user.jobDescription || (t.noProfessionalSummary || 'No professional summary provided.')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Authorization Info */}
                  {(user.role === UserRole.INSTRUCTOR || user.role === UserRole.ADMIN) && (
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 shadow-lg p-6 md:p-8 text-white">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">
                            {t.authorizationCompliance || 'Authorization & Compliance'}
                          </h3>
                          <p className="text-gray-300 text-sm">
                            {t.compliantRecords || 'Compliant training records and authorizations'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                          <p className="text-sm font-medium text-gray-300 mb-1">
                            {t.accessLevel || 'Access Level'}
                          </p>
                          <p className="text-lg font-bold">{user.role}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                          <p className="text-sm font-medium text-gray-300 mb-1">
                            {t.scopeOfDuty || 'Scope of Duty'}
                          </p>
                          <p className="text-lg font-bold">
                            {user.instructorScope || (t.standardOperations || 'Standard Operations')}
                          </p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                          <p className="text-sm font-medium text-gray-300 mb-1">
                            {t.authorizationExpiry || 'Authorization Expiry'}
                          </p>
                          <p className="text-lg font-bold">
                            {user.instructorAuthExpiry 
                              ? new Date(user.instructorAuthExpiry).toLocaleDateString() 
                              : (t.activeStatus || 'Active')}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20 flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-300">
                          {t.complianceMessage || 'All training records are compliant with aviation regulations.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">
                    {t.accountSecurity || 'Account Security'}
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {t.changePassword || 'Change Password'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {t.lastChangedDays || 'Last changed 30 days ago'}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleSecurityAction('change-password')}
                          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                          {t.changePassword || 'Change Password'}
                        </button>
                      </div>
                    </div>

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