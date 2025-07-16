import * as React from "react"
import { Dialog } from "./dialog"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"

interface PromptDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (value: string) => void
  title: string
  message: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  required?: boolean
}

export const PromptDialog: React.FC<PromptDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  message,
  placeholder = "",
  confirmText = "Confirmer",
  cancelText = "Annuler",
  isLoading = false,
  required = false
}) => {
  const [value, setValue] = React.useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (required && !value.trim()) return
    onSubmit(value.trim())
    setValue("")
  }

  const handleClose = () => {
    setValue("")
    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div>
          <Label className="text-sm sm:text-base font-medium text-gray-700 mb-2 block">
            {message}
          </Label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full text-sm sm:text-base py-3 sm:py-2"
            disabled={isLoading}
            required={required}
            autoFocus
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto order-2 sm:order-1 py-3 sm:py-2"
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto order-1 sm:order-2 py-3 sm:py-2"
            disabled={isLoading || (required && !value.trim())}
          >
            {isLoading ? 'Chargement...' : confirmText}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}