'use client'

export default function PrintLayout({ children }) {
  // This layout bypasses the parent /data layout
  // Returns children directly without sidebar/header
  return children;
}
