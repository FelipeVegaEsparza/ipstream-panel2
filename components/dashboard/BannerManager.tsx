'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PencilIcon, PhotoIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { showToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { normalizeImageUrl } from '@/lib/image-url-helper'
import { isValidBannerLink } from '@/lib/banner-link'

interface BannerItem {
  id: string
  imageUrl: string
  linkUrl: string | null
  order: number
  createdAt: Date | string
}

interface BannerManagerProps {
  banners: BannerItem[]
}

export function BannerManager({ banners }: BannerManagerProps) {
  const { t } = useDashboardI18n()
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [order, setOrder] = useState('0')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const reset = () => {
    setEditingId(null)
    setImageUrl('')
    setLinkUrl('')
    setOrder('0')
  }

  const startEdit = (banner: BannerItem) => {
    setEditingId(banner.id)
    setImageUrl(banner.imageUrl)
    setLinkUrl(banner.linkUrl ?? '')
    setOrder(String(banner.order))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!imageUrl.trim()) {
      showToast({ type: 'error', title: t('banner.required') })
      return
    }

    const normalizedLink = linkUrl.trim()
    if (!isValidBannerLink(normalizedLink)) {
      showToast({ type: 'error', title: t('banner.invalidLink') })
      return
    }

    setSaving(true)
    try {
      const payload = {
        imageUrl: imageUrl.trim(),
        linkUrl: normalizedLink || null,
        order: Number(order) || 0,
      }
      const response = await fetch(editingId ? `/api/banner/${editingId}` : '/api/banner', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        showToast({ type: 'error', title: data?.error || t('banner.saveError') })
        return
      }

      showToast({ type: 'success', title: editingId ? t('banner.saved') : t('banner.added') })
      reset()
      router.refresh()
    } catch {
      showToast({ type: 'error', title: t('banner.saveError') })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm(t('banner.deleteConfirm'))) return

    setLoading(id)
    try {
      const response = await fetch(`/api/banner/${id}`, { method: 'DELETE' })
      if (response.ok) {
        if (editingId === id) reset()
        showToast({ type: 'success', title: t('banner.deleted') })
        router.refresh()
      } else {
        showToast({ type: 'error', title: t('banner.deleteError') })
      }
    } catch {
      showToast({ type: 'error', title: t('banner.deleteError') })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {editingId ? t('banner.edit') : t('banner.new')}
        </h2>

        <ImageUpload
          value={imageUrl}
          onChange={setImageUrl}
          onRemove={() => setImageUrl('')}
          label={t('banner.image')}
          description={t('banner.imageHint')}
        />

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {t('banner.link')}
          </label>
          <input
            type="url"
            className="form-input w-full"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder={t('banner.linkPlaceholder')}
          />
          <p className="text-xs text-muted-foreground mt-1">{t('banner.linkHint')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {t('banner.order')}
          </label>
          <input
            type="number"
            className="form-input w-full max-w-xs"
            value={order}
            onChange={(event) => setOrder(event.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">{t('banner.orderHint')}</p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
            {saving ? t('common.saving') : editingId ? t('banner.saveChanges') : t('banner.add')}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="btn-secondary">
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>

      {banners.length === 0 ? (
        <div className="text-center py-12">
          <PhotoIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">{t('banner.empty')}</h3>
          <p className="text-muted-foreground">{t('banner.emptyHint')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {banners.map((banner) => (
            <li
              key={banner.id}
              className={`card flex items-center justify-between gap-4 ${editingId === banner.id ? 'ring-1 ring-brand' : ''}`}
            >
              <div className="flex min-w-0 items-center gap-4">
        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-panel border border-border bg-secondary">
                  <Image
                    src={normalizeImageUrl(banner.imageUrl)}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-mono text-muted-foreground">#{banner.order}</span>
                  {banner.linkUrl ? (
                    <a
                      href={banner.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm text-brand hover:underline"
                    >
                      {banner.linkUrl}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('banner.link')}</p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(banner)}
                  className="action-button action-button-edit"
                  title={t('common.edit')}
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(banner.id)}
                  disabled={loading === banner.id}
                  className="action-button action-button-delete"
                  title={t('common.delete')}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
