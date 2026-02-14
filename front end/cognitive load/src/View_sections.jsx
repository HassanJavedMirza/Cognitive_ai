import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api/axiosInstance";
import "./View_sections.css";
import SessionModal from "./SessionModal";
import RatingModal from "./RatingModal";

// Custom hooks for better organization
const useModal = () => {
  const [modalStates, setModalStates] = useState({
    view: false,
    create: false,
    rating: false,
    sectionRatings: false // Added section ratings modal
  });

  const openModal = (modalName) => {
    setModalStates(prev => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName) => {
    setModalStates(prev => ({ ...prev, [modalName]: false }));
  };

  const closeAllModals = () => {
    setModalStates({
      view: false,
      create: false,
      rating: false,
      sectionRatings: false
    });
  };

  return { ...modalStates, openModal, closeModal, closeAllModals };
};

const useDataFetching = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (fetchFunction, errorMessage) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFunction();
      return result;
    } catch (err) {
      console.error(errorMessage, err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, fetchData };
};

function View_sections() {
  const navigate = useNavigate();

  // Modal states using custom hook
  const {
    view: showViewModal,
    create: showCreateModal,
    rating: showRatingModal,
    sectionRatings: showSectionRatingsModal,
    openModal,
    closeModal,
    closeAllModals
  } = useModal();

  // Data fetching states
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sessionList, setSessionList] = useState([]);
  const [sectionRatings, setSectionRatings] = useState(null); // Added section ratings state

  // Selected item states
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedSessionForRating, setSelectedSessionForRating] = useState(null);
  const [selectedSectionForRatings, setSelectedSectionForRatings] = useState(null); // Added

  // Form states
  const [sessionForm, setSessionForm] = useState({
    date: "",
    start_time: "",
    end_time: "",
    venue: "",
    admin_id: 1,
    attendant_id: 1,
  });

  const [ratingForm, setRatingForm] = useState({
    rating: 3,
    response: ""
  });

  const [teacherInfo, setTeacherInfo] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);

  // Loading states
  const { loading: loadingSections, fetchData: fetchSectionsData } = useDataFetching();
  const { loading: loadingStudents, fetchData: fetchStudentsData } = useDataFetching();
  const { loading: loadingSessions, fetchData: fetchSessionsData } = useDataFetching();
  const { loading: loadingSectionRatings, fetchData: fetchSectionRatingsData } = useDataFetching();

  // Fetch all sections on mount
  useEffect(() => {
    const loadSections = async () => {
      const data = await fetchSectionsData(async () => {
        const res = await api.get("/all_students");
        const students = res.data;

        const sectionCounts = {};
        students.forEach((s) => {
          if (s.section) {
            sectionCounts[s.section] = (sectionCounts[s.section] || 0) + 1;
          }
        });

        const uniqueSections = Object.entries(sectionCounts).map(
          ([sectionName, count]) => ({
            section: sectionName,
            totalStudents: count,
          })
        );

        setSections(uniqueSections);
        return uniqueSections;
      }, "Error fetching sections:");
    };

    loadSections();
  }, []);

  // Handle ESC key for modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeAllModals();
      }
    };

    const hasOpenModal = Object.values({
      showViewModal,
      showCreateModal,
      showRatingModal,
      showSectionRatingsModal
    }).some(Boolean);

    if (hasOpenModal) {
      document.body.classList.add('modal-open');
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.body.classList.remove('modal-open');
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [showViewModal, showCreateModal, showRatingModal, showSectionRatingsModal]);

  // Load students for a section
  const loadStudents = async (section) => {
    const data = await fetchStudentsData(async () => {
      const res = await api.get(
        `/get_students_of_a_Section?section=${section}`
      );
      setSelectedSection(section);
      setStudents(res.data);
      return res.data;
    }, "Error loading students:");
  };

  // Load section ratings
  const loadSectionRatings = async (section) => {
    const data = await fetchSectionRatingsData(async () => {
      setSelectedSectionForRatings(section);

      try {
        const res = await api.get(
          `/section/${section}/overall_ratings`
        );

        if (res.data.error) {
          console.warn("Error loading section ratings:", res.data.error);
          setSectionRatings({
            section: section,
            average_rating: 0,
            rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            total_sessions: 0,
            total_students: 0,
            error: res.data.error
          });
        } else {
          setSectionRatings(res.data);
        }
      } catch (error) {
        console.error("Error fetching section ratings:", error);
        setSectionRatings({
          section: section,
          average_rating: 0,
          rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          total_sessions: 0,
          total_students: 0,
          error: error.message
        });
      }

      openModal('sectionRatings');
      return data;
    }, "Error loading section ratings:");
  };

  // Get course name by ID
  const getCourseNameById = useCallback(async (courseId) => {
    if (!courseId) return "Not Assigned";

    try {
      const res = await api.get(`/Course_by_id/${courseId}`);
      if (res.data && res.data.course_name) {
        return res.data.course_name;
      }
      return `Course ${courseId}`;
    } catch (error) {
      console.warn(`Could not fetch course ${courseId}:`, error);
      return `Course ${courseId}`;
    }
  }, []);

  // Get teacher name by ID
  const getTeacherNameById = useCallback(async (teacherId) => {
    if (!teacherId) return "Not Assigned";

    try {
      const res = await api.get(`/get_Teacher_name/${teacherId}`);
      if (typeof res.data === 'string') {
        return res.data;
      } else if (res.data && res.data.name) {
        return res.data.name;
      }
      return `Teacher ${teacherId}`;
    } catch (error) {
      console.warn(`Could not fetch teacher ${teacherId}:`, error);
      return `Teacher ${teacherId}`;
    }
  }, []);

  // View student sessions with admin responses
  const viewSessions = async (studentId) => {
    const data = await fetchSessionsData(async () => {
      setSelectedStudent(studentId);

      // Fetch sessions for the student
      const res = await api.get(
        `/Students_session/${studentId}`
      );

      let sessions = Array.isArray(res.data) ? res.data : [];

      // Get student info
      const student = students.find(s => s.student_id === studentId);
      const studentName = student ? student.name : `Student ${studentId}`;

      // Process sessions to get names and admin responses
      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const [courseName, teacherName] = await Promise.all([
            getCourseNameById(session.course_id),
            getTeacherNameById(session.teacher_id)
          ]);

          // Check if admin has responded to this session
          let adminResponse = null;
          try {
            const responseRes = await api.get(
              `/sessions/${session.session_id}/check-response`
            );
            if (responseRes.data && responseRes.data.has_response) {
              adminResponse = responseRes.data;
            }
          } catch (error) {
            console.warn(`No admin response for session ${session.session_id}:`, error);
          }

          return {
            ...session,
            course_name: courseName,
            teacher_name: teacherName,
            student_name: studentName,
            admin_response: adminResponse
          };
        })
      );

      setSessionList(sessionsWithDetails);
      openModal('view');
      return sessionsWithDetails;
    }, "Error loading sessions:");
  };

  // Open create session modal
  const openCreateSessionModal = async (studentId) => {
    setSelectedStudent(studentId);
    setSelectedCourseId(null);
    setTeacherInfo(null);

    try {
      const res = await api.get(`/get_courses_by_student?sid=${studentId}`);
      setCourses(res.data);
      openModal('create');
    } catch (error) {
      console.error("Error loading courses:", error);
      alert("Failed to load courses for the student.");
    }
  };

  // Navigate to compare progress page
  const openCompareProgressPage = async (studentId) => {
    const student = students.find(s => s.student_id === studentId);
    navigate("/CompareProgressPage", {
      state: {
        studentId: studentId,
        studentName: student?.name || `Student ${studentId}`,
        section: selectedSection
      }
    });
  };

  const handleCourseSelect = (courseId) => {
    setSelectedCourseId(courseId);
    const selected = courses.find(c => c.course_id === courseId);
    setTeacherInfo(selected);
  };

  const showResult = (sessionId, teacherName, studentName) => {
    navigate("/view_results", {
      state: {
        session_id: sessionId,
        teacher_name: teacherName,
        student_name: studentName,
      },
    });
  };

  // Create new session
  const createSession = async () => {
    if (!selectedCourseId || !teacherInfo) {
      alert("Please select a course first");
      return;
    }

    setCreatingSession(true);
    try {
      const payload = {
        course_id: selectedCourseId,
        student_id: selectedStudent,
        teacher_id: teacherInfo?.teacher_id || null,
        date: sessionForm.date,
        start_time: sessionForm.start_time,
        end_time: sessionForm.end_time,
        venue: sessionForm.venue,
        admin_id: 1,
        attendant_id: 1
      };

      const res = await api.post(
        "/Create_Student_Session",
        payload
      );

      if (res.data.error) {
        alert(res.data.error);
        return;
      }

      alert("Student Session Created Successfully!");
      closeModal('create');
      setSessionForm({
        date: "",
        start_time: "",
        end_time: "",
        venue: "",
      });

      // Refresh sessions list
      if (selectedStudent) {
        viewSessions(selectedStudent);
      }

    } catch (error) {
      console.error("Error creating student session:", error);
      alert("Failed to create session.");
    } finally {
      setCreatingSession(false);
    }
  };

  // Open rating modal
  const openRatingModal = (sessionId) => {
    setSelectedSessionForRating(sessionId);
    setRatingForm({
      rating: 3,
      response: ""
    });
    openModal('rating');
  };

  // Submit rating
  const submitRating = async () => {
    try {
      const payload = {
        session_id: selectedSessionForRating,
        admin_id: 1,
        response: ratingForm.response,
        rating: ratingForm.rating
      };

      const res = await api.post(
        "/responses/",
        payload
      );

      if (res.data.message) {
        alert("Rating submitted successfully!");
        closeModal('rating');

        // Refresh data if view modal is open
        if (showViewModal && selectedStudent) {
          viewSessions(selectedStudent);
        }
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert("Failed to submit rating");
    }
  };

  // Helper functions
  const renderStars = useCallback((rating) => {
    if (!rating) return null;

    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-xl ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  }, []);

  const getRatingDescription = useCallback((rating) => {
    if (!rating) return "No rating";
    const descriptions = {
      1: "Poor",
      2: "Below Average",
      3: "Average",
      4: "Good",
      5: "Excellent"
    };
    return descriptions[rating] || "No rating";
  }, []);

  const getRatingColor = useCallback((rating) => {
    const colors = {
      1: "bg-red-100 text-red-800 border-red-200",
      2: "bg-orange-100 text-orange-800 border-orange-200",
      3: "bg-yellow-100 text-yellow-800 border-yellow-200",
      4: "bg-green-100 text-green-800 border-green-200",
      5: "bg-emerald-100 text-emerald-800 border-emerald-200"
    };
    return colors[rating] || "bg-gray-100 text-gray-800 border-gray-200";
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  }, []);

  const formatTime = useCallback((timeString) => {
    if (!timeString) return "No time data";
    // If time is in seconds (like 39600), convert to HH:MM format
    if (!isNaN(timeString)) {
      const totalSeconds = parseInt(timeString);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    return timeString;
  }, []);

  // Memoized computations
  const sectionStats = useMemo(() => ({
    totalSections: sections.length,
    totalStudents: sections.reduce((sum, sec) => sum + sec.totalStudents, 0)
  }), [sections]);

  // Loading state
  if (loadingSections) {
    return (
      <div className="main-wrapper">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading sections...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-wrapper">
      <div className="page-header" style={{ "width": 1200 }}>
        <h1 className="page-title">Section Management</h1>
        <div className="page-actions">
          <button
            className="btn btn-secondary mr-2"
            onClick={() => {
              if (selectedSection) {
                loadSectionRatings(selectedSection);
              } else {
                alert("Please select a section first");
              }
            }}
          >
            📊 View Section Ratings
          </button>
          <button
            className="btn btn-back"
            onClick={() => navigate("/AdminDashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Section Cards Grid */}
      {!selectedSection ? (
        <>
          <div className="section-header">
            <h2 className="text-2xl font-bold mb-4">All Sections</h2>
            <div className="stats-badge">
              {sectionStats.totalSections} sections • {sectionStats.totalStudents} students
            </div>
          </div>
          {sections.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3 className="empty-title">No sections found</h3>
              <p className="empty-description">
                There are no sections available in the system.
              </p>
            </div>
          ) : (
            <div className="sections-grid">
              {sections.map((sec) => (
                <div
                  key={sec.section}
                  className="section-card"
                  onClick={() => loadStudents(sec.section)}
                >
                  <h3>{sec.section}</h3>
                  <p>Section</p>
                  <div className="student-count">{sec.totalStudents}</div>
                  <small>{sec.totalStudents} students</small>
                  <button
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadSectionRatings(sec.section);
                    }}
                  >
                    View Ratings →
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="students-container">
          <div className="section-heading">
            <div className="flex items-center justify-between">
              <div>
                <h3>Students in Section: {selectedSection}</h3>
                <span className="section-badge">{students.length} students</span>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => loadSectionRatings(selectedSection)}
              >
                📊 View Section Ratings
              </button>
            </div>
          </div>

          {loadingStudents ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading students...</div>
            </div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3 className="empty-title">No students found</h3>
              <p className="empty-description">
                There are no students in this section.
              </p>
            </div>
          ) : (
            <>
              <div className="students-grid">
                {students.map((student) => (
                  <div key={student.student_id} className="student-card">
                    <div className="student-header">
                      <h4 className="student-name">{student.name}</h4>
                      <span className="student-arid">{student.arid_no}</span>
                    </div>

                    <div className="student-details">
                      <div className="detail-item">
                        <span className="detail-label">CGPA</span>
                        <span className="detail-value">{student.cgpa}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Batch</span>
                        <span className="detail-value">{student.batch}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Gender</span>
                        <span className="detail-value">{student.gender}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Section</span>
                        <span className="detail-value">{student.section}</span>
                      </div>
                    </div>

                    <div className="student-actions" style={{ width: 500 }}>
                      <button
                        className="btn btn-info"
                        onClick={() => viewSessions(student.student_id)}
                        disabled={loadingSessions}

                      >
                        <span>📋</span>
                        {loadingSessions ? "Loading..." : "Sessions"}
                      </button>

                      <button
                        className="btn btn-warning"
                        onClick={() => openCreateSessionModal(student.student_id)}

                      >
                        <span>➕</span>
                        Create Session
                      </button>

                      <button
                        className="btn btn-secondary"
                        onClick={() => openCompareProgressPage(student.student_id)}
                      >
                        <span>📊</span>
                        Compare Sessions
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  className="btn btn-outline flex-1"
                  onClick={() => setSelectedSection(null)}
                >
                  ← Back to All Sections
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={() => loadSectionRatings(selectedSection)}
                >
                  📊 View Section Ratings
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODALS */}
      {/* VIEW SESSIONS MODAL */}
      {showViewModal && (
        <SessionModal
          sessionList={sessionList}
          formatDate={formatDate}
          formatTime={formatTime}
          renderStars={renderStars}
          getRatingDescription={getRatingDescription}
          showResult={showResult}
          openRatingModal={openRatingModal}
          closeModal={() => closeModal('view')}
        />
      )}

      {/* CREATE SESSION MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => closeModal('create')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">➕ Create New Session</h2>
              <button className="btn btn-outline" onClick={() => closeModal('create')}>✕</button>
            </div>

            <div className="modal-body">
              <div className="space-y-4">
                <div className="form-group">
                  <label className="detail-label mb-2">Select Course *</label>
                  <select
                    className="w-full p-3 border rounded-lg"
                    value={selectedCourseId || ""}
                    onChange={(e) => handleCourseSelect(Number(e.target.value))}
                  >
                    <option value="">-- Select a course --</option>
                    {courses.map((course) => (
                      <option key={course.course_id} value={course.course_id}>
                        {course.course_name}
                      </option>
                    ))}
                  </select>
                </div>

                {teacherInfo && (
                  <div className="teacher-info-card">
                    <div className="flex items-center gap-2">
                      <div className="teacher-icon">👨‍🏫</div>
                      <div>
                        <div className="teacher-label">Teacher</div>
                        <div className="teacher-name">{teacherInfo.teacher_name}</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedCourseId && teacherInfo && (
                  <>
                    <div className="grid grid-2 gap-4">
                      <div className="form-group">
                        <label className="detail-label mb-2">Date *</label>
                        <input
                          type="date"
                          className="w-full p-3 border rounded-lg"
                          value={sessionForm.date}
                          onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="detail-label mb-2">Venue *</label>
                        <select
                          className="w-full p-3 border rounded-lg"
                          value={sessionForm.venue}
                          onChange={(e) => setSessionForm({ ...sessionForm, venue: e.target.value })}
                          required
                        >
                          <option value="">-- Select Venue --</option>
                          <option value="Room 1">Room 1</option>
                          <option value="Room 2">Room 2</option>
                          <option value="Room 3">Room 3</option>
                          <option value="Lab 1">Lab 1</option>
                          <option value="Lab 2">Lab 2</option>
                          <option value="Auditorium">Auditorium</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-2 gap-4">
                      <div className="form-group">
                        <label className="detail-label mb-2">Start Time *</label>
                        <input
                          type="time"
                          className="w-full p-3 border rounded-lg"
                          value={sessionForm.start_time}
                          onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="detail-label mb-2">End Time *</label>
                        <input
                          type="time"
                          className="w-full p-3 border rounded-lg"
                          value={sessionForm.end_time}
                          onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => closeModal('create')}>
                Cancel
              </button>
              {selectedCourseId && teacherInfo && (
                <button
                  className="btn btn-primary"
                  onClick={createSession}
                  disabled={creatingSession}
                >
                  {creatingSession ? "Creating..." : "Create Session"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RATING MODAL */}
      {showRatingModal && (
        <RatingModal
          ratingForm={ratingForm}
          setRatingForm={setRatingForm}
          submitRating={submitRating}
          closeModal={() => closeModal('rating')}
        />
      )}

      {/* SECTION RATINGS MODAL */}
      {showSectionRatingsModal && (
        <div className="modal-overlay" onClick={() => closeModal('sectionRatings')}>
          <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                📊 Section Ratings: {selectedSectionForRatings}
              </h2>
              <button className="btn btn-outline" onClick={() => closeModal('sectionRatings')}>✕</button>
            </div>

            <div className="modal-body">
              {loadingSectionRatings ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <div className="loading-text">Loading section ratings...</div>
                </div>
              ) : sectionRatings && sectionRatings.error ? (
                <div className="empty-state">
                  <div className="empty-icon">⚠️</div>
                  <h3 className="empty-title">Unable to Load Ratings</h3>
                  <p className="empty-description">{sectionRatings.error}</p>
                </div>
              ) : sectionRatings ? (
                <div className="space-y-6">
                  {/* Overall Stats */}
                  <div className="grid grid-3 gap-4">
                    <div className="stat-card">
                      <div className="stat-label">Average Rating</div>
                      <div className="stat-value text-4xl">
                        {sectionRatings.average_rating.toFixed(1)}
                      </div>
                      <div className="mt-2">
                        {renderStars(Math.round(sectionRatings.average_rating))}
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-label">Total Students</div>
                      <div className="stat-value text-4xl">
                        {sectionRatings.total_students}
                      </div>
                      <div className="stat-description">
                        in this section
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-label">Total Sessions</div>
                      <div className="stat-value text-4xl">
                        {sectionRatings.total_sessions}
                      </div>
                      <div className="stat-description">
                        with ratings: {sectionRatings.sessions_with_ratings || 0}
                      </div>
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div className="card">
                    <h3 className="card-title">Rating Distribution</h3>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = sectionRatings.rating_distribution?.[rating] || 0;
                        const totalRatings = Object.values(sectionRatings.rating_distribution || {}).reduce((a, b) => a + b, 0);
                        const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;

                        return (
                          <div key={rating} className="flex items-center">
                            <div className="w-16">
                              <span className="rating-label">
                                {rating} ★
                              </span>
                            </div>
                            <div className="flex-1 ml-4">
                              <div className="progress-bar-container">
                                <div
                                  className={`progress-bar ${getRatingColor(rating).split(' ')[0]}`}
                                  style={{ width: `${percentage}%` }}
                                >
                                  <span className="progress-text">
                                    {count} ({percentage.toFixed(1)}%)
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary */}
                  {sectionRatings.summary && (
                    <div className="grid grid-2 gap-4">
                      <div className={`summary-card ${getRatingColor(5)}`}>
                        <div className="summary-title">Excellent</div>
                        <div className="summary-value">{sectionRatings.summary.excellent || 0}</div>
                      </div>
                      <div className={`summary-card ${getRatingColor(4)}`}>
                        <div className="summary-title">Good</div>
                        <div className="summary-value">{sectionRatings.summary.good || 0}</div>
                      </div>
                      <div className={`summary-card ${getRatingColor(3)}`}>
                        <div className="summary-title">Average</div>
                        <div className="summary-value">{sectionRatings.summary.average || 0}</div>
                      </div>
                      <div className={`summary-card ${getRatingColor(2)}`}>
                        <div className="summary-title">Below Average</div>
                        <div className="summary-value">{sectionRatings.summary.below_average || 0}</div>
                      </div>
                    </div>
                  )}

                  {/* Course Breakdown */}
                  {sectionRatings.course_breakdown && Object.keys(sectionRatings.course_breakdown).length > 0 && (
                    <div className="card">
                      <h3 className="card-title">Course-wise Performance</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr>
                              <th className="table-header">Course</th>
                              <th className="table-header">Sessions</th>
                              <th className="table-header">Avg. Rating</th>
                              <th className="table-header">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(sectionRatings.course_breakdown).map(([course, data]) => (
                              <tr key={course}>
                                <td className="table-cell">{course}</td>
                                <td className="table-cell">{data.sessions}</td>
                                <td className="table-cell">
                                  <div className="flex items-center gap-2">
                                    {data.average_rating?.toFixed(1) || "N/A"}
                                    {data.average_rating && renderStars(Math.round(data.average_rating))}
                                  </div>
                                </td>
                                <td className="table-cell">
                                  <span className={`status-badge ${(data.average_rating || 0) >= 4 ? 'bg-green-100 text-green-800' :
                                      (data.average_rating || 0) >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                    {(data.average_rating || 0) >= 4 ? 'Excellent' :
                                      (data.average_rating || 0) >= 3 ? 'Good' : 'Needs Improvement'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Top Performing Students */}
                  {sectionRatings.top_performing_students && sectionRatings.top_performing_students.length > 0 && (
                    <div className="card">
                      <h3 className="card-title">Top Performing Students</h3>
                      <div className="grid grid-3 gap-4">
                        {sectionRatings.top_performing_students.map((student, index) => (
                          <div key={student.student_id} className="student-highlight-card">
                            <div className="student-rank">#{index + 1}</div>
                            <div className="student-name">{student.name}</div>
                            <div className="student-arid">{student.arid_no}</div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-sm font-medium">Avg. Rating:</span>
                              <span className="text-lg font-bold">{student.average_rating}</span>
                            </div>
                            <div className="mt-1">
                              {renderStars(Math.round(student.average_rating))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <h3 className="empty-title">No Rating Data Available</h3>
                  <p className="empty-description">
                    There are no ratings available for this section yet.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => closeModal('sectionRatings')}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default View_sections;