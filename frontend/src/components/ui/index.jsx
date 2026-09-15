import { X } from 'lucide-react'
import { Button as ShadcnButton } from './button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'

export function Button({
  variant = 'primary',
  icon: Icon,
  children,
  className = '',
  ...props
}) {
  const mappedVariant = {
    primary: 'default',
    secondary: 'outline',
    ghost: 'ghost',
    danger: 'destructive',
  }[variant] ?? variant

  return (
    <ShadcnButton
      variant={mappedVariant}
      className={`button button-${variant} ${className}`}
      {...props}
    >
      {Icon && <Icon size={15} aria-hidden="true" />}
      {children}
    </ShadcnButton>
  )
}

export function IconButton({ label, children, className = '', ...props }) {
  return (
    <ShadcnButton
      variant="outline"
      size="icon-lg"
      className={`icon-button ${className}`}
      aria-label={label}
      {...props}
    >
      {children}
    </ShadcnButton>
  )
}

export function Avatar({ name, small = false, color }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
  return (
    <span
      className={`avatar ${small ? 'small' : ''}`}
      style={{ '--avatar-bg': color }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

export function StatusBadge({ children }) {
  const tone = children.toLowerCase().replace(' ', '-')
  return <span className={`status status-${tone}`}>{children}</span>
}

export function Field({ label, helper, error, children }) {
  return (
    <div className={`field ${error ? 'field-error' : ''}`}>
      <label>{label}</label>
      {children}
      {(error || helper) && (
        <span className="field-helper">{error || helper}</span>
      )}
    </div>
  )
}

export function Modal({ open, title, onClose, children, footer }) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="modal" showCloseButton={false}>
        <DialogHeader className="modal-head">
          <DialogTitle className="panel-title">{title}</DialogTitle>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={17} />
          </IconButton>
        </DialogHeader>
        <div className="modal-body">{children}</div>
        {footer && (
          <DialogFooter className="modal-actions">{footer}</DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function Skeleton({ width = '100%', height = 12 }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        width,
        height,
        borderRadius: 5,
        background: '#edf0ec',
      }}
    />
  )
}
