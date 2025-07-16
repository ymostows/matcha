import { toast } from 'react-toastify';

export interface ToastOptions {
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const useToast = () => {
  const showToast = (message: string, options: ToastOptions = {}) => {
    const { type = 'info', duration = 5000 } = options;
    
    const toastOptions = {
      autoClose: duration,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    };

    switch (type) {
      case 'success':
        toast.success(message, toastOptions);
        break;
      case 'error':
        toast.error(message, toastOptions);
        break;
      case 'warning':
        toast.warn(message, toastOptions);
        break;
      case 'info':
      default:
        toast.info(message, toastOptions);
        break;
    }
  };

  return {
    toast: showToast,
    success: (message: string) => showToast(message, { type: 'success' }),
    error: (message: string) => showToast(message, { type: 'error' }),
    warning: (message: string) => showToast(message, { type: 'warning' }),
    info: (message: string) => showToast(message, { type: 'info' }),
  };
};