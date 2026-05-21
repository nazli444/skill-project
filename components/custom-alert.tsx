'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useCustomAlert } from '@/hooks/use-custom-alert'

interface CustomAlertProps {
  isOpen: boolean
  title: string
  description: string
  confirmText: string
  cancelText?: string
  isConfirm?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function CustomAlert({
  isOpen,
  title,
  description,
  confirmText,
  cancelText,
  isConfirm,
  onConfirm,
  onCancel,
}: CustomAlertProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {isConfirm && cancelText && (
            <AlertDialogAction onClick={onCancel} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
              {cancelText}
            </AlertDialogAction>
          )}
          <AlertDialogAction onClick={onConfirm}>{confirmText}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Hook for easy usage
export { useCustomAlert }
