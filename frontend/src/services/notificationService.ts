import { toast, ToastOptions } from 'react-toastify';

const defaultOptions: ToastOptions = {
  position: "bottom-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
  toast(message, { ...defaultOptions, type });
};

export const notify = {
  success: (message: string) => {
    showToast(message, 'success');
  },
  error: (message: string) => {
    showToast(message, 'error');
  },
  info: (message: string) => {
    showToast(message, 'info');
  },
  warn: (message: string) => {
    showToast(message, 'warning');
  },
}; 