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
  PracticalStatus,
  UserCourseAssignment,
  QuestionSet 
} from './types';
import { supabase, supabaseAdmin } from './lib/supabase';

// ====================
// HELPER FUNKCIJE ZA KONVERZIJU
// ====================

const toUserCourseAssignment = (data: any): UserCourseAssignment => {
  return {
    id: data.id,
    userId: data.user_id,
    courseId: data.course_id,
    isRequired: data.is_required ?? true,
    dueDate: data.due_date,
    assignedBy: data.assigned_by,
    assignedAt: data.assigned_at, // ⭐⭐⭐ OVO JE VAŽNO ⭐⭐⭐
    updatedAt: data.updated_at
  };
};

// 2. Course konverzija
const toCourse = (data: SupabaseCourse): Course => {
  console.log('DB [toCourse]: Converting course data:', {
    id: data.id,
    title: data.title,
    instructor_id: data.instructor_id,
    category: data.category
  });
  
  const course: Course = {
    id: data.id,
    title: data.title,
    description: data.description,
    version: data.version,
    category: data.category as any,
    instructorId: data.instructor_id,
    thumbnail: data.thumbnail,
    isSequential: data.is_sequential ?? true,
    validityYears: data.validity_years,
    requiresPracticalCheck: data.requires_practical_check,
    refresherCourseId: data.refresher_course_id,
    lessons: [],
    exam: undefined
  };

  if (data.created_at) course.createdAt = data.created_at;
  if (data.updated_at) course.updatedAt = data.updated_at;

  console.log('DB [toCourse]: Converted course:', {
    id: course.id,
    title: course.title,
    instructorId: course.instructorId
  });
  
  return course;
};

// 3. Lesson konverzija
const toLesson = (data: SupabaseLesson): Lesson => {
  console.log('DB [toLesson]: Converting lesson:', {
    id: data.id,
    title: data.title,
    course_id: data.course_id
  });
  
  const lesson: Lesson = {
    id: data.id,
    courseId: data.course_id,
    title: data.title,
    description: data.description,
    order: data.order,
    minLearningTimeMinutes: data.min_learning_time_minutes,
    materials: data.materials || []
  };

  if (data.created_at) lesson.createdAt = data.created_at;
  if (data.updated_at) lesson.updatedAt = data.updated_at;

  return lesson;
};

// 4. Exam konverzija
const toExam = (data: SupabaseExam): Exam => {
  console.log('DB [toExam]: Converting exam:', {
    id: data.id,
    course_id: data.course_id,
    questionsCount: data.questions?.length || 0
  });
  
  const exam: Exam = {
    id: data.id,
    courseId: data.course_id,
    passingScore: data.passing_score,
    timeLimitMinutes: data.time_limit_minutes,
    maxAttempts: data.max_attempts,
    randomizeQuestions: data.randomize_questions,
    randomizeAnswers: data.randomize_answers,
    questionBankDrawCount: data.question_bank_draw_count,
    questions: data.questions || []
  };

  if (data.created_at) exam.createdAt = data.created_at;
  if (data.updated_at) exam.updatedAt = data.updated_at;

  return exam;
};

// 5. ExamAttempt konverzija
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

  if (data.user_id) attempt.userId = data.user_id;
  if (data.course_id) attempt.courseId = data.course_id;
  if (data.started_at) attempt.startedAt = data.started_at;
  if (data.completed_at) attempt.completedAt = data.completed_at;
  if (data.created_at) attempt.createdAt = data.created_at;

  return attempt;
};

// 6. Progress konverzija
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

  if (data.id) progress.id = data.id;
  if (data.created_at) progress.createdAt = data.created_at;
  if (data.updated_at) progress.updatedAt = data.updated_at;

  return progress;
};

// ====================
// DB OBJEKT SA FUNKCIJAMA
// ====================

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
        
        if (item.lessons && Array.isArray(item.lessons)) {
          course.lessons = item.lessons.map((lesson: any) => {
            const lessonObj = toLesson(lesson as SupabaseLesson);
            lessonObj.materials = lesson.materials || [];
            return lessonObj;
          });
        }

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
      
      if (data.lessons && Array.isArray(data.lessons)) {
        course.lessons = data.lessons.map((lesson: any) => {
          const lessonObj = toLesson(lesson as SupabaseLesson);
          lessonObj.materials = lesson.materials || [];
          return lessonObj;
        });
      }

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
      
      const isValidUUID = course.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.id);
      const isUpdate = course.id && isValidUUID;
      
      console.log('DB: Is valid UUID?', isValidUUID);
      console.log('DB: Is update operation?', isUpdate);
      
      if (!course.title || course.title.trim() === '') {
        throw new Error('Course title is required');
      }
      
      if (!course.instructorId) {
        throw new Error('Instructor ID is required');
      }
      
      const courseData = {
        title: course.title.trim(),
        description: course.description || '',
        version: course.version || '1.0.0',
        category: course.category,
        instructor_id: course.instructorId,
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

      if (course.lessons && course.lessons.length > 0) {
        console.log('DB: Saving', course.lessons.length, 'lessons');
        await db.saveLessons(courseId, course.lessons);
        console.log('DB: Lessons saved successfully');
      } else {
        console.log('DB: No lessons to save, deleting existing lessons if any');
        await supabase
          .from('lessons')
          .delete()
          .eq('course_id', courseId);
      }

      if (course.exam) {
        console.log('DB: Saving exam with', course.exam.questions?.length || 0, 'questions');
        await db.saveExam(courseId, course.exam);
        console.log('DB: Exam saved successfully');
      } else {
        console.log('DB: No exam to save, deleting existing exam if any');
        const { data: existingExam } = await supabase
          .from('exams')
          .select('id')
          .eq('course_id', courseId)
          .single();
        
        if (existingExam) {
          await supabase
            .from('questions')
            .delete()
            .eq('exam_id', existingExam.id);
          
          await supabase
            .from('exams')
            .delete()
            .eq('id', existingExam.id);
          
          console.log('DB: Existing exam deleted');
        }
      }

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

      const lessonsToDelete = [...existingLessonIds].filter(id => !newLessonIds.has(id));
      if (lessonsToDelete.length > 0) {
        console.log('DB: Deleting removed lessons:', lessonsToDelete);
        await supabase
          .from('lessons')
          .delete()
          .in('id', lessonsToDelete);
      }

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

        if (lesson.materials && lesson.materials.length > 0) {
          await db.saveMaterials(lesson.id!, lesson.materials);
        } else if (lesson.id) {
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

      const materialsToDelete = [...existingMaterialIds].filter(id => !newMaterialIds.has(id));
      if (materialsToDelete.length > 0) {
        console.log('DB: Deleting removed materials:', materialsToDelete);
        await supabase
          .from('materials')
          .delete()
          .in('id', materialsToDelete);
      }

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
      
      await supabase
        .from('questions')
        .delete()
        .eq('exam_id', examId);

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

  // QUESTION SETS
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
        const { data: updated, error } = await supabase
          .from('question_sets')
          .update(setData)
          .eq('id', questionSet.id)
          .select()
          .single();

        if (error) throw error;
        data = updated;
      } else {
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
  // db.ts - dodajte u db objekat (negde blizu getAuthUsers)
createAuthUser: async (email: string, password: string, name: string, role: UserRole): Promise<User | null> => {
  try {
    console.log('DB: Creating auth user:', { email, name, role });
    
    // ⭐⭐⭐ KORISTITE supabaseAdmin UMESTO supabase ⭐⭐⭐
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        full_name: name
      }
    });
    
    if (error) {
      console.error('DB: Error creating auth user:', error);
      throw error;
    }
    
    if (!data.user) {
      throw new Error('No user returned from auth creation');
    }
    
    console.log('DB: Auth user created successfully with ID:', data.user.id);
    
    return {
      id: data.user.id,
      email: data.user.email || email,
      name: data.user.user_metadata?.name || name,
      role: (data.user.user_metadata?.role as UserRole) || role,
      staffId: '',
      airport: '',
      department: '',
      jobTitle: '',
      jobDescription: '',
      phone: ''
    };
  } catch (error) {
    console.error('DB: Error in createAuthUser:', error);
    return null;
  }
},
// db.ts - dodajte ovu funkciju za migraciju
migrateUsers: async (): Promise<void> => {
  try {
    console.log('DB: Starting user migration...');
    
    const localUsers = JSON.parse(localStorage.getItem('skyway_users') || '[]');
    console.log('DB: Found', localUsers.length, 'local users');
    
    const migratedUsers: User[] = [];
    
    for (const localUser of localUsers) {
      // Ako već ima UUID, preskočite
      if (!localUser.id.startsWith('u-')) {
        migratedUsers.push(localUser);
        continue;
      }
      
      console.log(`DB: Migrating user: ${localUser.email}`);
      
      try {
        // Proverite da li već postoji u Auth
        const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
        const existingAuthUser = authUsers?.find((au: any) => au.email === localUser.email);
        
        if (existingAuthUser) {
          console.log(`DB: User already exists in Auth: ${existingAuthUser.id}`);
          // Ažurirajte ID
          migratedUsers.push({
            ...localUser,
            id: existingAuthUser.id
          });
        } else {
          // Kreirajte novog u Auth
          const tempPassword = `Migrated${Date.now().toString().slice(-6)}!`;
          const authUser = await db.createAuthUser(
            localUser.email,
            tempPassword,
            localUser.name,
            localUser.role
          );
          
          if (authUser) {
            console.log(`DB: Created auth user: ${authUser.id}`);
            migratedUsers.push(authUser);
          } else {
            console.warn(`DB: Failed to create auth user for ${localUser.email}`);
            migratedUsers.push(localUser); // Zadržite starog
          }
        }
      } catch (error) {
        console.error(`DB: Error migrating user ${localUser.email}:`, error);
        migratedUsers.push(localUser); // Zadržite starog
      }
    }
    
    // Sačuvajte migrirane korisnike
    localStorage.setItem('skyway_users', JSON.stringify(migratedUsers));
    console.log('DB: Migration complete. Users:', migratedUsers.length);
    
    alert(`Migration complete! Migrated ${migratedUsers.length} users.`);
    
  } catch (error) {
    console.error('DB: Error in migrateUsers:', error);
    alert('Error migrating users. Check console for details.');
  }
},

  // USERS (for backward compatibility - still using localStorage)
getAuthUsers: async (): Promise<User[]> => {
  try {
    // ⭐⭐⭐ KORISTITE supabaseAdmin ⭐⭐⭐
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      console.error('Error fetching auth users:', error);
      return [];
    }
    
    return users.map(authUser => ({
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.full_name || 
            authUser.user_metadata?.name || 
            authUser.email?.split('@')[0] || '',
      role: (authUser.user_metadata?.role as UserRole) || UserRole.TRAINEE,
    }));
  } catch (error) {
    console.error('Error in getAuthUsers:', error);
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
  getAllUsers: async (): Promise<User[]> => {
  try {
    console.log('DB: Getting all users...');
    
    // Prvo pokušajte da dobijete auth korisnike
    const authUsers = await db.getAuthUsers();
    
    if (authUsers && authUsers.length > 0) {
      console.log('DB [getAllUsers]: Found', authUsers.length, 'auth users');
      return authUsers;
    }
    
    console.warn('DB [getAllUsers]: No auth users found, trying localStorage...');
    
    // Fallback na lokalne korisnike
    try {
      const data = localStorage.getItem('skyway_users');
      const localUsers = data ? JSON.parse(data) : [];
      console.log('DB [getAllUsers]: Found', localUsers.length, 'local users');
      return localUsers;
    } catch (localError) {
      console.error('DB [getAllUsers]: Error parsing local users:', localError);
      return [];
    }
  } catch (error) {
    console.error('DB [getAllUsers]: Error:', error);
    return [];
  }
},

// db.ts - ispravite updateUser funkciju
updateUser: (user: User): void => {
  try {
    // OVA LINIJA JE PROBLEM - getUsers ne postoji
    // const users = db.getUsers();
    
    // Umesto toga, koristite getAuthUsers ako vam trebaju auth korisnici
    // ILI uklonite ovu funkciju ako ne koristite lokalne korisnike
    console.warn('updateUser is deprecated. Use Supabase auth instead.');
    
    // Ako baš morate da koristite lokalne korisnike, dodajte getUsers funkciju
    const users = JSON.parse(localStorage.getItem('skyway_users') || '[]');
    const index = users.findIndex(u => u.id === user.id);
    if (index > -1) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem('skyway_users', JSON.stringify(users));
  } catch (error) {
    console.error('Error updating user:', error);
  }
},
  deleteCourse: async (courseId: string): Promise<boolean> => {
    try {
      console.log('DB: Deleting course:', courseId);
      
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
        
        console.log('DB: Deleting exam:', examData.id);
        await supabase
          .from('exams')
          .delete()
          .eq('id', examData.id);
      }
      
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
      
      console.log('DB: Deleting lessons');
      await supabase
        .from('lessons')
        .delete()
        .eq('course_id', courseId);
      
      console.log('DB: Deleting user progress');
      await supabase
        .from('user_progress')
        .delete()
        .eq('course_id', courseId);
      
      console.log('DB: Deleting exam attempts');
      await supabase
        .from('exam_attempts')
        .delete()
        .eq('course_id', courseId);
      
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
  },
// db.ts - dodajte ovu funkciju u db objekat (možda blizu getAuthUsers)

  // USER COURSE ASSIGNMENTS
assignCourseToUser: async (userId: string, courseId: string, isRequired: boolean = true, dueDate?: string, assignedBy?: string): Promise<UserCourseAssignment | null> => {
  try {
    console.log('DB: ===== START assignCourseToUser =====');
    console.log('DB: Raw input:', { userId, courseId, isRequired, dueDate, assignedBy });
    
    // Validacija - ODBIJANJE LOKALNIH KORISNIKA
    if (!userId?.trim()) throw new Error('User ID is required');
    if (!courseId?.trim()) throw new Error('Course ID is required');
    
    // ⭐⭐⭐ ODBIJTE LOKALNE KORISNIKE ⭐⭐⭐
    if (userId.startsWith('u-')) {
      throw new Error('Local users (starting with "u-") are not supported. Please use Supabase Auth users only.');
    }
    
    let finalUserId = userId;
    
    // Validacija UUID-ova - SADA OČEKIVANJE SAMO SUPABASE ID-jeva
    const isValidUserId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    const isValidCourseId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
    
    if (!isValidUserId) {
      throw new Error(`Invalid Supabase Auth user ID: ${userId}. User must be created in Supabase Auth.`);
    }
    
    if (!isValidCourseId) {
      throw new Error(`Invalid course ID: ${courseId}`);
    }
    
    // Proverite da li korisnik postoji u Supabase Auth
    console.log('DB: Verifying user exists in Supabase Auth...');
    try {
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.find((au: any) => au.id === userId);
      
      if (!authUser) {
        throw new Error(`User not found in Supabase Auth: ${userId}. Please create user in Supabase Auth first.`);
      }
      
      console.log('DB: User verified in Supabase Auth:', authUser.email);
    } catch (authError) {
      console.error('DB: Error verifying user in Auth:', authError);
      throw new Error(`Cannot verify user in Supabase Auth: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
    }
    
    // Proverite kurs
    console.log('DB: Verifying course exists...');
    const { data: courseCheck, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .maybeSingle();
    
    if (courseError) {
      console.error('DB: Error checking course:', courseError);
      throw courseError;
    }
    
    if (!courseCheck) {
      throw new Error(`Course not found: ${courseId}`);
    }
    
    console.log('DB: Course verified:', courseCheck.title);
    
    // Validacija assigned_by
    if (assignedBy && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignedBy)) {
      console.warn('DB: Invalid assigned_by UUID, setting to null');
      assignedBy = null;
    }
    
    // Proverite da li već postoji dodela
    console.log('DB: Checking for existing assignment...');
    const { data: existingAssignments, error: existingError } = await supabase
      .from('user_course_assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId);
    
    if (existingError) {
      console.error('DB: Error checking existing assignments:', existingError);
      throw existingError;
    }
    
    console.log('DB: Existing assignments found:', existingAssignments?.length || 0);
    
    let result;
    
    if (existingAssignments && existingAssignments.length > 0) {
      // AŽURIRAJTE POSTOJEĆU
      console.log('DB: Updating existing assignment...');
      
      const existingId = existingAssignments[0].id;
      const { data, error } = await supabase
        .from('user_course_assignments')
        .update({
          is_required: isRequired,
          due_date: dueDate || null,
          assigned_by: assignedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingId)
        .select()
        .single();
      
      if (error) {
        console.error('DB: Error updating assignment:', error);
        throw error;
      }
      
      result = data;
      console.log('DB: Updated assignment:', result);
    } else {
      // KREIRAJTE NOVU
      console.log('DB: Creating new assignment...');
      
      const assignmentData = {
        user_id: userId,
        course_id: courseId,
        is_required: isRequired,
        due_date: dueDate || null,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('DB: Assignment data:', assignmentData);
      
      const { data, error } = await supabase
        .from('user_course_assignments')
        .insert([assignmentData])
        .select()
        .single();
      
      if (error) {
        console.error('DB: Error creating assignment:', error);
        throw error;
      }
      
      result = data;
      console.log('DB: New assignment created:', result);
    }
    
    console.log('DB: Success! Final result:', result);
    console.log('DB: ===== END assignCourseToUser =====');
    
    return toUserCourseAssignment(result);
  } catch (error) {
    console.error('DB: ===== ERROR in assignCourseToUser =====');
    console.error('DB: Full error:', error);
    
    if (error instanceof Error) {
      console.error('DB: Error message:', error.message);
      console.error('DB: Error stack:', error.stack);
      
      // Vratite korisnički-friendly poruku
      throw new Error(`Failed to assign course: ${error.message}`);
    }
    
    console.error('DB: ===== END ERROR =====');
    return null;
  }
},

  removeCourseAssignment: async (userId: string, courseId: string): Promise<boolean> => {
    try {
      console.log('DB: Removing course assignment:', { userId, courseId });
      
      const { error } = await supabase
        .from('user_course_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', courseId);

      if (error) {
        console.error('DB: Error removing course assignment:', error);
        throw error;
      }
      
      console.log('DB: Course assignment removed successfully');
      return true;
    } catch (error) {
      console.error('DB: Error in removeCourseAssignment:', error);
      return false;
    }
  },

  getUserCourseAssignments: async (userId: string): Promise<UserCourseAssignment[]> => {
    try {
      console.log('DB: Getting course assignments for user:', userId);
      
      const { data, error } = await supabase
        .from('user_course_assignments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('DB: Error getting user course assignments:', error);
        throw error;
      }
      
      console.log('DB: Found', data?.length || 0, 'course assignments');
      
      return (data || []).map((item: any) => {
        const assignment = toUserCourseAssignment(item);
        if (item.course) {
          assignment.course = toCourse(item.course);
        }
        return assignment;
      });
    } catch (error) {
      console.error('DB: Error in getUserCourseAssignments:', error);
      return [];
    }
  },
  

  getUsersAssignedToCourse: async (courseId: string): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('user_course_assignments')
        .select(`
          *,
          user:auth.users(id, email, raw_user_meta_data)
        `)
        .eq('course_id', courseId);

      if (error) throw error;
      
      return (data || []).map((item: any) => {
        const userMeta = item.user?.raw_user_meta_data || {};
        return {
          id: item.user?.id || item.user_id,
          email: item.user?.email || '',
          name: userMeta.full_name || userMeta.name || '',
          role: userMeta.role as UserRole || UserRole.TRAINEE
        };
      });
    } catch (error) {
      console.error('Error getting users assigned to course:', error);
      return [];
    }
  },
  // db.ts - dodajte cleanup funkciju
cleanupLocalUsers: async (): Promise<void> => {
  try {
    const localUsers = JSON.parse(localStorage.getItem('skyway_users') || '[]');
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
    
    const authUserIds = authUsers?.map(au => au.id) || [];
    const authUserEmails = authUsers?.map(au => au.email) || [];
    
    // Zadržite samo korisnike koji postoje u Supabase Auth
    const validLocalUsers = localUsers.filter((lu: any) => 
      authUserIds.includes(lu.id) || authUserEmails.includes(lu.email)
    );
    
    localStorage.setItem('skyway_users', JSON.stringify(validLocalUsers));
    console.log('DB: Cleaned up local users. Removed:', localUsers.length - validLocalUsers.length);
  } catch (error) {
    console.error('DB: Error cleaning up local users:', error);
  }
},
deleteAuthUser: async (userId: string): Promise<boolean> => {
  try {
    console.log('DB: Deleting auth user:', userId);
    
    // ⭐⭐⭐ KORISTITE supabaseAdmin ⭐⭐⭐
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error('DB: Error deleting auth user:', error);
      throw error;
    }
    
    // Obrišite i iz localStorage
    const localUsers = JSON.parse(localStorage.getItem('skyway_users') || '[]');
    const filteredUsers = localUsers.filter((u: any) => u.id !== userId);
    localStorage.setItem('skyway_users', JSON.stringify(filteredUsers));
    
    console.log('DB: Auth user deleted successfully');
    return true;
  } catch (error) {
    console.error('DB: Error in deleteAuthUser:', error);
    return false;
  }
},
// db.ts - dodajte ove funkcije

  // Dohvata sve progress podatke sa kursima i korisnicima
  getAllProgressWithDetails: async (): Promise<any[]> => {
    try {
      console.log('DB: Getting all progress with details...');
      
      // Dohvati sve progress podatke sa kursima
      const { data: allProgress, error: progressError } = await supabase
        .from('user_progress')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('is_completed', true); // Samo završene kurseve
      
      if (progressError) {
        console.error('DB: Error fetching progress with details:', progressError);
        throw progressError;
      }
      
      if (!allProgress) return [];
      
      // Dohvati sve korisnike iz auth
      const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        console.error('DB: Error fetching auth users:', authError);
        throw authError;
      }
      
      // Mapiraj progress sa korisničkim podacima
      const progressWithDetails = await Promise.all(
        allProgress.map(async (item: any) => {
          // Pronađi auth usera
          const authUser = authUsers?.find((au: any) => au.id === item.user_id);
          
          // Proveri da li ima dodatnih podataka u localStorage
          const localUsers = JSON.parse(localStorage.getItem('skyway_users') || '[]');
          const localUserData = localUsers.find((lu: any) => lu.id === item.user_id);
          
          const userMeta = authUser?.user_metadata || {};
          
          return {
            id: item.id,
            certificateId: item.certificate_id,
            userId: item.user_id,
            userName: localUserData?.name || 
                     userMeta.full_name || 
                     userMeta.name || 
                     authUser?.email?.split('@')[0] || 
                     'Unknown User',
            userEmail: authUser?.email || '',
            userRole: localUserData?.role || userMeta.role || 'TRAINEE',
            courseId: item.course_id,
            courseTitle: item.course?.title || 'Unknown Course',
            courseCategory: item.course?.category || '',
            examScore: item.exam_score || 0,
            practicalCheckStatus: item.practical_check_status || '',
            completionDate: item.completion_date,
            expiryDate: item.expiry_date,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          };
        })
      );
      
      return progressWithDetails;
    } catch (error) {
      console.error('Error fetching progress with details:', error);
      return [];
    }
  },

  // Export sertifikata u CSV
  exportCertificatesToCSV: async (certificates: any[], filename: string): Promise<void> => {
    try {
      if (!certificates.length) return;
      
      const headers = [
        'Certificate ID',
        'User Name',
        'User Email',
        'Course Title',
        'Course Category',
        'Exam Score (%)',
        'Practical Status',
        'Completion Date',
        'Expiry Date',
        'Created At'
      ];
      
      const rows = certificates.map(cert => [
        cert.certificateId || 'N/A',
        cert.userName || 'N/A',
        cert.userEmail || 'N/A',
        cert.courseTitle || 'N/A',
        cert.courseCategory || 'N/A',
        cert.examScore || '0',
        cert.practicalCheckStatus || 'N/A',
        cert.completionDate ? new Date(cert.completionDate).toLocaleDateString() : 'N/A',
        cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : 'N/A',
        cert.createdAt ? new Date(cert.createdAt).toLocaleDateString() : 'N/A'
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('CSV export successful:', certificates.length, 'certificates');
    } catch (error) {
      console.error('Error exporting certificates to CSV:', error);
      throw error;
    }
  },

  // Regeneriše certificate ID
  regenerateCertificateId: async (progressId: string): Promise<string | null> => {
    try {
      const newCertificateId = `CT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const { error } = await supabase
        .from('user_progress')
        .update({ certificate_id: newCertificateId })
        .eq('id', progressId);
      
      if (error) {
        console.error('DB: Error regenerating certificate ID:', error);
        throw error;
      }
      
      return newCertificateId;
    } catch (error) {
      console.error('Error regenerating certificate ID:', error);
      return null;
    }
  },

  // Dodatna pomocna funkcija za statistike
  getCertificateStats: async (): Promise<{
    total: number;
    active: number;
    expired: number;
    needsRenewal: number;
    practicalCompetent: number;
  }> => {
    try {
      const certificates = await db.getAllProgressWithDetails();
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      return {
        total: certificates.length,
        active: certificates.filter(cert =>
          !cert.expiryDate || new Date(cert.expiryDate) >= now
        ).length,
        expired: certificates.filter(cert =>
          cert.expiryDate && new Date(cert.expiryDate) < now
        ).length,
        needsRenewal: certificates.filter(cert =>
          cert.expiryDate &&
          new Date(cert.expiryDate) < thirtyDaysFromNow &&
          new Date(cert.expiryDate) >= now
        ).length,
        practicalCompetent: certificates.filter(cert =>
          cert.practicalCheckStatus === 'COMPETENT'
        ).length,
      };
    } catch (error) {
      console.error('Error getting certificate stats:', error);
      return {
        total: 0,
        active: 0,
        expired: 0,
        needsRenewal: 0,
        practicalCompetent: 0
      };
    }
  },

  // Helper funkcija za dobijanje sertifikata za određenog korisnika
  getUserCertificates: async (userId: string): Promise<any[]> => {
    try {
      const { data: userProgress, error } = await supabase
        .from('user_progress')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', userId)
        .eq('is_completed', true);
      
      if (error) throw error;
      
      if (!userProgress) return [];
      
      // Dohvati korisničke podatke
      const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = authUsers?.find((au: any) => au.id === userId);
      const localUsers = JSON.parse(localStorage.getItem('skyway_users') || '[]');
      const localUserData = localUsers.find((lu: any) => lu.id === userId);
      
      const userMeta = authUser?.user_metadata || {};
      
      return userProgress.map((item: any) => ({
        id: item.id,
        certificateId: item.certificate_id,
        userId: item.user_id,
        userName: localUserData?.name || 
                 userMeta.full_name || 
                 userMeta.name || 
                 authUser?.email?.split('@')[0] || 
                 'Unknown User',
        userEmail: authUser?.email || '',
        courseId: item.course_id,
        courseTitle: item.course?.title || 'Unknown Course',
        courseCategory: item.course?.category || '',
        examScore: item.exam_score || 0,
        practicalCheckStatus: item.practical_check_status || '',
        completionDate: item.completion_date,
        expiryDate: item.expiry_date,
        createdAt: item.created_at
      }));
    } catch (error) {
      console.error('Error getting user certificates:', error);
      return [];
    }
  }

};