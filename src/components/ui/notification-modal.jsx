import { useState, useEffect } from 'react';
import Modal from './modal';
import { Button } from './button';

const NotificationModal = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'success' // 'success', 'error', 'warning', 'info'
}) => {
  const [show, setShow] = useState(isOpen);

  useEffect(() => {
    setShow(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    setShow(false);
    onClose && onClose();
  };

  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✅',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          buttonColor: 'bg-green-600 hover:bg-green-700'
        };
      case 'error':
        return {
          icon: '❌',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          buttonColor: 'bg-red-600 hover:bg-red-700'
        };
      case 'warning':
        return {
          icon: '⚠️',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          buttonColor: 'bg-blue-600 hover:bg-blue-700'
        };
      default:
        return {
          icon: 'ℹ️',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          buttonColor: 'bg-gray-600 hover:bg-gray-700'
        };
    }
  };

  const { icon, bgColor, borderColor, textColor, buttonColor } = getIconAndColor();

  return (
    <Modal
      isOpen={show}
      onClose={handleClose}
      title={title}
      size="sm"
      zIndex="z-[60]"
    >
      <div className={`${bgColor} ${borderColor} border rounded-lg p-4 mb-4`}>
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{icon}</span>
          <div className="flex-1">
            <p className={`${textColor} font-medium`}>{message}</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleClose}
          className={`${buttonColor} text-white px-6`}
        >
          OK
        </Button>
      </div>
    </Modal>
  );
};

export default NotificationModal;
