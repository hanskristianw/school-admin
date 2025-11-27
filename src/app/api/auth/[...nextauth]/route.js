import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = (url && serviceKey) 
  ? createClient(url, serviceKey, { 
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } 
    }) 
  : null

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if email exists in our users table
      if (!admin) {
        console.error('Supabase admin client not configured')
        return false
      }

      try {
        const email = user.email?.toLowerCase()
        
        if (!email) {
          console.error('No email from Google')
          return false
        }

        // Search for user by email (case-insensitive)
        const { data: dbUser, error } = await admin
          .from('users')
          .select('user_id, user_email, is_active')
          .ilike('user_email', email)
          .single()

        if (error || !dbUser) {
          console.log('❌ Email not found in database:', email)
          // Return URL with error parameter
          return `/login?error=EmailNotFound&email=${encodeURIComponent(email)}`
        }

        if (!dbUser.is_active) {
          console.log('❌ User is not active:', email)
          return `/login?error=UserInactive&email=${encodeURIComponent(email)}`
        }

        console.log('✅ User found:', dbUser.user_id)
        return true
      } catch (err) {
        console.error('SignIn callback error:', err)
        return false
      }
    },

    async jwt({ token, user, account, profile }) {
      // On initial sign in, fetch user data from database
      if (account && user) {
        try {
          const email = user.email?.toLowerCase()
          
          const { data: dbUser, error } = await admin
            .from('users')
            .select(`
              user_id, 
              user_username, 
              user_nama_depan, 
              user_nama_belakang, 
              user_role_id, 
              user_unit_id, 
              is_active,
              user_email,
              user_profile_picture
            `)
            .ilike('user_email', email)
            .single()

          if (dbUser && !error) {
            // Fetch role & unit info
            const [{ data: role }, { data: unit }] = await Promise.all([
              admin.from('role').select('role_id, role_name, is_admin, is_counselor, is_teacher, is_student').eq('role_id', dbUser.user_role_id).single(),
              dbUser.user_unit_id ? admin.from('unit').select('unit_id, unit_name').eq('unit_id', dbUser.user_unit_id).single() : Promise.resolve({ data: null })
            ])

            // Add user data to token
            token.userID = dbUser.user_id
            token.username = dbUser.user_username
            token.namaDepan = dbUser.user_nama_depan
            token.namaBelakang = dbUser.user_nama_belakang
            token.roleID = dbUser.user_role_id
            token.roleName = role?.role_name || ''
            token.isAdmin = role?.is_admin || false
            token.isCounselor = role?.is_counselor || false
            token.isTeacher = role?.is_teacher || false
            token.isStudent = role?.is_student || false
            token.unitID = dbUser.user_unit_id
            token.unitName = unit?.unit_name || ''
            token.profilePicture = user.image || dbUser.user_profile_picture
          }
        } catch (err) {
          console.error('JWT callback error:', err)
        }
      }
      return token
    },

    async session({ session, token }) {
      // Add custom user data to session
      if (token) {
        session.user = {
          ...session.user,
          userID: token.userID,
          username: token.username,
          namaDepan: token.namaDepan,
          namaBelakang: token.namaBelakang,
          roleID: token.roleID,
          roleName: token.roleName,
          isAdmin: token.isAdmin,
          isCounselor: token.isCounselor,
          isTeacher: token.isTeacher,
          isStudent: token.isStudent,
          unitID: token.unitID,
          unitName: token.unitName,
          profilePicture: token.profilePicture,
        }
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.SUPABASE_JWT_SECRET,
})

export { handler as GET, handler as POST }
