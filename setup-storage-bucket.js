// Script untuk setup Supabase Storage Bucket
// Jalankan ini di browser console setelah login ke dashboard Supabase

// 1. Setup bucket programmatically (alternative dari dashboard)
const setupStorageBucket = async () => {
  try {
    // Create bucket
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('profile-pictures', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (bucketError && bucketError.message !== 'Bucket already exists') {
      console.error('Error creating bucket:', bucketError);
      return;
    }

    console.log('✅ Bucket created or already exists');

    // Test upload (optional)
    console.log('🔧 Storage bucket setup complete!');
    console.log('📁 Bucket name: profile-pictures');
    console.log('🌐 Public access: enabled');
    console.log('📏 Max file size: 5MB');
    console.log('🖼️ Allowed types: image files');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
};

// Run setup
// setupStorageBucket();

// Manual steps yang perlu dilakukan di Supabase Dashboard:
console.log(`
🚀 SETUP MANUAL SUPABASE STORAGE:

1. Buka Supabase Dashboard → Storage
2. Klik "Create bucket"
3. Bucket name: "profile-pictures"
4. ✅ Make bucket public
5. Save bucket

6. Buka bucket → Settings → Policies
7. Add policy untuk public read access
8. Add policy untuk authenticated upload

Atau jalankan file: setup-supabase-storage.sql di SQL Editor
`);

export { setupStorageBucket };
