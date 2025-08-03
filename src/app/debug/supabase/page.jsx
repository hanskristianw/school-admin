// Debug page untuk test Supabase connection
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DebugSupabase() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    const testResults = {};

    try {
      // Test 1: Basic connection
      console.log('🔍 Testing Supabase connection...');
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      testResults.connection = {
        success: !connectionError,
        error: connectionError?.message,
        data: connectionTest
      };

      // Test 2: Check if tables exist
      console.log('🔍 Checking tables...');
      const tables = ['users', 'role', 'menus', 'menu_permissions', 'unit', 'subject'];
      
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          testResults[`table_${table}`] = {
            exists: !error,
            error: error?.message,
            hasData: data && data.length > 0
          };
        } catch (err) {
          testResults[`table_${table}`] = {
            exists: false,
            error: err.message
          };
        }
      }

      // Test 3: Check specific data
      console.log('🔍 Checking specific data...');
      
      // Check roles
      const { data: roles, error: rolesError } = await supabase
        .from('role')
        .select('*');
      
      testResults.roles = {
        success: !rolesError,
        error: rolesError?.message,
        count: roles?.length || 0,
        data: roles
      };

      // Check menus
      const { data: menus, error: menusError } = await supabase
        .from('menus')
        .select('*');
      
      testResults.menus = {
        success: !menusError,
        error: menusError?.message,
        count: menus?.length || 0,
        data: menus
      };

      // Check users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');
      
      testResults.users = {
        success: !usersError,
        error: usersError?.message,
        count: users?.length || 0,
        data: users
      };

      // Test 4: Test JOIN queries (yang dipakai di sidebar)
      console.log('🔍 Testing JOIN queries...');
      
      try {
        const { data: adminMenus, error: adminMenusError } = await supabase
          .from('menus')
          .select(`
            *,
            menu_permissions!inner (
              role:role_id (
                role_name
              )
            )
          `)
          .eq('menu_permissions.role.role_name', 'admin');
        
        testResults.adminMenusJoin = {
          success: !adminMenusError,
          error: adminMenusError?.message,
          count: adminMenus?.length || 0,
          data: adminMenus
        };
      } catch (err) {
        testResults.adminMenusJoin = {
          success: false,
          error: err.message
        };
      }

    } catch (err) {
      testResults.generalError = err.message;
    }

    setResults(testResults);
    setLoading(false);
    console.log('🔍 All test results:', testResults);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔍 Supabase Connection Debug</h1>
      
      <button
        onClick={testConnection}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Supabase Connection'}
      </button>

      {Object.keys(results).length > 0 && (
        <div className="space-y-4">
          {Object.entries(results).map(([key, result]) => (
            <div key={key} className="border p-4 rounded">
              <h3 className="font-semibold mb-2">
                {result.success ? '✅' : '❌'} {key}
              </h3>
              
              {result.error && (
                <p className="text-red-600 text-sm mb-2">
                  Error: {result.error}
                </p>
              )}
              
              {result.count !== undefined && (
                <p className="text-sm mb-2">
                  Count: {result.count}
                </p>
              )}
              
              {result.data && (
                <details className="text-xs">
                  <summary className="cursor-pointer">Show Data</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
