'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/modal';

/**
 * ImageCropUploader — shows a crop dialog before uploading.
 * Props:
 *   label          — display label
 *   aspect         — crop aspect ratio (default: free / undefined)
 *   previewUrl     — current image URL (for preview)
 *   onCropped      — callback(croppedBlob) called with the cropped File blob
 *   onRemove       — callback when user clicks "Hapus"
 *   uploading      — bool, disables button when true
 *   inputRef       — forwarded ref to hidden <input>
 */
export default function ImageCropUploader({
  label,
  aspect,
  previewUrl,
  onCropped,
  onRemove,
  uploading,
  inputRef,
}) {
  const [rawSrc, setRawSrc] = useState(null);       // data URL of selected file
  const [crop, setCrop]     = useState({ x: 0, y: 0 });
  const [zoom, setZoom]     = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRawSrc(reader.result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset so same file can be re-selected
  };

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!rawSrc || !croppedAreaPixels) return;
    const blob = await getCroppedBlob(rawSrc, croppedAreaPixels);
    setModalOpen(false);
    setRawSrc(null);
    if (onCropped) onCropped(blob);
  };

  const handleCancel = () => {
    setModalOpen(false);
    setRawSrc(null);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef?.current?.click()}
          >
            {uploading ? 'Mengupload...' : 'Pilih & Crop'}
          </Button>
          {previewUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-500 border-red-300"
              onClick={onRemove}
            >
              Hapus
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {previewUrl && (
        <div className="border border-gray-200 rounded-md p-2 bg-white shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Preview:</p>
          <img src={previewUrl} alt={label} className="h-16 object-contain" />
        </div>
      )}

      {/* Crop Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCancel}
        title={`Crop Gambar — ${label}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Cropper area */}
          <div
            className="relative bg-gray-900 rounded-lg overflow-hidden"
            style={{ height: 320 }}
          >
            {rawSrc && (
              <Cropper
                image={rawSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}        // undefined = free crop
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: { borderRadius: 8 },
                }}
              />
            )}
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-10">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-blue-600"
            />
            <span className="text-xs text-gray-500 w-10 text-right">{zoom.toFixed(1)}×</span>
          </div>

          <p className="text-xs text-gray-400">
            Drag untuk menggeser, scroll / slider untuk zoom. Klik <strong>Konfirmasi</strong> untuk menggunakan area yang dipilih.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleCancel}>Batal</Button>
            <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={handleConfirm}>
              Konfirmasi
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ── Canvas helper: extract cropped area from image ── */
async function getCroppedBlob(imageSrc, pixelCrop, outputType = 'image/png') {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width  = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height,
  );
  return new Promise((resolve) => canvas.toBlob(resolve, outputType, 1));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src     = src;
  });
}
