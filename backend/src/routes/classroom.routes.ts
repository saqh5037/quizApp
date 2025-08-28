import { Router } from 'express';
import ClassroomController from '../controllers/classroom.controller';
import { simpleAuth } from '../middleware/auth.simple.middleware';
import { 
  tenantMiddleware, 
  tenantAdminOnly,
  instructorOnly 
} from '../middleware/tenant.middleware';

const router = Router();

// All routes require authentication and tenant context
router.use(simpleAuth);
router.use(tenantMiddleware);

// Public classroom routes (for authenticated users in the tenant)
router.get('/', ClassroomController.getClassrooms);
router.get('/:id', ClassroomController.getClassroom);
router.get('/:id/students', ClassroomController.getClassroomStudents);

// Instructor and admin routes
router.post('/', instructorOnly, ClassroomController.createClassroom);
router.put('/:id', instructorOnly, ClassroomController.updateClassroom);

// Enrollment management (instructors and admins)
router.post('/:id/enroll', instructorOnly, ClassroomController.enrollUser);
router.delete('/:id/enroll/:userId', instructorOnly, ClassroomController.unenrollUser);

// Admin only routes
router.delete('/:id', tenantAdminOnly, ClassroomController.deleteClassroom);

export default router;