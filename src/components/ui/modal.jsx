import React from 'react';
import { Button } from './button';
import { useTheme } from '@/lib/theme';

const Modal = ({ isOpen, onClose, title, children, size = 'md', zIndex = 'z-50', containerStyle = {}, headerStyle = {}, titleStyle = {}, disableBackdropClose = false }) => {
  const { theme } = useTheme();
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  const bgColor = containerStyle.background || containerStyle.backgroundColor || theme?.cardBg || '#ffffff';
  const borderColor = containerStyle.borderColor || theme?.border || '#e5e7eb';
  const titleColor = titleStyle.color || theme?.textPrimary || '#111827';

  return (
    <div className={`fixed inset-0 ${zIndex} overflow-y-auto`}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={disableBackdropClose ? undefined : onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative w-full ${sizeClasses[size]} rounded-xl border shadow-2xl transform transition-all overflow-hidden`}
          style={{ background: bgColor, borderColor: borderColor, ...containerStyle }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: borderColor, ...headerStyle }}>
            <h3 className="text-base font-bold tracking-tight" style={{ color: titleColor, ...titleStyle }}>
              {title}
            </h3>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
          
          {/* Content */}
          <div className="p-5 max-h-[calc(100vh-180px)] overflow-y-auto" style={{ color: theme?.textPrimary || '#111827' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
