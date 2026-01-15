import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function UploadResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sid, editMode = false } = location.state || {};

  const [sessionData, setSessionData] = useState(null);
  const [existingData, setExistingData] = useState(null);
  const [loading, setLoading] = useState(true);

  // File states
  const [eegFile, setEegFile] = useState(null);
  const [teacherVideo, setTeacherVideo] = useState(null);
  const [studentVideo, setStudentVideo] = useState(null);

  // UI states
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sid) {
      navigate(-1);
      return;
    }
    loadSessionData();
  }, [sid]);

  const loadSessionData = async () => {
    setLoading(true);
    try {
      // Get session details
      const sessionRes = await axios.get(`http://localhost:8000/Sessions_by_sid/${sid}`);
      if (sessionRes.data && sessionRes.data.length > 0)
       {

        setSessionData(sessionRes.data[0]);
        console.log(sessionData);

      }

      // If edit mode, load existing results
      if (editMode) {
        try {
          const resultsRes = await axios.get(
            `http://localhost:8000/teacher_session_results_by_sid/${sid}`
          );
          if (resultsRes.data && !resultsRes.data.error) {
            setExistingData(resultsRes.data[0]);
          }
        } catch (err) {
          console.log("No existing results found");
        }
      }
    } catch (err) {
      setError("Failed to load session data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    switch (type) {
      case "eeg":
        setEegFile(file);
        break;
      case "teacher":
        setTeacherVideo(file);
        break;
      case "student":
        setStudentVideo(file);
        break;
    }
  };

  const handleUpload = async () => {
    // Validation: At least one file must be selected
    if (!eegFile && !teacherVideo && !studentVideo) {
      setError("Please select at least one file to upload/update!");
      return;
    }

    if (!sessionData) {
      setError("Session data not loaded");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("session_id", sid);
      formData.append("student_name", sessionData.student_name || "Student");
      formData.append("teacher_name", sessionData.teacher_name || "Teacher");
      formData.append("arid_no", sessionData.student_id || "ARID");
      formData.append("edit_mode", editMode ? "true" : "false");

      // Only append files that are selected
      if (eegFile) {
        formData.append("eeg_file", eegFile);
      }
      if (teacherVideo) {
        formData.append("teacher_video", teacherVideo);
      }
      if (studentVideo) {
        formData.append("student_video", studentVideo);
      }

      const response = await axios.post(
        "http://localhost:8000/api/upload_video",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        setMessage(
          editMode
            ? `Successfully updated: ${response.data.uploaded.join(", ")}`
            : "Files uploaded successfully!"
        );
        setTimeout(() => navigate(-1), 2000);
      } else {
        setError(response.data.error || "Upload failed");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleClearFile = (type) => {
    switch (type) {
      case "eeg":
        setEegFile(null);
        document.getElementById("eeg-input").value = "";
        break;
      case "teacher":
        setTeacherVideo(null);
        document.getElementById("teacher-input").value = "";
        break;
      case "student":
        setStudentVideo(null);
        document.getElementById("student-input").value = "";
        break;
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading session data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h2 style={styles.title}>
            {editMode ? "Edit Session Results" : "Upload Session Results"}
          </h2>
          <div style={styles.sessionBadge}>Session #{sid}</div>
        </div>

        {/* Session Info */}
        {/* {sessionData && (
          <div style={styles.sessionInfo}>
            <h3 style={styles.sectionTitle}>Session Details</h3>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Course:</span>
                <span style={styles.infoValue}>{sessionData.course_name || "N/A"}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Teacher:</span>
                <span style={styles.infoValue}>{sessionData.teacher_name || "N/A"}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Student:</span>
                <span style={styles.infoValue}>{sessionData.student_name || "N/A"}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Date:</span>
                <span style={styles.infoValue}>
                  {new Date(sessionData.date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )} */}

        {/* Existing Data (Edit Mode) */}
        {editMode && existingData && (
          <div style={styles.existingData}>
            <h3 style={styles.sectionTitle}>Current Files</h3>
            <div style={styles.existingList}>
              {existingData.eeg_path && (
                <div style={styles.existingItem}>
                  ✅ <strong>EEG Data:</strong> Already uploaded
                </div>
              )}
              {existingData.teacher_path && (
                <div style={styles.existingItem}>
                  ✅ <strong>Teacher Video:</strong> Already uploaded
                </div>
              )}
              {existingData.student_path && (
                <div style={styles.existingItem}>
                  ✅ <strong>Student Video:</strong> Already uploaded
                </div>
              )}
            </div>
            <p style={styles.editNote}>
              💡 You can update individual files below. Only selected files will be replaced.
            </p>
          </div>
        )}

        {/* Upload Section */}
        <div style={styles.uploadSection}>
          <h3 style={styles.sectionTitle}>
            {editMode ? "Select Files to Update" : "Upload Files"}
          </h3>

          {/* EEG File */}
          <div style={styles.fileInput}>
            <label style={styles.fileLabel}>
              📊 EEG Data (CSV) <span style={styles.optional}>(Optional)</span>
            </label>
            <div style={styles.fileInputWrapper}>
              <input
                id="eeg-input"
                type="file"
                accept=".csv"
                onChange={(e) => handleFileChange(e, "eeg")}
                style={styles.fileInputField}
              />
              {eegFile && (
                <div style={styles.fileSelected}>
                  ✓ {eegFile.name}
                  <button
                    style={styles.clearBtn}
                    onClick={() => handleClearFile("eeg")}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Teacher Video */}
          <div style={styles.fileInput}>
            <label style={styles.fileLabel}>
              👨‍🏫 Teacher Video <span style={styles.optional}>(Optional)</span>
            </label>
            <div style={styles.fileInputWrapper}>
              <input
                id="teacher-input"
                type="file"
                accept="video/*"
                onChange={(e) => handleFileChange(e, "teacher")}
                style={styles.fileInputField}
              />
              {teacherVideo && (
                <div style={styles.fileSelected}>
                  ✓ {teacherVideo.name}
                  <button
                    style={styles.clearBtn}
                    onClick={() => handleClearFile("teacher")}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Student Video */}
          <div style={styles.fileInput}>
            <label style={styles.fileLabel}>
              👨‍🎓 Student Video <span style={styles.optional}>(Optional)</span>
            </label>
            <div style={styles.fileInputWrapper}>
              <input
                id="student-input"
                type="file"
                accept="video/*"
                onChange={(e) => handleFileChange(e, "student")}
                style={styles.fileInputField}
              />
              {studentVideo && (
                <div style={styles.fileSelected}>
                  ✓ {studentVideo.name}
                  <button
                    style={styles.clearBtn}
                    onClick={() => handleClearFile("student")}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && <div style={styles.errorMsg}>{error}</div>}
        {message && <div style={styles.successMsg}>{message}</div>}

        {/* Action Buttons */}
        <div style={styles.actionButtons}>
          <button
            style={styles.cancelBtn}
            onClick={() => navigate(-1)}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            style={{
              ...styles.uploadBtn,
              ...(uploading ? styles.uploadBtnDisabled : {}),
            }}
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading
              ? "Uploading..."
              : editMode
              ? "Update Files"
              : "Upload Files"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "40px 20px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "60vh",
    color: "white",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "5px solid rgba(255, 255, 255, 0.3)",
    borderTop: "5px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  card: {
    maxWidth: "800px",
    margin: "0 auto",
    background: "white",
    borderRadius: "20px",
    padding: "40px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "30px",
    paddingBottom: "20px",
    borderBottom: "2px solid #f0f0f0",
  },
  backBtn: {
    background: "#f0f3ff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    color: "#667eea",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "700",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  sessionBadge: {
    background: "#667eea",
    color: "white",
    padding: "8px 15px",
    borderRadius: "20px",
    fontSize: "14px",
    fontWeight: "600",
  },
  sessionInfo: {
    background: "#f9fafb",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "30px",
  },
  sectionTitle: {
    margin: "0 0 15px 0",
    fontSize: "18px",
    fontWeight: "600",
    color: "#333",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  infoLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: "14px",
    color: "#333",
  },
  existingData: {
    background: "#f0f9ff",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "30px",
    border: "2px solid #bfdbfe",
  },
  existingList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "15px",
  },
  existingItem: {
    fontSize: "14px",
    color: "#1e40af",
  },
  editNote: {
    margin: 0,
    fontSize: "13px",
    color: "#666",
    fontStyle: "italic",
  },
  uploadSection: {
    marginBottom: "30px",
  },
  fileInput: {
    marginBottom: "25px",
  },
  fileLabel: {
    display: "block",
    marginBottom: "10px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#333",
  },
  optional: {
    fontSize: "12px",
    fontWeight: "400",
    color: "#999",
  },
  fileInputWrapper: {
    position: "relative",
  },
  fileInputField: {
    width: "100%",
    padding: "12px",
    border: "2px dashed #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  fileSelected: {
    marginTop: "10px",
    padding: "10px 15px",
    background: "#f0f9ff",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "14px",
    color: "#1e40af",
  },
  clearBtn: {
    background: "#fee2e2",
    border: "none",
    padding: "4px 8px",
    borderRadius: "4px",
    color: "#dc2626",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },
  errorMsg: {
    padding: "15px",
    background: "#fee2e2",
    color: "#dc2626",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
  },
  successMsg: {
    padding: "15px",
    background: "#d1fae5",
    color: "#065f46",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
  },
  actionButtons: {
    display: "flex",
    gap: "15px",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    padding: "12px 30px",
    background: "#f3f4f6",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#666",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  uploadBtn: {
    padding: "12px 30px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  uploadBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
};

// ✅ THIS IS THE CRITICAL LINE - DEFAULT EXPORT
export default UploadResults;