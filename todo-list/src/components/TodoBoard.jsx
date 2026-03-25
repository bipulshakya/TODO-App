import React, { useState, useEffect, useRef } from 'react';
import './TodoBoard.css';

const COLUMN = { TODO: 'todo', IN_PROGRESS: 'inProgress', COMPLETED: 'completed' };

function formatTimestamp(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

function TodoBoard({ token, handleLogout }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  
  const [editIndex, setEditIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');

  // View & Filter states
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'
  const [listFilter, setListFilter] = useState('all'); // 'all', 'active', 'completed'

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  useEffect(() => {
    if (token) fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:5001/tasks', { headers: authHeaders() });
      if (response.status === 401) { handleLogout(); return; }
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const addTask = async () => {
    if (newTask.trim() === '') return;
    try {
      const response = await fetch('http://localhost:5001/tasks', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text: newTask, description: newDescription, priority: newPriority }),
      });
      const newTaskData = await response.json();
      if (!newTaskData.created_at) newTaskData.created_at = new Date().toISOString();
      setTasks(prev => [newTaskData, ...prev]);
      setNewTask('');
      setNewDescription('');
      setNewPriority('Medium');
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTask(); }
  };

  const toggleTask = async (index, taskId) => {
    const task = tasks[index];
    const newInProgress = (!task.inProgress && !task.in_progress && !task.completed) ? true : false;
    const newCompleted = (task.inProgress || task.in_progress) && !task.completed ? true : false;

    try {
      const response = await fetch(`http://localhost:5001/tasks/${taskId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          text: task.text,
          description: task.description,
          priority: task.priority,
          in_progress: newInProgress,
          completed: newCompleted
        })
      });

      if (response.ok) {
        setTasks(prev => prev.map((t, i) => {
          if (i !== index) return t;
          return { ...t, inProgress: newInProgress, in_progress: newInProgress, completed: newCompleted };
        }));
      }
    } catch (error) {
       console.error('Toggle error', error);
    }
  };

  const deleteTask = async (index, taskId) => {
    try {
      const response = await fetch(`http://localhost:5001/tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (response.ok) {
        setTasks(prev => prev.filter((_, i) => i !== index));
      }
    } catch (error) {
      console.error('Delete error', error);
    }
  };

  const startEditing = (index, task) => {
    setEditIndex(index);
    setEditText(task.text);
    setEditDescription(task.description);
    setEditPriority(task.priority || 'Medium');
  };

  const saveEdit = async (taskId) => {
    if (editText.trim() === '') return;
    const task = tasks[editIndex];
    try {
       const response = await fetch(`http://localhost:5001/tasks/${taskId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          text: editText,
          description: editDescription,
          priority: editPriority,
          in_progress: task.inProgress || task.in_progress,
          completed: task.completed
        })
      });
      if (response.ok) {
        setTasks(prev => prev.map((t, i) =>
          i === editIndex ? { ...t, text: editText, description: editDescription, priority: editPriority } : t
        ));
        setEditIndex(null);
      }
    } catch (error) {
       console.error('Edit error', error);
    }
  };

  // ── Drag-and-Drop ──────────────────────────────────────────
  const dragIndex = useRef(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDragStart = (index) => { dragIndex.current = index; };
  const handleDragOver = (e, col) => { e.preventDefault(); setDragOverCol(col); };
  const handleDragLeave = () => setDragOverCol(null);

  const handleDrop = async (e, targetCol) => {
    e.preventDefault();
    setDragOverCol(null);
    if (dragIndex.current === null) return;
    const idx = dragIndex.current;
    dragIndex.current = null;
    
    const task = tasks[idx];
    let newInProgress = false; let newCompleted = false;

    switch (targetCol) {
      case COLUMN.TODO: break;
      case COLUMN.IN_PROGRESS: newInProgress = true; break;
      case COLUMN.COMPLETED: newCompleted = true; break;
      default: return;
    }

    try {
      const response = await fetch(`http://localhost:5001/tasks/${task.id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ ...task, in_progress: newInProgress, completed: newCompleted })
      });
      if (response.ok) {
        setTasks(prev => prev.map((t, i) => i === idx ? { ...t, inProgress: newInProgress, in_progress: newInProgress, completed: newCompleted } : t));
      }
    } catch (error) { console.error('Drop error', error); }
  };

  // ── Filtering & Rendering ──────────────────────────────────
  const q = searchQuery.toLowerCase();
  let filtered = tasks.filter(t => t.text?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));

  if (viewMode === 'list') {
    if (listFilter === 'active') filtered = filtered.filter(t => !t.completed);
    if (listFilter === 'completed') filtered = filtered.filter(t => t.completed);
  }

  const todoTasks       = filtered.filter(t => !t.inProgress && !t.in_progress && !t.completed);
  const inProgressTasks = filtered.filter(t => (t.inProgress || t.in_progress) && !t.completed);
  const completedTasks  = filtered.filter(t => t.completed);

  const renderPriorityTag = (priority) => {
    let colorClass = 'prio-medium';
    let emoji = '🟡';
    if (priority === 'High') { colorClass = 'prio-high'; emoji = '🔴'; }
    if (priority === 'Low') { colorClass = 'prio-low'; emoji = '🟢'; }
    return <span className={`priority-tag ${colorClass}`}>{emoji} {priority || 'Medium'}</span>;
  };

  const renderTask = (task) => {
    const idx = tasks.indexOf(task);
    return (
      <li key={task.id} draggable onDragStart={() => handleDragStart(idx)} className="draggable-task">
        {editIndex === idx ? (
          <div className="edit-section">
            <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="Task label" />
            <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" rows="2" />
            <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
               <select className="priority-select" value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                 <option value="High">🔴 High</option>
                 <option value="Medium">🟡 Medium</option>
                 <option value="Low">🟢 Low</option>
               </select>
               <button className="btn-primary" onClick={() => saveEdit(task.id)}>Save Changes</button>
               <button className="control-btn" onClick={() => setEditIndex(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="task-item">
            {viewMode === 'board' && <div className="drag-handle" title="Drag to move">⣿</div>}
            
            <div className="task-item-header">
              <label className="task-checkbox-container">
                <input type="checkbox" checked={task.completed} onChange={() => toggleTask(idx, task.id)} />
                <div className="custom-checkbox"></div>
              </label>
              <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                 <span className={`task-title ${task.completed ? 'task-done' : ''}`}>{task.text}</span>
                 {!task.completed && renderPriorityTag(task.priority)}
              </div>
            </div>
            
            {task.description && <p className={`task-desc ${task.completed ? 'task-done' : ''}`}>{task.description}</p>}
            
            <div className="task-meta">
              <span className="task-timestamp">
                ⏱ {formatTimestamp(task.created_at)}
              </span>
              <div className="task-actions">
                <button className="btn-icon" onClick={() => startEditing(idx, task)} title="Edit">✎</button>
                <button className="btn-icon delete" onClick={() => deleteTask(idx, task.id)} title="Delete">✕</button>
              </div>
            </div>
          </div>
        )}
      </li>
    );
  };

  const renderColumn = (title, colTasks, col, icon) => (
    <div
      className={`task-box ${dragOverCol === col ? 'drop-target' : ''}`}
      onDragOver={(e) => handleDragOver(e, col)}
      onDrop={(e) => handleDrop(e, col)}
      onDragLeave={handleDragLeave}
    >
      <h2>{icon} {title} <span className="task-count">{colTasks.length}</span></h2>
      <ul className="task-list">
        {colTasks.length === 0 && <li className="empty-drop-hint">Drop tasks here</li>}
        {colTasks.map(task => renderTask(task))}
      </ul>
    </div>
  );

  return (
    <div className="todo-container">
      {/* ── Top Header & Controls ── */}
      <div className="todo-header-area">
        <div>
           <h1>Your Tasks</h1>
           <div className="task-timestamp" style={{marginTop:'4px', fontSize:'13px'}}>{dateStr} • {timeStr}</div>
        </div>

        <div className="board-controls">
          <div className="view-group">
            <button className={`control-btn ${viewMode === 'board' ? 'active' : ''}`} onClick={() => setViewMode('board')}>Board View</button>
            <button className={`control-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>List View</button>
          </div>
          
          {viewMode === 'list' && (
            <div className="filter-group">
              <button className={`control-btn ${listFilter === 'all' ? 'active' : ''}`} onClick={() => setListFilter('all')}>All</button>
              <button className={`control-btn ${listFilter === 'active' ? 'active' : ''}`} onClick={() => setListFilter('active')}>Active</button>
              <button className={`control-btn ${listFilter === 'completed' ? 'active' : ''}`} onClick={() => setListFilter('completed')}>Completed</button>
            </div>
          )}
        </div>
      </div>

      <div className="input-section">
        <input 
          type="text" 
          placeholder="What needs to be done?" 
          value={newTask} 
          onChange={(e) => setNewTask(e.target.value)} 
          onKeyDown={handleKeyDown} 
          style={{flex: 1.5}}
        />
        <input 
          type="text" 
          placeholder="Details (optional)" 
          value={newDescription} 
          onChange={(e) => setNewDescription(e.target.value)} 
          onKeyDown={handleKeyDown}
        />
        <select 
          className="priority-select" 
          value={newPriority} 
          onChange={(e) => setNewPriority(e.target.value)}
        >
          <option value="High">🔴 High</option>
          <option value="Medium">🟡 Medium</option>
          <option value="Low">🟢 Low</option>
        </select>
        <button className="btn-primary" onClick={addTask}>Create Task</button>
      </div>
      
      {/* ── View Rendering ── */}
      {viewMode === 'board' ? (
        <div className="task-box-container">
          {renderColumn('TODO', todoTasks, COLUMN.TODO, '📋')}
          {renderColumn('IN PROGRESS', inProgressTasks, COLUMN.IN_PROGRESS, '⚙️')}
          {renderColumn('COMPLETED', completedTasks, COLUMN.COMPLETED, '✅')}
        </div>
      ) : (
        <div className="list-view-container">
          <ul className="task-list">
            {filtered.length === 0 ? (
              <li className="empty-state">No tasks found.</li>
            ) : (
              filtered.map(task => renderTask(task))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default TodoBoard;
