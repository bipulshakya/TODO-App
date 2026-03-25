import React, { useState, useEffect } from 'react';
import './CalendarView.css';

function CalendarView({ token, handleLogout }) {
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:5001/tasks', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        handleLogout();
        return;
      }
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const isTaskOnDate = (task, date) => {
    if (!task.created_at) return false;
    const taskDate = new Date(task.created_at);
    return isSameDay(taskDate, date);
  };

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayTasks = tasks.filter(t => isTaskOnDate(t, date));
        const isSelected = isSameDay(date, selectedDate);
        const isToday = isSameDay(date, new Date());
        
        days.push(
            <div 
                key={day} 
                className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => setSelectedDate(date)}
            >
                <div className="day-number">{day}</div>
                {dayTasks.length > 0 && (
                    <div className="day-indicators">
                        {dayTasks.slice(0, 3).map((t, i) => (
                            <div key={i} className={`task-dot ${t.completed ? 'completed' : ''}`}></div>
                        ))}
                        {dayTasks.length > 3 && <div className="task-dot-more">+</div>}
                    </div>
                )}
            </div>
        );
    }
    
    return days;
  };

  // Filter tasks for selected day
  const selectedDayTasks = tasks.filter(t => isTaskOnDate(t, selectedDate));

  return (
    <div className="calendar-view-container">
      <div className="calendar-header-titles">
        <h1>Task Calendar</h1>
        <p>Browse your productivity history</p>
      </div>

      <div className="calendar-layout">
        {/* Left Side: Calendar Widget */}
        <div className="calendar-widget-card">
          <div className="calendar-controls">
            <button className="cal-btn" onClick={handlePrevMonth}>◀</button>
            <h2 className="current-month">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button className="cal-btn" onClick={handleNextMonth}>▶</button>
          </div>
          
          <div className="calendar-grid-header">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>
          
          <div className="calendar-grid-days">
            {renderCalendarDays()}
          </div>
        </div>

        {/* Right Side: Day View */}
        <div className="day-view-card">
          <h3 className="day-view-title">
            Tasks for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h3>
          
          <div className="day-task-list">
            {selectedDayTasks.length === 0 ? (
              <div className="no-tasks-message">
                <div className="no-tasks-icon">📅</div>
                <p>No tasks found on this date.</p>
              </div>
            ) : (
              selectedDayTasks.map(task => {
                let prioColor = 'prio-medium';
                if (task.priority === 'High') prioColor = 'prio-high';
                if (task.priority === 'Low') prioColor = 'prio-low';
                
                return (
                  <div key={task.id} className={`day-task-item ${task.completed ? 'completed' : ''}`}>
                    <div className="dtb-status">
                       {task.completed ? '✅' : (task.inProgress || task.in_progress ? '⚙️' : '📋')}
                    </div>
                    <div className="dtb-content">
                       <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px'}}>
                         <h4 style={{margin:0}}>{task.text}</h4>
                         {!task.completed && task.priority && (
                           <span className={`priority-tag ${prioColor}`} style={{fontSize:'10px', padding:'2px 6px'}}>
                             {task.priority === 'High' ? '🔴' : task.priority === 'Low' ? '🟢' : '🟡'} {task.priority}
                           </span>
                         )}
                       </div>
                       {task.description && <p>{task.description}</p>}
                       <span className="dtb-time">
                          {new Date(task.created_at).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}
                       </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarView;
