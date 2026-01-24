'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import Modal from './ui/modal';
import { Button } from './ui/button';

const ImageCropModal = ({ isOpen, onClose, imageSrc, onCropComplete, aspectRatio = 1 }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const onCropCompleteCallback = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = useCallback(async () => {
    try {
      setProcessing(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
      onClose();
    } catch (e) {
      console.error('Error cropping image:', e);
    } finally {
      setProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels, onCropComplete, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crop Profile Picture"
      size="lg"
    >
      <div className="space-y-4">
        <div className="relative h-96 bg-gray-100 rounded-lg">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteCallback}
            cropShape="round"
            showGrid={false}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={createCroppedImage}
            disabled={processing}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {processing ? 'Processing...' : 'Crop & Save'}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={processing}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Helper function to create cropped image with compression
const getCroppedImg = (imageSrc, pixelCrop) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;
    
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('No 2d context'));
        return;
      }

      // Set max dimension for compression (800px is good for profile pictures)
      const maxDimension = 800;
      let width = pixelCrop.width;
      let height = pixelCrop.height;

      // Scale down if larger than max dimension
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        width,
        height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        
        const file = new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg', 0.85); // Quality 0.85 for good balance between size and quality
    };

    image.onerror = () => {
      reject(new Error('Failed to load image'));
    };
  });
};

export default ImageCropModal;
