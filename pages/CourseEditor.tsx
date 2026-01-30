import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Trash2 } from 'lucide-react';
import { db } from '../db';
import { supabase } from '../lib/supabase';
import { Course, Lesson, Material, Exam, Question, User, UserRole } from '../types';
import { geminiService } from '../geminiService';
import { Language, translations } from '../translations';
import { MaterialUpload } from '../components/Materialupload';

// Helper function to extract filename from URL
const extractFileNameFromUrl = (url: string): string => {
  if (!url) return 'File';
  
  try {
    const urlParts = url.split('/');
    let fileName = urlParts[urlParts.length - 1];
    
    // Decode URL-encoded characters
    fileName = decodeURIComponent(fileName);
    
    // Remove timestamp prefix if exists (e.g., "1737891234567_myfile.pdf")
    const underscoreIndex = fileName.indexOf('_');
    if (underscoreIndex !== -1) {
      fileName = fileName.substring(underscoreIndex + 1);
    }
    
    // Remove query parameters if they exist
    const questionMarkIndex = fileName.indexOf('?');
    if (questionMarkIndex !== -1) {
      fileName = fileName.substring(0, questionMarkIndex);
    }
    
    return fileName || 'File';
  } catch (error) {
    console.error('Error extracting filename:', error);
    return 'File';
  }
};

// Helper function to check if URL is from Supabase Storage
const isSupabaseStorageUrl = (url: string): boolean => {
  return url.includes('supabase.co/storage/v1/object/public/materials/');
};

// Main CourseEditor Component
const CourseEditor: React.FC<{ user: User; lang: Language }> = ({ user, lang }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = translations[lang];
  const [loadingAI, setLoadingAI] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({ 
    text: '', 
    options: ['', '', '', ''], 
    correctOptionIndex: 0 
  });
  const [users, setUsers] = useState<User[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<string | null>(null);
  const [savingMaterial, setSavingMaterial] = useState<string | null>(null);

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
    const loadData = async (): Promise<void> => {
      if (user.role === UserRole.TRAINEE || user.role === UserRole.INSPECTOR) {
        navigate('/dashboard');
        return;
      }
      
      try {
        setIsLoading(true);
const usersData = await db.getAuthUsers();
console.log('Loaded auth users from Supabase:', usersData.length);
setUsers(usersData);
        
        // Load courses from Supabase
        console.log('Loading courses from Supabase...');
        const coursesData = await db.getCourses();
        console.log('Loaded courses from Supabase:', coursesData.length);
        
        coursesData.forEach((c, index) => {
          console.log(`Course ${index + 1}:`, {
            id: c.id,
            title: c.title,
            instructorId: c.instructorId,
            hasInstructor: !!c.instructorId,
            lessons: c.lessons?.length || 0
          });
        });
        
        setAllCourses(coursesData);
        
        if (id) {
          console.log('Looking for course with ID:', id);
          const existing = coursesData.find(c => c.id === id);
          if (existing) {
            console.log('Found existing course:', {
              id: existing.id,
              title: existing.title,
              instructorId: existing.instructorId,
              lessons: existing.lessons?.length || 0
            });
            
            // Load materials from public.materials table for each lesson
            const lessonsWithMaterials = await Promise.all(
              existing.lessons.map(async (lesson) => {
                try {
                  console.log(`Loading materials for lesson: ${lesson.id}`);
                  const { data: materials, error } = await supabase
                    .from('materials')
                    .select('*')
                    .eq('lesson_id', lesson.id)
                    .order('created_at', { ascending: true });
                  
                  if (error) {
                    console.error(`Error loading materials for lesson ${lesson.id}:`, error);
                    return lesson;
                  }
                  
                  console.log(`Found ${materials?.length || 0} materials for lesson ${lesson.id}`);
                  
                  return {
                    ...lesson,
                    materials: materials?.map(material => ({
                      id: material.id,
                      type: material.type as Material['type'],
                      title: material.title,
                      url: material.url || '',
                      content: material.content || undefined
                    })) || []
                  };
                } catch (error) {
                  console.error(`Error processing lesson ${lesson.id}:`, error);
                  return lesson;
                }
              })
            );
            
            setCourse({
              ...existing,
              lessons: lessonsWithMaterials
            });
          } else {
            console.log('Course not found with id:', id);
            alert(lang === 'en' ? 'Course not found' : 'Kurs nije pronađen');
            navigate('/admin/courses');
          }
        } else {
          console.log('Creating new course');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        alert(lang === 'en' ? 'Error loading course data' : 'Greška pri učitavanju podataka kursa');
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [id, user, navigate, lang]);

  const instructors = useMemo(() => 
    users.filter(u => u.role === UserRole.INSTRUCTOR || u.role === UserRole.ADMIN),
    [users]
  );

  const saveCourse = async (): Promise<void> => {
    console.log('=== SAVE COURSE STARTED ===');
    console.log('Course title:', course.title);
    console.log('Course instructor:', course.instructorId);
    console.log('Course ID:', course.id);
    console.log('Course lessons:', course.lessons?.length || 0);
    console.log('Course exam questions:', course.exam?.questions?.length || 0);
    
    // Validation
    if (!course.title || course.title.trim() === '') {
      alert(lang === 'en' ? 'Course title is required' : 'Naslov kursa je obavezan');
      return;
    }
    
    if (!course.instructorId) {
      alert(lang === 'en' ? 'Please select an instructor' : 'Molimo izaberite instruktora');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Create course data
      const courseToSave: Course = {
        id: course.id || '',
        title: course.title.trim(),
        description: course.description || '',
        version: course.version || '1.0.0',
        category: course.category as 'Safety' | 'Security' | 'Operations' | 'Customer Service',
        instructorId: course.instructorId,
        thumbnail: course.thumbnail || 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=400&q=80',
        lessons: course.lessons || [],
        isSequential: course.isSequential ?? true,
        validityYears: course.validityYears || 2,
        requiresPracticalCheck: course.requiresPracticalCheck || false,
        refresherCourseId: course.refresherCourseId,
        exam: course.exam
      };

      console.log('Saving course data:', {
        id: courseToSave.id,
        title: courseToSave.title,
        instructorId: courseToSave.instructorId,
        lessonsCount: courseToSave.lessons.length,
        hasExam: !!courseToSave.exam
      });
      
      // Save course to database
      console.log('Calling db.saveCourse...');
      const savedCourse = await db.saveCourse(courseToSave);
      
      if (savedCourse) {
        console.log('Course saved successfully:', savedCourse.id);
        
        // Log action
        try {
          await db.logAction(user.id, 'COURSE_SAVE', `Saved course: ${savedCourse.title} (v${savedCourse.version})`);
        } catch (logError) {
          console.warn('Failed to log action:', logError);
        }
        
        alert(lang === 'en' ? 'Course saved successfully!' : 'Kurs uspješno sačuvan!');
        
        // Update local state
        setCourse(savedCourse);
        
        // Update courses list
        const updatedCourses = await db.getCourses();
        setAllCourses(updatedCourses);
        
        // If new course, redirect to edit page with proper ID
        if (!id) {
          navigate(`/admin/course/edit/${savedCourse.id}`);
        }
      } else {
        console.error('Failed to save course: db.saveCourse returned null');
        alert(lang === 'en' ? 'Failed to save course - please check console for details' : 'Greška pri čuvanju kursa - proverite konzolu za detalje');
      }
    } catch (error: unknown) {
      console.error('=== ERROR SAVING COURSE ===');
      console.error('Error:', error);
      
      let errorMessage = lang === 'en' ? 'Error saving course: ' : 'Greška pri čuvanju kursa: ';
      
      if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += lang === 'en' ? 'Unknown error' : 'Nepoznata greška';
      }
      
      alert(errorMessage);
    } finally {
      setIsSaving(false);
      console.log('=== SAVE COURSE FINISHED ===');
    }
  };

  const addLesson = (): void => {
    const newLesson: Lesson = {
      id: '',
      courseId: course.id || '',
      title: 'New Lesson',
      description: '',
      order: (course.lessons?.length || 0) + 1,
      materials: [],
      minLearningTimeMinutes: 0
    };
    setCourse({ ...course, lessons: [...(course.lessons || []), newLesson] });
  };

  const updateLesson = (idx: number, updates: Partial<Lesson>): void => {
    const lessons = [...(course.lessons || [])];
    lessons[idx] = { ...lessons[idx], ...updates };
    setCourse({ ...course, lessons });
  };

  const deleteLesson = async (idx: number): Promise<void> => {
    const lessons = [...(course.lessons || [])];
    const lesson = lessons[idx];
    
    if (!lesson) return;
    
    if (!confirm(lang === 'en' ? 'Are you sure you want to delete this lesson and all its materials?' : 'Da li ste sigurni da želite da obrišete ovu lekciju i sve njene materijale?')) {
      return;
    }
    
    // Delete all materials from public.materials table for this lesson
    if (lesson.id) {
      try {
        const { error } = await supabase
          .from('materials')
          .delete()
          .eq('lesson_id', lesson.id);
        
        if (error) {
          console.error('Error deleting materials from database:', error);
          // Continue with deletion anyway
        }
      } catch (error) {
        console.error('Error deleting materials:', error);
      }
    }
    
    // Delete from local state
    lessons.splice(idx, 1);
    // Re-number the lessons
    lessons.forEach((lessonItem, index) => {
      lessonItem.order = index + 1;
    });
    setCourse({ ...course, lessons });
  };

  const addMaterial = (lessonIdx: number, type: 'pdf' | 'video' | 'pptx' | 'text' = 'pdf'): void => {
    const lessons = [...(course.lessons || [])];
    const lesson = lessons[lessonIdx];
    if (!lesson) return;
    
    const materials = [...(lesson.materials || [])];
    
    materials.push({ 
      id: '',
      type, 
      title: `New ${type.toUpperCase()}`, 
      url: '',
      content: type === 'text' ? 'Enter content here...' : undefined
    });
    
    lessons[lessonIdx] = { ...lesson, materials };
    setCourse({ ...course, lessons });
  };

  const saveMaterialToDatabase = async (lessonId: string, material: Material): Promise<Material> => {
    try {
      console.log('Saving material to database:', { lessonId, material });
      
      // If material has no ID, create new record
      if (!material.id) {
        const { data, error } = await supabase
          .from('materials')
          .insert({
            lesson_id: lessonId,
            type: material.type,
            title: material.title,
            url: material.url || null,
            content: material.content || null
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating material:', error);
          throw error;
        }
        
        console.log('Material created in database:', data);
        return {
          ...material,
          id: data.id
        };
      } else {
        // Update existing record
        const { data, error } = await supabase
          .from('materials')
          .update({
            title: material.title,
            url: material.url || null,
            content: material.content || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', material.id)
          .select()
          .single();
        
        if (error) {
          console.error('Error updating material:', error);
          throw error;
        }
        
        console.log('Material updated in database:', data);
        return material;
      }
    } catch (error) {
      console.error('Error saving material to database:', error);
      throw error;
    }
  };

  const updateMaterial = async (lessonIdx: number, materialIdx: number, updates: Partial<Material>): Promise<void> => {
    const lessons = [...(course.lessons || [])];
    const lesson = lessons[lessonIdx];
    if (!lesson) return;
    
    const materials = [...lesson.materials];
    const currentMaterial = materials[materialIdx];
    
    if (!currentMaterial) return;
    
    const updatedMaterial = { ...currentMaterial, ...updates };
    materials[materialIdx] = updatedMaterial;
    
    lessons[lessonIdx] = { ...lesson, materials };
    setCourse({ ...course, lessons });
    
    // Save to database if lesson has an ID
    if (lesson.id) {
      try {
        setSavingMaterial(updatedMaterial.id);
        await saveMaterialToDatabase(lesson.id, updatedMaterial);
      } catch (error) {
        console.error('Failed to save material to database:', error);
        alert(lang === 'en' ? 'Failed to save material to database' : 'Greška pri čuvanju materijala u bazi');
      } finally {
        setSavingMaterial(null);
      }
    }
  };

  const deleteMaterial = async (lessonIdx: number, materialId: string, materialUrl: string): Promise<void> => {
    if (!confirm(lang === 'en' ? 'Are you sure you want to delete this material?' : 'Da li ste sigurni da želite da obrišete ovaj materijal?')) {
      return;
    }
    
    try {
      setDeletingMaterial(materialId);
      
      // Delete from database if material has an ID
      if (materialId) {
        const { error } = await supabase
          .from('materials')
          .delete()
          .eq('id', materialId);
        
        if (error) {
          console.error('Error deleting material from database:', error);
          alert(lang === 'en' ? 'Failed to delete material from database' : 'Greška pri brisanju materijala iz baze');
          return;
        }
        console.log('Material deleted from database:', materialId);
      }
      
      // Delete file from Supabase Storage if URL exists
      if (materialUrl && isSupabaseStorageUrl(materialUrl)) {
        const urlParts = materialUrl.split('/');
        const filePath = urlParts.slice(urlParts.indexOf('materials') + 1).join('/');
        
        console.log('Deleting associated file from storage:', filePath);
        
        const { error: storageError } = await supabase.storage
          .from('materials')
          .remove([filePath]);
        
        if (storageError) {
          console.warn('Failed to delete file from storage:', storageError);
          // Continue with material deletion even if storage deletion fails
        }
      }
      
      // Delete material from local state
      const lessons = [...(course.lessons || [])];
      const lesson = lessons[lessonIdx];
      if (!lesson) return;
      
      const materials = lesson.materials.filter(m => m.id !== materialId);
      lessons[lessonIdx] = { ...lesson, materials };
      setCourse({ ...course, lessons });
      
      alert(lang === 'en' ? 'Material deleted successfully!' : 'Materijal uspešno obrisan!');
      
    } catch (error) {
      console.error('Error deleting material:', error);
      alert(lang === 'en' ? 'Error deleting material' : 'Greška pri brisanju materijala');
    } finally {
      setDeletingMaterial(null);
    }
  };

  const handleMaterialUploadComplete = async (
    lessonIdx: number,
    materialIdx: number,
    url: string,
    fileName: string,
    fileType: 'pdf' | 'video' | 'pptx'
  ): Promise<void> => {
    const lessons = [...(course.lessons || [])];
    const lesson = lessons[lessonIdx];
    if (!lesson) return;
    
    const materials = [...lesson.materials];
    const material = materials[materialIdx];
    if (!material) return;
    
    // Extract clean filename without extension for display
    const displayName = extractFileNameFromUrl(fileName);
    
    const updatedMaterial = {
      ...material,
      url,
      title: material.title === `New ${material.type.toUpperCase()}` ? displayName : material.title || displayName
    };
    
    materials[materialIdx] = updatedMaterial;
    lessons[lessonIdx] = { ...lesson, materials };
    setCourse({ ...course, lessons });
    
    // Save to database if lesson has an ID
    if (lesson.id) {
      try {
        setSavingMaterial(updatedMaterial.id);
        const savedMaterial = await saveMaterialToDatabase(lesson.id, updatedMaterial);
        
        // Update local state with database ID
        const updatedLessons = [...(course.lessons || [])];
        const updatedLesson = updatedLessons[lessonIdx];
        if (updatedLesson) {
          const updatedMaterials = [...updatedLesson.materials];
          updatedMaterials[materialIdx] = savedMaterial;
          updatedLessons[lessonIdx] = { ...updatedLesson, materials: updatedMaterials };
          setCourse({ ...course, lessons: updatedLessons });
        }
      } catch (error) {
        console.error('Failed to save material to database:', error);
        alert(lang === 'en' ? 'File uploaded but failed to save to database' : 'Fajl je uploadovan ali greška pri čuvanju u bazi');
      } finally {
        setSavingMaterial(null);
      }
    }
  };

  const handleDeleteFile = async (url: string, materialId: string): Promise<void> => {
    if (!url || !isSupabaseStorageUrl(url)) {
      alert(lang === 'en' ? 'Cannot delete this file. It is not stored in Supabase Storage.' : 'Ne mogu obrisati ovaj fajl. Nije sačuvan u Supabase Storage-u.');
      return;
    }
    
    if (!confirm(lang === 'en' ? 'Are you sure you want to delete this file from storage?' : 'Da li ste sigurni da želite da obrišete ovaj fajl iz skladišta?')) {
      return;
    }
    
    try {
      setDeletingFile(url);
      
      // Extract file path from URL
      const urlParts = url.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('materials') + 1).join('/');
      
      console.log('Deleting file from Supabase Storage:', filePath);
      
      // Delete from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('materials')
        .remove([filePath]);
      
      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        alert(lang === 'en' ? 'Failed to delete file from storage' : 'Greška pri brisanju fajla iz skladišta');
        return;
      }
      
      // Update material in database to remove URL
      if (materialId) {
        const { error } = await supabase
          .from('materials')
          .update({ url: null, updated_at: new Date().toISOString() })
          .eq('id', materialId);
        
        if (error) {
          console.error('Error updating material in database:', error);
        }
      }
      
      // Remove URL from the specific material in local state
      const updatedLessons = [...(course.lessons || [])].map(lesson => ({
        ...lesson,
        materials: lesson.materials.map(mat => 
          mat.id === materialId ? { ...mat, url: '' } : mat
        )
      }));
      
      setCourse({ ...course, lessons: updatedLessons });
      
      alert(lang === 'en' ? 'File deleted successfully from storage!' : 'Fajl uspešno obrisan iz skladišta!');
      
    } catch (error) {
      console.error('Error deleting file:', error);
      alert(lang === 'en' ? 'Error deleting file' : 'Greška pri brisanju fajla');
    } finally {
      setDeletingFile(null);
    }
  };

  const handleManualExam = (): void => {
    setCourse({
      ...course,
      exam: {
        id: '',
        courseId: course.id || '',
        passingScore: 80,
        timeLimitMinutes: 20,
        maxAttempts: 3,
        randomizeQuestions: true,
        randomizeAnswers: true,
        questionBankDrawCount: 0,
        questions: []
      }
    });
  };

  const handleGenerateExam = async (): Promise<void> => {
    if (!course.title || !course.description) {
      alert(lang === 'en' ? 'Please provide a title and description first.' : 'Molimo unesite naslov i opis prvo.');
      return;
    }
    
    setLoadingAI(true);
    try {
      const generatedQuestions = await geminiService.generateQuestions(course.title, course.description);
      setCourse({
        ...course,
        exam: {
          id: '',
          courseId: course.id || '',
          passingScore: 80,
          timeLimitMinutes: 20,
          maxAttempts: 3,
          randomizeQuestions: true,
          randomizeAnswers: true,
          questionBankDrawCount: 0,
          questions: generatedQuestions
        }
      });
    } catch (e) {
      console.error('Error generating exam:', e);
      alert(lang === 'en' ? 'Failed to generate questions.' : 'Greška pri generisanju pitanja.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleAddQuestion = (): void => {
    if (!course.exam) return;
    
    if (!newQuestion.text?.trim()) {
      alert(lang === 'en' ? 'Question text is required' : 'Tekst pitanja je obavezan');
      return;
    }
    
    // Check if all options have text
    const emptyOptions = newQuestion.options?.some(opt => !opt.trim());
    if (emptyOptions) {
      alert(lang === 'en' ? 'All options must have text' : 'Sve opcije moraju imati tekst');
      return;
    }
    
    const q: Question = {
      id: '',
      text: newQuestion.text.trim(),
      options: newQuestion.options!.map(opt => opt.trim()),
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

  const deleteQuestion = (qid: string): void => {
    if (!course.exam) return;
    
    setCourse({
      ...course,
      exam: {
        ...course.exam,
        questions: course.exam.questions.filter(q => q.id !== qid)
      }
    });
  };

  const updateQuestion = (qid: string, updates: Partial<Question>): void => {
    if (!course.exam) return;
    
    setCourse({
      ...course,
      exam: {
        ...course.exam,
        questions: course.exam.questions.map(q => 
          q.id === qid ? { ...q, ...updates } : q
        )
      }
    });
  };

  const inputStyles = "w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 font-medium placeholder-slate-400 transition-all";
  const labelStyles = "block text-sm font-bold text-slate-800 mb-2";

  const Tooltip: React.FC<{ title: string; text: string }> = ({ title, text }) => (
    <div className="group relative inline-block ml-1">
      <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-black cursor-help">?</div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-50 pointer-events-none">
        <p className="font-bold mb-1 uppercase tracking-widest text-blue-400">{title}</p>
        <p className="font-medium leading-relaxed opacity-80">{text}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-12 flex justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">{lang === 'en' ? 'Loading course...' : 'Učitavanje kursa...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <header className="flex justify-between items-center mb-8">
        <div>
          <button onClick={() => navigate('/admin/courses')} className="flex items-center text-slate-500 hover:text-slate-900 mb-4 font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.backToDashboard}
          </button>
          <h1 className="text-3xl font-bold text-slate-900">
            {id ? t.editCourse : t.createNewCourse} {course.id && `(${course.id.slice(0, 8)}...)`}
          </h1>
        </div>
        <button 
          onClick={() => void saveCourse()} 
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (lang === 'en' ? 'Saving...' : 'Čuvanje...') : t.saveChanges}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6">{t.courseDetails}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className={labelStyles}>{t.title} *</label>
                  <input 
                    type="text" 
                    value={course.title} 
                    onChange={(e) => setCourse({...course, title: e.target.value})} 
                    className={inputStyles} 
                    placeholder="Course Title" 
                    required
                  />
                </div>
                <div>
                  <label className={labelStyles}>{t.version}</label>
                  <input 
                    type="text" 
                    value={course.version} 
                    onChange={(e) => setCourse({...course, version: e.target.value})} 
                    className={inputStyles} 
                    placeholder="1.0.0" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyles}>{t.instructorAssigned} *</label>
                  <select 
                    value={course.instructorId} 
                    onChange={(e) => setCourse({...course, instructorId: e.target.value})} 
                    className={inputStyles}
                    required
                  >
                    <option value="">Select Instructor</option>
                    {instructors.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.role})
                      </option>
                    ))}
                  </select>
                  {course.instructorId && (
                    <p className="text-xs text-slate-500 mt-1">
                      Selected: {instructors.find(i => i.id === course.instructorId)?.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelStyles}>{t.refresherCourse}</label>
                  <select 
                    value={course.refresherCourseId || ''} 
                    onChange={(e) => setCourse({...course, refresherCourseId: e.target.value || undefined})} 
                    className={inputStyles}
                  >
                    <option value="">None</option>
                    {allCourses.filter(c => c.id !== id).map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelStyles}>{t.description}</label>
                <textarea 
                  rows={3} 
                  value={course.description} 
                  onChange={(e) => setCourse({...course, description: e.target.value})} 
                  className={inputStyles} 
                  placeholder="Overview" 
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className={labelStyles}>{t.category}</label>
                  <select 
                    value={course.category} 
                    onChange={(e) => setCourse({...course, category: e.target.value as Course['category']})} 
                    className={inputStyles}
                  >
                    <option value="Safety">Safety</option>
                    <option value="Security">Security</option>
                    <option value="Operations">Operations</option>
                    <option value="Customer Service">Customer Service</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>{t.validityYears}</label>
                  <select 
                    value={course.validityYears} 
                    onChange={(e) => setCourse({...course, validityYears: parseInt(e.target.value) || 2})} 
                    className={inputStyles}
                  >
                    <option value={1}>1 Year</option>
                    <option value={2}>2 Years</option>
                    <option value={3}>3 Years</option>
                    <option value={5}>5 Years</option>
                  </select>
                </div>
                <div className="flex items-end pb-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={course.requiresPracticalCheck} 
                      onChange={(e) => setCourse({...course, requiresPracticalCheck: e.target.checked})} 
                      className="w-5 h-5 rounded text-blue-600" 
                    />
                    <span className="text-sm font-bold text-slate-700">{t.practicalCheck}</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">{t.curriculum}</h2>
              <button 
                onClick={addLesson} 
                className="text-blue-600 font-bold flex items-center bg-blue-50 px-4 py-2 rounded-xl transition-all border border-blue-100 hover:bg-blue-100"
                type="button"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t.addLesson}
              </button>
            </div>
            <div className="space-y-6">
              {(course.lessons || []).map((lesson, idx) => {
                return (
                  <div key={lesson.id || `lesson-${idx}`} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-black">
                          {lesson.order}
                        </span>
                        Lesson {lesson.order}
                      </h3>
                      <button 
                        onClick={() => deleteLesson(idx)} 
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        type="button"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 px-2">Title</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-900" 
                          value={lesson.title} 
                          onChange={(e) => updateLesson(idx, { title: e.target.value })} 
                          placeholder="Lesson Title"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 px-2">{t.minLearningTime}</label>
                        <input 
                          type="number" 
                          min="0" 
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-blue-600" 
                          value={lesson.minLearningTimeMinutes} 
                          onChange={(e) => updateLesson(idx, { minLearningTimeMinutes: parseInt(e.target.value) || 0 })} 
                          placeholder="Minutes"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="text-[10px] font-black uppercase text-slate-400 px-2">Description</label>
                      <textarea 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-slate-900 min-h-[60px]" 
                        value={lesson.description} 
                        onChange={(e) => updateLesson(idx, { description: e.target.value })} 
                        placeholder="Lesson description..."
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-bold text-slate-700">Materials ({lesson.materials.length})</h4>
                        <div className="flex gap-2">
                          {(['pdf', 'video', 'pptx', 'text'] as const).map((type) => (
                            <button 
                              key={type} 
                              onClick={() => addMaterial(idx, type)} 
                              className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all uppercase"
                              type="button"
                            >
                              + {type}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {lesson.materials.map((m, mIdx) => {
                        const isSupabaseUrl = isSupabaseStorageUrl(m.url);
                        const isSavingThis = savingMaterial === m.id;
                        
                        return (
                          <div key={m.id || `material-${mIdx}`} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                m.type === 'video' ? 'bg-red-100 text-red-600' : 
                                m.type === 'pdf' ? 'bg-orange-100 text-orange-600' : 
                                m.type === 'pptx' ? 'bg-amber-100 text-amber-600' : 
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {m.type}
                              </span>
                              <div className="flex gap-1">
                                {isSavingThis && (
                                  <div className="p-1.5">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                                  </div>
                                )}
                                {m.url && isSupabaseUrl && (
                                  <button 
                                    onClick={() => handleDeleteFile(m.url, m.id)}
                                    disabled={deletingFile === m.url || deletingMaterial === m.id}
                                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    title={lang === 'en' ? 'Delete file from storage' : 'Obriši fajl iz skladišta'}
                                    type="button"
                                  >
                                    {deletingFile === m.url ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                                <button 
                                  onClick={() => deleteMaterial(idx, m.id, m.url)}
                                  disabled={deletingMaterial === m.id || deletingFile === m.url}
                                  className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  type="button"
                                >
                                  {deletingMaterial === m.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                            
                            <div className="relative">
                              <input 
                                type="text" 
                                className="w-full text-sm font-bold text-slate-900 border-b border-slate-100 focus:border-blue-200 outline-none pb-1 pr-8" 
                                value={m.title} 
                                onChange={(e) => void updateMaterial(idx, mIdx, { title: e.target.value })} 
                                placeholder="Material Title" 
                              />
                              {isSavingThis && (
                                <div className="absolute right-0 top-0">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                                </div>
                              )}
                            </div>
                            
                            {m.type !== 'text' ? (
                              <div className="space-y-2">
                                {/* URL Input */}
                                <div>
                                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 px-1 block">
                                    URL Link
                                  </label>
                                  <div className="flex gap-2">
                                    <input 
                                      type="text" 
                                      className="flex-1 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg outline-none border border-slate-100" 
                                      value={m.url} 
                                      onChange={(e) => void updateMaterial(idx, mIdx, { url: e.target.value })} 
                                      placeholder="https://example.com/file.pdf" 
                                    />
                                    {m.url && (
                                      <a
                                        href={m.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center gap-1"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        {lang === 'en' ? 'Open' : 'Otvori'}
                                      </a>
                                    )}
                                  </div>
                                </div>
                                
                                {/* OR Divider */}
                                <div className="flex items-center gap-2 my-2">
                                  <div className="flex-1 border-t border-slate-200"></div>
                                  <span className="text-[10px] text-slate-400 font-bold">OR</span>
                                  <div className="flex-1 border-t border-slate-200"></div>
                                </div>
                                
                                {/* Upload Component */}
                                <MaterialUpload
                                  acceptedTypes={
                                    m.type === 'pdf' ? '.pdf' :
                                    m.type === 'video' ? '.mp4,.webm,.ogg,.mov,.avi,.wmv,.flv' :
                                    '.ppt,.pptx'
                                  }
                                  onUploadComplete={(url, fileName, fileType) => {
                                    void handleMaterialUploadComplete(idx, mIdx, url, fileName, fileType);
                                  }}
                                />
                                
                                {/* Success indicator */}
                                {m.url && (
                                  <div className="flex items-center justify-between gap-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                                    <div className="flex items-center gap-2">
                                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="truncate">
                                        {isSupabaseUrl 
                                          ? `${lang === 'en' ? 'Uploaded to Supabase Storage' : 'Uploadovano na Supabase Storage'}: ${extractFileNameFromUrl(m.url)}`
                                          : m.url.length > 40 
                                            ? `...${m.url.slice(-40)}` 
                                            : m.url}
                                      </span>
                                    </div>
                                    {isSupabaseUrl && (
                                      <button
                                        onClick={() => navigator.clipboard.writeText(m.url)}
                                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                        title={lang === 'en' ? 'Copy URL' : 'Kopiraj URL'}
                                        type="button"
                                      >
                                        {lang === 'en' ? 'Copy' : 'Kopiraj'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <textarea
                                className="w-full text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg outline-none border border-slate-100 min-h-[80px]"
                                value={m.content || ''} 
                                onChange={(e) => void updateMaterial(idx, mIdx, { content: e.target.value })} 
                                placeholder="Content text..." 
                              />
                            )}
                            
                            {m.id && (
                              <div className="text-[10px] text-slate-400 italic">
                                {lang === 'en' ? 'Saved in database' : 'Sačuvano u bazi podataka'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {lesson.materials.length === 0 && (
                        <div className="text-center py-6 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                          <p className="text-sm">No materials yet. Add PDFs, videos, or text content.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {(course.lessons || []).length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <p className="text-slate-500 mb-4">No lessons yet. Add your first lesson to get started.</p>
                  <button 
                    onClick={addLesson} 
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                    type="button"
                  >
                    Add First Lesson
                  </button>
                </div>
              )}
            </div>
          </section>

          {course.exam && (
            <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Exam Questions ({course.exam.questions.length})</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingQuestionId('new')} 
                    className="text-blue-600 font-bold bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors"
                    type="button"
                  >
                    {t.addQuestion}
                  </button>
                  {loadingAI && (
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Generating...
                    </div>
                  )}
                </div>
              </div>

              {editingQuestionId === 'new' && (
                <div className="mb-8 p-6 bg-slate-50 rounded-2xl border-2 border-blue-100 space-y-4">
                  <div>
                    <label className={labelStyles}>Question Text *</label>
                    <textarea 
                      value={newQuestion.text} 
                      onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})} 
                      className={inputStyles} 
                      placeholder="Enter your question..." 
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {newQuestion.options?.map((opt, oIdx) => (
                      <div key={oIdx} className="relative">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 px-1">
                          Option {String.fromCharCode(65 + oIdx)} *
                        </label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={opt} 
                            onChange={(e) => { 
                              const opts = [...(newQuestion.options || [])]; 
                              opts[oIdx] = e.target.value; 
                              setNewQuestion({...newQuestion, options: opts}); 
                            }} 
                            className={inputStyles} 
                            placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                          />
                          <button 
                            onClick={() => setNewQuestion({...newQuestion, correctOptionIndex: oIdx})} 
                            className={`p-3 rounded-xl border-2 transition-all ${
                              newQuestion.correctOptionIndex === oIdx ? 
                              'bg-green-600 border-green-600 text-white' : 
                              'bg-white border-slate-200 text-slate-300 hover:border-green-400 hover:text-green-600'
                            }`}
                            type="button"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button 
                      onClick={handleAddQuestion} 
                      className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors"
                      type="button"
                    >
                      {t.saveQuestion}
                    </button>
                    <button 
                      onClick={() => setEditingQuestionId(null)} 
                      className="px-6 py-3 bg-slate-200 text-slate-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-300 transition-colors"
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {course.exam.questions.map((q, qIdx) => (
                  <div key={q.id || `question-${qIdx}`} className="p-5 bg-white border border-slate-100 rounded-2xl flex items-start gap-6 shadow-sm group hover:border-blue-100 transition-colors">
                    <div className="flex flex-col items-center gap-2">
                      <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                        {qIdx + 1}
                      </span>
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        Correct: {String.fromCharCode(65 + q.correctOptionIndex)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <textarea 
                        className="w-full font-bold text-slate-900 border-b border-slate-100 focus:border-blue-200 outline-none pb-1 mb-3" 
                        value={q.text} 
                        onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                        rows={2}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className={`p-3 rounded-lg border ${q.correctOptionIndex === oIdx ? 'border-green-200 bg-green-50' : 'border-slate-100'}`}>
                            <div className="text-[10px] font-black uppercase text-slate-400 mb-1">
                              {String.fromCharCode(65 + oIdx)}
                            </div>
                            <input 
                              type="text" 
                              className="w-full text-sm text-slate-700 bg-transparent outline-none" 
                              value={opt} 
                              onChange={(e) => {
                                const options = [...q.options];
                                options[oIdx] = e.target.value;
                                updateQuestion(q.id, { options });
                              }}
                            />
                            <button 
                              onClick={() => updateQuestion(q.id, { correctOptionIndex: oIdx })} 
                              className={`mt-2 px-3 py-1 rounded text-xs font-bold ${
                                q.correctOptionIndex === oIdx 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                              type="button"
                            >
                              {q.correctOptionIndex === oIdx ? 'Correct ✓' : 'Mark Correct'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteQuestion(q.id)} 
                      className="p-2 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                      type="button"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                
                {course.exam.questions.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                    <p className="text-slate-500">No questions yet. Add questions manually or generate with AI.</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-8">
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 sticky top-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">{t.integrityRules}</h2>
            {!course.exam ? (
              <div className="space-y-3">
                <button 
                  onClick={() => void handleGenerateExam()} 
                  disabled={loadingAI || !course.title || !course.description} 
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  {loadingAI ? t.generating : t.aiGenerate}
                </button>
                <button 
                  onClick={handleManualExam} 
                  className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-100 transition-all active:scale-95 text-xs uppercase tracking-widest"
                  type="button"
                >
                  {t.manualSetup}
                </button>
                {(!course.title || !course.description) && (
                  <p className="text-xs text-red-500 text-center">
                    {lang === 'en' ? 'Title and description required for AI generation' : 'Naslov i opis su potrebni za AI generaciju'}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={labelStyles}>
                    {t.timeLimit}
                    <Tooltip title="Time Limit" text="Number of minutes allowed to complete the exam. Default is 20 minutes." />
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    value={course.exam.timeLimitMinutes} 
                    onChange={(e) => setCourse({
                      ...course, 
                      exam: {...course.exam!, timeLimitMinutes: parseInt(e.target.value) || 1}
                    })} 
                    className={inputStyles} 
                  />
                </div>
                <div>
                  <label className={labelStyles}>
                    {t.passingScore}%
                    <Tooltip title="Passing Score" text="Minimum percentage required to pass the final proficiency exam." />
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    value={course.exam.passingScore} 
                    onChange={(e) => setCourse({
                      ...course, 
                      exam: {...course.exam!, passingScore: parseInt(e.target.value) || 80}
                    })} 
                    className={inputStyles} 
                  />
                </div>
                <div>
                  <label className={labelStyles}>
                    {t.maxAttempts}
                    <Tooltip title="Max Attempts" text="Maximum tries allowed for this exam profile." />
                  </label>
                  <select 
                    value={course.exam.maxAttempts} 
                    onChange={(e) => setCourse({
                      ...course, 
                      exam: {...course.exam!, maxAttempts: parseInt(e.target.value)}
                    })} 
                    className={inputStyles}
                  >
                    {[1, 2, 3, 4, 5, 10].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>
                    {t.drawFromBank}
                    <Tooltip title="Question Bank" text="Draw a subset of questions from the total pool to make every exam unique. Set to 0 to use all questions." />
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    value={course.exam.questionBankDrawCount || 0} 
                    onChange={(e) => setCourse({
                      ...course, 
                      exam: {...course.exam!, questionBankDrawCount: parseInt(e.target.value) || 0}
                    })} 
                    className={inputStyles} 
                  />
                </div>
                <div className="space-y-2 py-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={course.exam.randomizeQuestions} 
                      onChange={(e) => setCourse({
                        ...course, 
                        exam: {...course.exam!, randomizeQuestions: e.target.checked}
                      })} 
                      className="w-4 h-4 rounded text-blue-600" 
                    />
                    <span className="text-xs font-bold text-slate-700">{t.randomizeQuestions}</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={course.exam.randomizeAnswers} 
                      onChange={(e) => setCourse({
                        ...course, 
                        exam: {...course.exam!, randomizeAnswers: e.target.checked}
                      })} 
                      className="w-4 h-4 rounded text-blue-600" 
                    />
                    <span className="text-xs font-bold text-slate-700">{t.randomizeAnswers}</span>
                  </label>
                </div>
                <button 
                  onClick={() => setCourse({...course, exam: undefined})} 
                  className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-all"
                  type="button"
                >
                  Delete Exam Module
                </button>
              </div>
            )}
          </section>
          
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Course Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">ID:</span>
                <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                  {course.id ? `${course.id.slice(0, 8)}...` : 'Not saved yet'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Lessons:</span>
                <span className="font-bold">{course.lessons?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Exam Questions:</span>
                <span className="font-bold">{course.exam?.questions?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Created:</span>
                <span className="text-xs">
                  {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'Not saved'}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CourseEditor;