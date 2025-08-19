import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, History, User, LogOut, Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';

const Navigation = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    closeMenu();
    logout();
  };

  return (
    <nav className="bg-blue-700 border-b border-blue-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo - Always Visible */}
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center mr-3">
              <Package className="w-5 h-5 text-blue-700" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Inventory Management
            </h1>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            <Link to="/products">
              <Button 
                variant={isActive('/products') ? 'secondary' : 'ghost'}
                className={`px-4 lg:px-6 py-2 font-medium transition-all duration-200 ${
                  isActive('/products')
                    ? 'bg-white text-blue-700 hover:bg-blue-50'
                    : 'text-blue-100 hover:text-white hover:bg-blue-600'
                }`}
              >
                <Package className="w-4 h-4 mr-2" />
                Products
              </Button>
            </Link>
            
            <Link to="/inventory-history">
              <Button 
                variant={isActive('/inventory-history') ? 'secondary' : 'ghost'}
                className={`px-4 lg:px-6 py-2 font-medium transition-all duration-200 ${
                  isActive('/inventory-history')
                    ? 'bg-white text-blue-700 hover:bg-blue-50'
                    : 'text-blue-100 hover:text-white hover:bg-blue-600'
                }`}
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
            </Link>
          </div>

          {/* Desktop User Info & Logout */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
            <div className="flex items-center text-blue-100 bg-blue-800 px-3 py-1.5 rounded-lg">
              <User className="w-4 h-4 mr-2" />
              <span className="font-medium text-sm lg:text-base">{user?.name}</span>
            </div>
            <Button 
              variant="ghost" 
              onClick={logout}
              className="text-blue-100 hover:text-white hover:bg-blue-600 px-3 lg:px-4 py-2"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden lg:inline">Logout</span>
            </Button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              onClick={toggleMenu}
              className="text-blue-100 hover:text-white hover:bg-blue-600 p-2"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-blue-800 border-t border-blue-600">
              {/* User Info */}
              <div className="flex items-center text-blue-100 bg-blue-900 px-3 py-2 rounded-lg mb-3">
                <User className="w-4 h-4 mr-2" />
                <span className="font-medium">{user?.name}</span>
              </div>

              {/* Navigation Links */}
              <Link to="/products" onClick={closeMenu}>
                <Button 
                  variant="ghost"
                  className={`w-full justify-start px-3 py-3 font-medium transition-all duration-200 ${
                    isActive('/products')
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-100 hover:text-white hover:bg-blue-700'
                  }`}
                >
                  <Package className="w-5 h-5 mr-3" />
                  Products
                </Button>
              </Link>
              
              <Link to="/inventory-history" onClick={closeMenu}>
                <Button 
                  variant="ghost"
                  className={`w-full justify-start px-3 py-3 font-medium transition-all duration-200 ${
                    isActive('/inventory-history')
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-100 hover:text-white hover:bg-blue-700'
                  }`}
                >
                  <History className="w-5 h-5 mr-3" />
                  Inventory History
                </Button>
              </Link>

              {/* Logout Button */}
              <Button 
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start px-3 py-3 text-blue-100 hover:text-white hover:bg-blue-700 font-medium mt-4 border-t border-blue-600"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;