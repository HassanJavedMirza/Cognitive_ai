// import { useEffect, useState, useCallback } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import "./Sessions.css";

// function Sessions() {

  
//   const [sessions, setSessions] = useState([]);
//   const [filteredSessions, setFilteredSessions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeFilter, setActiveFilter] = useState("recent");
//   const [error, setError] = useState(null);
//   const [editingSession, setEditingSession] = useState(null);
//   const [editFormData, setEditFormData] = useState({});
  
//   // New state for response management
//   const [responseData, setResponseData] = useState({});
//   const [editingResponse, setEditingResponse] = useState(null);
//   const [responseForm, setResponseForm] = useState({
//     response: "",
//     rating: ""
//   });
  
//   const navigate = useNavigate();

//   // Filter sessions function
//   const filterSessions = useCallback((sessionsData, filterType) => {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
    
//     const now = new Date();
    
//     if (filterType === "recent") {
//       return sessionsData.filter(s => new Date(s.date) < today);
//     }
    
//     if (filterType === "upcoming") {
//       return sessionsData.filter(s => {
//         const sessionDate = new Date(s.date);
//         sessionDate.setHours(0, 0, 0, 0);
        
//         if (sessionDate > today) return true;
        
//         if (sessionDate.getTime() === today.getTime()) {
//           if (s.end_time && typeof s.end_time === 'string') {
//             try {
//               const timeParts = s.end_time.split(':');
//               if (timeParts.length >= 2) {
//                 const hours = parseInt(timeParts[0]);
//                 const minutes = parseInt(timeParts[1]);
                
//                 if (!isNaN(hours) && !isNaN(minutes)) {
//                   const sessionEndTime = new Date();
//                   sessionEndTime.setHours(hours, minutes, 0, 0);
                  
//                   return now < sessionEndTime;
//                 }
//               }
//             } catch (err) {
//               console.error("Error parsing time in filter:", err);
//               return true;
//             }
//           }
//           return true;
//         }
        
//         return false;
//       });
//     }
    
//     return sessionsData;
//   }, []);

//   // Helper function to check response for a session
//   const checkSessionResponse = async (sessionId) => {
//     try {
//       const response = await axios.get(
//         `http://localhost:8000/sessions/${sessionId}/check-response?admin_id=1`
//       );
//       return response.data;
//     } catch (err) {
//       console.error("Error checking response:", err);
//       return { has_response: false };
//     }
//   };

//   // Fetch all responses for sessions
//   const fetchAllResponses = async (sessionsList) => {
//     const responses = {};
    
//     for (const session of sessionsList) {
//       try {
//         const data = await checkSessionResponse(session.session_id);
//         responses[session.session_id] = data;
//       } catch (err) {
//         responses[session.session_id] = { has_response: false };
//       }
//     }
    
//     setResponseData(responses);
//   };

//   // Fetch sessions with responses
//   const fetchSessions = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const response = await axios.get("http://localhost:8000/all_Sessions");
      
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);
//       const now = new Date();
      
//       const sessionsWithResultStatus = await Promise.all(
//         response.data.map(async (session) => {
//           const sessionDate = new Date(session.date);
//           sessionDate.setHours(0, 0, 0, 0);
          
//           let checkResults = false;
//           if (sessionDate.getTime() === today.getTime()) {
//             if (session.end_time && typeof session.end_time === 'string') {
//               try {
//                 const timeParts = session.end_time.split(':');
//                 if (timeParts.length >= 2) {
//                   const hours = parseInt(timeParts[0]);
//                   const minutes = parseInt(timeParts[1]);
                  
//                   if (!isNaN(hours) && !isNaN(minutes)) {
//                     const sessionEndTime = new Date();
//                     sessionEndTime.setHours(hours, minutes, 0, 0);
                    
//                     checkResults = now >= sessionEndTime;
//                   }
//                 }
//               } catch (err) {
//                 console.error("Error parsing end_time:", err);
//               }
//             }
//           }
          
//           let hasResults = false;
//           if (checkResults) {
//             try {
//               const resultResponse = await axios.get(
//                 `http://localhost:8000/teacher_session_results_by_sid/${session.session_id}`
//               );
//               hasResults = !resultResponse.data.error && resultResponse.data.length > 0;
//             } catch (err) {
//               hasResults = false;
//             }
//           }
          
//           return {
//             ...session,
//             hasResults: hasResults,
//             isPastToday: checkResults
//           };
//         })
//       );
      
//       setSessions(sessionsWithResultStatus);
//       setFilteredSessions(filterSessions(sessionsWithResultStatus, activeFilter));
      
//       await fetchAllResponses(sessionsWithResultStatus);
//     } catch (err) {
//       console.error("Error fetching sessions:", err);
//       setError("Failed to load sessions. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   }, [activeFilter, filterSessions]);

//   useEffect(() => {
//     fetchSessions();
//   }, [fetchSessions]);

//   useEffect(() => {
//     const interval = setInterval(fetchSessions, 15000);
//     return () => clearInterval(interval);
//   }, [fetchSessions]);

//   const handleFilterChange = (filterType) => {
//     setActiveFilter(filterType);
//     setFilteredSessions(filterSessions(sessions, filterType));
//   };

//   const goToNewSession = () => navigate("/new-session");

//   const showResult = (sid, teacherName, studentName) => {
//     navigate("/view_results", {
//       state: {
//         sid,
//         teacherName,
//         studentName,
//       },
//     });
//   };

//   const deleteSession = async (sid) => {
//     if (!window.confirm("Are you sure you want to delete this session?")) return;
    
//     try {
//       await axios.delete(`http://localhost:8000/delete_session/${sid}`);
//       await fetchSessions();
//       alert("Session deleted successfully!");
//     } catch (err) {
//       console.error("Error deleting session:", err);
//       alert("Failed to delete session. Please try again.");
//     }
//   };

//   const openEditModal = (session) => {
//     setEditingSession(session);
//     setEditFormData({
//       date: session.date,
//       start_time: session.start_time,
//       end_time: session.end_time,
//       venue: session.venue
//     });
//   };

//   const closeEditModal = () => {
//     setEditingSession(null);
//     setEditFormData({});
//   };

//   const handleEditSubmit = async (e) => {
//     e.preventDefault();
    
//     try {
//       const response = await axios.put(
//         `http://localhost:8000/update_session/${editingSession.session_id}`,
//         editFormData
//       );
      
//       if (response.data.error) {
//         alert(`Error: ${response.data.error}`);
//       } else {
//         alert("Session updated successfully!");
//         closeEditModal();
//         await fetchSessions();
//       }
//     } catch (err) {
//       console.error("Error updating session:", err);
//       alert("Failed to update session. Please try again.");
//     }
//   };

//   // Response Management Functions
//   const addResponse = async (sessionId) => {
//     try {
//       const params = new URLSearchParams({
//         session_id: sessionId,
//         admin_id: 1,
//         response: responseForm.response,
//         rating: responseForm.rating
//       });
      
//       await axios.post(`http://localhost:8000/responses/?${params}`);
      
//       const updatedResponse = await checkSessionResponse(sessionId);
//       setResponseData(prev => ({
//         ...prev,
//         [sessionId]: updatedResponse
//       }));
      
//       alert("Response added successfully!");
//       setResponseForm({ response: "", rating: "" });
//       setEditingResponse(null);
//     } catch (err) {
//       console.error("Error adding response:", err);
//       alert("Failed to add response. Please try again.");
//     }
//   };

//   const editResponse = async (sessionId, responseId) => {
//     try {
//       const params = new URLSearchParams({
//         response: responseForm.response,
//         rating: responseForm.rating
//       });
      
//       await axios.put(`http://localhost:8000/responses/${responseId}?${params}`);
      
//       const updatedResponse = await checkSessionResponse(sessionId);
//       setResponseData(prev => ({
//         ...prev,
//         [sessionId]: updatedResponse
//       }));
      
//       alert("Response updated successfully!");
//       setResponseForm({ response: "", rating: "" });
//       setEditingResponse(null);
//     } catch (err) {
//       console.error("Error updating response:", err);
//       alert("Failed to update response. Please try again.");
//     }
//   };

//   const deleteResponse = async (sessionId, responseId) => {
//     if (!window.confirm("Are you sure you want to delete this response?")) return;
    
//     try {
//       await axios.delete(`http://localhost:8000/responses/${responseId}`);
      
//       setResponseData(prev => ({
//         ...prev,
//         [sessionId]: { has_response: false }
//       }));
      
//       alert("Response deleted successfully!");
//     } catch (err) {
//       console.error("Error deleting response:", err);
//       alert("Failed to delete response. Please try again.");
//     }
//   };

//   const openAddResponse = (sessionId) => {
//     setEditingResponse({
//       sessionId,
//       type: "add",
//       title: "Add Response"
//     });
//     setResponseForm({ response: "", rating: "" });
//   };

//   const openEditResponse = (sessionId, currentResponse) => {
//     setEditingResponse({
//       sessionId,
//       responseId: currentResponse.response_id,
//       type: "edit",
//       title: "Edit Response"
//     });
//     setResponseForm({
//       response: currentResponse.response || "",
//       rating: currentResponse.rating || ""
//     });
//   };

//   const handleResponseSubmit = () => {
//     if (!responseForm.rating || responseForm.rating < 1 || responseForm.rating > 5) {
//       alert("Please provide a valid rating (1-5)");
//       return;
//     }
    
//     if (editingResponse.type === "add") {
//       addResponse(editingResponse.sessionId);
//     } else {
//       editResponse(editingResponse.sessionId, editingResponse.responseId);
//     }
//   };

//   const renderRatingStars = (rating) => {
//     if (!rating) return "No rating";
    
//     return (
//       <div className="rating-display">
//         <div className="rating-stars">
//           {[...Array(5)].map((_, i) => (
//             <span 
//               key={i} 
//               className={`star ${i < rating ? "filled" : ""}`}
//             >
//               ★
//             </span>
//           ))}
//         </div>
//         <span className="rating-value">({rating})</span>
//       </div>
//     );
//   };

//   const renderResponseStatus = (sessionId) => {
//     const response = responseData[sessionId];
    
//     if (!response || !response.has_response) {
//       return <span className="response-badge no-response">No Response</span>;
//     }
    
//     return (
//       <div className="response-status">
//         <span className="response-badge has-response">Response Added</span>
//         {response.rating && renderRatingStars(response.rating)}
//       </div>
//     );
//   };

//   const renderResponseButtons = (sessionId, sessionResponse) => {
//     if (sessionResponse?.has_response) {
//       return (
//         <>
//           <button
//             className="btn-response btn-edit-response"
//             onClick={() => openEditResponse(sessionId, sessionResponse)}
//             title="Edit Response"
//           >
//             <span>✏️</span> Edit RESPONSE
//           </button>
//           <button
//             className="btn-response btn-delete-response"
//             onClick={() => deleteResponse(sessionId, sessionResponse.response_id)}
//             title="Delete Response"
//           >
//             <span>🗑️</span> Delete Session
//           </button>
//         </>
//       );
//     } else {
//       return (
//         <button
//           className="btn-response btn-add-response"
//           onClick={() => openAddResponse(sessionId)}
//           title="Add Response"
//         >
//           <span>📝</span> Add Response
//         </button>
//       );
//     }
//   };

//   const formatDate = (dateString) => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', { 
//       year: 'numeric', 
//       month: 'short', 
//       day: 'numeric' 
//     });
//   };

//   return (
//     <div className="sessions-page">
//       <header className="page-header">
//         <div className="header-actions">
//           <button className="back-to-dashboard" onClick={() => navigate("/AdminDashboard")}>
//             ← Dashboard
//           </button>
//         </div>
//         <h1 className="page-title">
//           <span className="title-icon"></span>
//           Cognitive AI — Session Dashboard
//         </h1>
//         <div className="header-actions">
//           <button 
//             className="logout-button" 
//             onClick={() => {
//               if (window.confirm("Are you sure you want to logout?")) {
//                 navigate("/");
//               }
//             }}
//           >
//             🚪 Logout
//           </button>
//         </div>
//       </header>

//       <section className="filter-cards">
//         <button
//           className={`filter-card ${activeFilter === "upcoming" ? "active" : ""}`}
//           onClick={() => handleFilterChange("upcoming")}
//           aria-pressed={activeFilter === "upcoming"}
//         >
//           <div className="card-content">
//             <div className="card-icon-wrapper">
//               <div className="card-icon">📆</div>
//               <div className="card-text">
//                 <h3 className="card-title">Upcoming Sessions</h3>
//                 <p className="card-description">Future scheduled sessions</p>
//               </div>
//             </div>
//             <div className="card-stats">
//               <span className="card-count">
//                 {filteredSessions.filter(s => activeFilter === "upcoming").length}
//               </span>
//               <span className="card-arrow">→</span>
//             </div>
//           </div>
//         </button>

//         <button
//           className={`filter-card ${activeFilter === "recent" ? "active" : ""}`}
//           onClick={() => handleFilterChange("recent")}
//           aria-pressed={activeFilter === "recent"}
//         >
//           <div className="card-content">
//             <div className="card-icon-wrapper">
//               <div className="card-icon">📋</div>
//               <div className="card-text">
//                 <h3 className="card-title">Recent Sessions</h3>
//                 <p className="card-description">Past or ongoing sessions</p>
//               </div>
//             </div>
//             <div className="card-stats">
//               <span className="card-count">
//                 {filteredSessions.filter(s => activeFilter === "recent").length}
//               </span>
//               <span className="card-arrow">→</span>
//             </div>
//           </div>
//         </button>

//         <button
//           className="filter-card new-session-card"
//           onClick={goToNewSession}
//         >
//           <div className="card-content">
//             <div className="card-icon-wrapper">
//               <div className="card-icon">➕</div>
//               <div className="card-text">
//                 <h3 className="card-title">New Session</h3>
//                 <p className="card-description">Create new session</p>
//               </div>
//             </div>
//             <div className="card-stats">
//               <span className="card-count">+</span>
//               <span className="card-arrow">→</span>
//             </div>
//           </div>
//         </button>
//       </section>

//       <main className="sessions-content">
//         {error && (
//           <div className="error-message">
//             <span className="error-icon">⚠️</span>
//             <span>{error}</span>
//           </div>
//         )}

//         {loading ? (
//           <div className="loading-container">
//             <div className="spinner"></div>
//             <p className="loading-text">Loading sessions...</p>
//           </div>
//         ) : filteredSessions.length === 0 ? (
//           <div className="empty-state">
//             <div className="empty-icon">📭</div>
//             <h3>No sessions found</h3>
//             <p>There are no {activeFilter} sessions at the moment.</p>
//           </div>
//         ) : (
//           <div className="sessions-grid">
//             {filteredSessions.map((session, index) => {
//               const sessionResponse = responseData[session.session_id];
              
//               return (
//                 <div 
//                   key={session.session_id || index} 
//                   className={`session-card ${sessionResponse?.has_response ? 'has-response' : 'no-response'}`}
//                 >
//                   <div className={`floating-response-indicator ${sessionResponse?.has_response ? 'has-response' : 'no-response'}`}>
//                     {sessionResponse?.has_response ? '✓' : '+'}
//                   </div>
                  
//                   {sessionResponse?.has_response && <div className="response-timeline" />}
                  
//                   <div className="session-header">
//                     <div className="session-badge">
//                       <div className="session-number">#{index + 1}</div>
//                       <div className="session-date">
//                         <span className="date-icon">📅</span>
//                         {formatDate(session.date)}
//                       </div>
//                     </div>
                    
//                     <div className="session-response-status">
//                       {renderResponseStatus(session.session_id)}
//                     </div>
//                   </div>

//                   <div className="session-body">
//                     <div className="session-info-grid">
//                       <div className="session-info-row">
//                         <span className="info-label">👨‍🏫 Teacher</span>
//                         <span className="info-value">{session.teacher_name}</span>
//                       </div>
//                       <div className="session-info-row">
//                         <span className="info-label">👨‍🎓 Student</span>
//                         <span className="info-value">{session.student_name}</span>
//                       </div>
//                       <div className="session-info-row">
//                         <span className="info-label">📚 Course</span>
//                         <span className="info-value">{session.course_name}</span>
//                       </div>
//                       <div className="session-info-row">
//                         <span className="info-label">📍 Venue</span>
//                         <span className="info-value">{session.venue}</span>
//                       </div>
//                     </div>
                    
//                     {sessionResponse?.has_response && sessionResponse.response && (
//                       <div className="response-preview" style={{backgroundColor:"whitesmoke"}}>
//                         <div className="response-preview-title">
//                           <span>📝 Response Preview</span>
//                           <div className="response-count">
//                             <span className="response-count-number">{sessionResponse.response.length}</span>
//                             <span style={{ fontSize: '10px', opacity: 0.7 }}> chars</span>
//                           </div>
//                         </div>
//                         <div className="response-preview-text" style={{height:30, backgroundColor:"black", paddingLeft:5}}>
//                           {sessionResponse.response}
//                       </div>
//                       </div>
//                     )}
//                   </div>

//                   <div className="session-footer">
//                     {activeFilter === "recent" ? (
//                       <>
//                         <button
//                           className="btn btn-view"
//                           onClick={() => showResult(session.session_id, session.teacher_name, session.student_name)}
//                         >
//                           📊 View Result
//                         </button>
                        
//                         <div className="response-actions">
//                           {renderResponseButtons(session.session_id, sessionResponse)}
//                         </div>
                        
//                         <button
//                           className="btn btn-delete"
//                           onClick={() => deleteSession(session.session_id)}
//                         >
//                           🗑️ Delete Session
//                         </button>
//                       </>
//                     ) : (
//                       <>
//                         {session.isPastToday && session.hasResults && (
//                           <button
//                             className="btn btn-view"
//                             onClick={() => showResult(session.session_id, session.teacher_name, session.student_name)}
//                           >
//                             📊 View Result
//                           </button>
//                         )}
                        
//                         {(!session.isPastToday || !session.hasResults) && (
//                           <button
//                             className="btn btn-edit"
//                             onClick={() => openEditModal(session)}
//                           >
//                             ✏️ Edit
//                           </button>
//                         )}
                        
//                         <button
//                           className="btn btn-delete"
//                           onClick={() => deleteSession(session.session_id)}
//                         >
//                           🗑️ Delete Sessions
//                         </button>
//                       </>
//                     )}
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </main>

//       {/* Edit Session Modal */}
//       {editingSession && (
//         <div className="modal-overlay" onClick={closeEditModal}>
//           <div className="modal-content" onClick={(e) => e.stopPropagation()}>
//             <div className="modal-header">
//               <h2>✏️ Edit Session</h2>
//               <button className="modal-close" onClick={closeEditModal}>
//                 ✕
//               </button>
//             </div>

//             <form onSubmit={handleEditSubmit} className="modal-form">
//               <div className="modal-info-section">
//                 <div className="info-item">
//                   <span className="info-icon">👨‍🏫</span>
//                   <div>
//                     <label>Teacher</label>
//                     <p>{editingSession.teacher_name}</p>
//                   </div>
//                 </div>
//                 <div className="info-item">
//                   <span className="info-icon">👨‍🎓</span>
//                   <div>
//                     <label>Student</label>
//                     <p>{editingSession.student_name}</p>
//                   </div>
//                 </div>
//                 <div className="info-item">
//                   <span className="info-icon">📚</span>
//                   <div>
//                     <label>Course</label>
//                     <p>{editingSession.course_name}</p>
//                   </div>
//                 </div>
//               </div>

//               <div className="form-group">
//                 <label>📅 Date</label>
//                 <input
//                   type="date"
//                   value={editFormData.date}
//                   onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
//                   required
//                 />
//               </div>

//               <div className="form-group">
//                 <label>📍 Venue</label>
//                 <select
//                   value={editFormData.venue}
//                   onChange={(e) => setEditFormData({...editFormData, venue: e.target.value})}
//                   required
//                 >
//                   {Array.from({ length: 14 }, (_, i) => `LT${i + 1}`).map((v) => (
//                     <option key={v} value={v}>
//                       {v}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="form-row">
//                 <div className="form-group">
//                   <label>🕐 Start Time</label>
//                   <input
//                     type="time"
//                     value={editFormData.start_time}
//                     onChange={(e) => setEditFormData({...editFormData, start_time: e.target.value})}
//                     required
//                   />
//                 </div>

//                 <div className="form-group">
//                   <label>🕑 End Time</label>
//                   <input
//                     type="time"
//                     value={editFormData.end_time}
//                     onChange={(e) => setEditFormData({...editFormData, end_time: e.target.value})}
//                     required
//                   />
//                 </div>
//               </div>

//               <div className="modal-actions">
//                 <button type="button" className="btn-cancel" onClick={closeEditModal}>
//                   Cancel
//                 </button>
//                 <button type="submit" className="btn-save">
//                   💾 Save Changes
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Add/Edit Response Modal */}
//       {editingResponse && (
//         <div className="modal-overlay modal-response" onClick={() => setEditingResponse(null)}>
//           <div className="modal-content" onClick={(e) => e.stopPropagation()}>
//             <div className="modal-header">
//               <h2>📝 {editingResponse.title}</h2>
//               <button className="modal-close" onClick={() => setEditingResponse(null)}>
//                 ✕
//               </button>
//             </div>

//             <div className="modal-form">
//               <div className="form-group">
//                 <label>💭 Response Text</label>
//                 <textarea
//                   className="response-form-textarea"
//                   value={responseForm.response}
//                   onChange={(e) => setResponseForm({...responseForm, response: e.target.value})}
//                   placeholder="Enter your feedback about this session..."
//                   rows="4"
//                   style={{color:"black"}}
//                 />
//                 {responseForm.response && (
//                   <div className="response-char-counter">
//                     {responseForm.response.length} characters
//                   </div>
//                 )}
//               </div>

//               <div className="form-group">
//                 <label>⭐ Rating (1-5)</label>
//                 <div className="rating-input">
//                   {[1, 2, 3, 4, 5].map((star) => (
//                     <button
//                       key={star}
//                       type="button"
//                       className={`rating-star ${responseForm.rating === star.toString() ? "selected" : ""}`}
//                       onClick={() => setResponseForm({...responseForm, rating: star})}
//                     >
//                       ★
//                     </button>
//                   ))}
//                   <input
//                     type="number"
//                     min="1"
//                     max="5"
//                     value={responseForm.rating}
//                     onChange={(e) => setResponseForm({...responseForm, rating: e.target.value})}
//                     placeholder="Enter rating 1-5"
//                     className="rating-number"
//                   />
//                 </div>
//                 <p className="rating-hint">1 = Poor, 5 = Excellent</p>
//               </div>

//               <div className="modal-actions">
//                 <button 
//                   type="button" 
//                   className="btn-cancel" 
//                   onClick={() => setEditingResponse(null)}
//                 >
//                   Cancel
//                 </button>
//                 <button 
//                   type="button" 
//                   className="btn-save" 
//                   onClick={handleResponseSubmit}
//                 >
//                   💾 {editingResponse.type === "add" ? "Add Response" : "Update Response"}
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default Sessions;


import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Sessions.css";

function Sessions() {

  
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("recent");
  const [error, setError] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  
  // New state for response management
  const [responseData, setResponseData] = useState({});
  const [editingResponse, setEditingResponse] = useState(null);
  const [responseForm, setResponseForm] = useState({
    response: "",
    score: ""
  });
  
  const navigate = useNavigate();

  // Filter sessions function
  const filterSessions = useCallback((sessionsData, filterType) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const now = new Date();
    
    if (filterType === "recent") {
      return sessionsData.filter(s => new Date(s.date) < today);
    }
    
    if (filterType === "upcoming") {
      return sessionsData.filter(s => {
        const sessionDate = new Date(s.date);
        sessionDate.setHours(0, 0, 0, 0);
        
        if (sessionDate > today) return true;
        
        if (sessionDate.getTime() === today.getTime()) {
          if (s.end_time && typeof s.end_time === 'string') {
            try {
              const timeParts = s.end_time.split(':');
              if (timeParts.length >= 2) {
                const hours = parseInt(timeParts[0]);
                const minutes = parseInt(timeParts[1]);
                
                if (!isNaN(hours) && !isNaN(minutes)) {
                  const sessionEndTime = new Date();
                  sessionEndTime.setHours(hours, minutes, 0, 0);
                  
                  return now < sessionEndTime;
                }
              }
            } catch (err) {
              console.error("Error parsing time in filter:", err);
              return true;
            }
          }
          return true;
        }
        
        return false;
      });
    }
    
    return sessionsData;
  }, []);

  // Helper function to check response for a session
  const checkSessionResponse = async (sessionId) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/sessions/${sessionId}/check-response?admin_id=1`
      );
      return response.data;
    } catch (err) {
      console.error("Error checking response:", err);
      return { has_response: false };
    }
  };

  // Fetch all responses for sessions
  const fetchAllResponses = async (sessionsList) => {
    const responses = {};
    
    for (const session of sessionsList) {
      try {
        const data = await checkSessionResponse(session.session_id);
        responses[session.session_id] = data;
      } catch (err) {
        responses[session.session_id] = { has_response: false };
      }
    }
    
    setResponseData(responses);
  };

  // Fetch sessions with responses
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("http://localhost:8000/all_Sessions");
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const now = new Date();
      
      const sessionsWithResultStatus = await Promise.all(
        response.data.map(async (session) => {
          const sessionDate = new Date(session.date);
          sessionDate.setHours(0, 0, 0, 0);
          
          let checkResults = false;
          if (sessionDate.getTime() === today.getTime()) {
            if (session.end_time && typeof session.end_time === 'string') {
              try {
                const timeParts = session.end_time.split(':');
                if (timeParts.length >= 2) {
                  const hours = parseInt(timeParts[0]);
                  const minutes = parseInt(timeParts[1]);
                  
                  if (!isNaN(hours) && !isNaN(minutes)) {
                    const sessionEndTime = new Date();
                    sessionEndTime.setHours(hours, minutes, 0, 0);
                    
                    checkResults = now >= sessionEndTime;
                  }
                }
              } catch (err) {
                console.error("Error parsing end_time:", err);
              }
            }
          }
          
          let hasResults = false;
          if (checkResults) {
            try {
              const resultResponse = await axios.get(
                `http://localhost:8000/teacher_session_results_by_sid/${session.session_id}`
              );

              hasResults = !resultResponse.data.error && resultResponse.data.length > 0;
            } catch (err) {
              hasResults = false;
            }
          }
          
          return {
            ...session,
            hasResults: hasResults,
            isPastToday: checkResults
          };
        })
      );
      
      setSessions(sessionsWithResultStatus);
      setFilteredSessions(filterSessions(sessionsWithResultStatus, activeFilter));
      
      await fetchAllResponses(sessionsWithResultStatus);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError("Failed to load sessions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeFilter, filterSessions]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const interval = setInterval(fetchSessions, 15000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleFilterChange = (filterType) => {
    setActiveFilter(filterType);
    setFilteredSessions(filterSessions(sessions, filterType));
  };

  const goToNewSession = () => navigate("/new-session");

  const showResult = (sid, teacherName, studentName) => {
    navigate("/view_results", {
      state: {
        sid,
        teacherName,
        studentName,
      },
    });
  };

  const deleteSession = async (sid) => {
    if (!window.confirm("Are you sure you want to delete this session?")) return;
    
    try {
      await axios.delete(`http://localhost:8000/delete_session/${sid}`);
      await fetchSessions();
      alert("Session deleted successfully!");
    } catch (err) {
      console.error("Error deleting session:", err);
      alert("Failed to delete session. Please try again.");
    }
  };

  const openEditModal = (session) => {
    setEditingSession(session);
    setEditFormData({
      date: session.date,
      start_time: session.start_time,
      end_time: session.end_time,
      venue: session.venue
    });
  };

  const closeEditModal = () => {
    setEditingSession(null);
    setEditFormData({});
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.put(
        `http://localhost:8000/update_session/${editingSession.session_id}`,
        editFormData
      );
      
      if (response.data.error) {
        alert(`Error: ${response.data.error}`);
      } else {
        alert("Session updated successfully!");
        closeEditModal();
        await fetchSessions();
      }
    } catch (err) {
      console.error("Error updating session:", err);
      alert("Failed to update session. Please try again.");
    }
  };

  // Response Management Functions
  const addResponse = async (sessionId) => {
    try {
      const params = new URLSearchParams({
        session_id: sessionId,
        admin_id: 1,
        response: responseForm.response,
        score: responseForm.score
      });
      
      await axios.post(`http://localhost:8000/responses/?${params}`);
      
      const updatedResponse = await checkSessionResponse(sessionId);
      setResponseData(prev => ({
        ...prev,
        [sessionId]: updatedResponse
      }));
      
      alert("Response added successfully!");
      setResponseForm({ response: "", score: "" });
      setEditingResponse(null);
    } catch (err) {
      console.error("Error adding response:", err);
      alert("Failed to add response. Please try again.");
    }
  };

  const editResponse = async (sessionId, responseId) => {
    try {
      const params = new URLSearchParams({
        response: responseForm.response,
        score: responseForm.score
      });
      
      await axios.put(`http://localhost:8000/responses/${responseId}?${params}`);
      
      const updatedResponse = await checkSessionResponse(sessionId);
      setResponseData(prev => ({
        ...prev,
        [sessionId]: updatedResponse
      }));
      
      alert("Response updated successfully!");
      setResponseForm({ response: "", score: "" });
      setEditingResponse(null);
    } catch (err) {
      console.error("Error updating response:", err);
      alert("Failed to update response. Please try again.");
    }
  };

  const deleteResponse = async (sessionId, responseId) => {
    if (!window.confirm("Are you sure you want to delete this response?")) return;
    
    try {
      await axios.delete(`http://localhost:8000/responses/${responseId}`);
      
      setResponseData(prev => ({
        ...prev,
        [sessionId]: { has_response: false }
      }));
      
      alert("Response deleted successfully!");
    } catch (err) {
      console.error("Error deleting response:", err);
      alert("Failed to delete response. Please try again.");
    }
  };

  const openAddResponse = (sessionId) => {
    setEditingResponse({
      sessionId,
      type: "add",
      title: "Add Response"
    });
    setResponseForm({ response: "", score: "" });
  };

  const openEditResponse = (sessionId, currentResponse) => {
    setEditingResponse({
      sessionId,
      responseId: currentResponse.response_id,
      type: "edit",
      title: "Edit Response"
    });
    setResponseForm({
      response: currentResponse.response || "",
      score: currentResponse.score || ""
    });
  };

  const handleResponseSubmit = () => {
    if (!responseForm.score || responseForm.score < 1 || responseForm.score > 5) {
      alert("Please provide a valid score (1-5)");
      return;
    }
    
    if (editingResponse.type === "add") {
      addResponse(editingResponse.sessionId);
    } else {
      editResponse(editingResponse.sessionId, editingResponse.responseId);
    }
  };

  const renderScoreStars = (score) => {
    if (!score) return "No score";
    
    return (
      <div className="score-display">
        <div className="score-stars">
          {[...Array(5)].map((_, i) => (
            <span 
              key={i} 
              className={`star ${i < score ? "filled" : ""}`}
            >
              ★
            </span>
          ))}
        </div>
        <span className="score-value">({score})</span>
      </div>
    );
  };

  const renderResponseStatus = (sessionId) => {
    const response = responseData[sessionId];
    
    if (!response || !response.has_response) {
      return <span className="response-badge no-response">No Response</span>;
    }
    
    return (
      <div className="response-status">
        <span className="response-badge has-response">Response Added</span>
        {response.score && renderScoreStars(response.score)}
      </div>
    );
  };

  const renderResponseButtons = (sessionId, sessionResponse) => {
    if (sessionResponse?.has_response) {
      return (
        <>
          <button
            className="btn-response btn-edit-response"
            onClick={() => openEditResponse(sessionId, sessionResponse)}
            title="Edit Response"
          >
            <span>✏️</span> Edit RESPONSE
          </button>
          <button
            className="btn-response btn-delete-response"
            onClick={() => deleteResponse(sessionId, sessionResponse.response_id)}
            title="Delete Response"
          >
            <span>🗑️</span> Delete Response 
          </button>
        </>
      );
    } else {
      return (
        <button
          className="btn-response btn-add-response"
          onClick={() => openAddResponse(sessionId)}
          title="Add Response"
        >
          <span>📝</span> Add Response
        </button>
      );
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="sessions-page">
      <header className="page-header">
        <div className="header-actions">
          <button className="back-to-dashboard" onClick={() => navigate(-1)}>
            ← Dashboard
          </button>
        </div>
        <h1 className="page-title">
          <span className="title-icon"></span>
          Cognitive AI — Session Dashboard
        </h1>
        <div className="header-actions">
          <button 
            className="logout-button" 
            onClick={() => {
              if (window.confirm("Are you sure you want to logout?")) {
                navigate("/");
              }
            }}
          >
            🚪 Logout
          </button>
        </div>
      </header>

      <section className="filter-cards">
        <button
          className={`filter-card ${activeFilter === "upcoming" ? "active" : ""}`}
          onClick={() => handleFilterChange("upcoming")}
          aria-pressed={activeFilter === "upcoming"}
        >
          <div className="card-content">
            <div className="card-icon-wrapper">
              <div className="card-icon">📆</div>
              <div className="card-text">
                <h3 className="card-title">Upcoming Sessions</h3>
                <p className="card-description">Future scheduled sessions</p>
              </div>
            </div>
            <div className="card-stats">
              <span className="card-count">
                {filteredSessions.filter(s => activeFilter === "upcoming").length}
              </span>
              <span className="card-arrow">→</span>
            </div>
          </div>
        </button>

        <button
          className={`filter-card ${activeFilter === "recent" ? "active" : ""}`}
          onClick={() => handleFilterChange("recent")}
          aria-pressed={activeFilter === "recent"}
        >
          <div className="card-content">
            <div className="card-icon-wrapper">
              <div className="card-icon">📋</div>
              <div className="card-text">
                <h3 className="card-title">Recent Sessions</h3>
                <p className="card-description">Past or ongoing sessions</p>
              </div>
            </div>
            <div className="card-stats">
              <span className="card-count">
                {filteredSessions.filter(s => activeFilter === "recent").length}
              </span>
              <span className="card-arrow">→</span>
            </div>
          </div>
        </button>

        {/* <button
          className="filter-card new-session-card"
          onClick={goToNewSession}
        >
          <div className="card-content">
            <div className="card-icon-wrapper">
              <div className="card-icon">➕</div>
              <div className="card-text">
                <h3 className="card-title">New Session</h3>
                <p className="card-description">Create new session</p>
              </div>
            </div>
            <div className="card-stats">
              <span className="card-count">+</span>
              <span className="card-arrow">→</span>
            </div>
          </div>
        </button> */}
      </section>

      <main className="sessions-content">
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Loading sessions...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No sessions found</h3>
            <p>There are no {activeFilter} sessions at the moment.</p>
          </div>
        ) : (
          <div className="sessions-grid">
            {filteredSessions.map((session, index) => {
              const sessionResponse = responseData[session.session_id];
              
              return (
                <div 
                  key={session.session_id || index} 
                  className={`session-card ${sessionResponse?.has_response ? 'has-response' : 'no-response'}`}
                >
                  <div className={`floating-response-indicator ${sessionResponse?.has_response ? 'has-response' : 'no-response'}`}>
                    {sessionResponse?.has_response ? '✓' : '+'}
                  </div>
                  
                  {sessionResponse?.has_response && <div className="response-timeline" />}
                  
                  <div className="session-header">
                    <div className="session-badge">
                      <div className="session-number">#{index + 1}</div>
                      <div className="session-date">
                        <span className="date-icon">📅</span>
                        {formatDate(session.date)}
                      </div>
                    </div>
                    
                    {/* <div className="session-response-status">
                      {renderResponseStatus(session.session_id)}
                    </div> */}
                  </div>

                  <div className="session-body">
                    <div className="session-info-grid">
                      <div className="session-info-row">
                        <span className="info-label" style={{color:"black"}}>👨‍🏫 Teacher</span>
                        <span className="info-value" style={{color:"black"}}>{session.teacher_name}</span>
                      </div>
                      <div className="session-info-row">
                        <span className="info-label" style={{color:"black"}}>👨‍🎓 Student</span>
                        <span className="info-value" style={{color:"black"}}>{session.student_name}</span>
                      </div>
                      <div className="session-info-row">
                        <span className="info-label" style={{color:"black"}}>📚 Course</span>
                        <span className="info-value" style={{color:"black"}}>{session.course_name}</span>
                      </div>
                      <div className="session-info-row">
                        <span className="info-label" style={{color:"black"}}>📍 Venue</span>
                        <span className="info-value" style={{color:"black"}}>{session.venue}</span>
                      </div>
                    </div>
                    
                    {/* {sessionResponse?.has_response && sessionResponse.response && (
                      <div className="response-preview" style={{backgroundColor:"whitesmoke"}}>
                        <div className="response-preview-title">
                          <span>📝 Response Preview</span>
                          <div className="response-count">
                            <span className="response-count-number">{sessionResponse.response.length}</span>
                            <span style={{ fontSize: '10px', opacity: 0.7 }}> chars</span>
                          </div>
                        </div>
                        <div className="response-preview-text" style={{height:30, backgroundColor:"black", paddingLeft:5}}>
                          {sessionResponse.response}
                      </div>
                      </div>
                    )} */}
                  </div>

                  <div className="session-footer">
                    {activeFilter === "recent" ? (
                      <>
                        {/* <button
                          className="btn btn-view"
                          onClick={() => showResult(session.session_id, session.teacher_name, session.student_name)}
                        >
                          📊 View Results
                        </button> */}
                            <button
                          className="btn btn-view"
                          onClick={() => showResult(session.session_id, session.teacher_name, session.student_name)}
                        >
                          📊 View in Editor
                        </button>
                        
                        {/* <div className="response-actions">
                          {renderResponseButtons(session.session_id, sessionResponse)}
                        </div> */}
                        
                        {/* <button
                          className="btn btn-delete"
                          onClick={() => deleteSession(session.session_id)}
                        >
                          🗑️ Delete Session
                        </button> */}
                      </>
                    ) : (
                      <>
                        {session.isPastToday && session.hasResults && (
                          <button
                            className="btn btn-view"
                            onClick={() => showResult(session.session_id, session.teacher_name, session.student_name)}
                          >
                            📊 View Result
                          </button>
                        )}
                        


                        {(!session.isPastToday || !session.hasResults) && (
                          <button
                            className="btn btn-edit"
                            onClick={() => openEditModal(session)}
                          >
                            ✏️ Edit
                          </button>
                        )}
                        
                        <button
                          className="btn btn-delete"
                          onClick={() => deleteSession(session.session_id)}
                        >
                          🗑️ Delete Sessions
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Session Modal */}
      {editingSession && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Edit Session</h2>
              <button className="modal-close" onClick={closeEditModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="modal-info-section">
                <div className="info-item">
                  <span className="info-icon">👨‍🏫</span>
                  <div>
                    <label>Teacher</label>
                    <p>{editingSession.teacher_name}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="info-icon">👨‍🎓</span>
                  <div>
                    <label>Student</label>
                    <p>{editingSession.student_name}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="info-icon">📚</span>
                  <div>
                    <label>Course</label>
                    <p>{editingSession.course_name}</p>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>📅 Date</label>
                <input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>📍 Venue</label>
                <select
                  value={editFormData.venue}
                  onChange={(e) => setEditFormData({...editFormData, venue: e.target.value})}
                  required
                >
                  {Array.from({ length: 14 }, (_, i) => `LT${i + 1}`).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>🕐 Start Time</label>
                  <input
                    type="time"
                    value={editFormData.start_time}
                    onChange={(e) => setEditFormData({...editFormData, start_time: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>🕑 End Time</label>
                  <input
                    type="time"
                    value={editFormData.end_time}
                    onChange={(e) => setEditFormData({...editFormData, end_time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeEditModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  💾 Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Response Modal */}
      {editingResponse && (
        <div className="modal-overlay modal-response" onClick={() => setEditingResponse(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📝 {editingResponse.title}</h2>
              <button className="modal-close" onClick={() => setEditingResponse(null)}>
                ✕
              </button>
            </div>

            <div className="modal-form">
              <div className="form-group">
                <label>💭 Response Text</label>
                <textarea
                  className="response-form-textarea"
                  value={responseForm.response}
                  onChange={(e) => setResponseForm({...responseForm, response: e.target.value})}
                  placeholder="Enter your feedback about this session..."
                  rows="4"
                  style={{color:"black"}}
                />
                {responseForm.response && (
                  <div className="response-char-counter">
                    {responseForm.response.length} characters
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>⭐ Score (1-5)</label>
                <div className="score-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`score-star ${responseForm.score === star.toString() ? "selected" : ""}`}
                      onClick={() => setResponseForm({...responseForm, score: star})}
                    >
                      ★
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={responseForm.score}
                    onChange={(e) => setResponseForm({...responseForm, score: e.target.value})}
                    placeholder="Enter score 1-5"
                    className="score-number"
                  />
                </div>
                <p className="score-hint">1 = Poor, 5 = Excellent</p>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setEditingResponse(null)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn-save" 
                  onClick={handleResponseSubmit}
                >
                  💾 {editingResponse.type === "add" ? "Add Response" : "Update Response"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sessions;