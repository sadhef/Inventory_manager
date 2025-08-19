import toast from 'react-hot-toast';

const toastConfig = {
  success: {
    duration: 3000,
    position: 'top-right',
    style: {
      background: '#10B981',
      color: 'white',
      fontWeight: '500',
    },
  },
  error: {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#EF4444',
      color: 'white',
      fontWeight: '500',
    },
  },
  loading: {
    position: 'top-right',
    style: {
      background: '#3B82F6',
      color: 'white',
      fontWeight: '500',
    },
  },
  info: {
    duration: 3500,
    position: 'top-right',
    style: {
      background: '#6366F1',
      color: 'white',
      fontWeight: '500',
    },
  },
  warning: {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#F59E0B',
      color: 'white',
      fontWeight: '500',
    },
  }
};

export const showToast = {
  success: (message, options = {}) => {
    return toast.success(message, {
      ...toastConfig.success,
      ...options,
    });
  },

  error: (message, options = {}) => {
    return toast.error(message, {
      ...toastConfig.error,
      ...options,
    });
  },

  loading: (message, options = {}) => {
    return toast.loading(message, {
      ...toastConfig.loading,
      ...options,
    });
  },

  info: (message, options = {}) => {
    return toast(message, {
      icon: 'ℹ️',
      ...toastConfig.info,
      ...options,
    });
  },

  warning: (message, options = {}) => {
    return toast(message, {
      icon: '⚠️',
      ...toastConfig.warning,
      ...options,
    });
  },

  promise: (promise, { loading, success, error }) => {
    return toast.promise(
      promise,
      {
        loading: loading || 'Processing...',
        success: success || 'Success!',
        error: error || 'Something went wrong',
      },
      {
        style: toastConfig.loading.style,
        position: 'top-right',
      }
    );
  },

  dismiss: (toastId) => {
    return toast.dismiss(toastId);
  },

  dismissAll: () => {
    return toast.dismiss();
  }
};

export const apiToast = {
  handleResponse: async (responsePromise, messages = {}) => {
    const loadingToast = showToast.loading(messages.loading || 'Processing...');
    
    try {
      const response = await responsePromise;
      toast.dismiss(loadingToast);
      
      if (response.status >= 200 && response.status < 300) {
        showToast.success(messages.success || response.data?.message || 'Operation successful');
        return response;
      } else {
        showToast.error(messages.error || response.data?.message || 'Operation failed');
        throw new Error(response.data?.message || 'Operation failed');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      const errorMessage = error.response?.data?.message || error.message || messages.error || 'Operation failed';
      showToast.error(errorMessage);
      throw error;
    }
  },

  handleAsyncOperation: async (operation, messages = {}) => {
    return showToast.promise(operation, {
      loading: messages.loading || 'Processing...',
      success: messages.success || 'Operation completed successfully',
      error: messages.error || 'Operation failed'
    });
  }
};

export const inventoryToast = {
  productCreated: (productName) => showToast.success(`Product "${productName}" created successfully`),
  productUpdated: (productName) => showToast.success(`Product "${productName}" updated successfully`),
  productDeleted: (productName) => showToast.success(`Product "${productName}" deleted successfully`),
  stockUpdated: (productName, newStock) => showToast.info(`Stock updated for "${productName}": ${newStock} units`),
  importStarted: () => showToast.loading('Importing products from CSV...'),
  importCompleted: (successCount, skipCount, errorCount) => {
    if (errorCount > 0) {
      showToast.warning(`Import completed: ${successCount} success, ${skipCount} skipped, ${errorCount} errors`);
    } else {
      showToast.success(`Import completed: ${successCount} products imported successfully`);
    }
  },
  exportStarted: () => showToast.loading('Preparing export...'),
  exportCompleted: () => showToast.success('Products exported successfully'),
  validationError: (fieldName) => showToast.error(`${fieldName} is required`),
  duplicateProduct: (productName) => showToast.error(`Product "${productName}" already exists`),
  networkError: () => showToast.error('Network error. Please check your connection and try again.'),
  unauthorizedAccess: () => showToast.error('Session expired. Please login again.')
};

export const authToast = {
  loginSuccess: (userName) => showToast.success(`Welcome back, ${userName}!`),
  loginError: (message) => showToast.error(message || 'Login failed'),
  logoutSuccess: () => showToast.success('Logged out successfully'),
  signupSuccess: () => showToast.success('Account created successfully'),
  signupError: (message) => showToast.error(message || 'Failed to create account'),
  passwordRequired: () => showToast.error('Password is required'),
  emailRequired: () => showToast.error('Email is required'),
  invalidCredentials: () => showToast.error('Invalid email or password')
};

export default showToast;