import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Filter, TrendingUp, TrendingDown, Activity, User, Package, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { productAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';

const InventoryHistory = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    totalRecords: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const [filters, setFilters] = useState({
    productId: '',
    changeType: '',
    date: '',
    userId: ''
  });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };

      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== '') {
          params[key] = filters[key];
        }
      });

      const response = await productAPI.getAllInventoryLogs(params);
      setLogs(response.data.history);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.pagination.totalPages,
        totalRecords: response.data.pagination.totalRecords,
        hasNextPage: response.data.pagination.hasNextPage,
        hasPrevPage: response.data.pagination.hasPrevPage
      }));
    } catch (error) {
      setError('Failed to fetch inventory logs');
      console.error('Fetch logs error:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await productAPI.getProducts({ 
        limit: 1000,
        sortBy: 'name',
        sortOrder: 'asc'
      });
      setProducts(response.data.products);
    } catch (error) {
      console.error('Fetch products error:', error);
      try {
        const response = await productAPI.getProducts({ 
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc'
        });
        setProducts(response.data.products);
      } catch (fallbackError) {
        console.error('Fallback fetch products error:', fallbackError);
      }
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const getChangeIcon = (changeType) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="w-5 h-5 text-blue-700" />;
      case 'decrease':
        return <TrendingDown className="w-5 h-5 text-blue-700" />;
      default:
        return <Activity className="w-5 h-5 text-blue-700" />;
    }
  };

  const getChangeColor = (changeAmount) => {
    if (changeAmount > 0) return 'text-blue-700 bg-blue-50 border border-blue-200';
    if (changeAmount < 0) return 'text-white bg-blue-700';
    return 'text-gray-700 bg-gray-100 border border-gray-300';
  };


  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access inventory history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header Section */}
        <div className="mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Inventory History</h1>
            <p className="text-gray-600 text-sm lg:text-base">Track all inventory changes and stock movements</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 text-red-700 px-6 py-4 rounded-r-lg">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Filters */}
        <Card className="border border-blue-200 mb-6 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-gray-800 text-lg">
              <Filter className="w-4 h-4 lg:w-5 lg:h-5 mr-2 text-blue-600" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Product Filter */}
              <Select value={filters.productId || 'all'} onValueChange={(value) => handleFilterChange('productId', value === 'all' ? '' : value)}>
                <SelectTrigger className="h-10 border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-800 text-sm">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product._id} value={product._id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Change Type Filter */}
              <Select value={filters.changeType || 'all'} onValueChange={(value) => handleFilterChange('changeType', value === 'all' ? '' : value)}>
                <SelectTrigger className="h-10 border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-800 text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="increase">Increase</SelectItem>
                  <SelectItem value="decrease">Decrease</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Input
                type="date"
                placeholder="Filter by Date"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                className="h-10 border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-800 text-sm"
              />

              {/* Items per page */}
              <Select value={pagination.limit.toString()} onValueChange={(value) => {
                setPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }));
              }}>
                <SelectTrigger className="h-10 border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-800 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card className="border border-blue-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-800">
              Inventory Change History 
              {pagination.totalRecords > 0 && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({pagination.totalRecords.toLocaleString()} total records)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="flex items-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                  <span className="text-gray-600">Loading logs...</span>
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <Clock className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <p className="font-medium">No inventory logs found</p>
                <p className="text-sm">Try adjusting your filters or check back later</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => {
                  const { date, time } = formatDate(log.createdAt);
                  return (
                    <div
                      key={log._id}
                      className="border border-blue-200 rounded-lg p-4 lg:p-6 hover:border-blue-300 hover:bg-blue-50 transition-colors bg-white"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start space-y-4 lg:space-y-0 lg:space-x-4">
                        {/* Mobile: Top row with icon, image, and title */}
                        <div className="flex items-start space-x-3 lg:space-x-4 lg:flex-shrink-0">
                          {/* Change Icon */}
                          <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center">
                            {getChangeIcon(log.changeType)}
                          </div>

                          {/* Product Info */}
                          <div className="flex-shrink-0">
                            {log.productId?.image ? (
                              <img
                                src={log.productId.image}
                                alt={log.productName}
                                className="w-12 h-12 lg:w-16 lg:h-16 object-cover rounded-lg border border-blue-200"
                              />
                            ) : (
                              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center">
                                <Package className="w-6 h-6 lg:w-8 lg:h-8 text-blue-400" />
                              </div>
                            )}
                          </div>

                          {/* Product Name and Category - Mobile */}
                          <div className="flex-1 min-w-0 lg:hidden">
                            <h3 className="text-base font-semibold text-gray-800 truncate">
                              {log.productName}
                            </h3>
                            {log.productId?.category && (
                              <span className="inline-block mt-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                {log.productId.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Details Section */}
                        <div className="flex-1 min-w-0">
                          {/* Desktop: Product Name and Category */}
                          <div className="hidden lg:flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-800 truncate">
                              {log.productName}
                            </h3>
                            {log.productId?.category && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                {log.productId.category}
                              </span>
                            )}
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-3 lg:mb-4">
                            <div>
                              <p className="text-xs lg:text-sm text-gray-600 mb-1">Quantity Change</p>
                              <p className="font-mono font-semibold text-gray-800 text-sm lg:text-base">
                                {log.oldQuantity} → {log.newQuantity}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs lg:text-sm text-gray-600 mb-1">Change Amount</p>
                              <span className={`inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-semibold ${getChangeColor(log.changeAmount)}`}>
                                {log.changeAmount > 0 ? '+' : ''}{log.changeAmount} units
                              </span>
                            </div>

                            <div className="sm:col-span-2 lg:col-span-1">
                              <p className="text-xs lg:text-sm text-gray-600 mb-1">Reason</p>
                              <p className="font-medium text-gray-800 text-sm lg:text-base">{log.reason}</p>
                            </div>
                          </div>

                          {/* Meta Information */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-2 sm:space-y-0 text-xs lg:text-sm text-gray-600">
                            <div className="flex items-center">
                              <User className="w-3 h-3 lg:w-4 lg:h-4 mr-1.5" />
                              <span className="font-medium">{log.userName}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 lg:w-4 lg:h-4 mr-1.5" />
                              <span>{date} at {time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {!loading && logs.length > 0 && pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 lg:mt-8 pt-4 lg:pt-6 border-t border-blue-200 space-y-4 sm:space-y-0">
                <div className="flex items-center justify-center sm:justify-start space-x-1 lg:space-x-2">
                  <Button
                    variant="outline"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-gray-700 text-sm px-3 py-2"
                  >
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
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
                          className={`w-8 h-8 lg:w-10 lg:h-10 p-0 text-sm ${
                            pagination.page === page
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-gray-700'
                          }`}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-gray-700 text-sm px-3 py-2"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                  </Button>
                </div>

                <div className="text-xs lg:text-sm text-gray-600 text-center sm:text-left">
                  <span className="block sm:inline">
                    Showing <span className="font-medium text-blue-700">{((pagination.page - 1) * pagination.limit) + 1}</span>-<span className="font-medium text-blue-700">{Math.min(pagination.page * pagination.limit, pagination.totalRecords)}</span>
                  </span>
                  <span className="block sm:inline sm:ml-1">
                    of <span className="font-medium text-blue-700">{pagination.totalRecords.toLocaleString()}</span> entries
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InventoryHistory;