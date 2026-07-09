'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  getPyqTopicQuestions,
  getPyqQuestionDetail,
  savePyqProgress,
  togglePyqBookmark,
  togglePyqMarkForReview,
  editPyqQuestion,
  uploadPyqImage
} from '@/actions/pyq'
import ContentRenderer from '@/components/pyq/ContentRenderer'
import MarkdownLatexEditor from '@/components/pyq/MarkdownLatexEditor'
import {
  ChevronRight,
  Loader2,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Flag,
  Search,
  Check,
  HelpCircle,
  Edit,
  Save,
  Trash2,
  Image as ImageIcon
} from 'lucide-react'

interface Question {
  id: string
  year: number
  marks: number
  questionType: 'MCQ' | 'MSQ' | 'NAT'
  difficulty: string
  tags: string[]
  question: {
    text: string
    images: string[]
    tables: Array<{ headers?: string[]; rows?: string[][] }>
  }
  options: Array<{
    id: string
    text: string
    images: string[]
    tables: Array<{ headers?: string[]; rows?: string[][] }>
  }>
  progress: {
    attempted: boolean
    solved: boolean
    incorrect: boolean
    bookmarked: boolean
    markedForReview: boolean
    attemptCount: number
    timeTaken: number
    lastAttempt: string | null
    firstSolved: string | null
  } | null
}

interface LazyQuestionDetail {
  question: {
    id: string
    correctAnswer: string[]
    solution: {
      text: string
      images: string[]
      tables: Array<{ headers?: string[]; rows?: string[][] }>
    }
  }
}

export default function PyqTopicPracticePage() {
  const params = useParams()
  const subjectName = decodeURIComponent(params.subjectName as string)
  const topicName = decodeURIComponent(params.topicName as string)
  const queryClient = useQueryClient()

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'All' | 'Solved' | 'Unsolved' | 'Incorrect' | 'Bookmarked' | 'Review'>('All')
  const [typeFilter, setTypeFilter] = useState<'All' | 'MCQ' | 'MSQ' | 'NAT'>('All')
  const [yearFilter, setYearFilter] = useState<string>('All')

  // Active question state
  const [activeIndex, setActiveIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(20)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [natAnswer, setNatAnswer] = useState('')
  const [reportSuccess, setReportSuccess] = useState(false)
  const [isReattempting, setIsReattempting] = useState(false)

  // Edit Question state
  const [isEditing, setIsEditing] = useState(false)
  const [editQuestionText, setEditQuestionText] = useState('')
  const [editQuestionImages, setEditQuestionImages] = useState<string[]>([])
  const [editOptionTexts, setEditOptionTexts] = useState<Record<string, string>>({})
  const [editCorrectAnswers, setEditCorrectAnswers] = useState<string[]>([])
  const [editSolutionText, setEditSolutionText] = useState('')
  const [editSolutionImages, setEditSolutionImages] = useState<string[]>([])

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Fetch questions list
  const { data: topicData = null, isLoading } = useQuery({
    queryKey: ['pyq-topic', subjectName, topicName],
    queryFn: () => getPyqTopicQuestions(subjectName, topicName),
  })

  // Start question timer
  useEffect(() => {
    // Reset timer when question changes
    setTimerSeconds(0)
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => prev + 1)
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeIndex])

  const questions = useMemo(() => {
    return (topicData?.questions || []) as Question[]
  }, [topicData])

  // Filter years list dynamically from dataset
  const years = useMemo(() => {
    const ySet = new Set(questions.map((q) => String(q.year)))
    return Array.from(ySet).sort((a, b) => b.localeCompare(a))
  }, [questions])

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // 1. Search Query (id, text, tags, year)
      const matchesSearch =
        q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.question.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        String(q.year).includes(searchQuery)

      if (!matchesSearch) return false

      // 2. Status Filter
      if (activeFilter === 'Solved' && !q.progress?.solved) return false
      if (activeFilter === 'Unsolved' && q.progress?.solved) return false
      if (activeFilter === 'Incorrect' && !q.progress?.incorrect) return false
      if (activeFilter === 'Bookmarked' && !q.progress?.bookmarked) return false
      if (activeFilter === 'Review' && !q.progress?.markedForReview) return false

      // 3. Type Filter
      if (typeFilter !== 'All' && q.questionType !== typeFilter) return false

      // 4. Year Filter
      if (yearFilter !== 'All' && String(q.year) !== yearFilter) return false

      return true
    })
  }, [questions, searchQuery, activeFilter, typeFilter, yearFilter])

  const activeQuestion = filteredQuestions[activeIndex] || null

  // 2. Fetch active question full details (lazy loaded)
  const { data: activeDetail = null, isLoading: isLoadingDetail } = useQuery<LazyQuestionDetail>({
    queryKey: ['pyq-question-detail', subjectName, topicName, activeQuestion?.id],
    queryFn: () => getPyqQuestionDetail(subjectName, topicName, activeQuestion.id),
    enabled: !!activeQuestion?.id,
  })

  // Submit Answer mutation
  const submitMutation = useMutation({
    mutationFn: (variables: { solved: boolean; incorrect: boolean; timeTaken: number }) =>
      savePyqProgress(activeQuestion.id, variables.solved, variables.incorrect, variables.timeTaken),
    onSuccess: () => {
      setIsReattempting(false)
      queryClient.invalidateQueries({ queryKey: ['pyq-topic', subjectName, topicName] })
      queryClient.invalidateQueries({ queryKey: ['pyq-question-detail', subjectName, topicName, activeQuestion?.id] })
      queryClient.invalidateQueries({ queryKey: ['pyq-subject', subjectName] })
    }
  })

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: (id: string) => togglePyqBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pyq-topic', subjectName, topicName] })
      queryClient.invalidateQueries({ queryKey: ['pyq-question-detail', subjectName, topicName, activeQuestion?.id] })
    }
  })

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: (id: string) => togglePyqMarkForReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pyq-topic', subjectName, topicName] })
      queryClient.invalidateQueries({ queryKey: ['pyq-question-detail', subjectName, topicName, activeQuestion?.id] })
    }
  })

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: (variables: {
      questionText: string
      questionImages?: string[]
      options?: Array<{ id: string; text: string }>
      correctAnswer: string[]
      solutionText: string
      solutionImages?: string[]
    }) =>
      editPyqQuestion(
        subjectName,
        topicName,
        activeQuestion.id,
        variables
      ),
    onSuccess: () => {
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['pyq-topic', subjectName, topicName] })
      queryClient.invalidateQueries({ queryKey: ['pyq-question-detail', subjectName, topicName, activeQuestion?.id] })
    }
  })

  // Image Upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: (formData: FormData) => uploadPyqImage(formData),
  })

  useEffect(() => {
    setSelectedOptions([])
    setNatAnswer('')
    setReportSuccess(false)
    setIsReattempting(false)
    setIsEditing(false)
    if (activeIndex >= visibleCount) {
      setVisibleCount(activeIndex + 10)
    }
  }, [activeIndex, activeQuestion?.id, visibleCount])

  const hasProgressSubmitted =
    ((activeQuestion?.progress?.attempted || submitMutation.isSuccess) && !isReattempting)

  // Calculate correctness for displays
  const isSubmissionCorrect = useMemo(() => {
    if (!activeQuestion || !activeDetail) return false
    
    if (activeQuestion.questionType === 'MCQ' || activeQuestion.questionType === 'MSQ') {
      const correctOpts = activeDetail.question.correctAnswer || []
      if (selectedOptions.length === 0) return false
      // Sort and compare arrays
      const sortedSelected = [...selectedOptions].sort()
      const sortedCorrect = [...correctOpts].sort()
      return (
        sortedSelected.length === sortedCorrect.length &&
        sortedSelected.every((val, idx) => val === sortedCorrect[idx])
      )
    }

    if (activeQuestion.questionType === 'NAT') {
      const correctAns = activeDetail.question.correctAnswer || []
      // Check if user answer matches any of acceptable values or ranges
      const ansVal = parseFloat(natAnswer.trim())
      if (isNaN(ansVal)) return false
      
      return correctAns.some((c) => {
        if (c.includes('to')) {
          // Range check e.g. "24 to 26"
          const parts = c.split('to').map(parseFloat)
          return ansVal >= parts[0] && ansVal <= parts[1]
        }
        return parseFloat(c) === ansVal
      })
    }

    return false
  }, [activeQuestion, activeDetail, selectedOptions, natAnswer])

  const handleSubmit = useCallback(() => {
    if (!activeQuestion || !activeDetail || hasProgressSubmitted) return
    const isCorrect = isSubmissionCorrect
    
    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current)

    submitMutation.mutate({
      solved: isCorrect,
      incorrect: !isCorrect,
      timeTaken: timerSeconds
    })
  }, [activeQuestion, activeDetail, hasProgressSubmitted, isSubmissionCorrect, timerSeconds, submitMutation])

  const handleReattemptClick = useCallback(() => {
    setIsReattempting(true)
    setSelectedOptions([])
    setNatAnswer('')
    // Restart timer
    setTimerSeconds(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => prev + 1)
    }, 1000)
  }, [])

  const handleEditClick = useCallback(() => {
    if (!activeQuestion || !activeDetail) return
    setEditQuestionText(activeQuestion.question.text)
    setEditQuestionImages(activeQuestion.question.images || [])
    const optsMap: Record<string, string> = {}
    if (activeQuestion.options) {
      activeQuestion.options.forEach((opt) => {
        optsMap[opt.id] = opt.text
      })
    }
    setEditOptionTexts(optsMap)
    setEditCorrectAnswers(activeDetail.question.correctAnswer || [])
    setEditSolutionText(activeDetail.question.solution?.text || '')
    setEditSolutionImages(activeDetail.question.solution?.images || [])
    setIsEditing(true)
  }, [activeQuestion, activeDetail])

  const handleSaveEdit = useCallback(() => {
    if (!activeQuestion) return
    const optsList = activeQuestion.options
      ? activeQuestion.options.map((opt) => ({
          id: opt.id,
          text: editOptionTexts[opt.id] || '',
        }))
      : undefined

    editMutation.mutate({
      questionText: editQuestionText,
      questionImages: editQuestionImages,
      options: optsList,
      correctAnswer: editCorrectAnswers,
      solutionText: editSolutionText,
      solutionImages: editSolutionImages,
    })
  }, [activeQuestion, editQuestionText, editQuestionImages, editOptionTexts, editCorrectAnswers, editSolutionText, editSolutionImages, editMutation])

  const handleQuestionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folderName', topicName.toLowerCase().replace(/[^a-z0-9]/g, '_'))

    try {
      const res = await uploadImageMutation.mutateAsync(formData)
      setEditQuestionImages((prev) => [...prev, res.path])
    } catch (err) {
      console.error('Question image upload failed:', err)
    }
  }

  const handleSolutionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folderName', topicName.toLowerCase().replace(/[^a-z0-9]/g, '_'))

    try {
      const res = await uploadImageMutation.mutateAsync(formData)
      setEditSolutionImages((prev) => [...prev, res.path])
    } catch (err) {
      console.error('Solution image upload failed:', err)
    }
  }

  const handleOptionToggle = useCallback((optionId: string) => {
    if (hasProgressSubmitted) return
    
    if (activeQuestion?.questionType === 'MCQ') {
      setSelectedOptions([optionId])
    } else if (activeQuestion?.questionType === 'MSQ') {
      setSelectedOptions((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      )
    }
  }, [activeQuestion, hasProgressSubmitted])

  // Keyboard Shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts inside input fields
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      const key = e.key.toLowerCase()

      // Navigation
      if (e.key === 'ArrowRight') {
        if (activeIndex < filteredQuestions.length - 1) {
          setActiveIndex((prev) => prev + 1)
        }
      }
      if (e.key === 'ArrowLeft') {
        if (activeIndex > 0) {
          setActiveIndex((prev) => prev - 1)
        }
      }

      // Bookmark / Review
      if (key === 'b' && activeQuestion) {
        bookmarkMutation.mutate(activeQuestion.id)
      }
      if (key === 'r' && activeQuestion) {
        reviewMutation.mutate(activeQuestion.id)
      }

      // Selection A/B/C/D mapping to 1/2/3/4 keys
      if (activeQuestion && (activeQuestion.questionType === 'MCQ' || activeQuestion.questionType === 'MSQ')) {
        const optionIdMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' }
        const mappedId = optionIdMap[key]
        if (mappedId && activeQuestion.options.some(o => o.id === mappedId)) {
          handleOptionToggle(mappedId)
        }
      }

      // Submit
      if (e.key === 'Enter' && activeQuestion && !hasProgressSubmitted) {
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    activeIndex,
    filteredQuestions,
    activeQuestion,
    selectedOptions,
    natAnswer,
    hasProgressSubmitted,
    activeDetail,
    timerSeconds,
    bookmarkMutation,
    reviewMutation,
    handleOptionToggle,
    handleSubmit
  ])

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold font-mono">
        <Link href="/pyqs" className="hover:text-primary transition-colors">PYQ Practice</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/pyqs/${encodeURIComponent(subjectName)}`} className="hover:text-primary transition-colors">{subjectName}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{topicName}</span>
      </div>

      {/* Main Workspace Layout (LeetCode style splits) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Question Panel */}
        <div className="lg:col-span-2 space-y-6">
          {activeQuestion ? (
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs flex flex-col justify-between min-h-[550px]">
              {/* Question Banner Header */}
              <div className="bg-secondary/40 px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Question {activeIndex + 1} of {filteredQuestions.length}
                    </span>
                    <span className="text-4xs font-bold font-mono px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary">
                      {activeQuestion.questionType}
                    </span>
                    <span className="text-4xs font-bold font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      GATE {activeQuestion.year}
                    </span>
                    <span className="text-4xs font-bold font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {activeQuestion.marks} Marks
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <span>ID: {activeQuestion.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => bookmarkMutation.mutate(activeQuestion.id)}
                    className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-amber-500 hover:bg-secondary transition-all cursor-pointer"
                    title="Bookmark Question"
                  >
                    {activeQuestion.progress?.bookmarked ? (
                      <BookmarkCheck className="h-4 w-4 text-amber-500 fill-current" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => reviewMutation.mutate(activeQuestion.id)}
                    className={`px-3 py-1.5 rounded-lg border text-3xs font-semibold font-mono cursor-pointer transition-all ${
                      activeQuestion.progress?.markedForReview
                        ? 'bg-blue-500/10 border-blue-500 text-blue-500 font-bold'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Review
                  </button>
                  {isEditing ? (
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground text-3xs font-semibold font-mono cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={handleEditClick}
                      className="px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-primary hover:bg-secondary text-3xs font-semibold font-mono cursor-pointer transition-all flex items-center gap-1"
                      title="Edit Question details"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Question Body */}
              {isEditing ? (
                <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[500px]">
                  <MarkdownLatexEditor
                    id="edit_question"
                    value={editQuestionText}
                    onChange={setEditQuestionText}
                    label="Question Text (Supports LaTeX & Markdown)"
                    minHeight="120px"
                  />

                  {/* Question Images List & Uploader */}
                  <div className="space-y-2 border-t border-border/40 pt-4">
                    <label className="block text-2xs font-extrabold uppercase text-muted-foreground font-mono tracking-wider">
                      Question Images
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {editQuestionImages.map((imgPath, idx) => (
                        <div key={idx} className="relative group border border-border/60 rounded-xl overflow-hidden aspect-video bg-secondary/15 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/${imgPath}`} alt="Question image" className="object-contain max-h-full max-w-full" />
                          <button
                            type="button"
                            onClick={() => setEditQuestionImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-red-500 hover:bg-red-600 text-white cursor-pointer transition-colors shadow shadow-red-500/20"
                            title="Delete Image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <label className="border border-dashed border-border/70 hover:border-primary/50 hover:bg-primary/5 rounded-xl aspect-video flex flex-col items-center justify-center gap-1 cursor-pointer transition-all text-muted-foreground hover:text-foreground">
                        {uploadImageMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <>
                            <ImageIcon className="h-5 w-5" />
                            <span className="text-4xs font-bold font-mono uppercase tracking-wider">Add Image</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleQuestionImageUpload}
                          disabled={uploadImageMutation.isPending}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Options Input fields (MCQ/MSQ) */}
                  {(activeQuestion.questionType === 'MCQ' || activeQuestion.questionType === 'MSQ') && (
                    <div className="space-y-4 border-t border-border/40 pt-4">
                      <label className="block text-2xs font-extrabold uppercase text-muted-foreground font-mono tracking-wider">
                        Options Text & Correct Selection
                      </label>
                      {['A', 'B', 'C', 'D'].map((optId) => {
                        const isCorrect = editCorrectAnswers.includes(optId)
                        return (
                          <div key={optId} className="flex items-center gap-3 bg-secondary/20 border border-border/50 rounded-xl p-3.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (activeQuestion.questionType === 'MCQ') {
                                  setEditCorrectAnswers([optId])
                                } else {
                                  setEditCorrectAnswers((prev) =>
                                    prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
                                  )
                                }
                              }}
                              className={`h-6.5 w-6.5 rounded-lg flex items-center justify-center font-mono font-bold text-xs cursor-pointer border transition-all ${
                                isCorrect
                                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs shadow-emerald-500/20'
                                  : 'bg-card text-muted-foreground border-border hover:bg-secondary'
                              }`}
                            >
                              {optId}
                            </button>
                            <input
                              type="text"
                              value={editOptionTexts[optId] || ''}
                              onChange={(e) => {
                                const val = e.target.value
                                setEditOptionTexts((prev) => ({ ...prev, [optId]: val }))
                              }}
                              className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                              placeholder={`Option ${optId} text...`}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Correct Answer Input field (NAT) */}
                  {activeQuestion.questionType === 'NAT' && (
                    <div className="space-y-2 border-t border-border/40 pt-4">
                      <label className="block text-2xs font-extrabold uppercase text-muted-foreground font-mono tracking-wider">
                        Correct Answer Range or Value
                      </label>
                      <input
                        type="text"
                        value={editCorrectAnswers[0] || ''}
                        onChange={(e) => setEditCorrectAnswers([e.target.value])}
                        className="w-full bg-secondary/50 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                        placeholder="e.g. 25 or 24 to 26"
                      />
                    </div>
                  )}

                  <MarkdownLatexEditor
                    id="edit_solution"
                    value={editSolutionText}
                    onChange={setEditSolutionText}
                    label="Step-by-step Solution Text"
                    minHeight="120px"
                  />

                  {/* Solution Images List & Uploader */}
                  <div className="space-y-2 border-t border-border/40 pt-4">
                    <label className="block text-2xs font-extrabold uppercase text-muted-foreground font-mono tracking-wider">
                      Solution Images
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {editSolutionImages.map((imgPath, idx) => (
                        <div key={idx} className="relative group border border-border/60 rounded-xl overflow-hidden aspect-video bg-secondary/15 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/${imgPath}`} alt="Solution image" className="object-contain max-h-full max-w-full" />
                          <button
                            type="button"
                            onClick={() => setEditSolutionImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-red-500 hover:bg-red-600 text-white cursor-pointer transition-colors shadow shadow-red-500/20"
                            title="Delete Image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <label className="border border-dashed border-border/70 hover:border-primary/50 hover:bg-primary/5 rounded-xl aspect-video flex flex-col items-center justify-center gap-1 cursor-pointer transition-all text-muted-foreground hover:text-foreground">
                        {uploadImageMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <>
                            <ImageIcon className="h-5 w-5" />
                            <span className="text-4xs font-bold font-mono uppercase tracking-wider">Add Image</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleSolutionImageUpload}
                          disabled={uploadImageMutation.isPending}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold px-4.5 py-2 cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={editMutation.isPending}
                      className="rounded-lg bg-primary text-primary-foreground text-xs font-bold px-5 py-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {editMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-6 space-y-6 flex-1">
                    {/* Timer ticker */}
                    <div className="flex items-center gap-1.5 text-3xs font-mono font-bold text-muted-foreground justify-end">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        Timer: {Math.floor(timerSeconds / 60)}m {(timerSeconds % 60).toString().padStart(2, '0')}s
                      </span>
                    </div>

                    <ContentRenderer
                      id={activeQuestion.id}
                      text={activeQuestion.question.text}
                      images={activeQuestion.question.images}
                      tables={activeQuestion.question.tables}
                    />

                    {/* Option selection */}
                    {(activeQuestion.questionType === 'MCQ' || activeQuestion.questionType === 'MSQ') && (
                      <div className="space-y-3 mt-6">
                        {activeQuestion.options.map((opt) => {
                          const isSelected = selectedOptions.includes(opt.id)
                          const isCorrectAnswer = activeDetail?.question.correctAnswer.includes(opt.id)

                          let optionBorder = 'border-border bg-card hover:bg-secondary/10'
                          if (isSelected) optionBorder = 'border-primary bg-primary/5 ring-1 ring-primary'
                          
                          // Solution overlays
                          if (hasProgressSubmitted && activeDetail) {
                            if (isCorrectAnswer) optionBorder = 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500'
                            else if (isSelected) optionBorder = 'border-red-500 bg-red-500/5 ring-1 ring-red-500'
                          }

                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleOptionToggle(opt.id)}
                              disabled={hasProgressSubmitted}
                              className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 ${optionBorder} ${
                                !hasProgressSubmitted ? 'cursor-pointer active:scale-99' : 'cursor-default'
                              }`}
                            >
                              <div className={`mt-0.5 h-5.5 w-5.5 rounded flex items-center justify-center border font-mono font-black text-xs ${
                                isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border'
                              }`}>
                                {opt.id}
                              </div>
                              <div className="flex-1">
                                <ContentRenderer id={`${activeQuestion.id}_${opt.id}`} text={opt.text} images={opt.images} tables={opt.tables} />
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* NAT Input box */}
                    {activeQuestion.questionType === 'NAT' && (
                      <div className="space-y-2 mt-6 max-w-xs">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest font-mono">
                          Your Numerical Answer
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 25 or 3.14"
                          value={natAnswer}
                          onChange={(e) => setNatAnswer(e.target.value)}
                          disabled={hasProgressSubmitted}
                          className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary font-mono font-bold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Solution display panel */}
                  {hasProgressSubmitted && activeDetail && (
                    <div className="border-t border-border bg-secondary/15 p-6 space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center gap-3 border-b border-border/40 pb-3">
                        {activeQuestion.progress?.solved || isSubmissionCorrect ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-3xs font-extrabold uppercase tracking-widest font-mono">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Correct Answer</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-500 text-3xs font-extrabold uppercase tracking-widest font-mono">
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Incorrect Answer</span>
                          </div>
                        )}
                        <span className="text-3xs font-mono font-bold text-muted-foreground">
                          Time Taken: {activeQuestion.progress?.timeTaken || timerSeconds} seconds
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="text-3xs text-muted-foreground font-mono font-semibold uppercase">Correct Value</p>
                        <div className="font-bold text-base text-foreground font-mono flex items-center gap-1">
                          {activeDetail.question.correctAnswer.join(', ')}
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        <p className="text-3xs text-muted-foreground font-mono font-semibold uppercase">Step-by-step Solution</p>
                        <div className="bg-card border border-border/50 rounded-xl p-5 shadow-2xs">
                          <ContentRenderer
                            id={`${activeQuestion.id}_solution`}
                            text={activeDetail.question.solution.text}
                            images={activeDetail.question.solution.images}
                            tables={activeDetail.question.solution.tables}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Bottom Control Bar */}
              <div className="bg-secondary/25 px-5 py-4 border-t border-border flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedOptions([])
                      setNatAnswer('')
                    }}
                    disabled={hasProgressSubmitted}
                    className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-30"
                    title="Reset choice"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setReportSuccess(true)
                      setTimeout(() => setReportSuccess(false), 3000)
                    }}
                    className="flex items-center gap-1 text-3xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Flag className="h-3 w-3" />
                    <span>Report Issue</span>
                  </button>
                  {reportSuccess && (
                    <span className="text-4xs font-mono font-bold text-emerald-500 animate-pulse">
                      Issue reported.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                    disabled={activeIndex === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary font-semibold px-4.5 py-2 text-xs shadow-2xs cursor-pointer transition-colors disabled:opacity-40"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Prev</span>
                  </button>

                  {!hasProgressSubmitted ? (
                    <button
                      onClick={handleSubmit}
                      disabled={
                        isLoadingDetail ||
                        submitMutation.isPending ||
                        (activeQuestion.questionType !== 'NAT' && selectedOptions.length === 0) ||
                        (activeQuestion.questionType === 'NAT' && !natAnswer.trim())
                      }
                      className="rounded-lg bg-foreground text-background font-bold px-6 py-2 hover:opacity-90 active:scale-95 transition-all text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {submitMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>Submit Answer</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleReattemptClick}
                        className="rounded-lg border border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10 text-primary font-bold px-4 py-2 text-xs shadow-2xs cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reattempt</span>
                      </button>
                      <div className="flex items-center gap-1 text-3xs font-mono font-bold text-emerald-500">
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Submitted</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setActiveIndex((prev) => Math.min(filteredQuestions.length - 1, prev + 1))}
                    disabled={activeIndex === filteredQuestions.length - 1}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary font-semibold px-4.5 py-2 text-xs shadow-2xs cursor-pointer transition-colors disabled:opacity-40"
                  >
                    <span>Next</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-card">
              <HelpCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <h3 className="text-sm font-bold text-foreground">No questions matching filters</h3>
              <p className="text-xs text-muted-foreground mt-1">Try relaxing some sidebar search tags.</p>
            </div>
          )}
        </div>

        {/* Right Side: Filters, Stats, Questions Directory List */}
        <div className="space-y-6">
          {/* Topic Stats Rollup */}
          <div className="rounded-2xl border border-border bg-card p-5.5 space-y-4 shadow-2xs">
            <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground font-mono">
              Topic Analytics
            </h3>
            
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-secondary/15 border border-border/40 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-4xs text-muted-foreground font-semibold font-mono uppercase">Solved</span>
                <span className="text-base font-black text-foreground mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {topicData?.solved} / {topicData?.questionCount}
                </span>
              </div>
              <div className="bg-secondary/15 border border-border/40 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-4xs text-muted-foreground font-semibold font-mono uppercase">Incorrect</span>
                <span className="text-base font-black text-foreground mt-1 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                  {topicData?.incorrect}
                </span>
              </div>
              <div className="bg-secondary/15 border border-border/40 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-4xs text-muted-foreground font-semibold font-mono uppercase">Accuracy</span>
                <span className="text-base font-black text-primary mt-1">
                  {topicData?.accuracy}%
                </span>
              </div>
              <div className="bg-secondary/15 border border-border/40 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-4xs text-muted-foreground font-semibold font-mono uppercase">Avg Time</span>
                <span className="text-base font-black text-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {topicData?.averageTime}s
                </span>
              </div>
            </div>
          </div>

          {/* Directory Search & Filters Panel */}
          <div className="rounded-2xl border border-border bg-card p-5.5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground font-mono">
                Filter Directory
              </h3>
              <span className="text-4xs text-muted-foreground font-mono">Matches: {filteredQuestions.length}</span>
            </div>

            <div className="space-y-3.5">
              {/* Text Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ID, text, tag, year..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setActiveIndex(0)
                  }}
                  className="w-full bg-secondary border border-border rounded-lg pl-8.5 pr-3 py-1.5 text-3xs text-foreground focus:outline-none focus:border-primary placeholder-muted-foreground/45 transition-colors font-mono"
                />
              </div>

              {/* Status Tabs */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-muted-foreground font-mono uppercase">Status</label>
                <div className="flex flex-wrap gap-1">
                  {(['All', 'Solved', 'Unsolved', 'Incorrect', 'Bookmarked', 'Review'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setActiveFilter(f)
                        setActiveIndex(0)
                      }}
                      className={`px-2 py-1 rounded text-4xs font-extrabold uppercase font-mono border transition-all cursor-pointer ${
                        activeFilter === f
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-card border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-muted-foreground font-mono uppercase">Type</label>
                <div className="flex flex-wrap gap-1">
                  {(['All', 'MCQ', 'MSQ', 'NAT'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTypeFilter(t)
                        setActiveIndex(0)
                      }}
                      className={`px-2 py-1 rounded text-4xs font-extrabold uppercase font-mono border transition-all cursor-pointer ${
                        typeFilter === t
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-card border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year Filter */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-muted-foreground font-mono uppercase">Exam Year</label>
                <select
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value)
                    setActiveIndex(0)
                  }}
                  className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-3xs text-foreground focus:outline-none focus:border-primary font-mono"
                >
                  <option value="All">All Years</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Directory Questions List */}
          <div className="rounded-2xl border border-border bg-card p-5.5 space-y-3 shadow-2xs">
            <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground font-mono border-b border-border/50 pb-2">
              Question Navigator
            </h3>
            
            <div className="max-h-[350px] overflow-y-auto pr-1 space-y-2 divide-y divide-border/20">
              {filteredQuestions.length === 0 ? (
                <p className="text-4xs text-muted-foreground text-center py-4 italic font-medium">
                  No matching questions.
                </p>
              ) : (
                <>
                  {filteredQuestions.slice(0, visibleCount).map((q, idx) => {
                    const isActive = idx === activeIndex
                    const isSolved = q.progress?.solved
                    const isIncorrect = q.progress?.incorrect
                    
                    let badgeColor = 'bg-secondary text-muted-foreground border-border/40'
                    if (isSolved) badgeColor = 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
                    else if (isIncorrect) badgeColor = 'bg-red-500/10 border-red-500/25 text-red-500'

                    return (
                      <button
                        key={q.id}
                        onClick={() => setActiveIndex(idx)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer pt-3 ${
                          isActive
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                            : 'border-transparent hover:bg-secondary/15'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-3xs font-bold text-foreground">Q{idx + 1}</span>
                            <span className="text-4xs font-bold text-muted-foreground font-mono">
                              {q.id.split('_').slice(-2).join('_')}
                            </span>
                          </div>
                          <div className="flex-1 flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] text-muted-foreground font-mono uppercase font-semibold">
                              GATE {q.year} • {q.marks}M
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {q.progress?.bookmarked && (
                            <Bookmark className="h-3 w-3 text-amber-500 fill-current" />
                          )}
                          {q.progress?.markedForReview && (
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          )}
                          <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border ${badgeColor}`}>
                            {isSolved ? 'Solved' : isIncorrect ? 'Fail' : 'New'}
                          </span>
                        </div>
                      </button>
                    )
                  })}

                  {filteredQuestions.length > visibleCount && (
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 20)}
                      className="w-full py-2.5 text-3xs font-bold font-mono uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl transition-all cursor-pointer mt-2 text-center"
                    >
                      Load More Questions (+20)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
