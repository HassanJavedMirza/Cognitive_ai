import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./TeacherDashboard.css";

function TeacherDashboard() {
  
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = location.state || {};
  
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  const [teacherName, setTeacherName] = useState("");
  const [teacherId, setTeacherId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [view, setView] = useState("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [todaySessions, setTodaySessions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);

  // NEW STATES FOR RESULTS, RESPONSES, RATINGS AND REPORTS
  const [sessionResults, setSessionResults] = useState([]);
  const [adminResponses, setAdminResponses] = useState([]);
  const [sessionRatings, setSessionRatings] = useState([]);
  const [selectedSessionForReport, setSelectedSessionForReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState(null);
  const [sessionDetailsModal, setSessionDetailsModal] = useState(false);

  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  // Load teacher data with full session details
  useEffect(() => {
    if (!id) {
      console.error("No teacher ID provided");
      setError("Teacher ID not found. Please login again.");
      setLoading(false);
      return;
    }
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      console.log("Loading data for teacher ID:", id);
      
      // Get teacher info
      const teacherRes = await axios.get(`http://localhost:8000/get_teacher_by_user_id/${id}`);
      console.log("Teacher response:", teacherRes.data);
      
      if (!teacherRes.data || !teacherRes.data.name) {
        throw new Error("Teacher data not found");
      }
      
      setTeacherName(teacherRes.data.name);
      const teacherId = teacherRes.data.id || teacherRes.data.teacher_id;
      setTeacherId(teacherId);
      console.log("Teacher ID:", teacherId);

      // Get teacher sessions
      let sessionData = [];
      try {
        const sessionRes = await axios.get(`http://localhost:8000/teachers_session/${teacherId}`);
        console.log("Session response:", sessionRes.data);
        
        // Handle different response formats
        if (sessionRes.data && typeof sessionRes.data === 'object') {
          if (sessionRes.data.error === 'Not found!') {
            console.log("No sessions found for this teacher");
            // Continue with empty sessions array
          } else if (Array.isArray(sessionRes.data)) {
            sessionData = sessionRes.data;
          } else if (sessionRes.data.sessions && Array.isArray(sessionRes.data.sessions)) {
            sessionData = sessionRes.data.sessions;
          } else if (sessionRes.data.results && Array.isArray(sessionRes.data.results)) {
            sessionData = sessionRes.data.results;
          } else if (sessionRes.data.data && Array.isArray(sessionRes.data.data)) {
            sessionData = sessionRes.data.data;
          } else if (!sessionRes.data.error) {
            // Single session object
            sessionData = [sessionRes.data];
          }
        }
      } catch (sessionErr) {
        console.warn("Error fetching sessions:", sessionErr.message);
        // Continue with empty sessions array
      }

      const allSessions = [];

      // Enrich each session with course name and student name
      for (const s of sessionData) {
        try {
          // Validate session object
          if (!s || typeof s !== 'object') {
            console.warn("Invalid session object:", s);
            continue;
          }

          // Get course name
          let courseName = "Unknown Course";
          if (s.course_id) {
            try {
              const courseRes = await axios.get(`http://localhost:8000/Course_by_id/${s.course_id}`);
              if (courseRes.data && courseRes.data.course_name) {
                courseName = courseRes.data.course_name;
              } else if (courseRes.data && typeof courseRes.data === 'string') {
                courseName = courseRes.data;
              }
            } catch (courseErr) {
              console.warn(`Error fetching course ${s.course_id}:`, courseErr.message);
            }
          }

          // Get student name
          let studentName = "Unknown Student";
          if (s.student_id) {
            try {
              const studentRes = await axios.get(`http://localhost:8000/get_student_name_by_id/${s.student_id}`);
              if (studentRes.data && typeof studentRes.data === 'string') {
                studentName = studentRes.data;
              } else if (studentRes.data && studentRes.data.name) {
                studentName = studentRes.data.name;
              }
            } catch (studentErr) {
              console.warn(`Error fetching student ${s.student_id}:`, studentErr.message);
            }
          }

          // Ensure session has required properties
          const enrichedSession = {
            session_id: s.session_id || Date.now() + Math.random(),
            course_id: s.course_id || null,
            student_id: s.student_id || null,
            date: s.date || new Date().toISOString().split('T')[0],
            start_time: s.start_time || "09:00",
            end_time: s.end_time || "10:00",
            venue: s.venue || "Not specified",
            course_name: courseName,
            student_name: studentName
          };

          allSessions.push(enrichedSession);
        } catch (err) {
          console.error("Error enriching session:", err);
          // Skip this session
        }
      }

      console.log("Processed sessions:", allSessions);
      setSessions(allSessions);

      // Categorize sessions with safe date parsing
      const todayList = [];
      const upcomingList = [];
      const recentList = [];

      allSessions.forEach(sess => {
        try {
          const sessionDate = new Date(sess.date);
          sessionDate.setHours(0, 0, 0, 0);
          
          if (sessionDate.toDateString() === today.toDateString()) {
            todayList.push(sess);
          } else if (sessionDate > today) {
            upcomingList.push(sess);
          } else {
            recentList.push(sess);
          }
        } catch (dateErr) {
          console.warn(`Invalid date for session ${sess.session_id}:`, sess.date);
          recentList.push(sess); // Default to recent if date is invalid
        }
      });

      setTodaySessions(todayList);
      setUpcomingSessions(upcomingList);
      setRecentSessions(recentList);
      
      console.log("Categorized sessions - Today:", todayList.length, "Upcoming:", upcomingList.length, "Recent:", recentList.length);
      
      // Load additional data for results, responses and ratings
      await loadSessionResults(teacherId);
      await loadAdminResponses(teacherId);
      await loadSessionRatings(teacherId);
      
      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to load data. Please try again.");
      setSessions([]);
      setTodaySessions([]);
      setUpcomingSessions([]);
      setRecentSessions([]);
      setLoading(false);
    }
  };

  // Load session results
  const loadSessionResults = async (teacherId) => {
    try {
      // Get session results for teacher's sessions
      const results = [];
      
      // For each recent session, check if it has results
      for (const session of recentSessions) {
        try {
          const response = await axios.get(`http://localhost:8000/teacher_session_results_by_sid/${session.session_id}`);
          
          if (response.data && !response.data.error) {
            results.push({
              session_id: session.session_id,
              student_name: session.student_name,
              course_name: session.course_name,
              date: session.date,
              results: response.data
            });
          }
        } catch (err) {
          // Skip if no results found
        }
      }
      
      setSessionResults(results);
    } catch (err) {
      console.error("Error loading session results:", err);
    }
  };

  // Load admin responses
  const loadAdminResponses = async (teacherId) => {
    try {
      const response = await axios.get(`http://localhost:8000/responses/`);
      if (response.data && response.data.responses) {
        // Filter responses for this teacher's sessions
        const teacherSessionIds = sessions.map(s => s.session_id);
        const filteredResponses = response.data.responses.filter(
          r => teacherSessionIds.includes(r.session_id)
        );
        setAdminResponses(filteredResponses);
      }
    } catch (err) {
      console.error("Error loading admin responses:", err);
    }
  };

  // Load session ratings
  const loadSessionRatings = async (teacherId) => {
    try {
      const ratings = [];
      for (const session of recentSessions) {
        try {
          const response = await axios.get(`http://localhost:8000/sessions/${session.session_id}/check-response`);
          if (response.data.has_response && response.data.rating) {
            ratings.push({
              session_id: session.session_id,
              student_name: session.student_name,
              date: session.date,
              rating: response.data.rating,
              response: response.data.response
            });
          }
        } catch (err) {
          // Skip if no rating
        }
      }
      setSessionRatings(ratings);
    } catch (err) {
      console.error("Error loading session ratings:", err);
    }
  };

  // Generate report for a session
  const generateSessionReport = async (sessionId) => {
    setIsGeneratingReport(true);
    try {
      setSelectedSessionForReport(sessionId);
      
      // Get session details
      const session = sessions.find(s => s.session_id === sessionId);
      
      // Get EEG summary if available
      let eegSummary = null;
      try {
        const summaryResponse = await axios.get(`http://localhost:8000/api/session_summary/${sessionId}`);
        if (summaryResponse.data && !summaryResponse.data.error) {
          eegSummary = summaryResponse.data;
        }
      } catch (e) {
        // EEG data not available
      }
      
      // Get admin response if exists
      let adminResponse = null;
      try {
        const responseCheck = await axios.get(`http://localhost:8000/sessions/${sessionId}/check-response`);
        if (responseCheck.data.has_response) {
          adminResponse = responseCheck.data;
        }
      } catch (e) {
        // No admin response
      }
      
      // Get session results
      let sessionResultsData = null;
      try {
        const resultsResponse = await axios.get(`http://localhost:8000/teacher_session_results_by_sid/${sessionId}`);
        if (resultsResponse.data && !resultsResponse.data.error) {
          sessionResultsData = resultsResponse.data;
        }
      } catch (e) {
        // No results
      }
      
      const report = {
        session_id: sessionId,
        date: session?.date,
        student_name: session?.student_name,
        course_name: session?.course_name,
        venue: session?.venue,
        time: `${formatTime(session?.start_time)} - ${formatTime(session?.end_time)}`,
        eeg_summary: eegSummary,
        admin_response: adminResponse,
        session_results: sessionResultsData,
        generated_at: new Date().toISOString(),
        teacher_name: teacherName
      };
      
      setReportData(report);
      
    } catch (err) {
      console.error("Error generating report:", err);
      alert("Error generating report");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Export report as PDF
  const exportReportAsPDF = async (sessionId) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/export/session_report/${sessionId}?format=pdf`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `session_${sessionId}_report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("Error exporting report as PDF");
    }
  };

  // View session details
  const viewSessionDetails = async (sessionId) => {
    setSelectedSessionForDetails(sessionId);
    setSessionDetailsModal(true);
  };

  // View response for a session
  const viewSessionResponse = async (sessionId) => {
    try {
      const response = await axios.get(`http://localhost:8000/sessions/${sessionId}/check-response`);
      if (response.data.has_response) {
        alert(`Admin Response for Session ${sessionId}:\n\nRating: ${response.data.rating}/5\n\nFeedback: ${response.data.response}`);
      } else {
        alert("No admin response available for this session.");
      }
    } catch (err) {
      console.error("Error viewing response:", err);
      alert("Error loading response");
    }
  };

  // Initialize Notification System (SSE)
  useEffect(() => {
    if (!teacherId) return;

    // Request browser notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Connect to SSE endpoint
    const eventSource = new EventSource("http://localhost:8000/events/session");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✅ Connected to notification stream');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      const msg = event.data;
      console.log('📬 New notification:', msg);

      const notification = {
        id: Date.now(),
        message: msg,
        timestamp: new Date().toISOString(),
        read: false
      };

      setNotifications(prev => [notification, ...prev]);

      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification('New Session Update', {
          body: msg,
          icon: '/notification-icon.png'
        });
      }

      // Reload data to get new session
      loadData();
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
      setIsConnected(false);
    };

    return () => {
      console.log('🔌 Disconnecting from notification stream');
      eventSource.close();
    };
  }, [teacherId]);

  const formatDate = (d) => {
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) {
        return "Date not set";
      }
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return "Invalid date";
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "Not set";
    
    try {
      // Handle string time format (e.g., "14:30:00" or "14:30")
      if (typeof timeStr === 'string') {
        const timeParts = timeStr.split(':');
        if (timeParts.length >= 2) {
          const hours = parseInt(timeParts[0]);
          const minutes = parseInt(timeParts[1]);
          
          if (!isNaN(hours) && !isNaN(minutes)) {
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
          }
        }
      }
      
      // If time is in seconds (as number)
      if (typeof timeStr === 'number') {
        const h = Math.floor(timeStr / 3600).toString().padStart(2, "0");
        const m = Math.floor((timeStr % 3600) / 60).toString().padStart(2, "0");
        return `${h}:${m}`;
      }
      
      return timeStr; // Return original if can't parse
    } catch {
      return "Invalid time";
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "Just now";
      }
      
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
      return date.toLocaleDateString();
    } catch {
      return "Just now";
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setShowProfileDropdown(false);
  };

  const handleProfileClick = () => {
    setShowProfileDropdown(!showProfileDropdown);
    setShowNotifications(false);
  };

  const handleLogout = () => {
    setShowProfileDropdown(false);
    navigate("/");
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getCurrentSessions = () => {
    switch(view) {
      case "today": return todaySessions;
      case "upcoming": return upcomingSessions;
      case "recent": return recentSessions;
      case "results": return sessionResults;
      case "responses": return adminResponses;
      case "ratings": return sessionRatings;
      default: return sessions;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const currentSessions = getCurrentSessions();

  // Render star rating
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`star ${i <= rating ? 'filled' : ''}`}>
          {i <= rating ? '★' : '☆'}
        </span>
      );
    }
    return <div className="rating-stars">{stars}</div>;
  };

  // Render different content based on view
  const renderContent = () => {
    switch(view) {
      case "results":
        return renderResultsView();
      case "responses":
        return renderResponsesView();
      case "ratings":
        return renderRatingsView();
      case "reports":
        return renderReportsView();
      case "today":
      case "upcoming":
      case "recent":
      default:
        return renderSessionsView();
    }
  };

  const renderResultsView = () => (
    <div className="results-container">
      <h2 className="section-title">Session Results</h2>
      {sessionResults.length === 0 ? (
        <div className="no-data-card">
          <div className="no-data-icon">📊</div>
          <h3>No Results Available</h3>
          <p>Session results will appear here once sessions are completed and processed.</p>
        </div>
      ) : (
        <div className="results-grid">
          {sessionResults.map((result, idx) => (
            <div key={idx} className="result-card">
              <div className="result-header">
                <h4>Session #{result.session_id}</h4>
                <span className="result-date">{formatDate(result.date)}</span>
              </div>
              <div className="result-body">
                <div className="result-info">
                  <div className="info-item">
                    <span className="label">Student:</span>
                    <span className="value">{result.student_name}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Course:</span>
                    <span className="value">{result.course_name}</span>
                  </div>
                </div>
                <div className="result-actions">
                  <button 
                    className="action-btn view-btn"
                    onClick={() => viewSessionDetails(result.session_id)}
                  >
                    View Details
                  </button>
                  <button 
                    className="action-btn report-btn"
                    onClick={() => generateSessionReport(result.session_id)}
                  >
                    Generate Report
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderResponsesView = () => (
    <div className="responses-container">
      <h2 className="section-title">Admin Responses</h2>
      {adminResponses.length === 0 ? (
        <div className="no-data-card">
          <div className="no-data-icon">💬</div>
          <h3>No Responses Yet</h3>
          <p>Admin responses will appear here when available.</p>
        </div>
      ) : (
        <div className="responses-list">
          {adminResponses.map((response, idx) => {
            const session = sessions.find(s => s.session_id === response.session_id);
            return (
              <div key={idx} className="response-card">
                <div className="response-header">
                  <h4>Session #{response.session_id}</h4>
                  <span className="response-date">{formatDate(response.created_at)}</span>
                </div>
                <div className="response-body">
                  <div className="response-info">
                    <div className="info-item">
                      <span className="label">Student:</span>
                      <span className="value">{session?.student_name || 'Unknown'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Rating:</span>
                      <div className="value">{renderStars(response.rating)}</div>
                    </div>
                  </div>
                  <div className="response-content">
                    <p>{response.response}</p>
                  </div>
                  <button 
                    className="action-btn view-full-btn"
                    onClick={() => viewSessionResponse(response.session_id)}
                  >
                    View Full Response
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderRatingsView = () => (
    <div className="ratings-container">
      <h2 className="section-title">Session Ratings</h2>
      {sessionRatings.length === 0 ? (
        <div className="no-data-card">
          <div className="no-data-icon">⭐</div>
          <h3>No Ratings Yet</h3>
          <p>Session ratings will appear here when available.</p>
        </div>
      ) : (
        <div className="ratings-grid">
          {sessionRatings.map((rating, idx) => (
            <div key={idx} className="rating-card">
              <div className="rating-header">
                <h4>Session #{rating.session_id}</h4>
                <div className="rating-score">
                  {renderStars(rating.rating)}
                  <span className="rating-number">{rating.rating}/5</span>
                </div>
              </div>
              <div className="rating-body">
                <div className="rating-info">
                  <div className="info-item">
                    <span className="label">Student:</span>
                    <span className="value">{rating.student_name}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Date:</span>
                    <span className="value">{formatDate(rating.date)}</span>
                  </div>
                </div>
                {rating.response && (
                  <div className="rating-feedback">
                    <p className="feedback-text">{rating.response}</p>
                  </div>
                )}
                <button 
                  className="action-btn compare-btn"
                  onClick={() => generateSessionReport(rating.session_id)}
                  style={{color:"black"}}
                >
                  View Report
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderReportsView = () => (
    <div className="reports-container">
      <h2 className="section-title">Session Reports</h2>
      <div className="reports-controls">
        <div className="report-generator">
          <h3>Generate Report</h3>
          <div className="session-selector">
            <select 
              className="session-select"
              value={selectedSessionForReport || ""}
              onChange={(e) => setSelectedSessionForReport(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Select a session</option>
              {recentSessions.map(session => (
                <option key={session.session_id} value={session.session_id}>
                  Session #{session.session_id} - {session.student_name} ({formatDate(session.date)})
                </option>
              ))}
            </select>
            <button 
              className="generate-btn"
              onClick={() => selectedSessionForReport && generateSessionReport(selectedSessionForReport)}
              disabled={!selectedSessionForReport || isGeneratingReport}
            >
              {isGeneratingReport ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {reportData && (
        <div className="report-preview">
          <div className="report-header">
            <h3>Report Preview - Session #{reportData.session_id}</h3>
            <button 
              className="export-btn"
              onClick={() => exportReportAsPDF(reportData.session_id)}
            >
              Export as PDF
            </button>
          </div>
          <div className="report-content">
            <div className="report-section">
              <h4>Session Details</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="label">Student:</span>
                  <span className="value">{reportData.student_name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Course:</span>
                  <span className="value">{reportData.course_name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Date:</span>
                  <span className="value">{formatDate(reportData.date)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Time:</span>
                  <span className="value">{reportData.time}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Venue:</span>
                  <span className="value">{reportData.venue}</span>
                </div>
              </div>
            </div>

            {reportData.eeg_summary && (
              <div className="report-section">
                <h4>EEG Analysis</h4>
                <div className="eeg-stats">
                  <div className="stat-item">
                    <span className="label">Engagement Score:</span>
                    <span className="value">{reportData.eeg_summary.engagement_score || 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Duration:</span>
                    <span className="value">{reportData.eeg_summary.duration_formatted || 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Attention Dips:</span>
                    <span className="value">{reportData.eeg_summary.attention_dips_count || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {reportData.admin_response && (
              <div className="report-section">
                <h4>Admin Feedback</h4>
                <div className="feedback-content">
                  <div className="rating-display">
                    {renderStars(reportData.admin_response.rating)}
                    <span className="rating-text">{reportData.admin_response.rating}/5</span>
                  </div>
                  <div className="feedback-text">
                    <p>{reportData.admin_response.response}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="report-section">
              <h4>Report Summary</h4>
              <div className="summary">
                <p>Report generated on: {formatDate(reportData.generated_at)}</p>
                <p>Teacher: {reportData.teacher_name}</p>
                <p>This report provides a comprehensive analysis of the teaching session.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSessionsView = () => (
    <div className="sessions-container">
      {currentSessions.length === 0 ? (
        <div className="no-sessions-card">
          <div className="no-sessions-icon">📭</div>
          <h3>No {view} Sessions</h3>
          <p>
            {view === "today" ? "You don't have any sessions scheduled for today." :
             view === "upcoming" ? "You don't have any upcoming sessions." :
             "You don't have any recent sessions."}
          </p>
          {sessions.length === 0 && (
            <button className="refresh-btn" onClick={loadData}>
              🔄 Check for New Sessions
            </button>
          )}
        </div>
      ) : (
        <div className="sessions-grid">
          {currentSessions.map((session, index) => (
            <div key={session.session_id || index} className="session-card">
              <div className="session-header">
                <div className="session-date">
                  <span className="date-icon">📅</span>
                  <span>{formatDate(session.date)}</span>
                </div>
                <div className={`session-status ${view}`}>
                  {view === "today" ? "Today" : 
                   view === "upcoming" ? "Upcoming" : "Completed"}
                </div>
              </div>
              
              <div className="session-body">
                {/* Course Name */}
                <div className="session-detail">
                  <span className="detail-icon">📖</span>
                  <div className="detail-content">
                    <span className="detail-label">Course</span>
                    <span className="detail-value">{session.course_name}</span>
                  </div>
                </div>

                {/* Student Name */}
                <div className="session-detail">
                  <span className="detail-icon">👨‍🎓</span>
                  <div className="detail-content">
                    <span className="detail-label">Student</span>
                    <span className="detail-value">{session.student_name}</span>
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
                    <span className="detail-value">{session.venue}</span>
                  </div>
                </div>
              </div>

              {/* NEW: Action buttons for each session card */}
              <div className="session-actions">
                <button 
                  className="action-btn small-btn"
                  onClick={() => viewSessionDetails(session.session_id)}
                  title="View Session Details"
                >
                  👁️ View
                </button>
                <button 
                  className="action-btn small-btn"
                  onClick={() => viewSessionResponse(session.session_id)}
                  title="View Admin Response"
                >
                  💬 Response
                </button>
                <button 
                  className="action-btn small-btn"
                  onClick={() => generateSessionReport(session.session_id)}
                  title="Generate Report"
                >
                  📊 Report
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="teacher-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-dashboard">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <button className="retry-btn" onClick={loadData}>
            Try Again
          </button>
          <button className="logout-btn" onClick={() => navigate("/")} style={{marginTop: '10px'}}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      {/* Header */}
      <header className="teacher-header" style={{height:100}}>
        <div className="header-left">
          <div className="logo-circle">
            <span className="logo-icon">🧠</span>
          </div>
          <div className="brand-container">
            <h1 className="brand-name">Cognitive AI</h1>
            <p className="brand-sub">Session Management</p>
          </div>
        </div>

        {teacherName && (
          <div className="header-right">
            <div className="welcome-text">
              <span className="welcome-label">Welcome back,</span>
              <span className="welcome-name">{teacherName}</span>
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

              <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                <span className="status-dot"></span>
              </div>

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
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                          onClick={() => markAsRead(notif.id)}
                        >
                          <div className="notification-icon">📬</div>
                          <div className="notification-content">
                            <h4>Session Update</h4>
                            <p>{notif.message}</p>
                            <span className="notification-time">
                              {formatTimestamp(notif.timestamp)}
                            </span>
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
              >
                <div className="profile-avatar">
                  {teacherName.charAt(0).toUpperCase()}
                </div>
                <span className="profile-name">{teacherName}</span>
                <span className={`dropdown-arrow ${showProfileDropdown ? 'up' : 'down'}`}>
                  ▼
                </span>
              </button>

              {showProfileDropdown && (
                <div className="profile-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {teacherName.charAt(0).toUpperCase()}
                    </div>
                    <div className="dropdown-user-info">
                      <div className="dropdown-user-name">{teacherName}</div>
                      <div className="dropdown-user-role">Teacher</div>
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
                    >
                      <span className="dropdown-icon">❓</span>
                      <span>Help & Support</span>
                    </button>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button 
                      className="dropdown-item logout"
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
      <div className="dashboard-content">
        {/* View Tabs - ADDED NEW TABS */}
        <div className="view-tabs">
          <button
            className={`tab-btn ${view === "today" ? "active" : ""}`}
            onClick={() => setView("today")}
          >
            <span className="tab-icon">📅</span>
            Today ({todaySessions.length})
          </button>

          <button
            className={`tab-btn ${view === "upcoming" ? "active" : ""}`}
            onClick={() => setView("upcoming")}
          >
            <span className="tab-icon">🔜</span>
            Upcoming ({upcomingSessions.length})
          </button>

          <button
            className={`tab-btn ${view === "recent" ? "active" : ""}`}
            onClick={() => setView("recent")}
          >
            <span className="tab-icon">✅</span>
            Recent ({recentSessions.length})
          </button>

          {/* NEW TABS */}
          {/* <button
            className={`tab-btn ${view === "results" ? "active" : ""}`}
            onClick={() => setView("results")}
          >
            <span className="tab-icon">📊</span>
            Results ({sessionResults.length})
          </button> */}

          <button
            className={`tab-btn ${view === "responses" ? "active" : ""}`}
            onClick={() => setView("responses")}
          >
            <span className="tab-icon">💬</span>
            Responses ({adminResponses.length})
          </button>

          <button
            className={`tab-btn ${view === "ratings" ? "active" : ""}`}
            onClick={() => setView("ratings")}
          >
            <span className="tab-icon">⭐</span>
            Ratings ({sessionRatings.length})
          </button>

          <button
            className={`tab-btn ${view === "reports" ? "active" : ""}`}
            onClick={() => setView("reports")}
          >
            <span className="tab-icon">📋</span>
            Reports
          </button>
        </div>

        {/* Render content based on selected view */}
        {renderContent()}

        {/* Session Details Modal */}
        {sessionDetailsModal && selectedSessionForDetails && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Session Details - #{selectedSessionForDetails}</h3>
                <button className="close-btn" onClick={() => setSessionDetailsModal(false)}>×</button>
              </div>
              <div className="modal-body">
                {/* You can add more detailed session information here */}
                <p>Detailed session information will be displayed here.</p>
                <button 
                  className="action-btn"
                  onClick={() => {
                    generateSessionReport(selectedSessionForDetails);
                    setSessionDetailsModal(false);
                  }}
                >
                  Generate Full Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeacherDashboard;