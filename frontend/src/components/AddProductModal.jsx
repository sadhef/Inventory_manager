import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

// Move InputField component outside to prevent re-creation
const InputField = ({ 
  name, 
  label, 
  placeholder, 
  type = 'text', 
  suggestions = [],
  formData,
  handleChange,
  handleBlur,
  errors,
  ...props 
}) => (
  <div className="space-y-1">
    <label className="block text-xs sm:text-sm font-medium text-gray-800">
      {label}
    </label>
    <Input
      type={type}
      placeholder={placeholder}
      value={formData[name] || ''}
      onChange={(e) => handleChange(name, e.target.value)}
      onBlur={() => handleBlur(name)}
      className={`h-9 sm:h-10 w-full border-gray-400 bg-white text-gray-900 placeholder:text-gray-500 text-sm ${errors[name] ? 'border-red-500' : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`}
      style={{ color: '#111827' }}
      list={suggestions.length > 0 ? `${name}-suggestions` : undefined}
      {...props}
    />
    {suggestions.length > 0 && (
      <datalist id={`${name}-suggestions`}>
        {suggestions.map((suggestion, index) => (
          <option key={`${name}-${suggestion}-${index}`} value={suggestion} />
        ))}
      </datalist>
    )}
    {errors[name] && (
      <p className="text-xs sm:text-sm text-red-600">{errors[name]}</p>
    )}
  </div>
);

const AddProductModal = ({ isOpen, onClose, onSubmit, categories = [], loading = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    category: '',
    brand: '',
    stock: '',
    image: ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        return !value.trim() ? 'Product name is required' : '';
      case 'unit':
        return !value.trim() ? 'Unit is required' : '';
      case 'category':
        return !value.trim() ? 'Category is required' : '';
      case 'brand':
        return !value.trim() ? 'Brand is required' : '';
      case 'stock':
        const stockNum = parseInt(value);
        if (value === '' || isNaN(stockNum)) return 'Stock is required';
        if (stockNum < 0) return 'Stock cannot be negative';
        return '';
      case 'image':
        if (value && !isValidImageUrl(value)) return 'Please enter a valid image URL';
        return '';
      default:
        return '';
    }
  };

  const isValidImageUrl = (url) => {
    try {
      new URL(url);
      return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
    } catch {
      return false;
    }
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    setErrors(newErrors);
    setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    // If no errors, submit
    if (Object.keys(newErrors).length === 0) {
      const submitData = {
        ...formData,
        stock: parseInt(formData.stock) || 0
      };
      onSubmit(submitData);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      unit: '',
      category: '',
      brand: '',
      stock: '',
      image: ''
    });
    setErrors({});
    setTouched({});
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={handleClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative bg-white rounded-lg shadow-lg w-full max-w-sm sm:max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Add Product</h2>
            <Button
              variant="ghost"
              onClick={handleClose}
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                <InputField
                  name="name"
                  label="Product Name"
                  placeholder="Enter product name"
                  formData={formData}
                  handleChange={handleChange}
                  handleBlur={handleBlur}
                  errors={errors}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <InputField
                    name="unit"
                    label="Unit"
                    placeholder="pcs, kg, ltr"
                    suggestions={['pcs', 'kg', 'ltr', 'box', 'pack', 'bottle', 'meter']}
                    formData={formData}
                    handleChange={handleChange}
                    handleBlur={handleBlur}
                    errors={errors}
                    required
                  />

                  <InputField
                    name="stock"
                    label="Initial Stock"
                    placeholder="0"
                    type="number"
                    min="0"
                    formData={formData}
                    handleChange={handleChange}
                    handleBlur={handleBlur}
                    errors={errors}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <InputField
                    name="category"
                    label="Category"
                    placeholder="Enter category"
                    suggestions={categories}
                    formData={formData}
                    handleChange={handleChange}
                    handleBlur={handleBlur}
                    errors={errors}
                    required
                  />

                  <InputField
                    name="brand"
                    label="Brand"
                    placeholder="Enter brand"
                    formData={formData}
                    handleChange={handleChange}
                    handleBlur={handleBlur}
                    errors={errors}
                    required
                  />
                </div>

                <InputField
                  name="image"
                  label="Image URL (Optional)"
                  placeholder="https://example.com/image.jpg"
                  formData={formData}
                  handleChange={handleChange}
                  handleBlur={handleBlur}
                  errors={errors}
                />
                
                {formData.image && !errors.image && (
                  <div className="mt-2 p-3 bg-gray-50 rounded border">
                    <img 
                      src={formData.image} 
                      alt="Preview" 
                      className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        setErrors(prev => ({ ...prev, image: 'Failed to load image' }));
                      }}
                    />
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-3 sm:p-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || Object.values(errors).some(error => error)}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white order-1 sm:order-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Add Product'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProductModal;