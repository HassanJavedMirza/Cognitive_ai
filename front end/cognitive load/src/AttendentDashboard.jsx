import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./AttendentDashboard.css";

function AttendentDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = location.state || {};

  const [attendentData, setAttendentData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [view, setView] = useState("today");
  const [loading, setLoading] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [deletingSession, setDeletingSession] = useState(null);
  const dropdownRef = useRef(null);

  const [todaySessions, setTodaySessions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);

  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [animateBell, setAnimateBell] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowProfileDropdown(false);
        setShowNotifications(false);
        setShowDeleteModal(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    if (!id) {
      navigate("/", { replace: true });
      return;
    }
    loadData();
  }, [id, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch attendent data
      const attendentRes = await axios.get(`http://localhost:8000/Attendent_by_id/${id}`);
      setAttendentData(attendentRes.data);

      // Fetch all sessions
      const sessionRes = await axios.get(`http://localhost:8000/all_Sessions`);
      const allSessions = sessionRes.data;

      setSessions(allSessions);

      // Categorize sessions
      const todayList = allSessions.filter(
        (sess) => new Date(sess.date).toDateString() === today.toDateString()
      );
      const upcomingList = allSessions.filter((sess) => new Date(sess.date) > today);
      const recentList = allSessions.filter((sess) => new Date(sess.date) < today);

      setTodaySessions(todayList);
      setUpcomingSessions(upcomingList);
      setRecentSessions(recentList);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Server-Sent Events (Notifications)
  useEffect(() => {
    const evtSource = new EventSource("http://localhost:8000/events/session");

    evtSource.onmessage = (event) => {
      const msg = event.data;
      setNotifications((prev) => [{ id: Date.now(), message: msg }, ...prev]);
      setAnimateBell(true);
      setTimeout(() => setAnimateBell(false), 600);
      loadData();
    };

    evtSource.onerror = () => {
      console.log("SSE connection error");
    };

    return () => evtSource.close();
  }, []);

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((sec % 3600) / 60)
      .toString()
      .padStart(2, "0");
    return `${h}:${m}`;
  };

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    navigate("/", { replace: true });
  };

  const handleProfileClick = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const handleStartStream = (sessionId,teacher_name,student_name) => {
    navigate("/start_stream", { state: { sid: sessionId , t_name:teacher_name, s_name:student_name} });
  };

  const handleViewResult = async (sessionId) => {
    try {
      // Fetch session details to get teacher and student names
      const sessionRes = await axios.get(`http://localhost:8000/Sessions_by_sid/${sessionId}`);
      const sessionData = sessionRes.data;
      
      if (sessionData) {
        navigate("/view_results", { 
          state: { 
            sid: sessionId,
            teacherName: sessionData.teacher_name || "Teacher",
            studentName: sessionData.student_name || "Student"
          } 
        });
      } else {
        navigate("/view-results", { 
          state: { 
            sid: sessionId,
            teacherName: "Teacher",
            studentName: "Student"
          } 
        });
      }
    } catch (err) {
      console.error("Error fetching session details:", err);
      // Navigate anyway with just session ID
      navigate("/view-results", { state: { sid: sessionId } });
    }
  };

  const handleEditResult = (sessionId) => {
    navigate("/Upload_Results", { state: { sid: sessionId, editMode: true } });
  };

  const handleUploadResults = (sessionId) => {
    navigate("/Upload_Results", { state: { sid: sessionId } });
  };

  const openDeleteModal = async (sessionId) => {
    setSelectedSession(sessionId);
    
    try {
      const sessionRes = await axios.get(`http://localhost:8000/Sessions_by_sid/${sessionId}`);
      setSessionToDelete(sessionRes.data);
      setShowDeleteModal(true);
    } catch (err) {
      console.error("Error fetching session details:", err);
    }
  };

  const handleDeleteResults = async () => {
    if (!selectedSession) return;
    
    setDeletingSession(selectedSession);
    
    try {
      // First, get the result_id for this session
      const resultsRes = await axios.get(
        `http://localhost:8000/teacher_session_results_by_sid/${selectedSession}`
      );
      
      if (resultsRes.data.error || resultsRes.data.length === 0) {
        alert("No results found to delete!");
        setDeletingSession(null);
        return;
      }

      const resultId = resultsRes.data[0].result_id;
      
      // Call the delete API
      const deleteRes = await axios.delete(
        `http://localhost:8000/clear_session_result/${resultId}`
      );

      if (deleteRes.data.message) {
        // Show success notification
        setNotifications(prev => [
          { 
            id: Date.now(), 
            message: `Results deleted for session ${selectedSession}`,
            type: 'success'
          }, 
          ...prev
        ]);
        
        // Refresh data
        loadData();
      }
    } catch (err) {
      console.error("Error deleting results:", err);
      alert("Failed to delete session results!");
      
      // Add error notification
      setNotifications(prev => [
        { 
          id: Date.now(), 
          message: `Failed to delete results for session ${selectedSession}`,
          type: 'error'
        }, 
        ...prev
      ]);
    } finally {
      setDeletingSession(null);
      setShowDeleteModal(false);
      setSelectedSession(null);
      setSessionToDelete(null);
    }
  };

  const confirmDelete = async () => {
    await handleDeleteResults();
  };

  const getCurrentSessions = () => {
    switch (view) {
      case "today":
        return todaySessions;
      case "upcoming":
        return upcomingSessions;
      case "recent":
        return recentSessions;
      default:
        return [];
    }
  };

  const getSessionStats = () => {
    return {
      today: todaySessions.length,
      upcoming: upcomingSessions.length,
      recent: recentSessions.length,
      total: sessions.length,
    };
  };

  const stats = getSessionStats();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="attendant-container">
      {/* Enhanced Header - Matching Admin Dashboard */}
      <header className="attendant-header" style={{height:100}}>
        <div className="header-left">
          <div className="logo-circle">
            <span className="logo-icon">🧠</span>
          </div>
          <div className="brand-container">
            <h1 className="brand-name">Cognitive AI Attendent</h1>
            <p className="brand-sub">Session Management Portal</p>
          </div>
        </div>

        {attendentData && (
          <div className="header-right">
            <div className="welcome-text">
              <span className="welcome-label">Welcome back,</span>
              <span className="welcome-name">{attendentData.name}</span>
            </div>

            {/* Notification Bell */}
            <div className="notification-container">
              <button
                className={`notification-bell ${animateBell ? 'notification-bell-ring' : ''}`}
                onClick={handleBellClick}
                aria-label="Notifications"
              >
                🔔
                {notifications.length > 0 && (
                  <span className="notification-badge">{notifications.length}</span>
                )}
              </button>

              {showNotifications && (
                <div className="notification-panel">
                  <div className="notification-header">
                    <h4 className="notification-title">Notifications</h4>
                    {notifications.length > 0 && (
                      <button
                        className="clear-all-btn"
                        onClick={() => setNotifications([])}
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <p className="empty-note">You're all caught up 🎉</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="notification-item">
                          <span className="notification-icon">🔔</span>
                          <span className="notification-text">{n.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Section with Dropdown */}
            <div className="profile-section" ref={dropdownRef}>
              <button
                className="profile-btn"
                onClick={handleProfileClick}
                aria-expanded={showProfileDropdown}
              >
                <div className="profile-avatar">
                  {attendentData.name.charAt(0).toUpperCase()}
                </div>
                <span className="profile-name">{attendentData.name}</span>
                <span
                  className={`dropdown-arrow ${showProfileDropdown ? 'dropdown-arrow-up' : ''}`}
                >
                  ▼
                </span>
              </button>

              {showProfileDropdown && (
                <div className="profile-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {attendentData.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="dropdown-user-info">
                      <div className="dropdown-user-name">{attendentData.name}</div>
                      <div className="dropdown-user-role">Attendent</div>
                    </div>
                  </div>

                  <div className="dropdown-divider"></div>

                  <div className="dropdown-menu">
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        alert("Settings feature coming soon!");
                      }}
                    >
                      <span className="dropdown-icon">⚙️</span>
                      <span>Settings</span>
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        alert("Help & Support feature coming soon!");
                      }}
                    >
                      <span className="dropdown-icon">❓</span>
                      <span>Help & Support</span>
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        alert("Edit profile feature coming soon!");
                      }}
                    >
                      <span className="dropdown-icon">👤</span>
                      <span>Edit Profile</span>
                    </button>

                    <div className="dropdown-divider"></div>

                    <button
                      className="dropdown-item dropdown-item-logout"
                      onClick={handleLogout}
                    >
                      <span className="dropdown-icon">🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="attendant-main">
        {/* Dashboard Intro & Stats */}
        <section className="intro-section" style={{background:"#1f0c53ff"}}>
          <div className="intro-text">
            <h2 className="intro-title">Session Overview</h2>
            <p className="intro-subtitle" >
              Manage and monitor classroom sessions efficiently
            </p>
          </div>
        </section>

        {/* View Selector Buttons */}
        <div className="view-selector">
          <button
            className={`view-btn ${view === "today" ? 'view-btn-active' : ''}`}
            onClick={() => setView("today")}
          >
            <span className="view-btn-icon">📅</span>
            Today ({stats.today})
          </button>
          <button
            className={`view-btn ${view === "upcoming" ? 'view-btn-active' : ''}`}
            onClick={() => setView("upcoming")}
          >
            <span className="view-btn-icon">⏰</span>
            Upcoming ({stats.upcoming})
          </button>
          <button
            className={`view-btn ${view === "recent" ? 'view-btn-active' : ''}`}
            onClick={() => setView("recent")}
          >
            <span className="view-btn-icon">📊</span>
            Recent ({stats.recent})
          </button>
        </div>

        {/* Sessions List */}
        <div className="sessions-container">
          {getCurrentSessions().length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3 className="empty-title">No sessions found</h3>
              <p className="empty-text">
                {view === "today" && "No sessions scheduled for today"}
                {view === "upcoming" && "No upcoming sessions"}
                {view === "recent" && "No recent sessions"}
              </p>
            </div>
          ) : (
            getCurrentSessions().map((session) => (
              <div key={session.session_id} className="session-card">
                <div className="session-header">
                  <div className="session-header-left">
                    <h3 className="session-title">{session.course_name}</h3>
                    <span className="session-id">ID: {session.session_id}</span>
                  </div>
                  <div className="session-date">{formatDate(session.date)}</div>
                </div>

                <div className="session-body" >
                  <div className="session-info">
                    <div className="info-row">
                      <span className="info-icon">👨‍🏫</span>
                      <span className="info-label" style={{color:"black"}}>Teacher:</span>
                      <span className="info-value" style={{color:"black"}}>{session.teacher_name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-icon">👨‍🎓</span>
                      <span className="info-label" style={{color:"black"}}>Student:</span>
                      <span className="info-value" style={{color:"black"}}>{session.student_name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-icon">⏰</span>
                      <span className="info-label" style={{color:"black"}}>Time:</span>
                      <span className="info-value" style={{color:"black"}}>
                        {session.start_time} - {session.end_time}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-icon">📍</span>
                      <span className="info-label" style={{color:"black"}}>Venue:</span>
                      <span className="info-value" style={{color:"black"}}>{session.venue}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="session-actions">
                    {view === "today" && (
                      <button
                        className="action-btn action-btn-primary"
                        onClick={() => handleStartStream(session.session_id)}
                        style={{color:"black"}}
                      >
                        ▶️ Start Stream
                      </button>
                    )}

                    {view === "recent" && (
                      <>
                        <button
                          className="action-btn action-btn-secondary"
                          onClick={() => handleViewResult(session.session_id)}
                          style={{background:"#059669"}}
                        >
                          📂 View Results
                        </button>
                        <button
                          className="action-btn action-btn-secondary"
                          onClick={() => handleEditResult(session.session_id)}
                          style={{background:"#059669"}}
                        >
                          ✏️ Edit Results
                        </button>
                        <button
                          className="action-btn action-btn-success"
                          onClick={() => handleUploadResults(session.session_id)}
                          style={{background:"#059669"}}
                        >
                          📤 Upload Results
                        </button>
                        <button
                          className="action-btn action-btn-danger"
                          onClick={() => openDeleteModal(session.session_id)}
                          title="Delete all videos and EEG data for this session"
                          style={{background:"#059669"}}
                        >
                          🗑️ Delete Results
                        </button>
                      </>
                    )}

                    {/* {view === "upcoming" && (
                      <button
                        className="action-btn action-btn-secondary"
                        onClick={() => handleStartStream(session.session_id,session.teacher_name,session.student_name,session.arid)}
                        style={{color:"black"}}
                      >
                       
                        Start Stream
                      </button>
                    )} */}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="attendant-footer">
        <p className="footer-text">
          © {new Date().getFullYear()} Cognitive AI Attendent Portal. All rights reserved.
        </p>
      </footer>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && sessionToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Delete</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {/* <p>Are you sure you want to delete all results for:</p>
              <div className="session-details">
                <div className="detail-item">
                  <span className="detail-label">Course:</span>
                  <span className="detail-value">{sessionToDelete.course_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Teacher:</span>
                  <span className="detail-value">{sessionToDelete.teacher_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Student:</span>
                  <span className="detail-value">{sessionToDelete.student_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{formatDate(sessionToDelete.date)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Time:</span>
                  <span className="detail-value">
                    {formatTime(sessionToDelete.start_time)} - {formatTime(sessionToDelete.end_time)}
                  </span>
                </div>
              </div> */}
              
              <div className="warning-box">
                <div className="warning-icon">⚠️</div>
                <div className="warning-text">
                  <p className="warning-title">Warning: This action cannot be undone!</p>
                  <p className="warning-desc">
                    This will permanently delete all videos and EEG data for this session.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSession(null);
                  setSessionToDelete(null);
                }}
                disabled={deletingSession === selectedSession}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-delete"
                onClick={confirmDelete}
                disabled={deletingSession === selectedSession}
              >
                {deletingSession === selectedSession ? (
                  <>
                    <span className="loading-spinner-small"></span>
                    Deleting...
                  </>
                ) : (
                  'Delete Results'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendentDashboard;