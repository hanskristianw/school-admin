"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import NotificationModal from "@/components/ui/notification-modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faSave, faKey } from "@fortawesome/free-solid-svg-icons";

export default function DailyQrSettings() {
  const [secrets, setSecrets] = useState({
    mon: '',
    tue: '',
    wed: '',
    thu: '',
    fri: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, title: "", message: "", type: "success" });
  
  const showNotification = (title, message, type = "success") => {
    setNotification({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    loadSecrets();
  }, []);

  const loadSecrets = async () => {
    try {
      setLoading(true);
      const keys = ['attendance_secret_mon', 'attendance_secret_tue', 'attendance_secret_wed', 'attendance_secret_thu', 'attendance_secret_fri'];
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', keys);
      
      if (error) throw error;

      const secretsMap = {
        mon: '',
        tue: '',
        wed: '',
        thu: '',
        fri: ''
      };

      (data || []).forEach(item => {
        const day = item.key.replace('attendance_secret_', '');
        if (secretsMap.hasOwnProperty(day)) {
          secretsMap[day] = item.value || '';
        }
      });

      setSecrets(secretsMap);
    } catch (e) {
      console.error('Load error:', e);
      showNotification('Error', 'Gagal memuat konfigurasi: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGenerate = (day) => {
    setSecrets(prev => ({ ...prev, [day]: generateRandomSecret() }));
  };

  const handleGenerateAll = () => {
    setSecrets({
      mon: generateRandomSecret(),
      tue: generateRandomSecret(),
      wed: generateRandomSecret(),
      thu: generateRandomSecret(),
      fri: generateRandomSecret()
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updates = Object.entries(secrets).map(([day, value]) => ({
        key: `attendance_secret_${day}`,
        value: value || ''
      }));

      // Upsert all secrets
      for (const item of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert([item], { onConflict: 'key' });
        
        if (error) throw error;
      }

      showNotification('Berhasil', 'Konfigurasi QR harian berhasil disimpan', 'success');
    } catch (e) {
      console.error('Save error:', e);
      showNotification('Error', 'Gagal menyimpan: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const dayLabels = {
    mon: 'Senin',
    tue: 'Selasa',
    wed: 'Rabu',
    thu: 'Kamis',
    fri: 'Jumat'
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600 flex items-center">
          <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
          Memuat konfigurasi...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan QR Kehadiran Harian</h1>
        <p className="text-gray-600 text-sm mt-1">
          Kelola secret key untuk QR kehadiran Senin-Jumat. Setiap hari memiliki QR unik yang tidak berubah (static).
        </p>
      </div>

      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-800">Secret Keys</CardTitle>
            <Button
              type="button"
              onClick={handleGenerateAll}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-3"
            >
              <FontAwesomeIcon icon={faKey} className="mr-1" />
              Generate Semua
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(dayLabels).map(([day, label]) => (
              <div key={day} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-2">
                  <Label className="block mb-1 text-sm font-medium text-gray-700">{label}</Label>
                </div>
                <div className="md:col-span-8">
                  <input
                    type="text"
                    value={secrets[day]}
                    onChange={(e) => setSecrets(prev => ({ ...prev, [day]: e.target.value }))}
                    placeholder={`Secret key untuk ${label}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    onClick={() => handleGenerate(day)}
                    className="bg-gray-600 hover:bg-gray-700 text-white text-xs h-9 px-3 w-full"
                  >
                    <FontAwesomeIcon icon={faKey} className="mr-1" />
                    Generate
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800 mb-4">
              <p className="font-semibold mb-2">⚠️ Penting:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Secret key ini digunakan untuk generate QR code harian yang static (tidak berubah).</li>
                <li>Setiap hari (Senin-Jumat) memiliki secret berbeda untuk keamanan.</li>
                <li>Jangan bagikan secret key ini ke siapapun.</li>
                <li>Setelah mengubah secret, QR lama tidak akan valid lagi - cetak ulang QR baru.</li>
              </ul>
            </div>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6"
            >
              {saving ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  Simpan Konfigurasi
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}
