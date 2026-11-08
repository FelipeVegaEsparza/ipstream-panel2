'use client'

import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { TemplateActivationModal } from '@/components/dashboard/TemplateActivationModal'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Template {
  id: string
  name: string
  displayName: string
  description: string | null
  imageUrl: string | null
}

interface TemplateSelectorProps {
  templates: Template[]
  currentTemplateId: string | null
  currentAccentColor: string | null
}

export function TemplateSelector({ templates, currentTemplateId, currentAccentColor }: TemplateSelectorProps) {
  const { t } = useDashboardI18n()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(currentTemplateId)
  const [accentColor, setAccentColor] = useState<string | null>(currentAccentColor)
  const [activationTemplate, setActivationTemplate] = useState<Template | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info' as 'success' | 'error' | 'warning' | 'info' | 'confirm',
    title: '',
    message: ''
  })

  const showModalMessage = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ) => {
    setModal({ isOpen: true, type, title, message })
  }

  const closeModal = () => {
    setModal({ ...modal, isOpen: false })
  }

  const openActivation = (template: Template) => {
    setActivationTemplate(template)
  }

  const closeActivation = () => {
    if (isSubmitting) return
    setActivationTemplate(null)
  }

  const handleConfirmActivation = async (newAccentColor: string | null) => {
    if (!activationTemplate) return
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/dashboard/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: activationTemplate.id,
          accentColor: newAccentColor
        })
      })

      if (response.ok) {
        setSelectedTemplateId(activationTemplate.id)
        setAccentColor(newAccentColor)
        setActivationTemplate(null)
        showModalMessage('success', t('templateSelector.activatedTitle'), t('templateSelector.activatedMessage'))
      } else {
        const error = await response.json().catch(() => ({}))
        setActivationTemplate(null)
        showModalMessage('error', t('common.error'), error.error || t('templateSelector.activateError'))
      }
    } catch {
      setActivationTemplate(null)
      showModalMessage('error', t('common.error'), t('templateSelector.activateError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      />

      <TemplateActivationModal
        isOpen={activationTemplate !== null}
        templateName={activationTemplate?.displayName ?? ''}
        initialAccentColor={accentColor}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmActivation}
        onClose={closeActivation}
      />
      <DashboardPageHeader title={t('templateSelector.title')} description={t('templateSelector.subtitle')} />

      {selectedTemplateId && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--signal)]" />
            <p className="text-[11px] font-medium text-muted-foreground">
              {t('templateSelector.current')}
            </p>
            <p className="text-[13px] font-medium text-foreground">
              {templates.find(tpl => tpl.id === selectedTemplateId)?.displayName || t('templateSelector.noTemplate')}
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {templates.map((template) => {
          const isSelected = template.id === selectedTemplateId
          
          return (
            <Card
              key={template.id}
              className={`min-w-0 overflow-hidden ${isSelected ? 'border-[color:var(--signal)]' : ''}`}
            >
              <div className="relative aspect-[5/4] w-full overflow-hidden border-b border-line bg-surface-2">
                {template.imageUrl ? (
                  <img
                    src={template.imageUrl}
                    alt={template.displayName}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                    {template.displayName}
                  </div>
                )}
                {isSelected && (
                  <div className="absolute right-2 top-2">
                    <Badge>{t('templateSelector.selected')}</Badge>
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                <h3 className="mb-2 text-[15px] font-medium text-foreground">
                  {template.displayName}
                </h3>

                {template.description && (
                  <p className="mb-4 line-clamp-3 text-[12px] text-muted-foreground">
                    {template.description}
                  </p>
                )}

                <Button
                  onClick={() => openActivation(template)}
                  disabled={isSubmitting}
                  size="sm"
                  variant={isSelected ? 'outline' : 'default'}
                  className="w-full"
                >
                  {isSelected ? t('templateSelector.accentColor') : t('templateSelector.select')}
                </Button>
              </CardContent>
            </Card>
          )
        })}

        {templates.length === 0 && (
          <div className="dashboard-panel col-span-full p-8 text-center">
            <p className="text-[15px] font-medium text-foreground">
              {t('templateSelector.emptyTitle')}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {t('templateSelector.emptyHint')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
