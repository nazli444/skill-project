'use client'

import { useRef, useState } from 'react'

interface AlertOptions {
  title?: string
  description?: string
  confirmText?: string
  onConfirm?: () => void
  cancelText?: string
}

export function useCustomAlert() {
  const [isOpen, setIsOpen] = useState(false)
  const [alertData, setAlertData] = useState<{
    title: string
    description: string
    confirmText: string
    cancelText?: string
    isConfirm?: boolean
    onConfirm?: () => void
  }>({
    title: '',
    description: '',
    confirmText: 'OK'
  })
  const confirmResolver = useRef<((value: boolean) => void) | null>(null)

  const showAlert = (message: string, options: AlertOptions = {}) => {
    setAlertData({
      title: options.title || 'Alert',
      description: message,
      confirmText: options.confirmText || 'OK',
      onConfirm: options.onConfirm,
      cancelText: undefined,
      isConfirm: false
    })
    setIsOpen(true)
  }

  const showConfirm = (message: string, options: AlertOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve
      setAlertData({
        title: options.title || 'Confirm',
        description: message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        isConfirm: true
      })
      setIsOpen(true)
    })
  }

  const closeAlert = () => {
    setIsOpen(false)
    // For simple alerts, trigger onConfirm when closing
    if (alertData.onConfirm && !alertData.isConfirm) {
      alertData.onConfirm()
    }
    // For confirm dialogs, default to false if closed without explicit action
    if (alertData.isConfirm && confirmResolver.current) {
      confirmResolver.current(false)
      confirmResolver.current = null
    }
  }

  const confirmAlert = () => {
    setIsOpen(false)
    if (alertData.isConfirm && confirmResolver.current) {
      confirmResolver.current(true)
      confirmResolver.current = null
    } else if (alertData.onConfirm) {
      alertData.onConfirm()
    }
  }

  const cancelAlert = () => {
    setIsOpen(false)
    if (alertData.isConfirm && confirmResolver.current) {
      confirmResolver.current(false)
      confirmResolver.current = null
    }
  }

  return {
    isOpen,
    alertData,
    showAlert,
    showConfirm,
    closeAlert,
    confirmAlert,
    cancelAlert
  }
}
