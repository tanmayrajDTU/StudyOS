'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const DATASET_DIR = path.join(process.cwd(), 'public/pyq-dataset')

interface DatasetQuestion {
  id: string
  year: number
  marks: number
  questionType: 'MCQ' | 'MSQ' | 'NAT'
  difficulty?: string | null
  tags?: string[]
  question: {
    text: string
    images?: string[]
    tables?: Array<{ headers?: string[]; rows?: string[][] }>
  }
  options?: Array<{
    id: string
    text: string
    images?: string[]
    tables?: Array<{ headers?: string[]; rows?: string[][] }>
  }>
  correctAnswer?: string[]
  solution?: {
    text?: string
    images?: string[]
    tables?: Array<{ headers?: string[]; rows?: string[][] }>
  }
}

async function getAuthUser(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.email !== 'tanmayraj1705@gmail.com') throw new Error('Unauthorized account')
  return user
}

// Normalized topic file mapping helper
function getTopicFilename(topicName: string) {
  return topicName
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
    .trim() + '.json'
}

// Cache for subject questions to prevent disk hits
const subjectQuestionsCache: Record<string, Array<{ id: string; topic: string }>> = {}

function getSubjectQuestions(subjectName: string) {
  if (subjectQuestionsCache[subjectName]) {
    return subjectQuestionsCache[subjectName]
  }

  const subDir = path.join(DATASET_DIR, subjectName)
  if (!fs.existsSync(subDir)) return []

  const files = fs.readdirSync(subDir).filter(f => f.endsWith('.json') && f !== 'metadata.json')
  const questions: Array<{ id: string; topic: string }> = []

  files.forEach(file => {
    const filePath = path.join(subDir, file)
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      if (content.questions) {
        content.questions.forEach((q: DatasetQuestion & { topic: string }) => {
          questions.push({ id: q.id, topic: q.topic })
        })
      }
    } catch (e) {
      console.error('Error reading topic file:', file, e)
    }
  })

  subjectQuestionsCache[subjectName] = questions
  return questions
}

export async function getPyqSubjects() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  if (!fs.existsSync(DATASET_DIR)) {
    return []
  }

  const dirs = fs.readdirSync(DATASET_DIR).filter(f => {
    return fs.statSync(path.join(DATASET_DIR, f)).isDirectory() && f !== 'assets'
  })

  const subjects = await Promise.all(
    dirs.map(async (dirName) => {
      const metaPath = path.join(DATASET_DIR, dirName, 'metadata.json')
      let meta = { subject: dirName, totalTopics: 0, totalQuestions: 0 }
      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
        } catch (e) {
          console.error('Error reading metadata for', dirName, e)
        }
      }

      const questions = getSubjectQuestions(dirName)
      const questionIds = questions.map(q => q.id)

      let progressList: Array<{ solved: boolean; incorrect: boolean; attempted: boolean }> = []
      if (questionIds.length > 0) {
        const { data } = await supabase
          .from('pyq_progress')
          .select('solved, incorrect, attempted')
          .eq('user_id', user.id)
          .in('question_id', questionIds)
        progressList = (data || []) as Array<{ solved: boolean; incorrect: boolean; attempted: boolean }>
      }

      const solvedCount = progressList.filter(p => p.solved).length
      const incorrectCount = progressList.filter(p => p.incorrect).length
      
      const remainingCount = Math.max(0, meta.totalQuestions - solvedCount)
      const accuracy = solvedCount + incorrectCount > 0 
        ? Math.round((solvedCount / (solvedCount + incorrectCount)) * 100) 
        : 0

      const progressPercent = meta.totalQuestions > 0 
        ? Math.round((solvedCount / meta.totalQuestions) * 100) 
        : 0

      return {
        name: dirName,
        totalTopics: meta.totalTopics,
        totalQuestions: meta.totalQuestions,
        solvedCount,
        incorrectCount,
        remainingCount,
        accuracy,
        progressPercent
      }
    })
  )

  return subjects
}

interface DBProgressRecord {
  id: string
  user_id: string
  question_id: string
  attempted: boolean
  solved: boolean
  incorrect: boolean
  bookmarked: boolean
  marked_for_review: boolean
  attempt_count: number
  time_taken: number
  last_attempt: string | null
  first_solved: string | null
}

export async function getPyqSubjectDetail(subjectName: string) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const metaPath = path.join(DATASET_DIR, subjectName, 'metadata.json')
  if (!fs.existsSync(metaPath)) {
    throw new Error('Subject metadata not found')
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))

  const questions = getSubjectQuestions(subjectName)
  const questionIds = questions.map(q => q.id)

  let progressList: DBProgressRecord[] = []
  if (questionIds.length > 0) {
    const { data } = await supabase
      .from('pyq_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('question_id', questionIds)
    progressList = (data || []) as DBProgressRecord[]
  }

  const progressMap = new Map(progressList.map(p => [p.question_id, p]))

  // Map progress into topics
  const topics = meta.topics.map((t: { name: string; questionCount: number }) => {
    const topicLecs = questions.filter(q => q.topic === t.name)
    const topicQuestionIds = topicLecs.map(q => q.id)
    const topicProgress = topicQuestionIds.map(id => progressMap.get(id)).filter(Boolean) as DBProgressRecord[]

    const solved = topicProgress.filter(p => p.solved).length
    const incorrect = topicProgress.filter(p => p.incorrect).length
    const bookmarked = topicProgress.filter(p => p.bookmarked).length
    const markedForReview = topicProgress.filter(p => p.marked_for_review).length

    const remaining = Math.max(0, t.questionCount - solved)
    const accuracy = solved + incorrect > 0 
      ? Math.round((solved / (solved + incorrect)) * 100) 
      : 0

    // Find last attempt timestamp
    let lastAttempt: string | null = null
    const attempts = topicProgress.filter(p => p.last_attempt).map(p => new Date(p.last_attempt as string).getTime())
    if (attempts.length > 0) {
      lastAttempt = new Date(Math.max(...attempts)).toISOString()
    }

    return {
      name: t.name,
      questionCount: t.questionCount,
      solved,
      incorrect,
      bookmarked,
      markedForReview,
      remaining,
      accuracy,
      lastAttempt
    }
  })

  // Subject Stats
  const solvedCount = progressList.filter(p => p.solved).length
  const incorrectCount = progressList.filter(p => p.incorrect).length
  const accuracy = solvedCount + incorrectCount > 0 
    ? Math.round((solvedCount / (solvedCount + incorrectCount)) * 100) 
    : 0
  const progressPercent = meta.totalQuestions > 0 
    ? Math.round((solvedCount / meta.totalQuestions) * 100) 
    : 0

  return {
    subject: subjectName,
    totalTopics: meta.totalTopics,
    totalQuestions: meta.totalQuestions,
    solvedCount,
    incorrectCount,
    remainingCount: Math.max(0, meta.totalQuestions - solvedCount),
    accuracy,
    progressPercent,
    topics
  }
}

export async function getPyqTopicQuestions(subjectName: string, topicName: string) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const filename = getTopicFilename(topicName)
  const filePath = path.join(DATASET_DIR, subjectName, filename)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Topic file not found: ${filePath}`)
  }

  const topicData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const questions = (topicData.questions || []) as DatasetQuestion[]
  const questionIds = questions.map((q) => q.id)

  let progressList: DBProgressRecord[] = []
  if (questionIds.length > 0) {
    const { data } = await supabase
      .from('pyq_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('question_id', questionIds)
    progressList = (data || []) as DBProgressRecord[]
  }

  const progressMap = new Map(progressList.map(p => [p.question_id, p]))

  // Map progress into questions (without solutions to save bandwidth)
  const mappedQuestions = questions.map((q) => {
    const prog = progressMap.get(q.id)
    return {
      id: q.id,
      year: q.year,
      marks: q.marks,
      questionType: q.questionType,
      difficulty: q.difficulty || 'Medium',
      tags: q.tags || [],
      question: {
        text: q.question.text,
        images: q.question.images || [],
        tables: q.question.tables || []
      },
      options: (q.options || []).map((opt) => ({
        id: opt.id,
        text: opt.text,
        images: opt.images || [],
        tables: opt.tables || []
      })),
      progress: prog ? {
        attempted: prog.attempted,
        solved: prog.solved,
        incorrect: prog.incorrect,
        bookmarked: prog.bookmarked,
        markedForReview: prog.marked_for_review,
        attemptCount: prog.attempt_count,
        timeTaken: prog.time_taken,
        lastAttempt: prog.last_attempt,
        firstSolved: prog.first_solved
      } : null
    }
  })

  // Topic stats calculation
  const solved = progressList.filter(p => p.solved).length
  const incorrect = progressList.filter(p => p.incorrect).length
  const bookmarked = progressList.filter(p => p.bookmarked).length
  const markedForReview = progressList.filter(p => p.marked_for_review).length
  const total = questions.length
  const remaining = Math.max(0, total - solved)
  const accuracy = solved + incorrect > 0 
    ? Math.round((solved / (solved + incorrect)) * 100) 
    : 0

  const times = progressList.filter(p => p.time_taken > 0).map(p => p.time_taken)
  const averageTime = times.length > 0 
    ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) 
    : 0

  return {
    topic: topicName,
    subject: subjectName,
    questionCount: total,
    solved,
    incorrect,
    bookmarked,
    markedForReview,
    remaining,
    accuracy,
    averageTime,
    questions: mappedQuestions
  }
}

export async function getPyqQuestionDetail(subjectName: string, topicName: string, questionId: string) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const filename = getTopicFilename(topicName)
  const filePath = path.join(DATASET_DIR, subjectName, filename)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Topic file not found: ${filePath}`)
  }

  const topicData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const q = (topicData.questions || []).find((quest: DatasetQuestion) => quest.id === questionId) as DatasetQuestion | undefined

  if (!q) {
    throw new Error(`Question not found: ${questionId}`)
  }

  const { data: prog } = await supabase
    .from('pyq_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .single()

  const dbProgress = prog as DBProgressRecord | null

  return {
    question: {
      id: q.id,
      year: q.year,
      marks: q.marks,
      questionType: q.questionType,
      difficulty: q.difficulty || 'Medium',
      tags: q.tags || [],
      question: {
        text: q.question.text,
        images: q.question.images || [],
        tables: q.question.tables || []
      },
      options: (q.options || []).map((opt) => ({
        id: opt.id,
        text: opt.text,
        images: opt.images || [],
        tables: opt.tables || []
      })),
      correctAnswer: q.correctAnswer || [],
      solution: {
        text: q.solution?.text || '',
        images: q.solution?.images || [],
        tables: q.solution?.tables || []
      }
    },
    progress: dbProgress ? {
      attempted: dbProgress.attempted,
      solved: dbProgress.solved,
      incorrect: dbProgress.incorrect,
      bookmarked: dbProgress.bookmarked,
      markedForReview: dbProgress.marked_for_review,
      attemptCount: dbProgress.attempt_count,
      timeTaken: dbProgress.time_taken,
      lastAttempt: dbProgress.last_attempt,
      firstSolved: dbProgress.first_solved
    } : null
  }
}

export async function savePyqProgress(
  questionId: string,
  solved: boolean,
  incorrect: boolean,
  timeTaken: number
) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  // Fetch current progress
  const { data: current } = await supabase
    .from('pyq_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .single()

  const dbProgress = current as DBProgressRecord | null

  const nowStr = new Date().toISOString()
  const isSolved = solved
  const attemptCount = (dbProgress ? dbProgress.attempt_count : 0) + 1
  const totalTime = (dbProgress ? dbProgress.time_taken : 0) + timeTaken
  const firstSolved = isSolved && !(dbProgress?.first_solved) ? nowStr : (dbProgress ? dbProgress.first_solved : null)

  const { data, error } = await supabase
    .from('pyq_progress')
    .upsert({
      user_id: user.id,
      question_id: questionId,
      attempted: true,
      solved: isSolved,
      incorrect: incorrect,
      attempt_count: attemptCount,
      time_taken: totalTime,
      last_attempt: nowStr,
      first_solved: firstSolved,
      updated_at: nowStr
    }, { onConflict: 'user_id,question_id' })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/pyqs')
  return data
}

export async function togglePyqBookmark(questionId: string) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  // Fetch current progress
  const { data: current } = await supabase
    .from('pyq_progress')
    .select('bookmarked')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .single()

  const dbProgress = current as DBProgressRecord | null
  const nextVal = dbProgress ? !dbProgress.bookmarked : true

  const { data, error } = await supabase
    .from('pyq_progress')
    .upsert({
      user_id: user.id,
      question_id: questionId,
      bookmarked: nextVal,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,question_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function togglePyqMarkForReview(questionId: string) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  // Fetch current progress
  const { data: current } = await supabase
    .from('pyq_progress')
    .select('marked_for_review')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .single()

  const dbProgress = current as DBProgressRecord | null
  const nextVal = dbProgress ? !dbProgress.marked_for_review : true

  const { data, error } = await supabase
    .from('pyq_progress')
    .upsert({
      user_id: user.id,
      question_id: questionId,
      marked_for_review: nextVal,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,question_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

async function saveUploadedFile(file: File, folderName: string): Promise<string> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const uploadDir = path.join(DATASET_DIR, 'assets/user-uploads', folderName)
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  // Create unique filename
  const extension = path.extname(file.name) || '.png'
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}${extension}`
  const filePath = path.join(uploadDir, filename)

  fs.writeFileSync(filePath, buffer)
  return `assets/user-uploads/${folderName}/${filename}`
}

export async function addPyqQuestion(formData: FormData) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const subject = formData.get('subject') as string
  const topic = formData.get('topic') as string
  const year = parseInt(formData.get('year') as string) || new Date().getFullYear()
  const marks = parseFloat(formData.get('marks') as string) || 1
  const questionType = formData.get('questionType') as 'MCQ' | 'MSQ' | 'NAT'
  const difficulty = (formData.get('difficulty') as string) || 'Medium'
  const tagsString = (formData.get('tags') as string) || ''
  const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean)

  const questionText = formData.get('questionText') as string
  const questionImageFile = formData.get('questionImage') as File | null

  const solutionText = formData.get('solutionText') as string
  const solutionImageFile = formData.get('solutionImage') as File | null

  const subjectDir = path.join(DATASET_DIR, subject)
  if (!fs.existsSync(subjectDir)) {
    throw new Error('Subject directory does not exist')
  }

  const folderSlug = topic.toLowerCase().replace(/[^a-z0-9]/g, '_')
  
  let questionImgPath = ''
  if (questionImageFile && questionImageFile.size > 0) {
    questionImgPath = await saveUploadedFile(questionImageFile, folderSlug)
  }

  let solutionImgPath = ''
  if (solutionImageFile && solutionImageFile.size > 0) {
    solutionImgPath = await saveUploadedFile(solutionImageFile, folderSlug)
  }

  const options: Array<{ id: string; text: string; images: string[]; tables: Array<{ headers?: string[]; rows?: string[][] }> }> = []
  let correctAnswer: string[] = []

  if (questionType === 'MCQ' || questionType === 'MSQ') {
    const optIds = ['A', 'B', 'C', 'D']
    for (const optId of optIds) {
      const text = formData.get(`optionText_${optId}`) as string
      const file = formData.get(`optionImage_${optId}`) as File | null
      
      let imgPath = ''
      if (file && file.size > 0) {
        imgPath = await saveUploadedFile(file, `${folderSlug}_opt`)
      }

      options.push({
        id: optId,
        text: text || '',
        images: imgPath ? [imgPath] : [],
        tables: []
      })
    }

    if (questionType === 'MCQ') {
      const correctVal = formData.get('correctAnswerMCQ') as string
      if (correctVal) correctAnswer = [correctVal]
    } else {
      const correctVal = formData.get('correctAnswerMSQ') as string
      if (correctVal) {
        correctAnswer = correctVal.split(',').map(s => s.trim()).filter(Boolean)
      }
    }
  } else if (questionType === 'NAT') {
    const correctVal = formData.get('correctAnswerNAT') as string
    if (correctVal) {
      correctAnswer = [correctVal.trim()]
    }
  }

  const cleanSubjectSlug = subject.toUpperCase().replace(/[^A-Z0-9]/g, '_')
  const cleanTopicSlug = topic.toUpperCase().replace(/[^A-Z0-9]/g, '_')
  const newQuestionId = `USER_${cleanSubjectSlug}_${cleanTopicSlug}_${year}_Q${Date.now().toString().slice(-4)}`

  const newQuestion = {
    id: newQuestionId,
    subject,
    topic,
    subtopic: topic,
    year,
    exam: 'USER',
    marks,
    questionType,
    difficulty,
    estimatedTime: null,
    questionNumberWithinTopic: 999,
    tags,
    question: {
      text: questionText || '',
      images: questionImgPath ? [questionImgPath] : [],
      latex: [],
      tables: []
    },
    options,
    correctAnswer,
    solution: {
      text: solutionText || '',
      images: solutionImgPath ? [solutionImgPath] : [],
      latex: [],
      tables: []
    }
  }

  const topicFilename = topic.replace(/&/g, 'and').replace(/\s+/g, ' ').trim() + '.json'
  const filePath = path.join(subjectDir, topicFilename)

  let topicData = {
    subject,
    topic,
    questionCount: 0,
    questions: [] as DatasetQuestion[]
  }

  if (fs.existsSync(filePath)) {
    try {
      topicData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch (e) {
      console.error('Error reading existing topic JSON:', e)
    }
  }

  topicData.questions.push(newQuestion)
  topicData.questionCount = topicData.questions.length

  fs.writeFileSync(filePath, JSON.stringify(topicData, null, 4), 'utf8')

  const metaPath = path.join(subjectDir, 'metadata.json')
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
      meta.totalQuestions = (meta.totalQuestions || 0) + 1
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 4), 'utf8')
    } catch (e) {
      console.error('Error updating subject metadata:', e)
    }
  }

  revalidatePath('/pyqs')
  return { success: true, questionId: newQuestionId }
}

export async function editPyqQuestion(
  subject: string,
  topic: string,
  questionId: string,
  updates: {
    questionText: string
    questionImages?: string[]
    options?: Array<{ id: string; text: string }>
    correctAnswer: string[]
    solutionText: string
    solutionImages?: string[]
  }
) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const subjectDir = path.join(DATASET_DIR, subject)
  if (!fs.existsSync(subjectDir)) {
    throw new Error('Subject directory does not exist')
  }

  const topicFilename = topic.replace(/&/g, 'and').replace(/\s+/g, ' ').trim() + '.json'
  const filePath = path.join(subjectDir, topicFilename)

  if (!fs.existsSync(filePath)) {
    throw new Error('Topic JSON file does not exist')
  }

  const topicData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const questionIndex = topicData.questions.findIndex((q: { id: string }) => q.id === questionId)

  if (questionIndex === -1) {
    throw new Error('Question not found in topic dataset')
  }

  const q = topicData.questions[questionIndex]
  q.question.text = updates.questionText
  
  if (updates.questionImages !== undefined) {
    q.question.images = updates.questionImages
  }
  
  q.correctAnswer = updates.correctAnswer
  q.solution.text = updates.solutionText

  if (updates.solutionImages !== undefined) {
    if (!q.solution) {
      q.solution = { text: updates.solutionText, images: [], latex: [], tables: [] }
    }
    q.solution.images = updates.solutionImages
  }

  if (updates.options && q.options) {
    for (const optUpdate of updates.options) {
      const optIdx = q.options.findIndex((o: { id: string }) => o.id === optUpdate.id)
      if (optIdx !== -1) {
        q.options[optIdx].text = optUpdate.text
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(topicData, null, 4), 'utf8')

  revalidatePath('/pyqs')
  return { success: true }
}

export async function uploadPyqImage(formData: FormData) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const file = formData.get('file') as File | null
  const folderName = (formData.get('folderName') as string) || 'edits'

  if (!file || file.size === 0) {
    throw new Error('No file provided')
  }

  const imagePath = await saveUploadedFile(file, folderName)
  return { path: imagePath }
}

