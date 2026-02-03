const express = require('express');
const router = express.Router();
const { Task } = require('../database/db');
const { taskValidation, handleValidationErrors } = require('../middleware/validation');

// Get all tasks with filtering, sorting, and pagination
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            status, 
            priority, 
            search, 
            sort_by = 'createdAt', 
            sort_order = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Build filter query
        const filter = { user_id: userId };
        
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Build sort query
        const sort = {};
        const allowedSortFields = ['createdAt', 'updatedAt', 'due_date', 'priority', 'title'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'createdAt';
        sort[sortField] = sort_order.toLowerCase() === 'asc' ? 1 : -1;
        
        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        // Execute queries
        const [tasks, total] = await Promise.all([
            Task.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Task.countDocuments(filter)
        ]);
        
        // Get statistics
        const mongoose = require('mongoose');
        const stats = await Task.aggregate([
            { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    high_priority: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } }
                }
            }
        ]);
        
        const statData = stats[0] || { total: 0, pending: 0, in_progress: 0, completed: 0, high_priority: 0 };
        
        res.json({
            success: true,
            data: {
                tasks: tasks.map(t => ({
                    id: t._id,
                    ...t,
                    _id: undefined
                })),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    total_pages: Math.ceil(total / limitNum)
                },
                stats: {
                    total: statData.total,
                    pending: statData.pending,
                    in_progress: statData.in_progress,
                    completed: statData.completed,
                    high_priority: statData.high_priority
                }
            }
        });
        
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tasks'
        });
    }
});

// Get single task
router.get('/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;
        
        const task = await Task.findOne({ _id: taskId, user_id: userId }).lean();
        
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                id: task._id,
                ...task,
                _id: undefined
            }
        });
        
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching task'
        });
    }
});

// Create new task
router.post('/', taskValidation, handleValidationErrors, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, description, status, priority, due_date } = req.body;
        
        const task = new Task({
            user_id: userId,
            title,
            description: description || '',
            status: status || 'pending',
            priority: priority || 'medium',
            due_date: due_date || null
        });
        
        await task.save();
        
        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: {
                id: task._id,
                user_id: task.user_id,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                due_date: task.due_date,
                created_at: task.createdAt,
                updated_at: task.updatedAt
            }
        });
        
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating task'
        });
    }
});

// Update task
router.put('/:id', taskValidation, handleValidationErrors, async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;
        const { title, description, status, priority, due_date } = req.body;
        
        // Build update object dynamically
        const updates = {};
        
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (status !== undefined) updates.status = status;
        if (priority !== undefined) updates.priority = priority;
        if (due_date !== undefined) updates.due_date = due_date;
        
        const task = await Task.findOneAndUpdate(
            { _id: taskId, user_id: userId },
            updates,
            { new: true, runValidators: true }
        );
        
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Task updated successfully',
            data: {
                id: task._id,
                user_id: task.user_id,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                due_date: task.due_date,
                created_at: task.createdAt,
                updated_at: task.updatedAt
            }
        });
        
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating task'
        });
    }
});

// Delete task
router.delete('/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;
        
        const result = await Task.findOneAndDelete({ _id: taskId, user_id: userId });
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Task deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting task'
        });
    }
});

// Bulk update tasks status
router.patch('/bulk/status', async (req, res) => {
    try {
        const userId = req.user.id;
        const { task_ids, status } = req.body;
        
        if (!Array.isArray(task_ids) || task_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'task_ids must be a non-empty array'
            });
        }
        
        if (!['pending', 'in-progress', 'completed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }
        
        const mongoose = require('mongoose');
        const objectIds = task_ids.map(id => new mongoose.Types.ObjectId(id));
        
        const result = await Task.updateMany(
            { _id: { $in: objectIds }, user_id: userId },
            { status }
        );
        
        res.json({
            success: true,
            message: `${result.modifiedCount} tasks updated successfully`
        });
        
    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating tasks'
        });
    }
});

module.exports = router;
