const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../services/authMiddleware');
const { approveEmployee, getApplication, setRole,getProfileById,getAllUsers, getAllApplications, updateUser, deleteUser } = require('../controllers/adminController');


router.post('/approve-employee', authenticate, requireRole('admin'), approveEmployee); // Route restricted to admin for approving employee accounts
router.get('/application', authenticate, requireRole('admin') , getApplication); // Get user's employment application
router.post('/set-role', authenticate, requireRole('admin') , setRole); 
router.get('/profile/:id', authenticate, requireRole('admin') , getProfileById); // get any user's profile
router.get('/users', authenticate, requireRole('admin'), getAllUsers); // get all users
router.get('/applications', authenticate, requireRole('admin'), getAllApplications); // get all employment applications
router.put('/users/:id', authenticate, requireRole('admin'), updateUser);
router.delete('/users/:id', authenticate, requireRole('admin'), deleteUser);

module.exports = router;