import { useState, useEffect, useCallback, useRef } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
import './SessionAnnotations.css';

const SessionAnnotations = ({ sessionId, currentTime, onJumpToTime }) => {
  const [annotations, setAnnotations] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('time');
  const [isExpanded, setIsExpanded] = useState(false); // NEW: Toggle state
  const [showToolbar, setShowToolbar] = useState(false); // NEW: Show toolbar when expanded

  const [newAnnotation, setNewAnnotation] = useState({
    title: '',
    description: '',
    type: 'bookmark',
    color: '#3b82f6',
    importance: 'medium'
  });

  // Debounced fetch to prevent rapid calls
  const fetchAnnotations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/api/annotations/${sessionId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setAnnotations(data.annotations || []);
      } else {
        throw new Error(data.error || 'Failed to load annotations');
      }
    } catch (error) {
      console.error('Error fetching annotations:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchAnnotations();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchAnnotations, 30000);
    return () => clearInterval(interval);
  }, [fetchAnnotations]);

  const saveAnnotation = async (annotationData, isEdit = false) => {
    if (!annotationData.title.trim()) {
      setError('Please enter a title');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setLoading(true);

      const url = isEdit
        ? `${API_BASE}/api/annotations/${annotationData.id}`
        : `${API_BASE}/api/annotations/create`;

      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        session_id: sessionId,
        timestamp: currentTime,
        annotation_type: annotationData.type,
        title: annotationData.title,
        description: annotationData.description,
        color: annotationData.color,
        importance: annotationData.importance
      };

      if (isEdit) {
        payload.annotation_id = annotationData.id;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        await fetchAnnotations();

        if (!isEdit) {
          // Show success message
          setError('✅ Annotation saved!');
          setTimeout(() => setError(null), 2000);

          // Reset form
          setShowAddForm(false);
          setNewAnnotation({
            title: '',
            description: '',
            type: 'bookmark',
            color: '#3b82f6',
            importance: 'medium'
          });
        } else {
          setEditingId(null);
          setError('✅ Annotation updated!');
          setTimeout(() => setError(null), 2000);
        }
      } else {
        throw new Error(data.error || 'Failed to save annotation');
      }
    } catch (error) {
      console.error('Error saving annotation:', error);
      setError(`❌ ${error.message}`);
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const deleteAnnotation = async (annotationId) => {
    if (!window.confirm('Are you sure you want to delete this annotation? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/annotations/${annotationId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        await fetchAnnotations();
        setError('🗑️ Annotation deleted!');
        setTimeout(() => setError(null), 2000);
      } else {
        throw new Error(data.error || 'Failed to delete annotation');
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
      setError(`❌ Failed to delete: ${error.message}`);
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (annotation) => {
    setEditingId(annotation.annotation_id);
    setNewAnnotation({
      title: annotation.title,
      description: annotation.description || '',
      type: annotation.type,
      color: annotation.color,
      importance: annotation.importance || 'medium'
    });
    setIsExpanded(true); // Expand when editing
    setShowToolbar(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewAnnotation({
      title: '',
      description: '',
      type: 'bookmark',
      color: '#3b82f6',
      importance: 'medium'
    });
  };

  // Filter and sort annotations
  const filteredAnnotations = annotations
    .filter(annotation => {
      // Search filter
      const matchesSearch = searchTerm === '' ||
        annotation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (annotation.description && annotation.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // Type filter
      const matchesType = filterType === 'all' || annotation.type === filterType;

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'time':
          return a.timestamp - b.timestamp;
        case 'importance':
          const importanceOrder = { high: 3, medium: 2, low: 1 };
          return (importanceOrder[b.importance] || 0) - (importanceOrder[a.importance] || 0);
        case 'recent':
          return new Date(b.created_at) - new Date(a.created_at);
        default:
          return a.timestamp - b.timestamp;
      }
    });

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeIcon = (type) => {
    const icons = {
      bookmark: '🔖',
      note: '📝',
      flag: '🚩',
      question: '❓',
      insight: '💡',
      achievement: '🏆'
    };
    return icons[type] || '📌';
  };

  const getTypeLabel = (type) => {
    const labels = {
      bookmark: 'Bookmark',
      note: 'Note',
      flag: 'Flag',
      question: 'Question',
      insight: 'Insight',
      achievement: 'Achievement'
    };
    return labels[type] || type;
  };

  const getImportanceBadge = (importance) => {
    const config = {
      high: { label: 'High', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
      medium: { label: 'Medium', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
      low: { label: 'Low', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' }
    };
    const cfg = config[importance] || config.medium;

    return (
      <span className="importance-badge" style={{
        color: cfg.color,
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.color}20`
      }}>
        {cfg.label}
      </span>
    );
  };

  // Quick add button for common annotations
  const quickAddButtons = [
    { type: 'bookmark', label: '📖 Bookmark', color: '#3b82f6' },
    { type: 'note', label: '📝 Quick Note', color: '#10b981' },
    { type: 'question', label: '❓ Question', color: '#f59e0b' },
    { type: 'insight', label: '💡 Insight', color: '#8b5cf6' }
  ];

  const handleQuickAdd = (type, color) => {
    setIsExpanded(true);
    setShowAddForm(true);
    setShowToolbar(true);
    setNewAnnotation({
      title: `${getTypeLabel(type)} at ${formatTime(currentTime)}`,
      description: '',
      type,
      color,
      importance: 'medium'
    });
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setShowToolbar(true);
    } else {
      setShowToolbar(false);
      setShowAddForm(false);
      setEditingId(null);
    }
  };

  const handleAddAnnotation = () => {
    setIsExpanded(true);
    setShowAddForm(true);
    setShowToolbar(true);
  };

  return (
    <div className="annotations-container">
      {/* Header with Toggle */}
      <div className="annotations-header">
        <div className="header-left">
          <h3>
            <span className="header-icon">📌</span>
            Session Annotations
            <span className="annotations-count">({annotations.length})</span>
          </h3>
          {error && (
            <div className={`error-message ${error.includes('✅') ? 'success' : 'error'}`}>
              {error}
            </div>
          )}
        </div>

        <div className="header-controls">
          {/* Toggle Button */}
          <button
            onClick={toggleExpanded}
            className={`toggle-btn ${isExpanded ? 'expanded' : ''}`}
            title={isExpanded ? "Hide annotations" : "Show annotations"}
          >
            {isExpanded ? '▲ Hide' : '▼ Show'}
          </button>

          {/* Add Annotation Button - Only shown when expanded */}
          {isExpanded && (
            <button
              onClick={handleAddAnnotation}
              className="add-annotation-btn"
              disabled={loading}
            >
              {showAddForm ? '✕ Cancel' : loading ? '⏳ Loading...' : '+ Add Annotation'}
            </button>
          )}
        </div>
      </div>

      {/* Collapsed Preview (when not expanded) */}
      {!isExpanded && annotations.length > 0 && (
        <div className="annotations-preview">
          <div className="preview-items">
            {annotations.slice(0, 3).map((annotation, idx) => (
              <div key={idx} className="preview-item" title={annotation.title}>
                <span className="preview-icon">{getTypeIcon(annotation.type)}</span>
                <span className="preview-time">{formatTime(annotation.timestamp)}</span>
                <span className="preview-title">{annotation.title}</span>
              </div>
            ))}
            {annotations.length > 3 && (
              <div className="preview-more">+{annotations.length - 3} more</div>
            )}
          </div>
        </div>
      )}

      {/* Quick Add Buttons (when collapsed and no annotations) */}
      {!isExpanded && annotations.length === 0 && (
        <div className="quick-add-section collapsed">
          <p className="quick-add-label">Click "Show" to add annotations</p>
          <div className="quick-add-buttons">
            {quickAddButtons.slice(0, 2).map((btn, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAdd(btn.type, btn.color)}
                className="quick-add-btn"
                style={{ borderLeftColor: btn.color }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <>
          {/* Quick Add Buttons */}
          {!showAddForm && annotations.length === 0 && (
            <div className="quick-add-section">
              <p className="quick-add-label">Quick actions:</p>
              <div className="quick-add-buttons">
                {quickAddButtons.map((btn, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAdd(btn.type, btn.color)}
                    className="quick-add-btn"
                    style={{ borderLeftColor: btn.color }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add/Edit Form */}
          {(showAddForm || editingId) && (
            <div className="annotation-form">
              <div className="form-header">
                <h4>{editingId ? '✏️ Edit Annotation' : '➕ Add New Annotation'}</h4>
                <div className="current-time-info">
                  ⏱️ Current time: <strong>{formatTime(currentTime)}</strong>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={newAnnotation.type}
                    onChange={(e) => setNewAnnotation({ ...newAnnotation, type: e.target.value })}
                    className="form-select"
                  >
                    <option value="bookmark">🔖 Bookmark</option>
                    <option value="note">📝 Note</option>
                    <option value="flag">🚩 Flag</option>
                    <option value="question">❓ Question</option>
                    <option value="insight">💡 Insight</option>
                    <option value="achievement">🏆 Achievement</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Importance</label>
                  <select
                    value={newAnnotation.importance}
                    onChange={(e) => setNewAnnotation({ ...newAnnotation, importance: e.target.value })}
                    className="form-select"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Color</label>
                  <div className="color-picker">
                    <input
                      type="color"
                      value={newAnnotation.color}
                      onChange={(e) => setNewAnnotation({ ...newAnnotation, color: e.target.value })}
                      className="color-input"
                    />
                    <span className="color-preview" style={{ backgroundColor: newAnnotation.color }}></span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  placeholder="What happened at this moment?"
                  value={newAnnotation.title}
                  onChange={(e) => setNewAnnotation({ ...newAnnotation, title: e.target.value })}
                  className="annotation-input"
                  maxLength={100}
                />
                <div className="char-count">{newAnnotation.title.length}/100</div>
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  placeholder="Add more details, observations, or follow-up actions..."
                  value={newAnnotation.description}
                  onChange={(e) => setNewAnnotation({ ...newAnnotation, description: e.target.value })}
                  className="annotation-textarea"
                  rows="4"
                  maxLength={500}
                />
                <div className="char-count">{newAnnotation.description.length}/500</div>
              </div>

              <div className="form-actions">
                <button
                  onClick={() => editingId ? cancelEdit() : setShowAddForm(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveAnnotation({
                    ...newAnnotation,
                    id: editingId
                  }, !!editingId)}
                  className="save-btn"
                  disabled={loading || !newAnnotation.title.trim()}
                >
                  {loading ? '⏳ Saving...' : editingId ? '💾 Update' : '💾 Save Annotation'}
                </button>
              </div>
            </div>
          )}

          {/* Filters and Search - Only show when there are annotations */}
          {showToolbar && annotations.length > 0 && (
            <div className="annotations-toolbar">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="🔍 Search annotations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="filters">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Types</option>
                  <option value="bookmark">Bookmarks</option>
                  <option value="note">Notes</option>
                  <option value="flag">Flags</option>
                  <option value="question">Questions</option>
                  <option value="insight">Insights</option>
                  <option value="achievement">Achievements</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                >
                  <option value="time">Sort by Time</option>
                  <option value="importance">Sort by Importance</option>
                  <option value="recent">Sort by Recent</option>
                </select>
              </div>
            </div>
          )}

          {/* Annotations List */}
          <div className="annotations-list">
            {loading && annotations.length === 0 ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading annotations...</p>
              </div>
            ) : filteredAnnotations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h4>No annotations found</h4>
                <p>
                  {searchTerm || filterType !== 'all'
                    ? 'Try changing your search or filters'
                    : 'Add your first annotation to mark important moments'}
                </p>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="add-first-btn"
                  >
                    + Create First Annotation
                  </button>
                )}
              </div>
            ) : (
              <div className="annotations-grid">
                {filteredAnnotations.map((annotation) => (
                  <div
                    key={annotation.annotation_id}
                    className={`annotation-card ${editingId === annotation.annotation_id ? 'editing' : ''}`}
                    style={{
                      borderLeftColor: annotation.color,
                      borderLeftWidth: annotation.importance === 'high' ? '6px' : '4px'
                    }}
                  >
                    <div className="annotation-card-header">
                      <div className="annotation-type">
                        <span className="type-icon">{getTypeIcon(annotation.type)}</span>
                        <span className="type-label">{getTypeLabel(annotation.type)}</span>
                        {getImportanceBadge(annotation.importance)}
                      </div>

                      <div className="annotation-actions">
                        <button
                          onClick={() => onJumpToTime(annotation.timestamp)}
                          className="action-btn jump-btn"
                          title="Jump to this time in video"
                        >
                          ▶ Jump to {formatTime(annotation.timestamp)}
                        </button>

                        <button
                          onClick={() => startEditing(annotation)}
                          className="action-btn edit-btn"
                          title="Edit annotation"
                        >
                          ✏️
                        </button>

                        <button
                          onClick={() => deleteAnnotation(annotation.annotation_id)}
                          className="action-btn delete-btn"
                          title="Delete annotation"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="annotation-card-content">
                      <div className="annotation-title">{annotation.title}</div>

                      {annotation.description && (
                        <div className="annotation-description">{annotation.description}</div>
                      )}

                      <div className="annotation-meta">
                        <span className="meta-item">
                          <span className="meta-icon">⏱️</span>
                          {formatTime(annotation.timestamp)}
                        </span>
                        <span className="meta-item">
                          <span className="meta-icon">📅</span>
                          {getRelativeTime(annotation.created_at)}
                        </span>
                        {annotation.updated_at && annotation.updated_at !== annotation.created_at && (
                          <span className="meta-item">
                            <span className="meta-icon">✏️</span>
                            Edited {getRelativeTime(annotation.updated_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary - Only show when expanded and has annotations */}
          {showToolbar && annotations.length > 0 && (
            <div className="annotations-summary">
              <div className="summary-item">
                <span className="summary-label">Total:</span>
                <span className="summary-value">{annotations.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Filtered:</span>
                <span className="summary-value">{filteredAnnotations.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Showing:</span>
                <span className="summary-value">
                  {filterType === 'all' ? 'All types' : `${getTypeLabel(filterType)}s`}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SessionAnnotations;