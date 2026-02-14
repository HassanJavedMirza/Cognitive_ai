import React, { useEffect, useState } from "react";
import api from "./api/axiosInstance";
import "./View_teachers.css";
import { useNavigate } from "react-router-dom";

function View_teachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const [courses, setCourses] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [teacherSessions, setTeacherSessions] = useState([]);

  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);

  const [formData, setFormData] = useState({
    date: "",
    start_time: "",
    end_time: "",
    venue: "",
    course_id: "",
    student_id: "",
    admin_id: 1,
  });

  const [submitting, setSubmitting] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);

  const navigate = useNavigate();

  // Fetch teachers
  const fetchTeachers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/get_all_teachers", {
        headers: { "Cache-Control": "no-store" },
      });
      console.log(res.data)
      setTeachers(res.data || []);
    } catch (err) {
      console.error("Error fetching teachers:", err);
      setError("Failed to load teachers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Add this function to your TeacherDashboard component
  const compareSessionsButton = (teacher_id) => {
    navigate('/TeacherCompareSessions', { // Use your actual route
      state: {
        teacher_id: teacher_id
      }
    });
  };

  // --- View teacher sessions ---
  const viewTeacherSessions = async (teacher) => {
    setSelectedTeacher(teacher);
    setSessionsLoading(true);
    setSessionsError(null);
    setShowSessionsModal(true);

    try {
      const res = await api.get(
        `/get_teachers_sessions_by_id/${teacher.teacher_id}`,
        { headers: { "Cache-Control": "no-store" } }
      );

      if (res.data.message) {
        setTeacherSessions([]);
        setSessionsError(res.data.message);
      } else {
        setTeacherSessions(res.data || []);
      }
    } catch (err) {
      console.error(err);
      setSessionsError("Failed to load sessions.");
      setTeacherSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };
  const showResult = (sid, teacherName, studentName) => {
    navigate("/view_results", {
      state: {
        sid,
        teacherName,
        studentName,
      },
    });
  };
  const closeSessionsModal = () => {
    setShowSessionsModal(false);
    setSelectedTeacher(null);
    setTeacherSessions([]);
    setSessionsError(null);
  };

  // --- Input change handler ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- Open create session form ---
  const openCreateSessionForm = async (teacher) => {
    setSelectedTeacher(teacher);
    setShowCreateForm(true);

    // reset form
    setFormData({
      date: "",
      start_time: "",
      end_time: "",
      venue: "",
      course_id: "",
      student_id: "",
      admin_id: 1,
    });
    setCourses([]);
    setFilteredStudents([]);

    // fetch courses for teacher
    setFetchingCourses(true);
    try {
      const res = await api.get(
        `/get_courses_by_teacher?tid=${teacher.teacher_id}`
      );
      setCourses(res.data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
      alert("Failed to load courses. Please try again.");
      setCourses([]);
    } finally {
      setFetchingCourses(false);
    }
  };

  const closeCreateForm = () => {
    setShowCreateForm(false);
    setSelectedTeacher(null);
    setCourses([]);
    setFilteredStudents([]);
    setFormData({
      date: "",
      start_time: "",
      end_time: "",
      venue: "",
      course_id: "",
      student_id: "",
      admin_id: 1,
    });
    setSubmitting(false);
  };

  // --- Fetch students on course change ---
  const handleCourseChange = async (courseId) => {
    setFormData((prev) => ({ ...prev, course_id: courseId, student_id: "" }));
    setFilteredStudents([]);
    if (!courseId) return;

    setFetchingStudents(true);
    try {
      const res = await api.get(
        `/get_students_by_course?cid=${courseId}`
      );

      setFilteredStudents(res.data || []);
    } catch (err) {
      console.error("Error fetching students:", err);
      alert("Failed to load students. Please try again.");
      setFilteredStudents([]);
    } finally {
      setFetchingStudents(false);
    }
  };

  const comapre_sessions = (tid) => {

  }

  // --- Submit create session ---
  const submitSession = async (e) => {
    e.preventDefault();
    if (!selectedTeacher) return alert("No teacher selected.");

    const { date, start_time, end_time, venue, course_id, student_id } = formData;
    if (!date || !start_time || !end_time || !venue || !course_id || !student_id) {
      return alert("Please fill all required fields.");
    }

    const payload = {
      ...formData,
      teacher_id: selectedTeacher.teacher_id,
      attendant_id: 1, // ✅ Fixed: Added attendant_id
    };

    setSubmitting(true);
    try {
      const res = await api.post(
        "/Create_new_Session",
        payload,
        { headers: { "Cache-Control": "no-store" } }
      );

      if (res.data?.error) {
        alert(res.data.error);
      } else if (res.data?.message) { // ✅ Fixed: Corrected spelling
        alert("Session created successfully!");
        closeCreateForm();
      } else {
        alert("Session created successfully!");
        closeCreateForm();
      }
    } catch (err) {
      console.error("Error creating session:", err.response || err);
      const msg = err?.response?.data?.detail || err?.message || "Failed to create session.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Date & time formatting helpers ---
  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

  function goback() {
    navigate("/AdminDashboard")
  }
  const formatTime = (timeStr) => (timeStr ? String(timeStr).substring(0, 5) : "");

  return (
    <div className="teachers-container" aria-live="polite">
      <div class="teachers-header">

        <button class="back-btn" onClick={goback} style={{ width: 100, marginRight: 100 }}>Go Back</button>
        <h2 class="teachers-title" style={{ marginLeft: 500, width: 400, alignItems: "center", alignContent: "center" }}>All Teachers</h2>
      </div>


      {loading ? (
        <div className="skeleton-grid" role="status" aria-label="Loading teachers">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      ) : error ? (
        <p className="error">{error}</p>
      ) : teachers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👨‍🏫</div>
          <p>No teachers found.</p>
        </div>
      ) : (
        <div className="teachers-grid">
          {teachers.map((teacher, index) => (
            <div key={teacher.teacher_id || index} className="teacher-card">
              <div className="teacher-avatar" aria-hidden>
                {teacher.name?.charAt(0).toUpperCase() || "?"}
              </div>
              <h3>{teacher.name || "Unnamed Teacher"}</h3>
              <div className="teacher-links">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => viewTeacherSessions(teacher)}
                  title={`View sessions for ${teacher.name}`}
                >
                  📋 View Sessions
                </button>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => openCreateSessionForm(teacher)}
                  title={`Create session for ${teacher.name}`}
                >
                  ➕ Create Session
                </button>
                <button
                  type="button"

                  onClick={() => compareSessionsButton(teacher.teacher_id)}

                >
                  Comapre Sessions
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE SESSION MODAL */}
      {showCreateForm && selectedTeacher && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeCreateForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Create Session for {selectedTeacher.name}</h3>
              {/* <button className="modal-close" onClick={closeCreateForm}>✕</button> */}
            </div>

            <form onSubmit={submitSession} className="modal-form">
              <div className="form-group">
                <label htmlFor="course-select">📚 Course</label>
                <select
                  id="course-select"
                  value={formData.course_id}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  required
                  disabled={fetchingCourses}
                >
                  <option value="">
                    {fetchingCourses ? "Loading courses..." : "Select Course"}
                  </option>
                  {courses.map((c) => (
                    <option key={c.course_id} value={c.course_id}>
                      {c.course_name || c.name || `Course ${c.course_id}`}
                    </option>
                  ))}
                </select>
              </div>

              {fetchingStudents ? (
                <p className="small-muted">Loading students...</p>
              ) : filteredStudents.length > 0 ? (
                <div className="form-group">
                  <label htmlFor="student-select">👨‍🎓 Student</label>
                  <select
                    id="student-select"
                    value={formData.student_id}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, student_id: e.target.value }))
                    }
                    required
                  >
                    <option value="">Select Student</option>
                    {filteredStudents.map((s) => (
                      <option key={s.student_id} value={s.student_id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                formData.course_id && (
                  <p className="small-muted">No students found for selected course.</p>
                )
              )}

              <div className="form-group">
                <label htmlFor="venue-select">📍 Venue</label>
                <select
                  id="venue-select"
                  name="venue"
                  value={formData.venue}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Venue</option>
                  {Array.from({ length: 14 }, (_, i) => `LT${i + 1}`).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="date">📅 Date</label>
                <input
                  id="date"
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="start_time">🕐 Start Time</label>
                  <input
                    id="start_time"
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="end_time">🕑 End Time</label>
                  <input
                    id="end_time"
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeCreateForm} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? "Creating..." : "💾 Create Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW TEACHER SESSIONS MODAL */}
      {showSessionsModal && selectedTeacher && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeSessionsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Sessions of {selectedTeacher.name}</h3>
              {/* <button className="modal-close" onClick={closeSessionsModal}>✕</button> */}
            </div>

            <div className="modal-body">
              {sessionsLoading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading sessions...</p>
                </div>
              ) : sessionsError ? (
                <div className="empty-state">
                  <p>{sessionsError}</p>
                </div>
              ) : teacherSessions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>No sessions found for this teacher.</p>
                </div>
              ) : (
                <div className="sessions-list">
                  {teacherSessions.map((session) => (
                    <div key={session.session_id} className="session-item">
                      <div className="session-info">
                        <div className="info-row">
                          <span className="info-label">📚 Course ID:</span>
                          <span className="info-value">{session.course_id}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">📅 Date:</span>
                          <span className="info-value">{formatDate(session.date)}</span>
                        </div>
                        {/* <div className="info-row">
                          <span className="info-label">🕐 Time:</span>
                          <span className="info-value">
                            {formatTime(session.start_time)} - {formatTime(session.end_time)}
                          </span>
                        </div> */}
                        <div className="info-row">
                          <span className="info-label">📍 Venue:</span>
                          <span className="info-value">{session.venue}</span>
                        </div>
                        <button onClick={() => showResult(session.session_id, session.teacher_name, session.student_name)}>View Result </button>


                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-close" onClick={closeSessionsModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default View_teachers;