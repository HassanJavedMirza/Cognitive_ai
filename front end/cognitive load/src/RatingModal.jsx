import React from "react";

function RatingModal({ ratingForm, setRatingForm, submitRating, closeModal }) {
  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">⭐ Rate Session</h2>
          <button className="btn btn-outline" onClick={closeModal}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="space-y-6">
            {/* Star Rating */}
            <div className="rating-section">
              <label className="detail-label mb-3">Rate this session (1-5 stars)</label>
              <div className="star-rating-input">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star-button ${star <= ratingForm.rating ? 'active' : ''}`}
                    onClick={() => setRatingForm({...ratingForm, rating: star})}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div className="rating-description">
                {ratingForm.rating === 1 && 'Poor - Needs significant improvement'}
                {ratingForm.rating === 2 && 'Below Average - Room for improvement'}
                {ratingForm.rating === 3 && 'Average - Meets expectations'}
                {ratingForm.rating === 4 && 'Good - Exceeds expectations'}
                {ratingForm.rating === 5 && 'Excellent - Outstanding performance'}
              </div>
            </div>
            
            {/* Feedback Text */}
            <div className="feedback-section">
              <label className="detail-label mb-2">Additional Feedback (Optional)</label>
              <textarea
                className="w-full p-3 border rounded-lg h-32"
                value={ratingForm.response}
                onChange={(e) => setRatingForm({...ratingForm, response: e.target.value})}
                placeholder="Provide detailed feedback about the session..."
                maxLength={1000}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {ratingForm.response.length}/1000 characters
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={closeModal}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submitRating}
          >
            Submit Rating
          </button>
        </div>
      </div>
    </div>
  );
}

export default RatingModal;