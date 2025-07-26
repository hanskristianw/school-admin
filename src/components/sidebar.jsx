'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Sidebar() {
  const [menus, setMenus] = useState([])

  useEffect(() => {
    const role = localStorage.getItem("user_role") // ex: "admin"

    if (role) {
      fetch(`http://localhost:8080/menu/${role}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setMenus(data)
          } else {
            console.error("❌ Bukan array:", data)
            setMenus([]) // fallback agar tidak error
          }
        })
    }
  }, [])

  return (
    <aside className="w-64 bg-white p-4 shadow h-screen">
      <ul className="space-y-2">
        {menus.map((menu, index) => (
          <li key={index}>
            <Link href={menu.path} className="block py-2 px-3 rounded hover:bg-gray-100">
              {menu.name}
            </Link>
          </li>
        ))}

        {/* Tombol Logout */}
        <li>
          <button
            onClick={() => {
              localStorage.clear()
              window.location.href = "/login"
            }}
            className="block w-full text-left py-2 px-3 rounded hover:bg-red-100 text-red-600"
          >
            Logout
          </button>
        </li>
      </ul>
    </aside>
  )
}
