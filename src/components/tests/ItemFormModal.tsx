'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, Field, toast, errMsg } from './ui'
import { SERIES_LABEL, TIER_LABEL } from './constants'
import { TEST_KINDS, TEST_SERIES, TEST_TIERS, type TestItemWithStats, type TestKind } from '@/types/tests'
import { useCreateItem, useUpdateItem } from '@/hooks/useTests'
import './tests.css'

const formSchema = z.object({
  kind: z.enum(TEST_KINDS),
  category: z.string().trim().min(1, 'Category is required').max(120),
  series: z.enum(TEST_SERIES),
  title: z.string().trim().min(1, 'Title is required').max(300),
  topics: z.string().trim().max(2000),
  tier: z.enum(['none', ...TEST_TIERS]),
  is_available: z.boolean(),
  url: z.union([z.literal(''), z.url('Enter a full URL, e.g. https://…')]),
  notes: z.string().trim().max(2000),
})
type FormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onClose: () => void
  item?: TestItemWithStats | null
  defaultKind: TestKind
  defaultCategory?: string
  categories: string[]
}

function defaults(item: TestItemWithStats | null | undefined, kind: TestKind, category?: string): FormValues {
  return {
    kind: item?.kind ?? kind,
    category: item?.category ?? category ?? '',
    series: item?.series ?? (kind === 'quiz' ? 'weekly' : 'topic'),
    title: item?.title ?? '',
    topics: item?.topics ?? '',
    tier: item?.tier ?? 'none',
    is_available: item?.is_available ?? true,
    url: item?.url ?? '',
    notes: item?.notes ?? '',
  }
}

/** Add / edit modal (react-hook-form + zod). Category input autocompletes existing categories but accepts new ones. */
export function ItemFormModal({ open, onClose, item, defaultKind, defaultCategory, categories }: Props) {
  const create = useCreateItem()
  const update = useUpdateItem()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults(item, defaultKind, defaultCategory) })

  useEffect(() => {
    if (open) reset(defaults(item, defaultKind, defaultCategory))
  }, [open, item, defaultKind, defaultCategory, reset])

  const onSubmit = async (v: FormValues) => {
    const payload = {
      kind: v.kind,
      category: v.category,
      series: v.series,
      title: v.title,
      topics: v.topics || null,
      tier: v.tier === 'none' ? null : v.tier,
      is_available: v.is_available,
      url: v.url || null,
      notes: v.notes || null,
    }
    try {
      if (item) {
        await update.mutateAsync({ id: item.id, ...payload })
        toast.success('Saved changes')
      } else {
        await create.mutateAsync(payload)
        toast.success(`Added “${v.title}”`)
      }
      onClose()
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? 'Edit test / quiz' : 'Add test / quiz'}
      description={item ? undefined : 'It will be added to the end of its category.'}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" form="item-form" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving…' : item ? 'Save changes' : 'Add'}
          </button>
        </>
      }
    >
      <form id="item-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Title" error={errors.title?.message}>
          <input {...register('title')} className="field-input" placeholder="e.g. Discrete Mathematics — Topic Test 6" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select {...register('kind')} className="field-input">
              {TEST_KINDS.map((k) => <option key={k} value={k}>{k === 'test' ? 'Test' : 'Quiz'}</option>)}
            </select>
          </Field>
          <Field label="Series">
            <select {...register('series')} className="field-input">
              {TEST_SERIES.map((s) => <option key={s} value={s}>{SERIES_LABEL[s]}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Category / subject" error={errors.category?.message} hint="Pick an existing one or type a new category.">
          <input {...register('category')} list="tq-categories" className="field-input" placeholder="e.g. Algorithms" />
          <datalist id="tq-categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Topics covered">
          <input {...register('topics')} className="field-input" placeholder="e.g. Greedy, Dynamic Programming" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tier">
            <select {...register('tier')} className="field-input">
              <option value="none">—</option>
              {TEST_TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field label="Availability">
            <label className="flex h-[38px] items-center gap-2 rounded-xl border border-border bg-secondary px-3 text-xs text-foreground cursor-pointer">
              <input type="checkbox" {...register('is_available')} className="accent-[var(--primary)]" />
              Available to attempt
            </label>
          </Field>
        </div>
        <Field label="Link (optional)" error={errors.url?.message}>
          <input {...register('url')} inputMode="url" className="field-input" placeholder="https://…" />
        </Field>
        <Field label="Notes (optional)">
          <textarea {...register('notes')} rows={2} className="field-input resize-none" />
        </Field>
      </form>
    </Modal>
  )
}
