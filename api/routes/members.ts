import express from 'express';
import { authenticate } from '../middleware/auth';
import { authorize, requireAdminPermission } from '../middleware/authorization';
import { authService } from '../services/auth/AuthService';
import { PermissionLevel } from '../middleware/authorization';

const router = express.Router();

/**
 * Get all members for a project
 */
router.get('/projects/:projectId/members', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Check if user has access to this project
    const userPermission = await authService.getUserProjectPermission(req.user!.userId, projectId);
    
    if (!userPermission) {
      return res.status(403).json({ error: 'You do not have access to this project' });
    }
    
    // Get all project members
    const members = await authService.getProjectMembers(projectId);
    
    res.json({ members });
  } catch (error) {
    console.error('Error getting project members:', error);
    res.status(500).json({ error: 'Failed to get project members' });
  }
});

/**
 * Add a member to a project
 */
router.post('/projects/:projectId/members', authenticate, requireAdminPermission(), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, permission } = req.body;
    
    if (!userId || !permission) {
      return res.status(400).json({ error: 'User ID and permission are required' });
    }
    
    // Validate permission level
    if (!Object.values(PermissionLevel).includes(permission)) {
      return res.status(400).json({ 
        error: `Invalid permission level. Must be one of: ${Object.values(PermissionLevel).join(', ')}` 
      });
    }
    
    // Add member to project
    const success = await authService.setUserProjectPermission(
      userId, 
      projectId, 
      permission as 'view' | 'edit' | 'admin'
    );
    
    if (success) {
      res.json({ message: 'Member added successfully' });
    } else {
      res.status(500).json({ error: 'Failed to add member' });
    }
  } catch (error) {
    console.error('Error adding project member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

/**
 * Update a member's permission
 */
router.put('/projects/:projectId/members/:userId', authenticate, requireAdminPermission(), async (req, res) => {
  try {
    const { projectId, userId } = req.params;
    const { permission } = req.body;
    
    if (!permission) {
      return res.status(400).json({ error: 'Permission is required' });
    }
    
    // Validate permission level
    if (!Object.values(PermissionLevel).includes(permission)) {
      return res.status(400).json({ 
        error: `Invalid permission level. Must be one of: ${Object.values(PermissionLevel).join(', ')}` 
      });
    }
    
    // Update member's permission
    const success = await authService.setUserProjectPermission(
      userId, 
      projectId, 
      permission as 'view' | 'edit' | 'admin'
    );
    
    if (success) {
      res.json({ message: 'Member updated successfully' });
    } else {
      res.status(500).json({ error: 'Failed to update member' });
    }
  } catch (error) {
    console.error('Error updating project member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

/**
 * Remove a member from a project
 */
router.delete('/projects/:projectId/members/:userId', authenticate, requireAdminPermission(), async (req, res) => {
  try {
    const { projectId, userId } = req.params;
    
    // Remove member from project
    const success = await authService.removeUserProjectPermission(userId, projectId);
    
    if (success) {
      res.json({ message: 'Member removed successfully' });
    } else {
      res.status(500).json({ error: 'Failed to remove member' });
    }
  } catch (error) {
    console.error('Error removing project member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;