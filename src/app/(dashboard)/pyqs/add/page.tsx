'use client'

import React, { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getPyqSubjects, getPyqSubjectDetail, addPyqQuestion } from '@/actions/pyq'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  Eye
} from 'lucide-react'
import ContentRenderer from '@/components/pyq/ContentRenderer'
import MarkdownLatexEditor from '@/components/pyq/MarkdownLatexEditor'

export default function AddPyqQuestionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [showPreview, setShowPreview] = useState(false)

  // Pre-fill parameters if redirected from practice panel
  const initialSubject = searchParams.get('subject') || ''
  const initialTopic = searchParams.get('topic') || ''

  // Form State
  const [selectedSubject, setSelectedSubject] = useState(initialSubject)
  const [selectedTopic, setSelectedTopic] = useState(initialTopic)
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [marks, setMarks] = useState('1')
  const [questionType, setQuestionType] = useState<'MCQ' | 'MSQ' | 'NAT'>('MCQ')
  const [difficulty, setDifficulty] = useState('Medium')
  const [tags, setTags] = useState('')

  const [questionText, setQuestionText] = useState('')
  const [questionImage, setQuestionImage] = useState<File | null>(null)
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null)

  const [solutionText, setSolutionText] = useState('')
  const [solutionImage, setSolutionImage] = useState<File | null>(null)
  const [solutionImagePreview, setSolutionImagePreview] = useState<string | null>(null)

  // Options State
  const [optionTexts, setOptionTexts] = useState<Record<string, string>>({
    A: '', B: '', C: '', D: ''
  })
  const [optionImages, setOptionImages] = useState<Record<string, File | null>>({
    A: null, B: null, C: null, D: null
  })
  const [optionPreviews, setOptionPreviews] = useState<Record<string, string | null>>({
    A: null, B: null, C: null, D: null
  })

  // Correct Answer State
  const [correctAnswerMCQ, setCorrectAnswerMCQ] = useState('A')
  const [correctAnswerMSQ, setCorrectAnswerMSQ] = useState<Record<string, boolean>>({
    A: false, B: false, C: false, D: false
  })
  const [correctAnswerNAT, setCorrectAnswerNAT] = useState('')

  interface TopicDetail {
    name: string
    questionCount: number
    solved: number
    incorrect: number
    bookmarked: number
    markedForReview: number
    remaining: number
    accuracy: number
    lastAttempt: string | null
  }

  interface SubjectDetail {
    subject: string
    totalTopics: number
    totalQuestions: number
    solvedCount: number
    incorrectCount: number
    remainingCount: number
    accuracy: number
    progressPercent: number
    topics: TopicDetail[]
  }

  // Query Subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['pyq-subjects'],
    queryFn: () => getPyqSubjects(),
  })

  // Query Topics for active Subject
  const { data: subjectDetail = null } = useQuery<SubjectDetail | null>({
    queryKey: ['pyq-subject', selectedSubject],
    queryFn: () => getPyqSubjectDetail(selectedSubject) as unknown as SubjectDetail,
    enabled: !!selectedSubject,
  })

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)

  // Handle Image Previews
  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'question' | 'solution' | string
  ) => {
    const file = e.target.files?.[0] || null
    if (!file) return

    const previewUrl = URL.createObjectURL(file)

    if (type === 'question') {
      setQuestionImage(file)
      setQuestionImagePreview(previewUrl)
    } else if (type === 'solution') {
      setSolutionImage(file)
      setSolutionImagePreview(previewUrl)
    } else {
      // Option Image
      setOptionImages(prev => ({ ...prev, [type]: file }))
      setOptionPreviews(prev => ({ ...prev, [type]: previewUrl }))
    }
  }

  // Handle Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!selectedSubject) {
      setErrorMsg('Please select a subject.')
      return
    }
    if (!selectedTopic) {
      setErrorMsg('Please select a topic.')
      return
    }
    if (!questionText && !questionImage) {
      setErrorMsg('Question must have either text or an uploaded figure.')
      return
    }

    const formData = new FormData()
    formData.append('subject', selectedSubject)
    formData.append('topic', selectedTopic)
    formData.append('year', year)
    formData.append('marks', marks)
    formData.append('questionType', questionType)
    formData.append('difficulty', difficulty)
    formData.append('tags', tags)
    formData.append('questionText', questionText)

    if (questionImage) {
      formData.append('questionImage', questionImage)
    }

    formData.append('solutionText', solutionText)
    if (solutionImage) {
      formData.append('solutionImage', solutionImage)
    }

    if (questionType === 'MCQ' || questionType === 'MSQ') {
      const optIds = ['A', 'B', 'C', 'D']
      optIds.forEach(id => {
        formData.append(`optionText_${id}`, optionTexts[id])
        const file = optionImages[id]
        if (file) {
          formData.append(`optionImage_${id}`, file)
        }
      })

      if (questionType === 'MCQ') {
        formData.append('correctAnswerMCQ', correctAnswerMCQ)
      } else {
        const correctMsqStr = Object.keys(correctAnswerMSQ)
          .filter(k => correctAnswerMSQ[k])
          .join(',')
        if (!correctMsqStr) {
          setErrorMsg('Please select at least one correct option for MSQ.')
          return
        }
        formData.append('correctAnswerMSQ', correctMsqStr)
      }
    } else if (questionType === 'NAT') {
      if (!correctAnswerNAT.trim()) {
        setErrorMsg('Please fill the correct value or range for NAT.')
        return
      }
      formData.append('correctAnswerNAT', correctAnswerNAT)
    }

    startTransition(async () => {
      try {
        const res = await addPyqQuestion(formData)
        if (res.success) {
          setSuccessId(res.questionId)
          setTimeout(() => {
            router.push(`/pyqs/${encodeURIComponent(selectedSubject)}/${encodeURIComponent(selectedTopic)}`)
          }, 2000)
        }
      } catch (err: unknown) {
        const errorObj = err as Error
        setErrorMsg(errorObj.message || 'Failed to add question.')
      }
    })
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header breadcrumb */}
      <div>
        <Link
          href="/pyqs"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to PYQ Dashboard</span>
        </Link>
      </div>

      <div className="relative rounded-2xl border border-border bg-card p-6 md:p-8 overflow-hidden shadow-xs">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-3xs font-extrabold uppercase tracking-widest font-mono">
            <Sparkles className="h-3 w-3" />
            <span>Developer Mode</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Add Custom GATE Question
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl">
            Insert a new question directly into your local database files. You can type equations in standard text or upload screenshots/images for questions, options, and solutions.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Error / Success banners */}
        {errorMsg && (
          <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-xs font-bold text-destructive flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successId && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-500 flex items-center gap-2">
            <Check className="h-4.5 w-4.5" />
            <span>Question added successfully! ID: {successId}. Redirecting to practice workspace...</span>
          </div>
        )}

        {/* Metadata section */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground font-mono">
            1. Target Context & Info
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subject */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value)
                  setSelectedTopic('')
                }}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-semibold"
              >
                <option value="">-- Select Subject --</option>
                {subjects.map((sub) => (
                  <option key={sub.name} value={sub.name}>{sub.name}</option>
                ))}
              </select>
            </div>

            {/* Topic */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground">Topic</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                disabled={!selectedSubject}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-semibold disabled:opacity-40"
              >
                <option value="">-- Select Topic --</option>
                {subjectDetail?.topics.map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Question Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground">Question Type</label>
              <div className="flex gap-2">
                {(['MCQ', 'MSQ', 'NAT'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQuestionType(t)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      questionType === t
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Exam Year & Marks */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">GATE Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-semibold font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">Marks</label>
                <select
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-semibold font-mono"
                >
                  <option value="1">1 Mark</option>
                  <option value="2">2 Marks</option>
                </select>
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-semibold"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground">Tags (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. Recurrence, Probability"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Question content */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground font-mono">
            2. Question Content
          </h3>

          <div className="space-y-4">
            {/* Markdown Editor */}
            <MarkdownLatexEditor
              id="uploader_question"
              value={questionText}
              onChange={setQuestionText}
              placeholder="Type question content. You can write LaTeX like $x^2$ or equations."
              label="Question Text"
              minHeight="140px"
            />

            {/* File Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground">Question Image (Optional)</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 border border-dashed border-border hover:border-primary/50 bg-secondary/20 hover:bg-secondary/40 transition-colors p-4.5 rounded-xl cursor-pointer flex flex-col items-center gap-1.5">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-3xs font-extrabold uppercase font-mono tracking-wider text-muted-foreground">
                    Upload image file
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'question')}
                    className="hidden"
                  />
                </label>
                
                {questionImagePreview && (
                  <div className="h-16 w-16 border border-border rounded-xl overflow-hidden bg-secondary relative flex items-center justify-center">
                    <img src={questionImagePreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Options Content */}
        {(questionType === 'MCQ' || questionType === 'MSQ') && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground font-mono">
              3. Option Items
            </h3>

            <div className="space-y-5">
              {['A', 'B', 'C', 'D'].map((optId) => (
                <div key={optId} className="border-b border-border/40 pb-4 last:border-0 last:pb-0 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded bg-primary/10 border border-primary/20 text-primary font-black text-xs flex items-center justify-center font-mono">
                      {optId}
                    </span>
                    <input
                      type="text"
                      placeholder={`Enter text for Option ${optId}`}
                      value={optionTexts[optId]}
                      onChange={(e) => setOptionTexts(prev => ({ ...prev, [optId]: e.target.value }))}
                      className="flex-1 bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-semibold"
                    />
                  </div>

                  {/* Image for option */}
                  <div className="pl-9 flex items-center gap-4">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary/15 hover:bg-secondary/40 text-3xs font-extrabold uppercase font-mono tracking-wider text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>Add Option Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, optId)}
                        className="hidden"
                      />
                    </label>

                    {optionPreviews[optId] && (
                      <div className="h-10 w-10 border border-border rounded-lg overflow-hidden bg-secondary flex items-center justify-center">
                        <img src={optionPreviews[optId]!} alt="Option preview" className="max-h-full max-w-full object-contain" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Correct Answers */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground font-mono">
            {questionType === 'NAT' ? '3. Correct Value' : '4. Correct Answer'}
          </h3>

          <div>
            {/* MCQ Answer */}
            {questionType === 'MCQ' && (
              <div className="space-y-1.5 max-w-xs">
                <label className="block text-xs font-bold text-foreground">Select Correct Option</label>
                <select
                  value={correctAnswerMCQ}
                  onChange={(e) => setCorrectAnswerMCQ(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-bold font-mono"
                >
                  {['A', 'B', 'C', 'D'].map(id => (
                    <option key={id} value={id}>Option {id}</option>
                  ))}
                </select>
              </div>
            )}

            {/* MSQ Answer */}
            {questionType === 'MSQ' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">Select All Correct Options</label>
                <div className="flex gap-3">
                  {['A', 'B', 'C', 'D'].map(id => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCorrectAnswerMSQ(prev => ({ ...prev, [id]: !prev[id] }))}
                      className={`h-10 w-16 rounded-lg border font-black text-xs flex items-center justify-center font-mono cursor-pointer transition-all ${
                        correctAnswerMSQ[id]
                          ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                          : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* NAT Answer */}
            {questionType === 'NAT' && (
              <div className="space-y-1.5 max-w-sm">
                <label className="block text-xs font-bold text-foreground">Correct Numeric Value / Range</label>
                <input
                  type="text"
                  placeholder="e.g. 24 or 24 to 26"
                  value={correctAnswerNAT}
                  onChange={(e) => setCorrectAnswerNAT(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono font-bold"
                />
              </div>
            )}
          </div>
        </div>

        {/* Solution section */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground font-mono">
            {questionType === 'NAT' ? '4. Explanation & Solution' : '5. Explanation & Solution'}
          </h3>

          <div className="space-y-4">
            {/* Markdown Editor */}
            <MarkdownLatexEditor
              id="uploader_solution"
              value={solutionText}
              onChange={setSolutionText}
              placeholder="Explain the solution steps and proof for the correct answer."
              label="Step-by-step Explanation"
              minHeight="140px"
            />

            {/* Solution figure upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground">Solution Image (Optional)</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 border border-dashed border-border hover:border-primary/50 bg-secondary/20 hover:bg-secondary/40 transition-colors p-4.5 rounded-xl cursor-pointer flex flex-col items-center gap-1.5">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-3xs font-extrabold uppercase font-mono tracking-wider text-muted-foreground">
                    Upload solution figure
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'solution')}
                    className="hidden"
                  />
                </label>
                
                {solutionImagePreview && (
                  <div className="h-16 w-16 border border-border rounded-xl overflow-hidden bg-secondary relative flex items-center justify-center">
                    <img src={solutionImagePreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Toggle & Section */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 text-foreground font-extrabold text-xs px-5 py-2.5 transition-all cursor-pointer"
          >
            <Eye className="h-4 w-4" />
            <span>{showPreview ? 'Hide Live Preview' : 'Show Live Preview'}</span>
          </button>
        </div>

        {showPreview && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
            
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-primary font-mono flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Live Rendering Preview</span>
              </h3>
              <div className="flex items-center gap-2 text-3xs font-mono text-muted-foreground uppercase font-bold">
                <span>{selectedSubject || 'No Subject'}</span>
                <span>•</span>
                <span>{selectedTopic || 'No Topic'}</span>
              </div>
            </div>

            {/* Question Box */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap text-3xs font-bold font-mono">
                <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary uppercase">
                  {questionType}
                </span>
                <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground uppercase">
                  GATE {year}
                </span>
                <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                  {marks} Marks
                </span>
              </div>

              <div className="bg-secondary/10 border border-border/30 rounded-xl p-4.5">
                <ContentRenderer
                  text={questionText || '*No question text typed yet.*'}
                  images={questionImagePreview ? [questionImagePreview] : []}
                />
              </div>
            </div>

            {/* Options Box */}
            {(questionType === 'MCQ' || questionType === 'MSQ') && (
              <div className="space-y-3 mt-4">
                {['A', 'B', 'C', 'D'].map((optId) => {
                  const isCorrect = questionType === 'MCQ'
                    ? correctAnswerMCQ === optId
                    : correctAnswerMSQ[optId]

                  let optBorder = 'border-border bg-card'
                  if (isCorrect) optBorder = 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500'

                  return (
                    <div
                      key={optId}
                      className={`w-full p-4 rounded-xl border flex items-start gap-3.5 transition-all ${optBorder}`}
                    >
                      <div className={`mt-0.5 h-5.5 w-5.5 rounded flex items-center justify-center border font-mono font-black text-xs ${
                        isCorrect
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-secondary text-muted-foreground border-border'
                      }`}>
                        {optId}
                      </div>
                      <div className="flex-1">
                        <ContentRenderer
                          text={optionTexts[optId] || '*Empty option text*'}
                          images={optionPreviews[optId] ? [optionPreviews[optId]!] : []}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Correct Value for NAT */}
            {questionType === 'NAT' && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4.5">
                <p className="text-3xs text-muted-foreground font-mono font-semibold uppercase">Correct Answer Value</p>
                <div className="font-mono font-black text-emerald-500 text-sm mt-1">
                  {correctAnswerNAT || '*No answer value specified*'}
                </div>
              </div>
            )}

            {/* Solution Box */}
            <div className="space-y-3 pt-3 border-t border-border/40">
              <h4 className="text-3xs text-muted-foreground font-mono font-semibold uppercase">Step-by-step Solution</h4>
              <div className="bg-secondary/15 border border-border/30 rounded-xl p-4.5">
                <ContentRenderer
                  text={solutionText || '*No solution explanation provided yet.*'}
                  images={solutionImagePreview ? [solutionImagePreview] : []}
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Link
            href="/pyqs"
            className="rounded-lg border border-border bg-card text-foreground hover:bg-secondary font-bold px-6 py-2.5 text-xs cursor-pointer transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-foreground text-background font-black px-8 py-2.5 text-xs cursor-pointer hover:opacity-90 active:scale-97 transition-all flex items-center gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Add Question</span>
          </button>
        </div>
      </form>
    </div>
  )
}
