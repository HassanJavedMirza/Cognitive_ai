import React from "react";

function SessionModal({
  sessionList,
  formatDate,
  formatTime,
  renderStars,
  getRatingDescription,
  showResult,
  openRatingModal,
  closeModal
}) {
  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">📋 Student Sessions</h2>
          <button className="btn btn-outline" onClick={closeModal}>✕</button>
        </div>
        
        <div className="modal-body">
          {!sessionList || sessionList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3 className="empty-title">No sessions found</h3>
              <p className="empty-description">
                This student doesn't have any sessions yet.
              </p>
            </div>
          ) : (
            <div className="sessions-grid">
              {sessionList.map((session) => (
                <div key={session.session_id} className="session-card">
                  <div className="session-header">
                    <div className="session-date-time">
                      <span className="session-date">{formatDate(session.date)}</span>
                      <span className="session-time">
                        {formatTime(session.start_time)} - {formatTime(session.end_time)}
                      </span>
                    </div>
                    {session.admin_response && (
                      <div className="admin-rating-badge">
                        {renderStars(session.admin_response.rating)}
                        <span className="rating-text">
                          {getRatingDescription(session.admin_response.rating)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="session-details">
                    <div className="detail-item">
                      <span className="detail-label">Course:</span>
                      <span className="detail-value">{session.course_name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Teacher:</span>
                      <span className="detail-value">{session.teacher_name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Venue:</span>
                      <span className="detail-value">📍 {session.venue}</span>
                    </div>
                  </div>
                  
                  {/* Admin Response Section */}
                  {session.admin_response ? (
                    <div className="admin-response-section">
                      <div className="response-header">
                        <h4>Admin Feedback</h4>
                        <span className="response-date">
                          {formatDate(session.admin_response.created_at)}
                        </span>
                      </div>
                      {session.admin_response.response && (
                        <div className="response-content">
                          <p>{session.admin_response.response}</p>
                        </div>
                      )}
                      <div className="response-rating">
                        {renderStars(session.admin_response.rating)}
                      </div>
                    </div>
                  ) : (
                    <div className="no-response-section">
                      <p className="no-response-text">No admin feedback yet</p>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => openRatingModal(session.session_id)}
                      >
                        Add Feedback
                      </button>
                    </div>
                  )}
                  
                  <div className="session-actions">
                    <button 
                      className="btn btn-info"
                      onClick={() => showResult(
                        session.session_id, 
                        session.teacher_name,
                        session.student_name
                      )}
                    >
                      View Results
                    </button>
                    <button 
                      className="btn btn-outline"
                      onClick={() => openRatingModal(session.session_id)}
                    >
                      {session.admin_response ? 'Update Rating' : 'Rate Session'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={closeModal}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default SessionModal;