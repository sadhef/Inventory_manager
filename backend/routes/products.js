const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const { body, validationResult, query } = require('express-validator');
const fs = require('fs');
const path = require('path');

const Product = require('../models/Product');
const InventoryHistory = require('../models/InventoryHistory');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const logInventoryChange = async (productId, productName, oldQuantity, newQuantity, userId, userName, reason = 'Manual update') => {
  try {
    const changeAmount = newQuantity - oldQuantity;
    const changeType = changeAmount > 0 ? 'increase' : changeAmount < 0 ? 'decrease' : 'adjustment';
    
    await InventoryHistory.create({
      productId,
      productName,
      oldQuantity,
      newQuantity,
      changeAmount,
      changeType,
      reason,
      userId,
      userName
    });
  } catch (error) {
    console.error('Error logging inventory change:', error);
  }
};

// GET / - List all products with pagination and filtering
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('search').optional().isString().trim(),
  query('category').optional().isString().trim(),
  query('status').optional().isIn(['In Stock', 'Out of Stock']).withMessage('Status must be "In Stock" or "Out of Stock"'),
  query('sortBy').optional().isIn(['name', 'category', 'brand', 'stock', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const status = req.query.status || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    if (status) {
      query.status = status;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await Product.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const categories = await Product.distinct('category');

    res.json({
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      categories
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// GET /search - Search products by name
router.get('/search', [
  query('name').optional().isString().trim().withMessage('Name must be a string')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({ message: 'Search name parameter is required' });
    }

    const products = await Product.find({
      name: { $regex: name, $options: 'i' }
    }).limit(20);

    res.json({ products });

  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Error searching products' });
  }
});

// GET /all-logs - Get all inventory logs 
router.get('/all-logs', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('productId').optional().isMongoId().withMessage('Invalid product ID'),
  query('changeType').optional().isIn(['increase', 'decrease', 'adjustment']).withMessage('Invalid change type'),
  query('date').optional().isISO8601().withMessage('Invalid date'),
  query('userId').optional().isMongoId().withMessage('Invalid user ID')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter query
    let filterQuery = {};
    
    if (req.query.productId) {
      filterQuery.productId = req.query.productId;
    }
    
    if (req.query.changeType) {
      filterQuery.changeType = req.query.changeType;
    }
    
    if (req.query.userId) {
      filterQuery.userId = req.query.userId;
    }
    
    if (req.query.date) {
      const selectedDate = new Date(req.query.date);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(selectedDate.getDate() + 1);
      
      filterQuery.createdAt = {
        $gte: selectedDate,
        $lt: nextDay
      };
    }

    const history = await InventoryHistory.find(filterQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('productId', 'name category brand image');

    const total = await InventoryHistory.countDocuments(filterQuery);

    // Calculate stats based on filtered data
    const stats = await InventoryHistory.aggregate([
      { $match: filterQuery },
      {
        $group: {
          _id: null,
          totalChanges: { $sum: 1 },
          totalIncrease: { 
            $sum: { 
              $cond: [{ $eq: ['$changeType', 'increase'] }, '$changeAmount', 0] 
            } 
          },
          totalDecrease: { 
            $sum: { 
              $cond: [{ $eq: ['$changeType', 'decrease'] }, { $abs: '$changeAmount' }, 0] 
            } 
          },
          avgChangeAmount: { $avg: { $abs: '$changeAmount' } }
        }
      }
    ]);

    res.json({
      history,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      },
      stats: stats[0] || {
        totalChanges: 0,
        totalIncrease: 0,
        totalDecrease: 0,
        avgChangeAmount: 0
      },
      filters: {
        productId: req.query.productId || null,
        changeType: req.query.changeType || null,
        date: req.query.date || null,
        userId: req.query.userId || null
      }
    });
  } catch (error) {
    console.error('Error fetching inventory logs:', error);
    res.status(500).json({ message: 'Error fetching inventory logs' });
  }
});

// GET /export - Export products to CSV (MUST be before /:id routes)
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });

    const csvData = products.map(product => ({
      name: product.name,
      unit: product.unit,
      category: product.category,
      brand: product.brand,
      stock: product.stock,
      status: product.status,
      image: product.image,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString()
    }));

    const fields = ['name', 'unit', 'category', 'brand', 'stock', 'status', 'image', 'createdAt', 'updatedAt'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=products-${Date.now()}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('Error exporting products:', error);
    res.status(500).json({ message: 'Error exporting products' });
  }
});

// POST / - Create new product
router.post('/', [
  body('name').trim().isLength({ min: 1 }).withMessage('Product name is required'),
  body('unit').trim().isLength({ min: 1 }).withMessage('Unit is required'),
  body('category').trim().isLength({ min: 1 }).withMessage('Category is required'),
  body('brand').trim().isLength({ min: 1 }).withMessage('Brand is required'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('image').optional().isString()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, unit, category, brand, stock, image } = req.body;

    const existingProduct = await Product.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existingProduct) {
      return res.status(409).json({ message: 'Product with this name already exists' });
    }

    const product = new Product({
      name,
      unit,
      category,
      brand,
      stock,
      image: image || '',
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await product.save();

    if (stock > 0) {
      await logInventoryChange(
        product._id,
        product.name,
        0,
        stock,
        req.user._id,
        req.user.name,
        'Initial stock'
      );
    }

    const populatedProduct = await Product.findById(product._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.status(201).json({
      message: 'Product created successfully',
      product: populatedProduct
    });

  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Error creating product' });
  }
});

// POST /import - Import products from CSV (MUST be before /:id routes)
router.post('/import', authenticateToken, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required' });
    }

    const results = [];
    const errors = [];
    const duplicates = [];
    let successCount = 0;
    let skipCount = 0;

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const lineNumber = i + 2;

            try {
              const { name, unit, category, brand, stock, status, image } = row;

              if (!name || !unit || !category || !brand) {
                errors.push({
                  line: lineNumber,
                  data: row,
                  error: 'Missing required fields (name, unit, category, brand)'
                });
                continue;
              }

              const stockNumber = parseInt(stock) || 0;
              if (stockNumber < 0) {
                errors.push({
                  line: lineNumber,
                  data: row,
                  error: 'Stock must be non-negative'
                });
                continue;
              }

              const existingProduct = await Product.findOne({ 
                name: { $regex: `^${name.trim()}$`, $options: 'i' } 
              });

              if (existingProduct) {
                duplicates.push({
                  line: lineNumber,
                  csvData: row,
                  existingProduct: {
                    id: existingProduct._id,
                    name: existingProduct.name,
                    unit: existingProduct.unit,
                    category: existingProduct.category,
                    brand: existingProduct.brand,
                    stock: existingProduct.stock,
                    image: existingProduct.image
                  }
                });
                skipCount++;
                continue;
              }

              const product = new Product({
                name: name.trim(),
                unit: unit.trim(),
                category: category.trim(),
                brand: brand.trim(),
                stock: stockNumber,
                image: image?.trim() || '',
                createdBy: req.user._id,
                updatedBy: req.user._id
              });

              await product.save();

              if (stockNumber > 0) {
                await logInventoryChange(
                  product._id,
                  product.name,
                  0,
                  stockNumber,
                  req.user._id,
                  req.user.name,
                  'CSV Import'
                );
              }

              successCount++;

            } catch (error) {
              errors.push({
                line: lineNumber,
                data: row,
                error: error.message
              });
            }
          }

          fs.unlinkSync(req.file.path);

          res.json({
            message: 'Import completed',
            successCount,
            skipCount,
            errorCount: errors.length,
            errors: errors.slice(0, 10),
            duplicates: duplicates.slice(0, 20)
          });

        } catch (error) {
          console.error('Error processing CSV:', error);
          fs.unlinkSync(req.file.path);
          res.status(500).json({ message: 'Error processing CSV file' });
        }
      });

  } catch (error) {
    console.error('Error importing products:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error importing products' });
  }
});

// PUT /:id - Update product (parameterized routes come AFTER specific routes)
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Product name cannot be empty'),
  body('unit').optional().trim().isLength({ min: 1 }).withMessage('Unit cannot be empty'),
  body('category').optional().trim().isLength({ min: 1 }).withMessage('Category cannot be empty'),
  body('brand').optional().trim().isLength({ min: 1 }).withMessage('Brand cannot be empty'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('image').optional().isString()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (updates.name && updates.name !== product.name) {
      const existingProduct = await Product.findOne({ 
        name: { $regex: `^${updates.name}$`, $options: 'i' },
        _id: { $ne: id }
      });
      if (existingProduct) {
        return res.status(409).json({ message: 'Product with this name already exists' });
      }
    }

    const oldStock = product.stock;
    updates.updatedBy = req.user._id;

    // Explicitly update status if stock is being updated
    if (updates.stock !== undefined) {
      const stockNumber = parseInt(updates.stock) || 0;
      updates.stock = stockNumber;
      updates.status = stockNumber > 0 ? 'In Stock' : 'Out of Stock';
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email').populate('updatedBy', 'name email');

    if (updates.stock !== undefined && updates.stock !== oldStock) {
      await logInventoryChange(
        product._id,
        updatedProduct.name,
        oldStock,
        updates.stock,
        req.user._id,
        req.user.name,
        'Stock update'
      );
    }

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
});

// DELETE /:id - Delete product
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(id);
    await InventoryHistory.deleteMany({ productId: id });

    res.json({ message: 'Product deleted successfully' });

  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
});


module.exports = router;