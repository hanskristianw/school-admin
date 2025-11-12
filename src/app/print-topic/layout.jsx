'use client'

export default function PrintTopicLayout({ children }) {
  // Override root layout to remove language switcher and header
  // Return children in a clean container
  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#f5f5f5',
      overflow: 'auto',
      zIndex: 9999
    }}>
      {children}
    </div>
  );
}
