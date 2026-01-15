import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./StudentDashboard.css";

function StudentDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: user_id } = location.state || {};
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  const [studentName, setStudentName] = useState("");
  const [allSessions, setAllSessions] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [currentView, setCurrentView] = useState("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // Tracks which session cards are expanded
  const [expandedSessions, setExpandedSessions] = useState({});
  
  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize Notification System
  useEffect(() => {
    if (!user_id) return;

    // Request browser notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Establish SSE connection
    const eventSource = new EventSource(
      `http://localhost:8000/api/notifications/stream/${user_id}`
    );

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✅ Connected to notification stream');
      setIsConnected(true);
    };

    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('Connection confirmed:', data);
    });

    eventSource.addEventListener('notification', (event) => {
      const notification = JSON.parse(event.data);
      console.log('📬 New notification:', notification);
      
      // Add notification to list
      setNotifications(prev => [notification, ...prev]);
      
      // Show browser notification (if permission granted)
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/notification-icon.png'
        });
      }
      
      // Play sound (optional)
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.play().catch(() => {});
      } catch (e) {}
    });

    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
      setIsConnected(false);
      
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        eventSource.close();
      }, 5000);
    };

    // Cleanup on unmount
    return () => {
      console.log('🔌 Disconnecting from notification stream');
      eventSource.close();
    };
  }, [user_id]);

  // Load Student Data with Names, Ratings, and Results
  useEffect(() => {
    const loadData = async () => {
      if (!user_id) {
        setError("No user ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get student info
        const studentRes = await axios.get(
          `http://localhost:8000/get_one_student/${user_id}`
        );
        
        if (studentRes.data) {
          setStudentName(studentRes.data.name || "");
          
          const sid = studentRes.data.student_id;
          
          if (!sid) {
            setError("No student ID found");
            setLoading(false);
            return;
          }

          // Get student sessions
          const sessionsRes = await axios.get(
            `http://localhost:8000/Students_session/${sid}`
          );

          let sessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
          
          // Get admin responses for all sessions
          const responsesPromises = sessions.map(session => 
            axios.get(`http://localhost:8000/sessions/${session.session_id}/check-response`)
              .then(res => ({ session_id: session.session_id, response: res.data }))
              .catch(() => ({ session_id: session.session_id, response: { has_response: false } }))
          );
          
          const responses = await Promise.all(responsesPromises);
          const responseMap = responses.reduce((map, item) => {
            map[item.session_id] = item.response;
            return map;
          }, {});

          // Get EEG data check for all sessions
          const eegCheckPromises = sessions.map(session =>
            axios.get(`http://localhost:8000/check_eeg_data/${session.session_id}`)
              .then(res => ({ session_id: session.session_id, eeg_data: res.data }))
              .catch(() => ({ session_id: session.session_id, eeg_data: { has_eeg: false } }))
          );

          const eegChecks = await Promise.all(eegCheckPromises);
          const eegMap = eegChecks.reduce((map, item) => {
            map[item.session_id] = item.eeg_data;
            return map;
          }, {});

          // Get session summaries for sessions with EEG data
          const summaryPromises = sessions.map(session => {
            if (eegMap[session.session_id]?.has_eeg) {
              return axios.get(`http://localhost:8000/api/session_summary/${session.session_id}`)
                .then(res => ({ session_id: session.session_id, summary: res.data }))
                .catch(() => ({ session_id: session.session_id, summary: null }));
            }
            return Promise.resolve({ session_id: session.session_id, summary: null });
          });

          const summaries = await Promise.all(summaryPromises);
          const summaryMap = summaries.reduce((map, item) => {
            map[item.session_id] = item.summary;
            return map;
          }, {});

          // Enrich sessions with teacher, course names, ratings, and results
          const enrichedSessions = await Promise.all(
            sessions.map(async (session) => {
              try {
                // Get teacher name
                let teacherName = "Unknown Teacher";
                if (session.teacher_id) {
                  try {
                    const teacherRes = await axios.get(
                      `http://localhost:8000/get_Teacher_name/${session.teacher_id}`
                    );
                    teacherName = teacherRes.data || "Unknown Teacher";
                  } catch (err) {
                    console.error("Error fetching teacher name:", err);
                  }
                }

                // Get course name
                let courseName = "Unknown Course";
                if (session.course_id) {
                  try {
                    const courseRes = await axios.get(
                      `http://localhost:8000/Course_by_id/${session.course_id}`
                    );
                    courseName = courseRes.data?.course_name || "Unknown Course";
                  } catch (err) {
                    console.error("Error fetching course name:", err);
                  }
                }

                return {
                  ...session,
                  teacher_name: teacherName,
                  course_name: courseName,
                  // Add admin response data
                  admin_response: responseMap[session.session_id] || { has_response: false },
                  // Add EEG data check
                  has_eeg_data: eegMap[session.session_id]?.has_eeg || false,
                  // Add session summary if available
                  session_summary: summaryMap[session.session_id] || null
                };
              } catch (err) {
                console.error("Error enriching session:", err);
                return {
                  ...session,
                  teacher_name: "Unknown Teacher",
                  course_name: "Unknown Course",
                  admin_response: { has_response: false },
                  has_eeg_data: false,
                  session_summary: null
                };
              }
            })
          );

          setAllSessions(enrichedSessions);

          const today = new Date().toISOString().split("T")[0];

          const todayArr = [];
          const recentArr = [];
          const upcomingArr = [];

          enrichedSessions.forEach((s) => {
            if (!s || !s.date) return;
            
            const sessionDate = s.date.split("T")[0];

            if (sessionDate === today) {
              todayArr.push(s);
            } else if (new Date(sessionDate) > new Date(today)) {
              upcomingArr.push(s);
            } else {
              recentArr.push(s);
            }
          });

          setTodaySessions(todayArr);
          setUpcomingSessions(upcomingArr);
          setRecentSessions(recentArr);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setError(error.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user_id]);

  // Toggle expanded view for a session
  const toggleSessionDetails = (sessionId) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  // Collapse all expanded sessions
  const collapseAllSessions = () => {
    setExpandedSessions({});
  };

  const handleProfileClick = () => {
    setShowProfileDropdown(!showProfileDropdown);
    setShowNotifications(false);
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setShowProfileDropdown(false);
  };

  const handleLogout = () => {
    setShowProfileDropdown(false);
    navigate("/");
  };

  const markAsRead = (index) => {
    setNotifications(prev => 
      prev.map((notif, i) => 
        i === index ? { ...notif, read: true } : notif
      )
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return "Invalid date";
    }
  };
  
  const formatTime = (sec) => {
    if (!sec && sec !== 0) return "N/A";
    
    try {
      return `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(
        Math.floor((sec % 3600) / 60)
      ).padStart(2, "0")}`;
    } catch {
      return "Invalid time";
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    const icons = {
      session_created: '📅',
      session_updated: '🔄',
      session_cancelled: '❌',
      results_available: '✅',
      reminder: '⏰',
      announcement: '📢'
    };
    return icons[type] || '📬';
  };

  // Helper functions for ratings and results
  const renderRatingStars = (rating) => {
    if (!rating || rating === 0) {
      return <span className="no-rating">No rating</span>;
    }
    
    return (
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : 'empty'}`}
          >
            {star <= rating ? '★' : '☆'}
          </span>
        ))}
        <span className="rating-text">({rating}/5)</span>
      </div>
    );
  };

  const getRatingDescription = (rating) => {
    if (!rating) return "No rating";
    const descriptions = {
      1: "Poor",
      2: "Below Average",
      3: "Average",
      4: "Good",
      5: "Excellent"
    };
    return descriptions[rating] || "No rating";
  };

  const getCognitiveLoadColor = (load) => {
    if (!load) return '#6b7280';
    const colors = {
      'very low': '#22c55e',
      'low': '#84cc16',
      'medium': '#eab308',
      'high': '#f97316',
      'very high': '#ef4444',
      'focused': '#3b82f6',
      'relaxed': '#10b981',
      'stressed': '#f59e0b',
      'sleepy': '#8b5cf6'
    };
    return colors[load.toLowerCase()] || '#6b7280';
  };

  // Check what kind of details are available for a session
  const getSessionDetailsAvailable = (session) => {
    const details = {
      hasAdminFeedback: session.admin_response?.has_response || false,
      hasEEGResults: session.has_eeg_data || false,
      hasSessionSummary: session.session_summary !== null,
      hasAnyDetails: false
    };
    
    details.hasAnyDetails = details.hasAdminFeedback || details.hasEEGResults;
    return details;
  };

  const getSessions = () => {
    switch(currentView) {
      case "today": return Array.isArray(todaySessions) ? todaySessions : [];
      case "upcoming": return Array.isArray(upcomingSessions) ? upcomingSessions : [];
      case "recent": return Array.isArray(recentSessions) ? recentSessions : [];
      default: return Array.isArray(allSessions) ? allSessions : [];
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="student-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-dashboard">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <button className="retry-btn" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const sessions = getSessions();
  const expandedCount = Object.values(expandedSessions).filter(Boolean).length;

  return (
    <div className="student-dashboard">
      {/* Header */}
      <header className="student-header" style={{height:100}}>
        <div className="header-left">
          <div className="logo-circle">
            <span className="logo-icon">🧠</span>
          </div>
          <div className="brand-container">
            <h1 className="brand-name">Cognitive AI </h1>
            <p className="brand-sub">My Learning Sessions</p>
          </div>
        </div>

        {studentName && (
          <div className="header-right">
            <div className="welcome-text">
              <span className="welcome-label">Welcome back,</span>
              <span className="welcome-name">{studentName}</span>
            </div>

            {/* Notification Bell */}
            <div className="notification-system" ref={notificationRef}>
              <button 
                className="bell-button"
                onClick={handleNotificationClick}
                aria-label="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>

              {/* Connection Status */}
              <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                <span className="status-dot"></span>
              </div>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="dropdown-header">
                    <h3>Notifications ({unreadCount} unread)</h3>
                    {notifications.length > 0 && (
                      <button onClick={clearAllNotifications} className="clear-btn">
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="no-notifications">
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notif, index) => (
                        <div
                          key={index}
                          className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                          onClick={() => markAsRead(index)}
                          data-type={notif.type}
                        >
                          <div className="notification-icon">
                            {getNotificationIcon(notif.type)}
                          </div>
                          
                          <div className="notification-content">
                            <h4>{notif.title}</h4>
                            <p>{notif.message}</p>
                            <span className="notification-time">
                              {formatTimestamp(notif.timestamp)}
                            </span>
                            
                            {notif.data && Object.keys(notif.data).length > 0 && (
                              <div className="notification-data">
                                {notif.data.venue && <span>📍 {notif.data.venue}</span>}
                                {notif.data.date && <span>📅 {notif.data.date}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Profile Section */}
            <div className="profile-section" ref={dropdownRef}>
              <button 
                className="profile-btn"
                onClick={handleProfileClick}
                aria-expanded={showProfileDropdown}
                aria-label="Profile menu"
                aria-haspopup="true"
              >
                <div className="profile-avatar">
                  {studentName.charAt(0).toUpperCase()}
                </div>
                <span className="profile-name">{studentName}</span>
                <span className={`dropdown-arrow ${showProfileDropdown ? 'up' : 'down'}`}>
                  ▼
                </span>
              </button>

              {showProfileDropdown && (
                <div className="profile-dropdown" role="menu">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {studentName.charAt(0).toUpperCase()}
                    </div>
                    <div className="dropdown-user-info">
                      <div className="dropdown-user-name">{studentName}</div>
                      <div className="dropdown-user-role">Student</div>
                    </div>
                  </div>
                  
                  <div className="dropdown-divider"></div>
                  
                  <div className="dropdown-menu">
                    <button 
                      className="dropdown-item" 
                      onClick={() => {
                        setShowProfileDropdown(false);
                        alert('Profile settings coming soon!');
                      }}
                      role="menuitem"
                    >
                      <span className="dropdown-icon">👤</span>
                      <span>My Profile</span>
                    </button>
                    
                    <button 
                      className="dropdown-item" 
                      onClick={() => {
                        setShowProfileDropdown(false);
                        alert('Help & Support coming soon!');
                      }}
                      role="menuitem"
                    >
                      <span className="dropdown-icon">❓</span>
                      <span>Help & Support</span>
                    </button>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button 
                      className="dropdown-item logout" 
                      onClick={handleLogout}
                      role="menuitem"
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
      <div className="dashboard-content">
        {/* View Tabs */}
        <div className="view-tabs">
          <button
            className={`tab-btn ${currentView === "today" ? "active" : ""}`}
            onClick={() => {
              setCurrentView("today");
              collapseAllSessions();
            }}
          >
            <span className="tab-icon">📅</span>
            Today ({todaySessions.length})
          </button>

          <button
            className={`tab-btn ${currentView === "upcoming" ? "active" : ""}`}
            onClick={() => {
              setCurrentView("upcoming");
              collapseAllSessions();
            }}
          >
            <span className="tab-icon">🔜</span>
            Upcoming ({upcomingSessions.length})
          </button>

          <button
            className={`tab-btn ${currentView === "recent" ? "active" : ""}`}
            onClick={() => {
              setCurrentView("recent");
              collapseAllSessions();
            }}
          >
            <span className="tab-icon">✅</span>
            Recent ({recentSessions.length})
          </button>
        </div>

        {/* Sessions Cards */}
        <div className="sessions-container">
          {!Array.isArray(sessions) || sessions.length === 0 ? (
            <div className="no-sessions-card">
              <div className="no-sessions-icon">📭</div>
              <h3>No Sessions Found</h3>
              <p>You don't have any {currentView} sessions at the moment.</p>
            </div>
          ) : (
            <>
              {/* Collapse All Button (only shows when sessions are expanded) */}
              {expandedCount > 0 && (
                <div className="collapse-all-container">
                  <button 
                    className="collapse-all-btn"
                    onClick={collapseAllSessions}
                  >
                    <span className="collapse-icon">↑</span>
                    Collapse All Details ({expandedCount} expanded)
                  </button>
                </div>
              )}
              
              <div className="sessions-grid">
                {sessions.map((session, index) => {
                  const isExpanded = expandedSessions[session.session_id] || false;
                  const detailsAvailable = getSessionDetailsAvailable(session);
                  
                  return (
                    <div key={index} className={`session-card ${isExpanded ? 'expanded' : ''}`}>
                      <div className="session-header">
                        <div className="session-date">
                          <span className="date-icon">📅</span>
                          <span>{formatDate(session.date)}</span>
                        </div>
                        <div className={`session-status ${currentView}`}>
                          {currentView === "today" ? "Today" : 
                          currentView === "upcoming" ? "Upcoming" : "Completed"}
                        </div>
                      </div>
                      
                      <div className="session-body">
                        {/* Course Name */}
                        <div className="session-detail">
                          <span className="detail-icon">📖</span>
                          <div className="detail-content">
                            <span className="detail-label">Course</span>
                            <span className="detail-value">{session.course_name || "Not specified"}</span>
                          </div>
                        </div>

                        {/* Teacher Name */}
                        <div className="session-detail">
                          <span className="detail-icon">👨‍🏫</span>
                          <div className="detail-content">
                            <span className="detail-label">Teacher</span>
                            <span className="detail-value">{session.teacher_name || "Not specified"}</span>
                          </div>
                        </div>

                        {/* Start Time */}
                        <div className="session-detail">
                          <span className="detail-icon">🕐</span>
                          <div className="detail-content">
                            <span className="detail-label">Start Time</span>
                            <span className="detail-value">{formatTime(session.start_time)}</span>
                          </div>
                        </div>

                        {/* End Time */}
                        <div className="session-detail">
                          <span className="detail-icon">🕕</span>
                          <div className="detail-content">
                            <span className="detail-label">End Time</span>
                            <span className="detail-value">{formatTime(session.end_time)}</span>
                          </div>
                        </div>

                        {/* Venue */}
                        <div className="session-detail">
                          <span className="detail-icon">📍</span>
                          <div className="detail-content">
                            <span className="detail-label">Venue</span>
                            <span className="detail-value">{session.venue || "Not specified"}</span>
                          </div>
                        </div>

                        {/* Quick Info Badges (always shown) */}
                        {currentView === "recent" && (
                          <div className="session-badges">
                            {session.admin_response?.has_response && (
                              <span className="badge badge-feedback">
                                <span className="badge-icon">⭐</span>
                                Admin Feedback
                              </span>
                            )}
                            {session.has_eeg_data && (
                              <span className="badge badge-eeg">
                                <span className="badge-icon">🧠</span>
                                Brain Data Available
                              </span>
                            )}
                            {!session.admin_response?.has_response && !session.has_eeg_data && (
                              <span className="badge badge-no-data">
                                <span className="badge-icon">📝</span>
                                Basic Session Only
                              </span>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="session-actions">
                          {currentView === "recent" && detailsAvailable.hasAnyDetails && (
                            <button
                              className={`action-btn ${isExpanded ? 'hide-details' : 'show-details'}`}
                              onClick={() => toggleSessionDetails(session.session_id)}
                            >
                              <span className="action-icon">
                                {isExpanded ? '' : ''}
                              </span>
                              {isExpanded ? 'Hide Details' : 'Show Details'}
                              <span className="action-arrow">
                                {isExpanded ? '↑' : '↓'}
                              </span>
                            </button>
                          )}
                          
                          {/* View Detailed Results Button (always available for EEG data) */}
                        
                        </div>

                        {/* Expanded Details Section */}
                        {isExpanded && (
                          <div className="session-details-expanded">
                            <div className="expanded-header">
                              <h4>Session Details & Results</h4>
                            </div>

                            {/* Admin Feedback Section */}
                            {session.admin_response?.has_response && (
                              <div className="details-section">
                                <div className="section-header">
                                  <span className="section-icon">⭐</span>
                                  <h5>Admin Feedback</h5>
                                </div>
                                
                                {/* Rating */}
                                <div className="rating-display">
                                  {renderRatingStars(session.admin_response.rating)}
                                  <span className="rating-description">
                                    {getRatingDescription(session.admin_response.rating)}
                                  </span>
                                </div>
                                
                                {/* Admin Response */}
                                {session.admin_response.response && (
                                  <div className="admin-response">
                                    <span className="response-label">Feedback:</span>
                                    <p className="response-text">{session.admin_response.response}</p>
                                  </div>
                                )}
                                
                                {/* Response Date */}
                                {session.admin_response.created_at && (
                                  <div className="response-date">
                                    <small>Given on {new Date(session.admin_response.created_at).toLocaleDateString()}</small>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* EEG Results Summary */}
                            {session.has_eeg_data && session.session_summary && (
                              <div className="details-section">
                                <div className="section-header">
                                  <span className="section-icon">🧠</span>
                                  <h5>Brain Activity Analysis</h5>
                                </div>
                                
                                {/* Engagement Score */}
                                {session.session_summary.engagement_score !== undefined && (
                                  <div className="engagement-meter">
                                    <div className="engagement-label">
                                      <span>Engagement Score</span>
                                      <span className="engagement-value">
                                        {session.session_summary.engagement_score}/100
                                      </span>
                                    </div>
                                    <div className="progress-bar">
                                      <div 
                                        className="progress-fill"
                                        style={{ width: `${session.session_summary.engagement_score}%` }}
                                      ></div>
                                    </div>
                                    <div className="engagement-status">
                                      {session.session_summary.engagement_score >= 80 ? "Excellent Focus" :
                                      session.session_summary.engagement_score >= 60 ? "Good Focus" :
                                      session.session_summary.engagement_score >= 40 ? "Moderate Focus" :
                                      "Needs Improvement"}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Cognitive Load Distribution */}
                                {session.session_summary.cognitive_load_distribution && 
                                 Object.keys(session.session_summary.cognitive_load_distribution).length > 0 && (
                                  <div className="cognitive-load">
                                    <div className="load-label">Cognitive Load Distribution:</div>
                                    <div className="load-bars">
                                      {Object.entries(session.session_summary.cognitive_load_distribution)
                                        .sort(([a], [b]) => {
                                          const order = ['very low', 'low', 'medium', 'high', 'very high', 'focused', 'relaxed', 'stressed', 'sleepy'];
                                          return order.indexOf(a) - order.indexOf(b);
                                        })
                                        .map(([level, percentage]) => (
                                          <div key={level} className="load-bar-item">
                                            <div className="load-bar-label">
                                              <span 
                                                className="load-dot"
                                                style={{ backgroundColor: getCognitiveLoadColor(level) }}
                                              ></span>
                                              <span className="load-level">{level.replace('_', ' ').toLowerCase()}</span>
                                            </div>
                                            <div className="load-bar-wrapper">
                                              <div 
                                                className="load-bar-fill"
                                                style={{ 
                                                  width: `${percentage}%`,
                                                  backgroundColor: getCognitiveLoadColor(level)
                                                }}
                                              ></div>
                                            </div>
                                            <span className="load-percentage">
                                              {typeof percentage === 'number' ? percentage.toFixed(1) : '0.0'}%
                                            </span>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Quick Stats */}
                                {session.session_summary.attention_dips_count !== undefined && (
                                  <div className="quick-stats">
                                    <div className="stat-item">
                                      <span className="stat-label">Attention Dips:</span>
                                      <span className="stat-value">{session.session_summary.attention_dips_count}</span>
                                    </div>
                                    <div className="stat-item">
                                      <span className="stat-label">Session Duration:</span>
                                      <span className="stat-value">
                                        {session.session_summary.duration_formatted || 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* No Data Message */}
                            {!session.admin_response?.has_response && !session.has_eeg_data && (
                              <div className="no-details-message">
                                <p>No additional details available for this session.</p>
                              </div>
                            )}

                            {/* Close Details Button */}
                            <div className="close-details-container">
                              <button 
                                className="close-details-btn"
                                onClick={() => toggleSessionDetails(session.session_id)}
                              >
                                <span className="close-icon">×</span>
                                Close Details
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;