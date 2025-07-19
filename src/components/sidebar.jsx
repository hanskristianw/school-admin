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
        .then(data => setMenus(data))
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
      </ul>
    </aside>
  )
}
