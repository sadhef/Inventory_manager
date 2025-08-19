import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Upload, Download, Edit, Trash2, Save, X, Search, Package2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { productAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import AddProductModal from '../components/AddProductModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { showToast } from '../utils/toast';

const Products = () => {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalPages: 1,
    totalProducts: 0
  });

  const fileInputRef = useRef(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (filters.search.trim()) {
        params.search = filters.search;
      }
      if (filters.category.trim()) {
        params.category = filters.category;
      }
      if (filters.status.trim()) {
        params.status = filters.status;
      }
      
      const response = await productAPI.getProducts(params);
      setProducts(response.data.products);
      setCategories(response.data.categories);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.pagination.totalPages,
        totalProducts: response.data.pagination.totalProducts
      }));
    } catch (error) {
      console.error('Fetch products error:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      } else {
        showToast.error(error.response?.data?.message || 'Failed to fetch products');
      }
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters.search, filters.category, filters.status, logout]);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user, fetchProducts]);

  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value === 'all' ? '' : value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setEditForm({
      name: product.name,
      unit: product.unit,
      category: product.category,
      brand: product.brand,
      stock: product.stock,
      image: product.image || ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      const formDataToSend = {
        ...editForm,
        stock: parseInt(editForm.stock) || 0
      };

      await productAPI.updateProduct(editingId, formDataToSend);
      
      setEditingId(null);
      setEditForm({});
      await fetchProducts();
    } catch (error) {
      console.error('Update error:', error);
      fetchProducts();
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      setDeleteLoading(true);
      await productAPI.deleteProduct(productToDelete._id, productToDelete.name);
      setShowDeleteModal(false);
      setProductToDelete(null);
      await fetchProducts();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
  };

  const handleAddProduct = async (productData) => {
    try {
      setAddProductLoading(true);
      await productAPI.createProduct(productData);
      setShowAddModal(false);
      fetchProducts();
    } catch (error) {
      // Error handling is done in the API layer
    } finally {
      setAddProductLoading(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      setLoading(true);
      await productAPI.importProducts(formData);
      fetchProducts();
    } catch (error) {
      // Error handling is done in the API layer
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleExport = async () => {
    try {
      const response = await productAPI.exportProducts();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Error handling is done in the API layer
    }
  };


  const getStatusBadge = (status, stock) => {
    const stockNumber = parseInt(stock) || 0;
    const actualStatus = stockNumber > 0 ? 'In Stock' : 'Out of Stock';
    const isInStock = actualStatus === 'In Stock';
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
        isInStock 
          ? 'bg-green-100 text-green-800 border border-green-300' 
          : 'bg-red-100 text-red-800 border border-red-300'
      }`}>
        {isInStock ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <AlertCircle className="w-3 h-3" />
        )}
        {actualStatus}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 lg:mb-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 lg:mb-2">Product Management Dashboard</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2.5 font-medium text-sm lg:text-base"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Product</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-white border border-blue-200 rounded-lg p-4 lg:p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 lg:w-5 lg:h-5" />
                <Input
                  placeholder="Search products, brands, or categories..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-10 lg:h-11 border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-800 placeholder:text-gray-500 text-sm lg:text-base"
                />
              </div>
              
              {/* Filters and Actions Row */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  <Select value={filters.category || 'all'} onValueChange={(value) => handleFilterChange('category', value)}>
                    <SelectTrigger className="h-10 lg:h-11 border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-800 text-sm lg:text-base">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger className="h-10 lg:h-11 border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-800 text-sm lg:text-base">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="In Stock">In Stock</SelectItem>
                      <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Import/Export */}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="flex-1 sm:flex-none border-gray-400 hover:border-blue-500 hover:bg-blue-50 px-3 lg:px-4 py-2 lg:py-2.5 text-gray-800 font-medium text-sm lg:text-base"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Import</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleExport}
                    className="flex-1 sm:flex-none border-gray-400 hover:border-blue-500 hover:bg-blue-50 px-3 lg:px-4 py-2 lg:py-2.5 text-gray-800 font-medium text-sm lg:text-base"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <Card className="border border-blue-200 shadow-sm bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="border-b border-blue-200 bg-blue-50">
                    <TableHead className="h-10 lg:h-12 px-3 lg:px-6 text-left font-semibold text-gray-800 text-xs lg:text-sm">Image</TableHead>
                    <TableHead className="h-10 lg:h-12 px-3 lg:px-6 text-left font-semibold text-gray-800 text-xs lg:text-sm min-w-[120px]">Product</TableHead>
                    <TableHead className="h-10 lg:h-12 px-3 lg:px-6 text-left font-semibold text-gray-800 text-xs lg:text-sm">Unit</TableHead>
                    <TableHead className="h-10 lg:h-12 px-3 lg:px-6 text-left font-semibold text-gray-800 text-xs lg:text-sm">Category</TableHead>
                    <TableHead className="h-10 lg:h-12 px-3 lg:px-6 text-left font-semibold text-gray-800 text-xs lg:text-sm hidden lg:table-cell">Brand</TableHead>
                    <TableHead className="h-10 lg:h-12 px-3 lg:px-6 text-left font-semibold text-gray-800 text-xs lg:text-sm">Stock</TableHead>
                    <TableHead className="h-10 lg:h-12 px-3 lg:px-6 text-left font-semibold text-gray-800 text-xs lg:text-sm">Status</TableHead>
                    <TableHead className="h-10 lg:h-12 px-3 lg:px-6 text-left font-semibold text-gray-800 text-xs lg:text-sm min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                          <span className="text-gray-600">Loading products...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <Package2 className="w-12 h-12 text-blue-400 mb-3" />
                          <p className="text-gray-600 font-medium">No products found</p>
                          <p className="text-gray-400 text-sm">Add your first product to get started</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product, index) => (
                      <TableRow key={product._id} className={`border-b border-blue-100 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-25'}`}>
                        <TableCell className="px-3 lg:px-6 py-3 lg:py-4">
                          {editingId === product._id ? (
                            <div className="flex flex-col gap-2">
                              <Input
                                value={editForm.image}
                                onChange={(e) => setEditForm(prev => ({ ...prev, image: e.target.value }))}
                                placeholder="Image URL"
                                className="min-w-[150px] border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-xs lg:text-sm"
                              />
                              {editForm.image && (
                                <img 
                                  src={editForm.image} 
                                  alt="Preview"
                                  className="w-8 h-8 object-cover rounded border border-blue-200"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                          ) : (
                            <>
                              {product.image ? (
                                <img 
                                  src={product.image} 
                                  alt={product.name}
                                  className="w-10 h-10 lg:w-12 lg:h-12 object-cover rounded-lg border border-blue-200"
                                />
                              ) : (
                                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center">
                                  <Package2 className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
                                </div>
                              )}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="px-3 lg:px-6 py-3 lg:py-4">
                          {editingId === product._id ? (
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                              className="min-w-[120px] border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-xs lg:text-sm"
                            />
                          ) : (
                            <div className="min-w-[120px]">
                              <p className="font-semibold text-gray-800 text-xs lg:text-sm truncate">{product.name}</p>
                              <p className="text-xs text-gray-500 truncate lg:hidden">{product.brand}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-3 lg:px-6 py-3 lg:py-4">
                          {editingId === product._id ? (
                            <Input
                              value={editForm.unit}
                              onChange={(e) => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                              className="w-20 lg:w-24 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-xs lg:text-sm"
                            />
                          ) : (
                            <span className="text-gray-700 text-xs lg:text-sm">{product.unit}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 lg:px-6 py-3 lg:py-4">
                          {editingId === product._id ? (
                            <Input
                              value={editForm.category}
                              onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                              className="w-24 lg:w-32 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-xs lg:text-sm"
                            />
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                              {product.category}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 lg:px-6 py-3 lg:py-4 hidden lg:table-cell">
                          {editingId === product._id ? (
                            <Input
                              value={editForm.brand}
                              onChange={(e) => setEditForm(prev => ({ ...prev, brand: e.target.value }))}
                              className="w-24 lg:w-32 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-xs lg:text-sm"
                            />
                          ) : (
                            <span className="text-gray-700 text-xs lg:text-sm">{product.brand}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 lg:px-6 py-3 lg:py-4">
                          {editingId === product._id ? (
                            <Input
                              type="number"
                              value={editForm.stock}
                              onChange={(e) => setEditForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                              min="0"
                              className="w-20 lg:w-24 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-xs lg:text-sm"
                            />
                          ) : (
                            <span className="font-mono font-semibold text-gray-800 text-sm lg:text-lg">
                              {product.stock.toLocaleString()}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 lg:px-6 py-3 lg:py-4">
                          {getStatusBadge(product.status, product.stock)}
                        </TableCell>
                        <TableCell className="px-3 lg:px-6 py-3 lg:py-4">
                          <div className="flex items-center gap-1 lg:gap-2">
                            {editingId === product._id ? (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={handleSaveEdit}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 lg:px-3 py-1 lg:py-1.5"
                                >
                                  <Save className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={handleCancelEdit}
                                  className="border-blue-300 hover:border-blue-500 px-2 lg:px-3 py-1 lg:py-1.5 text-gray-700"
                                >
                                  <X className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleEdit(product)}
                                  className="border-blue-300 hover:border-blue-500 hover:bg-blue-50 px-2 lg:px-3 py-1 lg:py-1.5 text-gray-700"
                                >
                                  <Edit className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleDeleteClick(product)}
                                  className="border-gray-300 hover:border-red-500 hover:bg-red-50 hover:text-red-600 px-2 lg:px-3 py-1 lg:py-1.5"
                                >
                                  <Trash2 className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {!loading && products.length > 0 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium text-blue-700">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
              <span className="font-medium text-blue-700">{Math.min(pagination.page * pagination.limit, pagination.totalProducts)}</span> of{' '}
              <span className="font-medium text-blue-700">{pagination.totalProducts.toLocaleString()}</span> products
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                className="border-gray-300 hover:border-black hover:bg-gray-50 px-4 py-2"
              >
                Previous
              </Button>
              
              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={pagination.page === page ? "default" : "outline"}
                      onClick={() => setPagination(prev => ({ ...prev, page }))}
                      className={`w-10 h-10 p-0 ${
                        pagination.page === page
                          ? 'bg-black text-white hover:bg-gray-800'
                          : 'border-gray-300 hover:border-black hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                className="border-gray-300 hover:border-black hover:bg-gray-50 px-4 py-2"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddProduct}
        categories={categories}
        loading={addProductLoading}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message="Are you sure you want to delete this product?"
        itemName={productToDelete?.name}
        loading={deleteLoading}
      />
    </div>
  );
};

export default Products;