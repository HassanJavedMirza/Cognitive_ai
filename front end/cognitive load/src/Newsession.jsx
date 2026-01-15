  import { useEffect, useState } from "react";
  import axios from "axios";
  import { useNavigate } from "react-router-dom";
  import "./new_session.css";

  function NewSession() { 
    const navigate = useNavigate();

    // --- States ---
    const [students, setStudents] = useState([]);
    const [sections, setSections] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);

    const [selectedSection, setSelectedSection] = useState("");
    const [selectedStudent, setSelectedStudent] = useState("");
    const [teacherCourses, setTeacherCourses] = useState([]); // Changed from teachers
    const [selectedTeacherCourse, setSelectedTeacherCourse] = useState(""); // Combined selection

    const [selectedVenue, setSelectedVenue] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [message, setMessage] = useState("");

    // --- Fetch all students and extract sections ---
    useEffect(() => {
      const fetchStudents = async () => {
        try {
          const res = await axios.get("http://localhost:8000/all_students");
          setStudents(res.data);

          const uniqueSections = [
            ...new Set(res.data.map((s) => s.section).filter(Boolean)),
          ];
          setSections(uniqueSections);
        } catch (err) {
          console.error("Error fetching students:", err);
        }
      };
      fetchStudents();
    }, []);

    // --- When section changes ---
    const handleSectionChange = (section) => {
      setSelectedSection(section);
      setSelectedStudent("");
      setTeacherCourses([]);
      setSelectedTeacherCourse("");
      const filtered = students.filter((s) => s.section === section);
      setFilteredStudents(filtered);
    };

    // --- When student selected ---
    const handleStudentChange = async (sid) => {
      setSelectedStudent(sid);
      setSelectedTeacherCourse("");
      try {
        const res = await axios.get(
          `http://localhost:8000/get_teacher_by_course?sid=${sid}`
        );
        setTeacherCourses(res.data);
      } catch (err) {
        console.error("Error fetching teacher-courses:", err);
      }
    };

    // --- Create new session ---
    const handleCreateSession = async (e) => {
      e.preventDefault();
      setMessage("");

      if (!selectedTeacherCourse) {
        setMessage("❌ Please select a teacher and course.");
        return;
      }

      // Parse the selected value (format: "teacherId-courseId")
      const [teacherId, courseId] = selectedTeacherCourse.split("-").map(Number);

      const payload = {
        course_id: courseId,
        teacher_id: teacherId,
        student_id: parseInt(selectedStudent),
        date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        venue: selectedVenue,
        admin_id: 1,
        attendant_id: 1
      };

      try {
        const res = await axios.post(
          "http://localhost:8000/Create_new_Session",
          payload
        );

        if (res.data.error) {
          setMessage(`⚠️ ${res.data.error}`);
        } else {
          setMessage(`✅ ${res.data.message}`);
          console.log("Session Record ID:", res.data.session_record_id);
          setTimeout(() => {
            navigate("/Sessions");
          }, 2000);
        }
      } catch (err) {
        console.error("Error creating session:", err);
        setMessage("❌ Failed to create session. Try again.");
      }
    };

    return (
      <div className="new-session-container">
        {/* <h1 className="page-title" >🧩 Create New Session</h1> */}

        <form className="new-session-form" onSubmit={handleCreateSession}>
          {/* SECTION */}
          <label>Section:</label>
          <select
            value={selectedSection}
            onChange={(e) => handleSectionChange(e.target.value)}
            required
          >
            <option value="">Select Section</option>
            {sections.map((sec, i) => (
              <option key={i} value={sec}>
                {sec}
              </option>
            ))}
          </select>

          {/* STUDENTS */}
          {selectedSection && (
            <>
              <label>Student:</label>
              <select
                value={selectedStudent}
                onChange={(e) => handleStudentChange(e.target.value)}
                required
              >
                <option value="">Select Student</option>
                {filteredStudents.map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* TEACHER & COURSE COMBINED */}
          {teacherCourses.length > 0 && (
            <>
              <label>Teacher & Course:</label>
              <select
                value={selectedTeacherCourse}
                onChange={(e) => setSelectedTeacherCourse(e.target.value)}
                required
              >
                <option value="">Select Teacher & Course</option>
                {teacherCourses.map((tc) => (
                  <option 
                    key={`${tc.teacher_id}-${tc.course_id}`} 
                    value={`${tc.teacher_id}-${tc.course_id}`}
                  >
                    {tc.name} - {tc.course_name}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* VENUE */}
          <label>Venue:</label>
          <select
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
            required
          >
            <option value="">Select Venue</option>
            {Array.from({ length: 14 }, (_, i) => `LT${i + 1}`).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <label>Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            required
          />

          <label>Start Time:</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />

          <label>End Time:</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />

          <button type="submit" className="submit-btn">
            Create Session
          </button>

          {message && <p className="form-message">{message}</p>}
        </form>

        <button className="back-btn" onClick={() => navigate("/Sessions")} style={{marginRight:300, marginLeft:20}}>
          ← Back to Sessions
        </button>
      </div>
    );
  }

  export default NewSession;