import React from 'react';
import { User, UserRole } from '../types';
import { Language, translations } from '../translations';

const Profile: React.FC<{ user: User; lang: Language }> = ({ user, lang }) => {
  const t = translations[lang];

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return { color: 'bg-red-100 text-red-700', desc: t.roleAdminDesc };
      case UserRole.INSTRUCTOR:
        return { color: 'bg-blue-100 text-blue-700', desc: t.roleInstructorDesc };
      case UserRole.INSPECTOR:
        return { color: 'bg-purple-100 text-purple-700', desc: t.roleInspectorDesc };
      default:
        return { color: 'bg-slate-100 text-slate-700', desc: t.roleTraineeDesc };
    }
  };

  const currentRole = getRoleBadge(user.role);

  return (
    <div className="max-w-4xl mx-auto p-6 animate-in fade-in duration-700">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight sm:text-4xl">
          {t.profile}
        </h1>
        <p className="mt-2 text-gray-500 font-medium">
          Personnel professional identification and authorization file.
        </p>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden shadow-2xl shadow-gray-200/50">
        {/* User Header */}
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row items-center gap-8">
          <div className="w-28 h-28 rounded-3xl bg-gray-900 flex items-center justify-center text-5xl font-bold text-white shadow-2xl rotate-3">
            {user.name.charAt(0)}
          </div>
          <div className="text-center md:text-left flex-1">
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
              <span
                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm ${currentRole.color}`}
              >
                {user.role}
              </span>
              <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm">
                Verified Personnel
              </span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-5xl">
              {user.name}
            </h2>
            <p className="text-gray-500 text-lg font-medium font-mono">
              {user.email}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8 bg-gray-50/50">
          <div className="space-y-8">
            {/* Role Description */}
            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-start gap-6 transition-all hover:shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xl shadow-blue-500/20">
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3c1.288 0 2.511.242 3.633.682m0 0l.054.09A10.003 10.003 0 0112 21c-1.288 0-2.511-.242-3.633-.682m0 0L8.5 20"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-1">
                  Tier Authorization Scope
                </h3>
                <p className="text-gray-900 font-medium text-lg leading-tight tracking-tight">
                  {currentRole.desc}
                </p>
              </div>
            </div>

            {/* Staff Certification (Conditional) */}
            {(user.role === UserRole.INSTRUCTOR || user.role === UserRole.ADMIN) && (
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-6 px-4">
                  Staff Certification File
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-lg hover:border-blue-200">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                      {t.authScope}
                    </label>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight">
                      {user.instructorScope || 'Aviation Safety & Operations'}
                    </p>
                  </div>
                  <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-lg hover:border-green-200">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                      Authorization Status
                    </label>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="w-3.5 h-3.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]"></div>
                      <p className="text-xl font-bold text-green-600 uppercase tracking-tight">
                        Active & Qualified
                      </p>
                    </div>
                  </div>
                  <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-lg">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                      {t.authStartDate}
                    </label>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight">
                      {user.instructorAuthStartDate ? new Date(user.instructorAuthStartDate).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-lg hover:border-blue-200">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                      {t.authEndDate}
                    </label>
                    <p
                      className={`text-2xl font-bold tracking-tight ${
                        user.instructorAuthExpiry ? 'text-blue-600' : 'text-gray-900'
                      }`}
                    >
                      {user.instructorAuthExpiry ? new Date(user.instructorAuthExpiry).toLocaleDateString() : 'Permanent Authorization'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Security Credentials */}
            <div className="p-8 bg-gray-900 text-white rounded-3xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] group-hover:bg-blue-600/30 transition-all duration-700"></div>
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-400/10 rounded-full blur-[80px]"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-blue-400">
                    Security Credentials Verification
                  </h4>
                </div>
                <p className="text-base font-medium leading-relaxed opacity-70">
                  CloudTraining credentials are subject to continuous regulatory oversight. All training activities, session times, and exam performance are logged immutably for aviation authority audit readiness.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
