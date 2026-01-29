// db.ts - Kompletno ažuriran sa ispravljenim tipovima
import { 
  Course, 
  Progress, 
  User, 
  UserRole, 
  Lesson, 
  Material, 
  AuditLog, 
  ExamAttempt, 
  Exam, 
  Question,
  SupabaseCourse,
  SupabaseLesson,
  SupabaseExam,
  PracticalStatus 
} from './types';
import { supabase } from './lib/supabase';

// Helper funkcije za konverziju - KORISTI snake_case POLJA IZ SUPABASE
const toCourse = (data: SupabaseCourse): Course => {
  console.log('DB [toCourse]: Converting course data:', {
    id: data.id,
    title: data.title,
    instructor_id: data.instructor_id, // Ovo je ključno polje
    category: data.category
  });
  
  const course: Course = {
    id: data.id,
    title: data.title,
    description: data.description,
    version: data.version,
    category: data.category as any, // Type assertion za enum
    // MAPIRAJTE instructor_id NA instructorId
    instructorId: data.instructor_id,
    thumbnail: data.thumbnail,
    isSequential: data.is_sequential ?? true,
    validityYears: data.validity_years,
    requiresPracticalCheck: data.requires_practical_check,
    refresherCourseId: data.refresher_course_id,
    lessons: [],
    exam: undefined
  };

  // Dodaj timestamp polja ako postoje
  if (data.created_at) course.createdAt = data.created_at;
  if (data.updated_at) course.updatedAt = data.updated_at;

  console.log('DB [toCourse]: Converted course:', {
    id: course.id,
    title: course.title,
    instructorId: course.instructorId // Ovo treba da bude popunjeno
  });
  
  return course;
};

const toLesson = (data: SupabaseLesson): Lesson => {
  console.log('DB [toLesson]: Converting lesson:', {
    id: data.id,
    title: data.title,
    course_id: data.course_id
  });
  
  const lesson: Lesson = {
    id: data.id,
    // MAPIRAJTE course_id NA courseId
    courseId: data.course_id,
    title: data.title,
    description: data.description,
    order: data.order,
    minLearningTimeMinutes: data.min_learning_time_minutes,
    materials: data.materials || []
  };

  // Dodaj timestamp polja ako postoje
  if (data.created_at) lesson.createdAt = data.created_at;
  if (data.updated_at) lesson.updatedAt = data.updated_at;

  return lesson;
};

 getQuestionSetsByCourseId: async (courseId: string): Promise<QuestionSet[]> => {
    try {
      const { data, error } = await supabase
        .from('question_sets')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map((set: any) => ({
        id: set.id,
        courseId: set.course_id,
        name: set.name,
        description: set.description,
        questions: set.questions || [],
        createdAt: set.created_at,
        updatedAt: set.updated_at
      }));
    } catch (error) {
      console.error('Error fetching question sets:', error);
      return [];
    }
  },

  saveQuestionSet: async (questionSet: QuestionSet): Promise<QuestionSet | null> => {
    try {
      const setData = {
        course_id: questionSet.courseId,
        name: questionSet.name,
        description: questionSet.description,
        questions: questionSet.questions,
        updated_at: new Date().toISOString()
      };

      let data;
      if (questionSet.id) {
        // Update existing
        const { data: updated, error } = await supabase
          .from('question_sets')
          .update(setData)
          .eq('id', questionSet.id)
          .select()
          .single();

        if (error) throw error;
        data = updated;
      } else {
        // Create new
        const { data: created, error } = await supabase
          .from('question_sets')
          .insert([{ ...setData, created_at: new Date().toISOString() }])
          .select()
          .single();

        if (error) throw error;
        data = created;
      }

      return {
        id: data.id,
        courseId: data.course_id,
        name: data.name,
        description: data.description,
        questions: data.questions,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error saving question set:', error);
      return null;
    }
  },

  deleteQuestionSet: async (setId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('question_sets')
        .delete()
        .eq('id', setId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting question set:', error);
      return false;
    }
  }

const toExam = (data: SupabaseExam): Exam => {
  console.log('DB [toExam]: Converting exam:', {
    id: data.id,
    course_id: data.course_id,
    questionsCount: data.questions?.length || 0
  });
  
  const exam: Exam = {
    id: data.id,
    // MAPIRAJTE course_id NA courseId
    courseId: data.course_id,
    passingScore: data.passing_score,
    timeLimitMinutes: data.time_limit_minutes,
    maxAttempts: data.max_attempts,
    randomizeQuestions: data.randomize_questions,
    randomizeAnswers: data.randomize_answers,
    questionBankDrawCount: data.question_bank_draw_count,
    questions: data.questions || []
  };

  // Dodaj timestamp polja ako postoje
  if (data.created_at) exam.createdAt = data.created_at;
  if (data.updated_at) exam.updatedAt = data.updated_at;

  return exam;
};

const toExamAttempt = (data: any): ExamAttempt => {
  const attempt: ExamAttempt = {
    id: data.id,
    timestamp: data.timestamp || data.created_at || new Date().toISOString(),
    score: data.score,
    passed: data.passed,
    timeSpentSeconds: data.time_spent_seconds || 0,
    answers: data.answers || {},
    questionsSnapshot: data.questions_snapshot
  };

  // Dodaj dodatna polja za Supabase
  if (data.user_id) attempt.userId = data.user_id;
  if (data.course_id) attempt.courseId = data.course_id;
  if (data.started_at) attempt.startedAt = data.started_at;
  if (data.completed_at) attempt.completedAt = data.completed_at;
  if (data.created_at) attempt.createdAt = data.created_at;

  return attempt;
};

const toProgress = (data: any): Progress => {
  const progress: Progress = {
    userId: data.user_id,
    courseId: data.course_id,
    completedLessonIds: data.completed_lesson_ids || [],
    lessonStartTimes: data.lesson_start_times || {},
    lessonTimeSpent: data.lesson_time_spent || {},
    attempts: [],
    examScore: data.exam_score,
    isCompleted: data.is_completed || false,
    practicalCheckCompleted: data.practical_check_completed || false,
    practicalCheckStatus: data.practical_check_status as PracticalStatus,
    practicalCheckComment: data.practical_check_comment,
    practicalCheckBy: data.practical_check_by,
    practicalCheckDate: data.practical_check_date,
    completionDate: data.completion_date,
    certificateId: data.certificate_id,
    expiryDate: data.expiry_date
  };

  // Dodaj opciona polja ako postoje
  if (data.id) progress.id = data.id;
  if (data.created_at) progress.createdAt = data.created_at;
  if (data.updated_at) progress.updatedAt = data.updated_at;

  return progress;
};

export const db = {
  // COURSES
  getCourses: async (): Promise<Course[]> => {
    try {
      console.log('DB: Fetching courses from Supabase...');
      
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          lessons:lessons(
            *,
            materials:materials(*)
          ),
          exam:exams(
            *,
            questions:questions(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching courses:', error);
        return [];
      }

      console.log('DB: Raw data from Supabase (first course):', data?.[0] ? {
        id: data[0].id,
        title: data[0].title,
        instructor_id: data[0].instructor_id,
        fields: Object.keys(data[0])
      } : 'No data');
      
      if (!data) return [];

      return data.map((item: any) => {
        console.log('DB: Processing course item:', { 
          id: item.id, 
          title: item.title,
          instructor_id: item.instructor_id
        });
        
        const course = toCourse(item as SupabaseCourse);
        
        // Process lessons
        if (item.lessons && Array.isArray(item.lessons)) {
          course.lessons = item.lessons.map((lesson: any) => {
            const lessonObj = toLesson(lesson as SupabaseLesson);
            lessonObj.materials = lesson.materials || [];
            return lessonObj;
          });
        }

        // Process exam
        if (item.exam && Array.isArray(item.exam) && item.exam.length > 0) {
          const examData = item.exam[0];
          const exam = toExam(examData as SupabaseExam);
          exam.questions = examData.questions || [];
          course.exam = exam;
        }

        console.log('DB: Final course object:', {
          id: course.id,
          title: course.title,
          instructorId: course.instructorId,
          lessonsCount: course.lessons.length,
          hasExam: !!course.exam
        });
        
        return course;
      });
    } catch (error) {
      console.error('Error in getCourses:', error);
      return [];
    }
  },

  getCourse: async (id: string): Promise<Course | null> => {
    try {
      console.log('DB: Fetching course with ID:', id);
      
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          lessons:lessons(
            *,
            materials:materials(*)
          ),
          exam:exams(
            *,
            questions:questions(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching course:', error);
        return null;
      }

      if (!data) {
        console.log('DB: No course found with ID:', id);
        return null;
      }

      console.log('DB: Found course:', {
        id: data.id,
        title: data.title,
        instructor_id: data.instructor_id
      });

      const course = toCourse(data as SupabaseCourse);
      
      // Process lessons
      if (data.lessons && Array.isArray(data.lessons)) {
        course.lessons = data.lessons.map((lesson: any) => {
          const lessonObj = toLesson(lesson as SupabaseLesson);
          lessonObj.materials = lesson.materials || [];
          return lessonObj;
        });
      }

      // Process exam
      if (data.exam && Array.isArray(data.exam) && data.exam.length > 0) {
        const examData = data.exam[0];
        const exam = toExam(examData as SupabaseExam);
        exam.questions = examData.questions || [];
        course.exam = exam;
      }

      console.log('DB: Returning course:', {
        id: course.id,
        title: course.title,
        instructorId: course.instructorId,
        lessonsCount: course.lessons.length
      });
      
      return course;
    } catch (error) {
      console.error('Error in getCourse:', error);
      return null;
    }
  },

  saveCourse: async (course: Course): Promise<Course | null> => {
    try {
      console.log('DB: Starting to save course:', course.title);
      console.log('DB: Course object:', {
        id: course.id,
        title: course.title,
        instructorId: course.instructorId,
        lessonsCount: course.lessons?.length || 0,
        hasExam: !!course.exam
      });
      
      // Proveri da li je ID u UUID formatu
      const isValidUUID = course.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.id);
      const isUpdate = course.id && isValidUUID;
      
      console.log('DB: Is valid UUID?', isValidUUID);
      console.log('DB: Is update operation?', isUpdate);
      
      // Validacija obaveznih polja
      if (!course.title || course.title.trim() === '') {
        throw new Error('Course title is required');
      }
      
      if (!course.instructorId) {
        throw new Error('Instructor ID is required');
      }
      
      // Prepare course data for Supabase - KORISTITE snake_case
      const courseData = {
        title: course.title.trim(),
        description: course.description || '',
        version: course.version || '1.0.0',
        category: course.category,
        instructor_id: course.instructorId, // Ovo je polje u bazi
        thumbnail: course.thumbnail || 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=400&q=80',
        is_sequential: course.isSequential ?? true,
        validity_years: course.validityYears || 2,
        requires_practical_check: course.requiresPracticalCheck || false,
        refresher_course_id: course.refresherCourseId || null,
        updated_at: new Date().toISOString()
      };

      console.log('DB: Prepared course data (snake_case):', courseData);
      
      let savedCourse: any;
      
      if (isUpdate) {
        console.log('DB: Updating existing course with ID:', course.id);
        const { data, error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', course.id)
          .select()
          .single();
        
        if (error) {
          console.error('DB: Supabase error updating course:', error);
          throw new Error(`Failed to update course: ${error.message}`);
        }
        
        if (!data) {
          throw new Error('No data returned from update operation');
        }
        
        savedCourse = data;
        console.log('DB: Course updated successfully:', savedCourse.id);
      } else {
        console.log('DB: Creating new course (Supabase will generate UUID)');
        const { data, error } = await supabase
          .from('courses')
          .insert([{ ...courseData, created_at: new Date().toISOString() }])
          .select()
          .single();
        
        if (error) {
          console.error('DB: Supabase error creating course:', error);
          throw new Error(`Failed to create course: ${error.message}`);
        }
        
        if (!data) {
          throw new Error('No data returned from insert operation');
        }
        
        savedCourse = data;
        console.log('DB: Course created successfully with UUID:', savedCourse.id);
      }

      const courseId = savedCourse.id;
      console.log('DB: Saved course ID:', courseId);

      // Save lessons and materials
      if (course.lessons && course.lessons.length > 0) {
        console.log('DB: Saving', course.lessons.length, 'lessons');
        await db.saveLessons(courseId, course.lessons);
        console.log('DB: Lessons saved successfully');
      } else {
        console.log('DB: No lessons to save, deleting existing lessons if any');
        // Delete existing lessons if there are none
        await supabase
          .from('lessons')
          .delete()
          .eq('course_id', courseId);
      }

      // Save exam
      if (course.exam) {
        console.log('DB: Saving exam with', course.exam.questions?.length || 0, 'questions');
        await db.saveExam(courseId, course.exam);
        console.log('DB: Exam saved successfully');
      } else {
        console.log('DB: No exam to save, deleting existing exam if any');
        // Delete existing exam if it exists
        const { data: existingExam } = await supabase
          .from('exams')
          .select('id')
          .eq('course_id', courseId)
          .single();
        
        if (existingExam) {
          // Delete questions first
          await supabase
            .from('questions')
            .delete()
            .eq('exam_id', existingExam.id);
          
          // Then delete exam
          await supabase
            .from('exams')
            .delete()
            .eq('id', existingExam.id);
          
          console.log('DB: Existing exam deleted');
        }
      }

      // Return the saved course
      console.log('DB: Fetching saved course for return');
      const finalCourse = await db.getCourse(courseId);
      
      if (!finalCourse) {
        throw new Error('Failed to fetch saved course');
      }
      
      console.log('DB: Course saved and retrieved successfully:', {
        id: finalCourse.id,
        title: finalCourse.title,
        instructorId: finalCourse.instructorId
      });
      
      return finalCourse;
    } catch (error: any) {
      console.error('DB: Error in saveCourse:', error);
      throw error;
    }
  },

  saveLessons: async (courseId: string, lessons: Lesson[]): Promise<void> => {
    try {
      console.log('DB: Saving lessons for course:', courseId);
      
      // Get existing lessons
      const { data: existingLessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId);

      const existingLessonIds = new Set(existingLessons?.map(l => l.id) || []);
      const newLessonIds = new Set(
        lessons
          .filter(l => l.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(l.id))
          .map(l => l.id)
      );

      // Delete lessons that were removed
      const lessonsToDelete = [...existingLessonIds].filter(id => !newLessonIds.has(id));
      if (lessonsToDelete.length > 0) {
        console.log('DB: Deleting removed lessons:', lessonsToDelete);
        await supabase
          .from('lessons')
          .delete()
          .in('id', lessonsToDelete);
      }

      // Save or update lessons - KORISTITE snake_case
      for (const lesson of lessons) {
        const isValidUUID = lesson.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lesson.id);
        
        const lessonData = {
          course_id: courseId,
          title: lesson.title,
          description: lesson.description,
          order: lesson.order,
          min_learning_time_minutes: lesson.minLearningTimeMinutes || 0,
          updated_at: new Date().toISOString()
        };

        if (isValidUUID && existingLessonIds.has(lesson.id)) {
          console.log('DB: Updating lesson:', lesson.id);
          const { error } = await supabase
            .from('lessons')
            .update(lessonData)
            .eq('id', lesson.id);
          
          if (error) {
            console.error('DB: Error updating lesson:', error);
            throw error;
          }
        } else {
          console.log('DB: Creating new lesson:', lesson.title);
          const { data: newLesson, error } = await supabase
            .from('lessons')
            .insert([{ ...lessonData, created_at: new Date().toISOString() }])
            .select()
            .single();
          
          if (error) {
            console.error('DB: Error creating lesson:', error);
            throw error;
          }
          
          if (newLesson) {
            lesson.id = newLesson.id;
            console.log('DB: New lesson created with UUID:', newLesson.id);
          }
        }

        // Save materials
        if (lesson.materials && lesson.materials.length > 0) {
          await db.saveMaterials(lesson.id!, lesson.materials);
        } else if (lesson.id) {
          // Delete all materials if there are none
          await supabase
            .from('materials')
            .delete()
            .eq('lesson_id', lesson.id);
        }
      }
      
      console.log('DB: All lessons saved successfully');
    } catch (error) {
      console.error('DB: Error saving lessons:', error);
      throw error;
    }
  },

  saveMaterials: async (lessonId: string, materials: Material[]): Promise<void> => {
    try {
      console.log('DB: Saving materials for lesson:', lessonId);
      
      // Get existing materials
      const { data: existingMaterials } = await supabase
        .from('materials')
        .select('id')
        .eq('lesson_id', lessonId);

      const existingMaterialIds = new Set(existingMaterials?.map(m => m.id) || []);
      const newMaterialIds = new Set(
        materials
          .filter(m => m.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id))
          .map(m => m.id)
      );

      // Delete materials that were removed
      const materialsToDelete = [...existingMaterialIds].filter(id => !newMaterialIds.has(id));
      if (materialsToDelete.length > 0) {
        console.log('DB: Deleting removed materials:', materialsToDelete);
        await supabase
          .from('materials')
          .delete()
          .in('id', materialsToDelete);
      }

      // Save or update materials
      for (const material of materials) {
        const isValidUUID = material.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(material.id);
        
        const materialData = {
          lesson_id: lessonId,
          type: material.type,
          title: material.title,
          url: material.url || '',
          content: material.content,
          updated_at: new Date().toISOString()
        };

        if (isValidUUID && existingMaterialIds.has(material.id)) {
          console.log('DB: Updating material:', material.id);
          const { error } = await supabase
            .from('materials')
            .update(materialData)
            .eq('id', material.id);
          
          if (error) {
            console.error('DB: Error updating material:', error);
            throw error;
          }
        } else {
          console.log('DB: Creating new material:', material.title);
          const { error } = await supabase
            .from('materials')
            .insert([{ ...materialData, created_at: new Date().toISOString() }]);
          
          if (error) {
            console.error('DB: Error creating material:', error);
            throw error;
          }
        }
      }
      
      console.log('DB: All materials saved successfully');
    } catch (error) {
      console.error('DB: Error saving materials:', error);
      throw error;
    }
  },

  saveExam: async (courseId: string, exam: Exam): Promise<void> => {
    try {
      console.log('DB: Saving exam for course:', courseId);
      
      // KORISTITE snake_case za polja u bazi
      const examData = {
        course_id: courseId,
        passing_score: exam.passingScore,
        time_limit_minutes: exam.timeLimitMinutes,
        max_attempts: exam.maxAttempts,
        randomize_questions: exam.randomizeQuestions,
        randomize_answers: exam.randomizeAnswers,
        question_bank_draw_count: exam.questionBankDrawCount || 0,
        updated_at: new Date().toISOString()
      };

      // Check if exam already exists
      const { data: existingExam } = await supabase
        .from('exams')
        .select('id')
        .eq('course_id', courseId)
        .single();

      let examId: string;

      if (existingExam) {
        console.log('DB: Updating existing exam:', existingExam.id);
        const { error } = await supabase
          .from('exams')
          .update(examData)
          .eq('id', existingExam.id);
        
        if (error) {
          console.error('DB: Error updating exam:', error);
          throw error;
        }
        
        examId = existingExam.id;
      } else {
        console.log('DB: Creating new exam');
        const { data: newExam, error } = await supabase
          .from('exams')
          .insert([{ ...examData, created_at: new Date().toISOString() }])
          .select()
          .single();
        
        if (error) {
          console.error('DB: Error creating exam:', error);
          throw error;
        }
        
        if (newExam) examId = newExam.id;
        else throw new Error('Failed to create exam');
      }

      // Save questions
      await db.saveQuestions(examId, exam.questions);
      console.log('DB: Exam saved successfully');
    } catch (error) {
      console.error('DB: Error saving exam:', error);
      throw error;
    }
  },

  saveQuestions: async (examId: string, questions: Question[]): Promise<void> => {
    try {
      console.log('DB: Saving questions for exam:', examId, '- Count:', questions.length);
      
      // Delete all existing questions for this exam
      await supabase
        .from('questions')
        .delete()
        .eq('exam_id', examId);

      // Insert new questions - KORISTITE snake_case
      if (questions.length > 0) {
        const questionsToInsert = questions.map((q, index) => ({
          exam_id: examId,
          text: q.text,
          options: q.options,
          correct_option_index: q.correctOptionIndex,
          order: index,
          created_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('questions')
          .insert(questionsToInsert);
        
        if (error) {
          console.error('DB: Error inserting questions:', error);
          throw error;
        }
        
        console.log('DB: Questions saved successfully');
      }
    } catch (error) {
      console.error('DB: Error saving questions:', error);
      throw error;
    }
  },

  // USER PROGRESS
  getProgress: async (userId: string, courseId: string): Promise<Progress> => {
    try {
      console.log('DB: Getting progress for user:', userId, 'course:', courseId);
      
      const { data, error } = await supabase
        .from('user_progress')
        .select(`
          *,
          attempts:exam_attempts(*)
        `)
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching progress:', error);
      }

      if (!data) {
        console.log('DB: No progress found, returning empty progress');
        // Return empty progress
        return {
          userId,
          courseId,
          completedLessonIds: [],
          lessonStartTimes: {},
          lessonTimeSpent: {},
          attempts: [],
          isCompleted: false
        };
      }

      console.log('DB: Found progress data:', data);
      
      // Convert attempts
      const attempts = data.attempts?.map((attempt: any) => toExamAttempt(attempt)) || [];

      const progress = toProgress(data);
      progress.attempts = attempts;

      console.log('DB: Returning progress:', {
        userId: progress.userId,
        courseId: progress.courseId,
        completedLessons: progress.completedLessonIds.length,
        attempts: progress.attempts.length
      });
      
      return progress;
    } catch (error) {
      console.error('Error in getProgress:', error);
      return {
        userId,
        courseId,
        completedLessonIds: [],
        lessonStartTimes: {},
        lessonTimeSpent: {},
        attempts: [],
        isCompleted: false
      };
    }
  },

  updateProgress: async (progress: Progress): Promise<void> => {
    try {
      console.log('DB: Updating progress for user:', progress.userId, 'course:', progress.courseId);
      
      // KORISTITE snake_case za polja u bazi
      const progressData = {
        user_id: progress.userId,
        course_id: progress.courseId,
        completed_lesson_ids: progress.completedLessonIds,
        lesson_start_times: progress.lessonStartTimes,
        lesson_time_spent: progress.lessonTimeSpent,
        is_completed: progress.isCompleted,
        exam_score: progress.examScore,
        practical_check_completed: progress.practicalCheckCompleted,
        practical_check_status: progress.practicalCheckStatus,
        practical_check_comment: progress.practicalCheckComment,
        practical_check_by: progress.practicalCheckBy,
        practical_check_date: progress.practicalCheckDate,
        completion_date: progress.completionDate,
        certificate_id: progress.certificateId,
        expiry_date: progress.expiryDate,
        updated_at: new Date().toISOString()
      };

      const { data: existing } = await supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', progress.userId)
        .eq('course_id', progress.courseId)
        .single();

      if (existing) {
        console.log('DB: Updating existing progress record:', existing.id);
        await supabase
          .from('user_progress')
          .update(progressData)
          .eq('id', existing.id);
      } else {
        console.log('DB: Creating new progress record');
        const { data: newProgress } = await supabase
          .from('user_progress')
          .insert([{ ...progressData, created_at: new Date().toISOString() }])
          .select()
          .single();
        
        if (newProgress && progress) {
          progress.id = newProgress.id;
          console.log('DB: New progress record created with ID:', newProgress.id);
        }
      }
      
      console.log('DB: Progress updated successfully');
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  },

  // AUDIT LOGS
  logAction: async (userId: string, action: string, details: string): Promise<void> => {
    try {
      await supabase
        .from('audit_logs')
        .insert([{
          user_id: userId,
          action,
          details,
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Error logging action:', error);
    }
  },

  getAuditLogs: async (limit = 1000): Promise<AuditLog[]> => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }

      return (data || []).map((log: any): AuditLog => ({
        id: log.id,
        timestamp: log.created_at,
        userId: log.user_id,
        action: log.action,
        details: log.details,
        createdAt: log.created_at
      }));
    } catch (error) {
      console.error('Error in getAuditLogs:', error);
      return [];
    }
  },

  // EXAM ATTEMPTS
  saveExamAttempt: async (attempt: ExamAttempt): Promise<void> => {
    try {
      console.log('DB: Saving exam attempt for user:', attempt.userId, 'course:', attempt.courseId);
      
      // KORISTITE snake_case za polja u bazi
      const attemptData = {
        user_id: attempt.userId,
        course_id: attempt.courseId,
        score: attempt.score,
        passed: attempt.passed,
        time_spent_seconds: attempt.timeSpentSeconds,
        answers: attempt.answers,
        questions_snapshot: attempt.questionsSnapshot,
        started_at: attempt.startedAt || new Date().toISOString(),
        completed_at: attempt.completedAt || new Date().toISOString(),
        created_at: attempt.createdAt || new Date().toISOString()
      };

      await supabase
        .from('exam_attempts')
        .insert([attemptData]);
      
      console.log('DB: Exam attempt saved successfully');
    } catch (error) {
      console.error('Error saving exam attempt:', error);
    }
  },

  getExamAttempts: async (userId: string, courseId: string): Promise<ExamAttempt[]> => {
    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching exam attempts:', error);
        return [];
      }

      return (data || []).map((attempt: any) => toExamAttempt(attempt));
    } catch (error) {
      console.error('Error in getExamAttempts:', error);
      return [];
    }
  },

  // USERS (for backward compatibility - still using localStorage)
  getUsers: (): User[] => {
    try {
      const data = localStorage.getItem('skyway_users');
      const users = data ? JSON.parse(data) : [];
      console.log('DB [getUsers]: Found', users.length, 'users in localStorage');
      return users;
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  },

  saveUsers: (users: User[]): void => {
    try {
      localStorage.setItem('skyway_users', JSON.stringify(users));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  },

  updateUser: (user: User): void => {
    try {
      const users = db.getUsers();
      const index = users.findIndex(u => u.id === user.id);
      if (index > -1) {
        users[index] = user;
      } else {
        users.push(user);
      }
      db.saveUsers(users);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  },

  deleteCourse: async (courseId: string): Promise<boolean> => {
    try {
      console.log('DB: Deleting course:', courseId);
      
      // Prvo obriši sve povezane podatke u pravilnom redosledu
      
      // 1. Obriši pitanja preko exam
      const { data: examData } = await supabase
        .from('exams')
        .select('id')
        .eq('course_id', courseId)
        .single();
      
      if (examData) {
        console.log('DB: Deleting questions for exam:', examData.id);
        await supabase
          .from('questions')
          .delete()
          .eq('exam_id', examData.id);
        
        // 2. Obriši exam
        console.log('DB: Deleting exam:', examData.id);
        await supabase
          .from('exams')
          .delete()
          .eq('id', examData.id);
      }
      
      // 3. Obriši materijale preko lessons
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId);
      
      if (lessons && lessons.length > 0) {
        const lessonIds = lessons.map(l => l.id);
        console.log('DB: Deleting materials for lessons:', lessonIds);
        await supabase
          .from('materials')
          .delete()
          .in('lesson_id', lessonIds);
      }
      
      // 4. Obriši lessons
      console.log('DB: Deleting lessons');
      await supabase
        .from('lessons')
        .delete()
        .eq('course_id', courseId);
      
      // 5. Obriši user progress
      console.log('DB: Deleting user progress');
      await supabase
        .from('user_progress')
        .delete()
        .eq('course_id', courseId);
      
      // 6. Obriši exam attempts
      console.log('DB: Deleting exam attempts');
      await supabase
        .from('exam_attempts')
        .delete()
        .eq('course_id', courseId);
      
      // 7. Konačno, obriši course
      console.log('DB: Deleting course record');
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      
      if (error) throw error;
      
      console.log('DB: Course deleted successfully');
      return true;
    } catch (error) {
      console.error('DB: Error deleting course:', error);
      return false;
    }
  },

  getUserProgress: async (userId: string, courseId: string): Promise<Progress[]> => {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select(`
          *,
          attempts:exam_attempts(*)
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user progress:', error);
        return [];
      }

      return (data || []).map(item => {
        const progress = toProgress(item);
        progress.attempts = item.attempts?.map((attempt: any) => toExamAttempt(attempt)) || [];
        return progress;
      });
    } catch (error) {
      console.error('Error in getUserProgress:', error);
      return [];
    }
  },

  // CSV Export (for backward compatibility)
  exportToCSV: (data: any[], filename: string): void => {
    try {
      if (!data.length) return;
      
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(obj => {
        return Object.values(obj).map(val => {
          const s = String(val).replace(/"/g, '""');
          return `"${s}"`;
        }).join(',');
      }).join('\n');
      
      const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
    }
  },

  // DODAJTE OVU FUNKCIJU ZA DEBBUGING
  debugCourses: async (): Promise<void> => {
    try {
      console.log('=== DEBUG COURSES ===');
      const courses = await db.getCourses();
      console.log('Total courses:', courses.length);
      courses.forEach((course, index) => {
        console.log(`Course ${index + 1}:`, {
          id: course.id,
          title: course.title,
          instructorId: course.instructorId,
          hasInstructor: !!course.instructorId,
          lessons: course.lessons.length,
          exam: !!course.exam
        });
      });
    } catch (error) {
      console.error('Debug error:', error);
    }
  }
};