const express = require('express');
const router = express.Router();
const db = require('../db');

// Get task statistics for the logged-in user (Dashboard)
router.get('/stats', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN in_progress = 1 AND completed = 0 THEN 1 ELSE 0 END) as in_progress
      FROM tasks WHERE user_id = ?`,
      [req.userId]
    );
    
    const stats = rows[0];
    res.json({
      total: Number(stats.total || 0),
      completed: Number(stats.completed || 0),
      in_progress: Number(stats.in_progress || 0),
      todo: Number(stats.total || 0) - Number(stats.completed || 0) - Number(stats.in_progress || 0)
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get task history for the logged-in user
router.get('/history', async (req, res) => {
  try {
    const [history] = await db.query(
      'SELECT * FROM task_history WHERE user_id = ? ORDER BY action_at DESC',
      [req.userId]
    );
    res.json(history);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch task history' });
  }
});

// Get all tasks for the logged-in user
router.get('/', async (req, res) => {
  try {
    const [tasks] = await db.query(
      'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Add new task for the logged-in user
router.post('/', async (req, res) => {
  const { text, description, priority, deadline } = req.body;
  const taskPriority = priority || 'Medium';
  const taskDeadline = deadline || null;

  try {
    const [result] = await db.query(
      'INSERT INTO tasks (text, description, priority, deadline, user_id) VALUES (?, ?, ?, ?, ?)',
      [text, description, taskPriority, taskDeadline, req.userId]
    );
    res.json({
      id: result.insertId,
      text,
      description,
      priority: taskPriority,
      deadline: taskDeadline,
      completed: false,
      in_progress: false
    });
  } catch (error) {
    console.error('Add task error:', error);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// Update task (only if owned by the logged-in user)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { text, description, completed, in_progress, priority, deadline } = req.body;
  const taskPriority = priority || 'Medium';
  const taskDeadline = deadline !== undefined ? deadline : null;

  try {
    // Check previous state to detect completion transition
    const [existing] = await db.query(
      'SELECT completed, text, description, priority, deadline FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const prevTask = existing[0];
    const wasCompleted = Boolean(prevTask.completed);
    const nowCompleted = Boolean(completed);

    await db.query(
      'UPDATE tasks SET text = ?, description = ?, priority = ?, deadline = ?, completed = ?, in_progress = ? WHERE id = ? AND user_id = ?',
      [text, description, taskPriority, taskDeadline, completed, in_progress, id, req.userId]
    );

    // Log to history if task just became completed
    if (!wasCompleted && nowCompleted) {
      await db.query(
        `INSERT INTO task_history (user_id, task_text, description, priority, deadline, action)
         VALUES (?, ?, ?, ?, ?, 'completed')`,
        [req.userId, text, description, taskPriority, taskDeadline]
      );
    }

    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task (only if owned by the logged-in user)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch task before deleting to log it
    const [existing] = await db.query(
      'SELECT text, description, priority, deadline FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = existing[0];

    // Log to history
    await db.query(
      `INSERT INTO task_history (user_id, task_text, description, priority, deadline, action)
       VALUES (?, ?, ?, ?, ?, 'deleted')`,
      [req.userId, task.text, task.description, task.priority, task.deadline]
    );

    await db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
