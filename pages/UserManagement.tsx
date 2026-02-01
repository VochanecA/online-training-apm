import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db';
import { User, UserRole, Course, UserCourseAssignment } from '../types';
import { Language, translations } from '../translations';
import { useNavigate } from 'react-router-dom';

const UserManagement: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const navigate = useNavigate();
  const t = translations[lang];
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userAssignments, setUserAssignments] = useState<UserCourseAssignment[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // State za modal dodeljivanja kurseva
  const [showCourseAssignmentModal, setShowCourseAssignmentModal] = useState(false);
  const [selectedCourseToAssign, setSelectedCourseToAssign] = useState<string>('');
  const [assignmentDueDate, setAssignmentDueDate] = useState<string>('');
  const [isAssignmentRequired, setIsAssignmentRequired] = useState<boolean>(true);

  useEffect(() => {
    if (user.role !== UserRole.ADMIN) {
      navigate('/app');
      return;
    }
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        // ISKLJUČIVO SUPABASE AUTH KORISNICI
        const authUsers = await db.getAuthUsers();
        console.log('DB [UserManagement]: Supabase Auth users loaded:', authUsers.length);
        
        // Učitajte kurseve iz Supabase
        const coursesData = await db.getCourses();
        
        // KREIRAJTE PUNI User OBJEKAT SA DODATNIM POLJIMA
        const fullUsers = await Promise.all(
          authUsers.map(async (authUser) => {
            // Proverite da li ima dodatnih podataka u localStorage
            const localUsers = JSON.parse(localStorage.getItem('skyway_users') || '[]');
            const localUserData = localUsers.find((lu: any) => 
              lu.email === authUser.email || lu.id === authUser.id
            );
            
            return {
              ...authUser,
              // Dodajte dodatna polja iz localStorage ako postoje
              staffId: localUserData?.staffId || '',
              airport: localUserData?.airport || '',
              department: localUserData?.department || '',
              jobTitle: localUserData?.jobTitle || '',
              jobDescription: localUserData?.jobDescription || '',
              phone: localUserData?.phone || '',
              instructorScope: localUserData?.instructorScope || '',
              instructorAuthStartDate: localUserData?.instructorAuthStartDate || '',
              instructorAuthExpiry: localUserData?.instructorAuthExpiry || ''
            };
          })
        );
        
        setUsers(fullUsers);
        setCourses(coursesData);
        console.log('DB [UserManagement]: Full users:', fullUsers.length, 'Courses:', coursesData.length);
        
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading users from Supabase. Check console for details.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user, navigate]);

  // Funkcija za učitavanje dodeljenih kurseva za korisnika
  const loadUserAssignments = async (userId: string) => {
    try {
      console.log('Loading assignments for user:', userId);
      const assignments = await db.getUserCourseAssignments(userId);
      console.log('Assignments loaded:', assignments);
      setUserAssignments(assignments);
    } catch (error) {
      console.error('Error loading user assignments:', error);
      setUserAssignments([]);
    }
  };

  // Funkcija za brisanje korisnika iz Supabase Auth
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const success = await db.deleteAuthUser(userId);
      if (success) {
        // Uklonite iz state-a
        const updatedUsers = users.filter(u => u.id !== userId);
        setUsers(updatedUsers);
        
        // Ako je editingUser obrisan, resetujte
        if (editingUser?.id === userId) {
          setEditingUser(null);
          setUserAssignments([]);
        }
        
        alert(`User "${userName}" deleted successfully`);
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`Error deleting user: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Kada se promeni editingUser, učitajte njegove dodeljene kurseve
  useEffect(() => {
    if (editingUser) {
      loadUserAssignments(editingUser.id);
    } else {
      setUserAssignments([]);
    }
  }, [editingUser]);

  const stats = useMemo(() => ({
    total: users.length,
    trainees: users.filter(u => u.role === UserRole.TRAINEE).length,
    instructors: users.filter(u => u.role === UserRole.INSTRUCTOR).length,
    admins: users.filter(u => u.role === UserRole.ADMIN).length,
    inspectors: users.filter(u => u.role === UserRole.INSPECTOR).length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.staffId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleEdit = async (u: User) => {
    setEditingUser({ ...u });
    setIsCreating(false);
  };

  const handleCreateNew = () => {
    const newUser: User = {
      id: '',
      email: '',
      name: '',
      role: UserRole.TRAINEE,
      staffId: '',
      airport: '',
      department: '',
      jobTitle: '',
      jobDescription: '',
      phone: ''
    };
    setEditingUser(newUser);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    
    if (!editingUser.name || !editingUser.email) {
      alert(t.nameEmailRequired);
      return;
    }
    
    try {
      if (isCreating) {
        // KREIRAJTE NOVOG KORISNIKA U SUPABASE AUTH
        console.log('Creating new user in Supabase Auth...');
        
        const tempPassword = `Temp${Date.now().toString().slice(-6)}!`;
        
        const authUser = await db.createAuthUser(
          editingUser.email,
          tempPassword,
          editingUser.name,
          editingUser.role
        );
        
        if (!authUser) {
          throw new Error('Failed to create user in Supabase Auth');
        }
        
        console.log('✅ Auth user created with ID:', authUser.id);
        
        // SAČUVAJTE DODATNE PODATKE U localStorage (SAMO DODATNA POLJA)
        const localUsers = JSON.parse(localStorage.getItem('skyway_users') || '[]');
        
        // Uklonite stare podatke ako postoje
        const filteredLocalUsers = localUsers.filter((lu: any) => 
          lu.id !== authUser.id && lu.email !== authUser.email
        );
        
        // Dodajte nove podatke
        const userToSave = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.name,
          role: authUser.role,
          // Dodatna polja
          staffId: editingUser.staffId || '',
          airport: editingUser.airport || '',
          department: editingUser.department || '',
          jobTitle: editingUser.jobTitle || '',
          jobDescription: editingUser.jobDescription || '',
          phone: editingUser.phone || '',
          instructorScope: editingUser.instructorScope || '',
          instructorAuthStartDate: editingUser.instructorAuthStartDate || '',
          instructorAuthExpiry: editingUser.instructorAuthExpiry || ''
        };
        
        filteredLocalUsers.push(userToSave);
        localStorage.setItem('skyway_users', JSON.stringify(filteredLocalUsers));
        
        // Ažurirajte state
        setUsers([...users, userToSave]);
        
        // Logujte akciju
        await db.logAction(user.id, 'USER_CREATE', 
          `Created user: ${userToSave.name} (${userToSave.email}), Role: ${userToSave.role}`
        );
        
        const message = t.userCreated || 'User created successfully';
        alert(`${message} (Temporary password: ${tempPassword})`);
        
      } else {
        // AŽURIRAJTE POSTOJEĆEG KORISNIKA
        console.log('Updating user in localStorage:', editingUser.id);
        
        const localUsers = JSON.parse(localStorage.getItem('skyway_users') || '[]');
        
        // Pronađite korisnika
        const userIndex = localUsers.findIndex((lu: any) => lu.id === editingUser.id);
        
        if (userIndex > -1) {
          // Ažurirajte postojećeg
          localUsers[userIndex] = {
            ...localUsers[userIndex],
            ...editingUser
          };
        } else {
          // Dodajte novog ako ne postoji
          localUsers.push(editingUser);
        }
        
        localStorage.setItem('skyway_users', JSON.stringify(localUsers));
        
        // Ažurirajte state
        const updatedUsers = users.map(u => 
          u.id === editingUser.id ? editingUser : u
        );
        setUsers(updatedUsers);
        
        // Logujte akciju
        await db.logAction(user.id, 'USER_UPDATE', 
          `Updated user: ${editingUser.name} (${editingUser.email}), Role: ${editingUser.role}`
        );
        
        alert(t.userUpdated);
      }
      
      // Resetujte
      setEditingUser(null);
      setIsCreating(false);
      
    } catch (error) {
      console.error('Error saving user:', error);
      alert(`${t.saveError}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700';
      case UserRole.INSTRUCTOR: return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700';
      case UserRole.INSPECTOR: return 'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-700';
      case UserRole.TRAINEE: return 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Funkcija za uklanjanje dodeljenog kursa
  const handleRemoveAssignment = async (assignment: UserCourseAssignment) => {
    if (window.confirm(t.confirmRemoveAssignment || 'Are you sure you want to remove this course assignment?')) {
      try {
        const success = await db.removeCourseAssignment(assignment.userId, assignment.courseId);
        if (success) {
          // Osveži listu dodeljenih kurseva
          await loadUserAssignments(assignment.userId);
          alert(t.assignmentRemoved || 'Course assignment removed successfully');
        } else {
          alert(t.removeError || 'Error removing assignment');
        }
      } catch (error) {
        console.error('Error removing assignment:', error);
        alert(t.removeError || 'Error removing assignment');
      }
    }
  };

  // Funkcija za dodeljivanje kursa
  const handleAssignCourse = async () => {
    if (!selectedCourseToAssign) {
      alert(t.selectCourseFirst || 'Please select a course first');
      return;
    }

    if (!editingUser) {
      alert(t.noUserSelected || 'No user selected');
      return;
    }

    if (!editingUser.id) {
      alert(t.userNotSaved || 'Please save the user first before assigning courses');
      return;
    }

    console.log('Attempting to assign course:', {
      userId: editingUser.id,
      courseId: selectedCourseToAssign,
      isRequired: isAssignmentRequired,
      dueDate: assignmentDueDate,
      assignedBy: user.id
    });

    try {
      const assignment = await db.assignCourseToUser(
        editingUser.id,
        selectedCourseToAssign,
        isAssignmentRequired,
        assignmentDueDate || undefined,
        user.id
      );
      
      console.log('Assignment result:', assignment);
      
      if (assignment) {
        await loadUserAssignments(editingUser.id);
        
        setShowCourseAssignmentModal(false);
        setSelectedCourseToAssign('');
        setAssignmentDueDate('');
        setIsAssignmentRequired(true);
        
        alert(t.courseAssigned || 'Course assigned successfully');
      } else {
        alert(t.assignmentError || 'Error assigning course');
      }
    } catch (error) {
      console.error('Error assigning course:', error);
      alert(t.assignmentError || 'Error assigning course');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">{t.loadingUsers}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-600 to-cyan-600 rounded-full"></div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t.userManagement}
              </h1>
            </div>
            <p className="text-gray-600 text-sm md:text-base">{t.manageAirportPersonnel}</p>
          </div>
          <button 
            onClick={handleCreateNew}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2 group self-start lg:self-auto"
          >
            <svg className="w-5 h-5 group-hover:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.addNewStaff}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stats.total}</h3>
          <p className="text-sm text-gray-600 font-medium">{t.totalUsers}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stats.trainees}</h3>
          <p className="text-sm text-gray-600 font-medium">{t.trainees}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stats.instructors}</h3>
          <p className="text-sm text-gray-600 font-medium">{t.instructors}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-rose-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stats.admins}</h3>
          <p className="text-sm text-gray-600 font-medium">{t.administrators}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stats.inspectors}</h3>
          <p className="text-sm text-gray-600 font-medium">{t.inspectors}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - User List */}
        <div className="lg:col-span-7">
          <div className="bg-gradient-to-b from-white to-gray-50/50 rounded-2xl p-5 md:p-8 border border-gray-200 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t.personnelDirectory}</h2>
                <p className="text-gray-600 text-sm">{t.searchAndManageStaff}</p>
              </div>
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={t.searchByNameEmailStaffId}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* User List */}
            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium mb-2">{t.noUsersFound}</p>
                  <p className="text-gray-500 text-sm">{t.adjustSearchCriteria}</p>
                </div>
              ) : filteredUsers.map(u => (
                <div 
                  key={u.id} 
                  onClick={() => handleEdit(u)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                    editingUser?.id === u.id 
                      ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300 shadow-sm' 
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {u.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{u.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(u.role)}`}>
                          {u.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600 text-xs">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">{u.email}</span>
                        </span>
                        {u.airport && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
                            </svg>
                            <span>{u.airport}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      {/* DODAJTE DELETE DUGME OVDE */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUser(u.id, u.name);
                        }}
                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
                        title="Delete user"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Editor */}
        <div className="lg:col-span-5">
          {editingUser ? (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-lg sticky top-6">
              {/* Header */}
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-2xl">
                      {editingUser.name.charAt(0) || '?'}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {isCreating ? t.createNewStaff : t.editUser}
                      </h2>
                      <p className="text-gray-300 text-sm">
                        {isCreating ? t.creatingNewStaffProfile : `${t.id}: ${editingUser.staffId || t.notAssigned}`}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingUser(null);
                      setUserAssignments([]);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t.basicInformation}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.fullName}</label>
                      <input 
                        type="text" 
                        value={editingUser.name} 
                        onChange={e => setEditingUser({...editingUser, name: e.target.value})} 
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                        placeholder={t.placeholderFullName}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.staffId}</label>
                      <input 
                        type="text" 
                        value={editingUser.staffId || ''} 
                        onChange={e => setEditingUser({...editingUser, staffId: e.target.value})} 
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                        placeholder="AP-XXXX"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.emailAddress}</label>
                      <input 
                        type="email" 
                        value={editingUser.email} 
                        onChange={e => setEditingUser({...editingUser, email: e.target.value})} 
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                        placeholder="user@airport.com"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.phoneNumber}</label>
                      <input 
                        type="text" 
                        value={editingUser.phone || ''} 
                        onChange={e => setEditingUser({...editingUser, phone: e.target.value})} 
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                        placeholder={t.placeholderPhone}
                      />
                    </div>
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {t.roleAndAuthorization}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[UserRole.TRAINEE, UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.INSPECTOR].map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setEditingUser({...editingUser, role})}
                        className={`py-3 rounded-lg border text-xs font-medium transition-all duration-300 ${
                          editingUser.role === role
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-blue-600 shadow-md'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Job Profile */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
                    </svg>
                    {t.jobProfile}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.jobTitle}</label>
                      <input 
                        type="text" 
                        value={editingUser.jobTitle || ''} 
                        onChange={e => setEditingUser({...editingUser, jobTitle: e.target.value})} 
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                        placeholder={t.placeholderJobTitle}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.departmentName}</label>
                      <input 
                        type="text" 
                        value={editingUser.department || ''} 
                        onChange={e => setEditingUser({...editingUser, department: e.target.value})} 
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                        placeholder={t.placeholderDepartment}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.airportName}</label>
                      <input 
                        type="text" 
                        value={editingUser.airport || ''} 
                        onChange={e => setEditingUser({...editingUser, airport: e.target.value})} 
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                        placeholder={t.placeholderAirport}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.jobDescription}</label>
                      <textarea 
                        value={editingUser.jobDescription || ''} 
                        onChange={e => setEditingUser({...editingUser, jobDescription: e.target.value})} 
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900 min-h-[100px] resize-none"
                        placeholder={t.placeholderSummary}
                      />
                    </div>
                  </div>
                </div>

                {/* Assigned Courses Section */}
                <div className="p-5 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {t.assignedCourses || 'Assigned Courses'}
                    </h3>
                    <button
                      onClick={() => setShowCourseAssignmentModal(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
                      type="button"
                      disabled={!editingUser.id}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {t.assignCourse || 'Assign Course'}
                    </button>
                  </div>
                  
                  {userAssignments.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      {t.noCoursesAssigned || 'No courses assigned to this user'}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userAssignments.map(assignment => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                          <div>
                            <h4 className="font-medium text-gray-900">{assignment.course?.title || 'Loading...'}</h4>
                            <div className="flex gap-3 text-xs text-gray-500 mt-1">
                              <span className={`px-2 py-0.5 rounded ${assignment.isRequired ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {assignment.isRequired ? (t.required || 'Required') : (t.optional || 'Optional')}
                              </span>
                              {assignment.dueDate && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveAssignment(assignment)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title={t.removeAssignment || 'Remove assignment'}
                            type="button"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Administrative Authorization (for Instructors & Admins) */}
                {(editingUser.role === UserRole.INSTRUCTOR || editingUser.role === UserRole.ADMIN) && (
                  <div className="p-5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      {t.administrativeAuthorization}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-700 mb-2">{t.authScope}</label>
                        <input 
                          type="text" 
                          value={editingUser.instructorScope || ''} 
                          onChange={e => setEditingUser({...editingUser, instructorScope: e.target.value})} 
                          className="w-full px-4 py-3 bg-white border border-blue-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                          placeholder={t.authScopePlaceholder}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-2">{t.authStartDate}</label>
                          <input 
                            type="date" 
                            value={editingUser.instructorAuthStartDate || ''} 
                            onChange={e => setEditingUser({...editingUser, instructorAuthStartDate: e.target.value})} 
                            className="w-full px-4 py-3 bg-white border border-blue-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-2">{t.authEndDate}</label>
                          <input 
                            type="date" 
                            value={editingUser.instructorAuthExpiry || ''} 
                            onChange={e => setEditingUser({...editingUser, instructorAuthExpiry: e.target.value})} 
                            className="w-full px-4 py-3 bg-white border border-blue-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
                <div className="flex gap-3">
                  <button 
                    onClick={handleSave}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t.saveUser}
                  </button>
                  <button 
                    onClick={() => {
                      setEditingUser(null);
                      setUserAssignments([]);
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm p-8 text-center h-full flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t.selectAUser}</h3>
              <p className="text-gray-600 text-sm mb-6">
                {t.selectStaffToViewEdit}
              </p>
              <button 
                onClick={handleCreateNew}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t.addNewStaff}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL ZA DODELJIVANJE KURSEVA */}
      {showCourseAssignmentModal && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {t.assignCourseToUser || 'Assign Course to User'}
              </h3>
              <button
                onClick={() => {
                  setShowCourseAssignmentModal(false);
                  setSelectedCourseToAssign('');
                  setAssignmentDueDate('');
                  setIsAssignmentRequired(true);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                type="button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.selectCourse || 'Select Course'}
                </label>
                <select
                  value={selectedCourseToAssign}
                  onChange={(e) => setSelectedCourseToAssign(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                >
                  <option value="">{t.chooseCourse || 'Choose a course...'}</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title} - {course.category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.dueDate || 'Due Date (Optional)'}
                </label>
                <input
                  type="date"
                  value={assignmentDueDate}
                  onChange={(e) => setAssignmentDueDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isAssignmentRequired}
                    onChange={(e) => setIsAssignmentRequired(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {t.requiredCourse || 'Required course'}
                  </span>
                </label>
                <span className="text-xs text-gray-500">
                  {t.requiredExplanation || 'User must complete this course'}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleAssignCourse}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                type="button"
              >
                {t.assignCourse || 'Assign Course'}
              </button>
              <button
                onClick={() => {
                  setShowCourseAssignmentModal(false);
                  setSelectedCourseToAssign('');
                  setAssignmentDueDate('');
                  setIsAssignmentRequired(true);
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                type="button"
              >
                {t.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;