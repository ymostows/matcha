import { useState, useCallback } from 'react'

export interface DialogState {
  isOpen: boolean
  title: string
  message: string
  type: 'info' | 'warning' | 'danger'
  confirmText: string
  cancelText: string
  onConfirm: () => void
  isLoading: boolean
}

export const useDialog = () => {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    onConfirm: () => {},
    isLoading: false
  })

  const [promptState, setPromptState] = useState<{
    isOpen: boolean
    title: string
    message: string
    placeholder: string
    confirmText: string
    cancelText: string
    onSubmit: (value: string) => void
    isLoading: boolean
    required: boolean
  }>({
    isOpen: false,
    title: '',
    message: '',
    placeholder: '',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    onSubmit: () => {},
    isLoading: false,
    required: false
  })

  const [matchState, setMatchState] = useState<{
    isOpen: boolean
    userName: string
    onMessage?: () => void
    onContinue?: () => void
  }>({
    isOpen: false,
    userName: '',
    onMessage: undefined,
    onContinue: undefined
  })

  const showConfirm = useCallback((options: {
    title: string
    message: string
    type?: 'info' | 'warning' | 'danger'
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
  }) => {
    setDialogState({
      isOpen: true,
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      confirmText: options.confirmText || 'Confirmer',
      cancelText: options.cancelText || 'Annuler',
      onConfirm: options.onConfirm,
      isLoading: false
    })
  }, [])

  const showPrompt = useCallback((options: {
    title: string
    message: string
    placeholder?: string
    confirmText?: string
    cancelText?: string
    onSubmit: (value: string) => void
    required?: boolean
  }) => {
    setPromptState({
      isOpen: true,
      title: options.title,
      message: options.message,
      placeholder: options.placeholder || '',
      confirmText: options.confirmText || 'Confirmer',
      cancelText: options.cancelText || 'Annuler',
      onSubmit: options.onSubmit,
      isLoading: false,
      required: options.required || false
    })
  }, [])

  const showMatch = useCallback((options: {
    userName: string
    onMessage?: () => void
    onContinue?: () => void
  }) => {
    setMatchState({
      isOpen: true,
      userName: options.userName,
      onMessage: options.onMessage,
      onContinue: options.onContinue
    })
  }, [])

  const closeDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const closePrompt = useCallback(() => {
    setPromptState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const closeMatch = useCallback(() => {
    setMatchState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const setDialogLoading = useCallback((loading: boolean) => {
    setDialogState(prev => ({ ...prev, isLoading: loading }))
  }, [])

  const setPromptLoading = useCallback((loading: boolean) => {
    setPromptState(prev => ({ ...prev, isLoading: loading }))
  }, [])

  return {
    // State
    dialogState,
    promptState,
    matchState,
    
    // Methods
    showConfirm,
    showPrompt,
    showMatch,
    closeDialog,
    closePrompt,
    closeMatch,
    setDialogLoading,
    setPromptLoading
  }
}