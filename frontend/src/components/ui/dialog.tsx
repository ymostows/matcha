import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "./button"

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = ""
}) => {
  // Fermer avec Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Empêcher le scroll du body quand le dialog est ouvert
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`w-full max-w-lg max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-lg ${className}`}
            >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between border-b p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 pr-4">{title}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Content */}
            <div className="p-4 sm:p-6">
              {children}
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'info',
  isLoading = false
}) => {
  const getButtonColors = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white'
      case 'warning':
        return 'bg-orange-500 hover:bg-orange-600 text-white'
      case 'info':
      default:
        return 'bg-blue-500 hover:bg-blue-600 text-white'
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 sm:space-y-6">
        <p className="text-gray-700 text-sm sm:text-base leading-relaxed">{message}</p>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            {cancelText}
          </Button>
          <Button
            className={`w-full sm:w-auto order-1 sm:order-2 ${getButtonColors()}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Chargement...' : confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

interface MatchDialogProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  onMessage?: () => void
  onContinue?: () => void
}

export const MatchDialog: React.FC<MatchDialogProps> = ({
  isOpen,
  onClose,
  userName,
  onMessage,
  onContinue
}) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="!max-w-[90vw] sm:!max-w-sm">
      <div className="text-center space-y-4 sm:space-y-6">
        <div className="text-5xl sm:text-6xl mb-4">🎉</div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">C'est un match !</h2>
        <p className="text-gray-600 text-sm sm:text-base leading-relaxed px-2">
          Vous et <strong className="text-pink-600">{userName}</strong> vous êtes likés mutuellement !
        </p>
        
        <div className="flex flex-col gap-3 mt-6 sm:mt-8">
          {onMessage && (
            <Button
              className="bg-pink-500 hover:bg-pink-600 text-white w-full py-3 sm:py-2"
              onClick={onMessage}
            >
              💬 Envoyer un message
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onContinue || onClose}
            className="w-full py-3 sm:py-2"
          >
            Continuer à naviguer
          </Button>
        </div>
      </div>
    </Dialog>
  )
}