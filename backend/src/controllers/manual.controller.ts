import { Request, Response } from 'express';
import { Manual, User } from '@models/index';
import { Op } from 'sequelize';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { getTenantContext } from '@middleware/tenant.middleware';
import pdf from 'pdf-parse';

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'manuals');
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `manual-${uniqueSuffix}.pdf`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

export const uploadMiddleware = upload.single('file');

export const uploadManual = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { title, description, is_public } = req.body;
    const userId = (req as any).user?.id;
    const { tenantId } = getTenantContext(req);

    if (!title) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    // Create manual record
    const manual = await Manual.create({
      title,
      description,
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      is_public: is_public === 'true',
      status: 'processing',
      user_id: userId,
      tenant_id: tenantId,
      metadata: {
        original_name: req.file.originalname
      }
    });

    // Extract text from PDF asynchronously
    extractTextFromPDF(manual, req.file.path);

    res.status(201).json({
      success: true,
      data: manual,
      message: 'Manual uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading manual:', error);
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({
      success: false,
      error: 'Failed to upload manual'
    });
  }
};

export const getManuals = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const { tenantId } = getTenantContext(req);
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {};

    // Tenant isolation
    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    // Filter by visibility
    if (userRole !== 'admin') {
      whereClause[Op.or] = [
        { user_id: userId },
        { is_public: true }
      ];
    }

    // Filter by status
    if (status !== 'all') {
      whereClause.status = status;
    }

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: manuals } = await Manual.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: manuals,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching manuals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch manuals'
    });
  }
};

export const getManual = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const { tenantId } = getTenantContext(req);

    const whereClause: any = { id };

    // Tenant isolation
    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    // Check access permissions
    if (userRole !== 'admin') {
      whereClause[Op.or] = [
        { user_id: userId },
        { is_public: true }
      ];
    }

    const manual = await Manual.findOne({
      where: whereClause,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
      }]
    });

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual not found or access denied'
      });
    }

    res.json({
      success: true,
      data: manual
    });
  } catch (error) {
    console.error('Error fetching manual:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch manual'
    });
  }
};

export const updateManual = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const { tenantId } = getTenantContext(req);
    const { title, description, is_public } = req.body;

    const whereClause: any = { id };

    // Tenant isolation
    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    // Only creator or admin can update
    if (userRole !== 'admin') {
      whereClause.user_id = userId;
    }

    const manual = await Manual.findOne({ where: whereClause });

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual not found or access denied'
      });
    }

    // Update fields
    if (title) manual.title = title;
    if (description !== undefined) manual.description = description;
    if (typeof is_public === 'boolean') manual.is_public = is_public;

    await manual.save();

    res.json({
      success: true,
      data: manual,
      message: 'Manual updated successfully'
    });
  } catch (error) {
    console.error('Error updating manual:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update manual'
    });
  }
};

export const deleteManual = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const { tenantId } = getTenantContext(req);

    const whereClause: any = { id };

    // Tenant isolation
    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    // Only creator or admin can delete
    if (userRole !== 'admin') {
      whereClause.user_id = userId;
    }

    const manual = await Manual.findOne({ where: whereClause });

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual not found or access denied'
      });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(manual.file_path);
    } catch (error) {
      console.error('Error deleting manual file:', error);
    }

    // Delete database record
    await manual.destroy();

    res.json({
      success: true,
      message: 'Manual deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting manual:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete manual'
    });
  }
};

export const downloadManual = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const { tenantId } = getTenantContext(req);

    const whereClause: any = { id };

    // Tenant isolation
    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    // Check access permissions
    if (userRole !== 'admin') {
      whereClause[Op.or] = [
        { user_id: userId },
        { is_public: true }
      ];
    }

    const manual = await Manual.findOne({ where: whereClause });

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual not found or access denied'
      });
    }

    // Check if file exists
    try {
      await fs.access(manual.file_path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Manual file not found'
      });
    }

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${manual.title}.pdf"`);

    // Stream file to response
    const fileStream = require('fs').createReadStream(manual.file_path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading manual:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download manual'
    });
  }
};

// Helper function to extract text from PDF
const extractTextFromPDF = async (manual: any, filePath: string) => {
  try {
    // Read PDF file
    const dataBuffer = await fs.readFile(filePath);
    
    // Parse PDF and extract text
    const data = await pdf(dataBuffer);
    
    // Update manual with extracted text
    manual.extracted_text = data.text;
    manual.status = 'ready';
    manual.metadata = {
      ...manual.metadata,
      num_pages: data.numpages,
      pdf_info: data.info
    };
    
    await manual.save();
    
    console.log(`Text extracted from manual ${manual.id}: ${data.text.length} characters`);
  } catch (error) {
    console.error(`Error extracting text from manual ${manual.id}:`, error);
    
    // Mark as failed
    manual.status = 'failed';
    manual.metadata = {
      ...manual.metadata,
      error: error.message
    };
    
    await manual.save();
  }
};