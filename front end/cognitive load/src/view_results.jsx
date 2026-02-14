import { useState, useRef, useEffect, useCallback } from "react";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
import { useNavigate, useLocation } from "react-router-dom";
import "./view_results.css";
import SessionSummary from './SessionSummary';
import SessionAnnotations from './SessionAnnotations';
import { List } from "lucide-react";

const styleSheet = document.styleSheets[0];
if (styleSheet && !Array.from(styleSheet.cssRules).some(rule => rule.name === 'spin')) {
  styleSheet.insertRule(`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
}

// Add fadeOut animation for click feedback
if (styleSheet && !Array.from(styleSheet.cssRules).some(rule => rule.name === 'fadeOut')) {
  styleSheet.insertRule(`
    @keyframes fadeOut {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }
  `, styleSheet.cssRules.length);
}

const ViewResults = () => {

  const location = useLocation();
  const navigate = useNavigate();

  const sessionId = location.state?.sid;
  const teacherName = location.state?.teacherName;
  const studentName = location.state?.studentName;

  const [highaplha, sethighalpha] = useState("");
  const [highbeta, sethighbeta] = useState("");
  const [highgamma, sethighgamma] = useState("");
  const [highdelta, sethighdelta] = useState("");
  const [hightheta, sethightheta] = useState("");

  const [modalpha, setmodealpha] = useState("");
  const [modbeta, setmodebeta] = useState("");
  const [modgamma, setmmodegamma] = useState("");
  const [modedelta, setmodedelta] = useState("");
  const [modetheta, setmodetheta] = useState("");

  const [lowalpha, setlowaplpha] = useState("");
  const [lowbeta, setlowbeta] = useState("");
  const [lowgamma, setlowgamma] = useState("");
  const [lowdelta, setlowdelta] = useState("");
  const [lowtheta, setlowtheta] = useState("");


  const [minhigh, setminhigh] = useState("");
  const [minlow, setminlow] = useState("");
  const [minmoderate, setminmoderate] = useState("");
  const [maxhigh, setmaxhigh] = useState("");
  const [maxmoderate, setmaxmoderate] = useState("");
  const [maxlow, setmaxlow] = useState("");


  const [results, setResults] = useState([]);
  const [eegData, setEegData] = useState([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [showSessionSummary, setShowSessionSummary] = useState(false);

  // Response/Rating state variables
  const [showResponseSection, setShowResponseSection] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [rating, setRating] = useState(0);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [existingResponses, setExistingResponses] = useState([]);
  const [adminResponsesLoading, setAdminResponsesLoading] = useState(false);
  const [adminName, setAdminName] = useState("");

  const [selectedFilters, setSelectedFilters] = useState({
    "very high": true,
    high: true,
    medium: true,
    low: true,
    "very low": true,
  });

  // Wave filter states
  const [selectedWaves, setSelectedWaves] = useState({
    delta: true,
    theta: true,
    alpha: true,
    beta: true,
    gamma: true,
  });

  // Wave range filter states
  const [waveRanges, setWaveRanges] = useState({
    delta: { min: 0, max: 1000 },
    theta: { min: 0, max: 1000 },
    alpha: { min: 0, max: 1000 },
    beta: { min: 0, max: 1000 },
    gamma: { min: 0, max: 1000 }
  });

  const [segments, setSegments] = useState([]);
  const [detectedRanges, setDetectedRanges] = useState({
    delta: { min: 0, max: 1000 },
    theta: { min: 0, max: 1000 },
    alpha: { min: 0, max: 1000 },
    beta: { min: 0, max: 1000 },
    gamma: { min: 0, max: 1000 }
  });

  const mainStudentRef = useRef();
  const mainTeacherRef = useRef();

  const [mainIsPlaying, setMainIsPlaying] = useState(false);
  const [mainCurrentTime, setMainCurrentTime] = useState(0);
  // ["very high", "high", "moderate", "low", "very low"]
  const labelOrder = ["high", "medium", "low"];
  const order = ["high", "moderate", "low"];
  const BUFFER_SECONDS = 2;

  // Wave color mapping
  const waveColors = {
    delta: '#ff4444',
    theta: 'rgb(68, 68, 255)',
    alpha: '#44ff44',
    beta: '#ffaa44',
    gamma: '#aa44ff'
  };

  // Fetch admin name on component mount
  useEffect(() => {
    const fetchAdminName = async () => {
      try {
        const userRole = localStorage.getItem('userRole');
        const userId = localStorage.getItem('userId');

        if (userRole === 'admin' && userId) {
          const res = await fetch(`${API_BASE}/admins_by_id/${userId}`);
          const data = await res.json();
          if (data && data.name) {
            setAdminName(data.name);
          }
        }
      } catch (error) {
        console.error("Error fetching admin name:", error);
      }
    };

    fetchAdminName();
  }, []);

  // Fetch existing responses for this session
  useEffect(() => {
    if (!sessionId) return;

    const fetchExistingResponses = async () => {
      setAdminResponsesLoading(true);
      try {
        // First check if there's a response for this specific session
        const checkRes = await fetch(
          `${API_BASE}/sessions/${sessionId}/check-response`
        );

        const checkData = await checkRes.json();

        if (checkData.has_response) {
          // If there's a response, add it to the array
          setExistingResponses([checkData]);
        } else {
          setExistingResponses([]);
        }

        // Also fetch all responses to show in the list
        const allRes = await fetch(
          "${API_BASE}/responses/"
        );

        const allData = await allRes.json();

        if (allData.responses && allData.responses.length > 0) {
          // Filter responses for this session
          const sessionResponses = allData.responses.filter(
            response => response.session_id === sessionId
          );

          if (sessionResponses.length > 0) {
            setExistingResponses(sessionResponses);
          }
        }
      } catch (error) {
        console.error("Error fetching responses:", error);
      } finally {
        setAdminResponsesLoading(false);
      }
    };

    fetchExistingResponses();
  }, [sessionId]);



  // Fetch Session data
  useEffect(() => {
    if (!sessionId) return;
    const sessiondetails = async () => {
      try {
        const res = await fetch(`${API_BASE}/Sessions_by_sid/${sessionId}`);
        const details = await res.json();
        console.log("Session details:", details);
      } catch (error) {
        console.error(error);
      }
    };
    sessiondetails();
  }, [sessionId]);

  // Fetch SESSION RESULTS
  useEffect(() => {
    if (!sessionId) return;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/teacher_session_results_by_sid/${sessionId}`
        );
        const data = await res.json();
        if (!data.error) {
          setResults(data);
          console.log("Session results:", data);
        }
      } catch (err) {
        console.error("Error fetching session results:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [sessionId]);

  // Fetch EEG CSV - Improved with auto-range detection
  useEffect(() => {
    const eegPath = results[0]?.eeg_path;

    if (!eegPath) return;

    const fetchEEG = () => {
      fetch(`${API_BASE}/serve_csv?path=${eegPath}&t=${Date.now()}`)
        .then((res) => res.text())
        .then((text) => {
          const lines = text.split("\n");
          const data = [];
          let startTime = null;

          const headers = lines[0]
            .replace(/\r/g, "")
            .split(",")
            .map(h => h.replace(/\s+/g, "").toLowerCase());

          const idx = (name) =>
            headers.findIndex(h => h === name.replace(/\s+/g, "").toLowerCase());

          // Initialize range detection
          const ranges = {
            delta: { min: Infinity, max: -Infinity },
            theta: { min: Infinity, max: -Infinity },
            alpha: { min: Infinity, max: -Infinity },
            beta: { min: Infinity, max: -Infinity },
            gamma: { min: Infinity, max: -Infinity }
          };

          for (let i = 1; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;
            line = line.replace(/\r/g, "");

            const parts = line.split(",");
            const timeIdx = idx("time") !== -1 ? idx("time") : 0;
            const labelIdx = idx("label");

            const timeStr = parts[timeIdx]?.trim();
            const label = parts[labelIdx]?.trim().toLowerCase();

            if (!timeStr || !label) continue;

            let timeInSeconds;
            if (timeStr.includes(":")) {
              const timeParts = timeStr.split(":");
              const hours = parseInt(timeParts[0]) || 0;
              const minutes = parseInt(timeParts[1]) || 0;
              const seconds = parseFloat(timeParts[2]) || 0;
              timeInSeconds = hours * 3600 + minutes * 60 + seconds;
            } else {
              timeInSeconds = parseFloat(timeStr);
            }

            if (isNaN(timeInSeconds)) continue;
            if (startTime === null) startTime = timeInSeconds;

            const relativeTime = timeInSeconds - startTime;
            const delta = parseFloat(parts[idx("delta")]) || 0;
            const theta = parseFloat(parts[idx("theta")]) || 0;
            const alpha = parseFloat(parts[idx("alpha")]) || 0;
            const beta = parseFloat(parts[idx("beta")]) || 0;
            const gamma = parseFloat(parts[idx("gamma")]) || 0;

            // Update ranges
            if (delta < ranges.delta.min) ranges.delta.min = delta;
            if (delta > ranges.delta.max) ranges.delta.max = delta;
            if (theta < ranges.theta.min) ranges.theta.min = theta;
            if (theta > ranges.theta.max) ranges.theta.max = theta;
            if (alpha < ranges.alpha.min) ranges.alpha.min = alpha;
            if (alpha > ranges.alpha.max) ranges.alpha.max = alpha;
            if (beta < ranges.beta.min) ranges.beta.min = beta;
            if (beta > ranges.beta.max) ranges.beta.max = beta;
            if (gamma < ranges.gamma.min) ranges.gamma.min = gamma;
            if (gamma > ranges.gamma.max) ranges.gamma.max = gamma;

            data.push({
              time: relativeTime,
              label,
              delta,
              theta,
              alpha,
              beta,
              gamma
            });
          }

          // Process detected ranges to nice round numbers
          const processedRanges = {};
          Object.keys(ranges).forEach(band => {
            const min = ranges[band].min === Infinity ? 0 : ranges[band].min;
            const max = ranges[band].max === -Infinity ? 1000 : ranges[band].max;

            // Round min down to nearest nice number
            let niceMin = 0;
            if (min > 0) {
              const magnitude = Math.pow(10, Math.floor(Math.log10(min)));
              niceMin = Math.floor(min / magnitude) * magnitude;
            }

            // Round max up to nearest nice number
            let niceMax = 1000;
            if (max > 0) {
              const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
              niceMax = Math.ceil(max / magnitude) * magnitude;
              // Ensure we have some padding
              niceMax = Math.max(niceMax * 1.1, niceMin * 2);
            }

            processedRanges[band] = { min: niceMin, max: niceMax };
          });

          setDetectedRanges(processedRanges);
          // Initialize wave ranges with detected ranges
          setWaveRanges(processedRanges);
          setEegData(data);

          console.log("📊 Auto-detected EEG ranges:", processedRanges);
          console.log("📈 EEG data points loaded:", data.length);
          console.log("⏱️ Max EEG time:", data.length > 0 ? data[data.length - 1].time : 0);
        })
        .catch((err) => console.error("Error loading EEG:", err));
    };

    fetchEEG();
    const interval = setInterval(fetchEEG, 5000);
    return () => clearInterval(interval);
  }, [results]);

  // Get video duration - IMPROVED with EEG timeline
  useEffect(() => {
    const determineDuration = () => {
      // Priority 1: Use EEG data timeline
      if (eegData.length > 0) {
        const eegDuration = eegData[eegData.length - 1].time;
        console.log("📊 Using EEG duration as time base:", eegDuration, "seconds");
        setVideoDuration(eegDuration);
        return;
      }

      // Priority 2: Use session metadata
      if (results[0]?.duration) {
        console.log("📊 Using session metadata duration:", results[0].duration, "seconds");
        setVideoDuration(results[0].duration);
        return;
      }

      // Priority 3: Try to get from video elements
      const studentVid = mainStudentRef.current;
      const teacherVid = mainTeacherRef.current;

      if (studentVid?.duration && isFinite(studentVid.duration) && studentVid.duration > 0) {
        console.log("📊 Using student video duration:", studentVid.duration, "seconds");
        setVideoDuration(studentVid.duration);
      } else if (teacherVid?.duration && isFinite(teacherVid.duration) && teacherVid.duration > 0) {
        console.log("📊 Using teacher video duration:", teacherVid.duration, "seconds");
        setVideoDuration(teacherVid.duration);
      } else {
        // Fallback to default (3 minutes)
        console.log("⚠️ Using default duration: 180 seconds");
        setVideoDuration(180);
      }
    };

    determineDuration();

    // Also listen for video metadata
    const studentVid = mainStudentRef.current;
    const teacherVid = mainTeacherRef.current;

    const handleLoadedMetadata = () => determineDuration();

    if (studentVid) {
      studentVid.addEventListener("loadedmetadata", handleLoadedMetadata);
    }
    if (teacherVid) {
      teacherVid.addEventListener("loadedmetadata", handleLoadedMetadata);
    }

    return () => {
      if (studentVid) studentVid.removeEventListener("loadedmetadata", handleLoadedMetadata);
      if (teacherVid) teacherVid.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [eegData, results]);

  // Main video current time
  useEffect(() => {
    if (!mainIsPlaying) return;
    const timer = setInterval(() => {
      if (mainStudentRef.current) {
        const currentTime = mainStudentRef.current.currentTime;
        setMainCurrentTime(currentTime);

        // Sync teacher video if available
        if (mainTeacherRef.current && Math.abs(mainTeacherRef.current.currentTime - currentTime) > 0.1) {
          mainTeacherRef.current.currentTime = currentTime;
        }
      }
    }, 100);
    return () => clearInterval(timer);
  }, [mainIsPlaying]);

  // Generate segments based on filtered labels
  useEffect(() => {
    if (!eegData.length || !videoDuration) return;

    const allFiltersSelected = Object.values(selectedFilters).every((v) => v);
    if (allFiltersSelected) {
      setSegments([]);
      return;
    }

    const activeLabels = Object.keys(selectedFilters).filter(
      (label) => selectedFilters[label]
    );

    const filteredPoints = eegData.filter((p) =>
      activeLabels.includes(p.label)
    );

    const individualSegments = filteredPoints.map((point) => ({
      start: Math.max(0, point.time - BUFFER_SECONDS),
      end: Math.min(videoDuration, point.time + BUFFER_SECONDS),
      label: point.label,
      time: point.time
    }));

    // Merge overlapping segments
    const mergedSegments = [];
    const sortedSegments = individualSegments.sort((a, b) => a.start - b.start);

    sortedSegments.forEach(seg => {
      const last = mergedSegments[mergedSegments.length - 1];
      if (last && seg.start <= last.end) {
        last.end = Math.max(last.end, seg.end);
        last.labels = [...new Set([...last.labels || [last.label], seg.label])];
      } else {
        mergedSegments.push({ ...seg, labels: [seg.label] });
      }
    });

    setSegments(mergedSegments);

    console.log(`Generated ${mergedSegments.length} segments from ${filteredPoints.length} points`);
  }, [eegData, selectedFilters, videoDuration]);

  // ✅ FIXED: Get consistent time base for all graphs
  const getTimeBase = useCallback(() => {
    if (eegData.length === 0) return videoDuration || 180;

    // Always use EEG timeline for consistency
    const maxEEGTime = eegData[eegData.length - 1].time;
    return maxEEGTime;
  }, [eegData, videoDuration]);

  const formatValue = (val) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val.toFixed(0);
  };

  const getYAxisLabels = () => {
    // Get the maximum range from selected waves for Y-axis
    let maxValue = 1000;
    let minValue = 0;

    Object.keys(selectedWaves).forEach(band => {
      if (selectedWaves[band]) {
        const range = waveRanges[band];
        if (range.max > maxValue) maxValue = range.max;
        if (range.min < minValue) minValue = range.min;
      }
    });

    // Use logarithmic scale for labels
    const labels = [];
    const minLog = Math.log10(Math.max(1, minValue));
    const maxLog = Math.log10(Math.max(10, maxValue));

    // Generate 6 labels on log scale
    for (let i = 0; i <= 5; i++) {
      const logVal = minLog + (maxLog - minLog) * (i / 5);
      const val = Math.pow(10, logVal);
      labels.push(formatValue(val));
    }

    return labels.reverse(); // Reverse so highest is at top
  };

  const mapValueToY = (value, band) => {
    const { min, max } = waveRanges[band] || { min: 0, max: 1000 };

    if (value < min) value = min;
    if (value > max) value = max;

    // Use logarithmic scale for wide ranges
    const minLog = Math.log10(Math.max(1, min));
    const maxLog = Math.log10(Math.max(10, max));
    const valueLog = Math.log10(Math.max(1, value));

    const normalized = (valueLog - minLog) / (maxLog - minLog);
    // Return inverted value (0 at bottom, 100 at top in SVG)
    return 100 - (Math.max(0, Math.min(1, normalized)) * 100);
  };

  // ✅ FIXED: Use consistent time base for brainwave points
  const buildPoints = (key) => {
    if (eegData.length === 0 || !selectedWaves[key]) return "";

    const timeBase = getTimeBase();

    return eegData.map(p => {
      const x = (p.time / timeBase) * 100;
      const y = mapValueToY(p[key], key);
      return `${x},${y}`;
    }).join(" ");
  };

  const getYPosition = (label) => {
    const index = labelOrder.indexOf(label.toLowerCase());
    if (index === -1) return 50;
    const padding = 5;
    const step = (100 - padding * 2) / (labelOrder.length - 1);
    return padding + index * step;
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const formatTimeForGraph = (s) => {
    const totalSeconds = Math.floor(s);
    const m = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    if (m > 0) {
      return `${m}m ${sec}s`;
    }
    return `${sec}s`;
  };

  // FIXED: Format for second-by-second display with proper NaN handling
  const formatTimeSeconds = (s) => {
    const sec = Math.floor(s);
    if (isNaN(sec)) return "0s";
    return `${sec}s`;
  };

  const formatTimeDetailed = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    if (m > 0) {
      return `${m} min ${sec} sec`;
    }
    return `${sec} seconds`;
  };

  const getLabelColor = (label) => {
    const colors = {
      "very high": "#22c55e",
      "high": "#84cc16",
      "medium": "#eab308",
      "low": "#f97316",
      "very low": "#ef4444"
    };
    return colors[label.toLowerCase()] || "#888";
  };

  // FIXED: Generate time labels without NaN
  const generateTimeLabels = (duration, startTime = 0) => {
    const labels = [];
    const timeBase = getTimeBase();
    const effectiveDuration = duration || timeBase;

    if (isNaN(effectiveDuration) || effectiveDuration <= 0) {
      // Return minimal labels if duration is invalid
      return [
        { position: 0, time: "0s", showFullLabel: true, isTickMark: false },
        { position: 100, time: "0s", showFullLabel: true, isTickMark: false }
      ];
    }

    // For very short durations (≤ 10 seconds), show every second
    if (effectiveDuration <= 10) {
      for (let t = 0; t <= Math.ceil(effectiveDuration); t++) {
        const absoluteTime = startTime + t;
        labels.push({
          position: (t / effectiveDuration) * 100,
          time: formatTimeSeconds(absoluteTime),
          showFullLabel: true,
          isTickMark: false
        });
      }
    }
    // For short durations (≤ 60 seconds), show every 5 seconds
    else if (effectiveDuration <= 60) {
      const interval = 5;
      for (let t = 0; t <= effectiveDuration; t += interval) {
        const absoluteTime = startTime + t;
        labels.push({
          position: (t / effectiveDuration) * 100,
          time: formatTimeSeconds(absoluteTime),
          showFullLabel: true,
          isTickMark: false
        });
      }
      // Ensure last point is included
      const lastLabel = labels[labels.length - 1];
      if (lastLabel.position < 100) {
        labels.push({
          position: 100,
          time: formatTimeSeconds(startTime + effectiveDuration),
          showFullLabel: true,
          isTickMark: false
        });
      }
    }
    // For medium durations (≤ 300 seconds = 5 minutes), show every 10 seconds
    else if (effectiveDuration <= 300) {
      const interval = 10;
      for (let t = 0; t <= effectiveDuration; t += interval) {
        const absoluteTime = startTime + t;
        labels.push({
          position: (t / effectiveDuration) * 100,
          time: formatTimeForGraph(absoluteTime),
          showFullLabel: true,
          isTickMark: false
        });
      }
      // Ensure last point is included
      const lastLabel = labels[labels.length - 1];
      if (lastLabel.position < 100) {
        labels.push({
          position: 100,
          time: formatTimeForGraph(startTime + effectiveDuration),
          showFullLabel: true,
          isTickMark: false
        });
      }
    }
    // For longer durations, show every 30 seconds
    else {
      const interval = 30;
      for (let t = 0; t <= effectiveDuration; t += interval) {
        const absoluteTime = startTime + t;
        labels.push({
          position: (t / effectiveDuration) * 100,
          time: formatTimeForGraph(absoluteTime),
          showFullLabel: true,
          isTickMark: false
        });
      }
      // Ensure last point is included
      const lastLabel = labels[labels.length - 1];
      if (lastLabel.position < 100) {
        labels.push({
          position: 100,
          time: formatTimeForGraph(startTime + effectiveDuration),
          showFullLabel: true,
          isTickMark: false
        });
      }
    }

    return labels;
  };

  // Star Rating Component
  const StarRating = ({ rating, onRatingChange, editable = false }) => {
    return (
      <div className="star-rating" style={{ display: 'flex', gap: '5px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => editable && onRatingChange && onRatingChange(star)}
            style={{
              fontSize: '24px',
              cursor: editable ? 'pointer' : 'default',
              color: star <= rating ? '#ffc107' : '#e4e5e9',
              transition: 'color 0.2s'
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // Format date for responses
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString || 'Unknown date';
    }
  };

  // Function to submit a response/rating
  const handleSubmitResponse = async () => {
    if (!responseText.trim() && rating === 0) {
      alert("Please add a response or select a rating!");
      return;
    }

    setIsSubmittingResponse(true);
    try {
      const userId = localStorage.getItem('userId');
      const adminId = userId || 1; // Default to admin ID 1 if not available

      const responseData = {
        session_id: sessionId,
        admin_id: adminId,
        response: responseText.trim(),
        rating: rating > 0 ? rating : null
      };

      const res = await fetch("${API_BASE}/responses/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(responseData),
      });

      if (res.ok) {
        const data = await res.json();

        // Add the new response to existing responses
        const newResponse = {
          response_id: data.response_id,
          session_id: sessionId,
          admin_id: adminId,
          response: responseText.trim(),
          rating: rating,
          created_at: new Date().toISOString(),
          admin_name: adminName || "Admin"
        };

        setExistingResponses([...existingResponses, newResponse]);

        // Clear form
        setResponseText("");
        setRating(0);

        // Show success message
        alert("Response submitted successfully!");

        // Optionally hide the response section
        setShowResponseSection(false);
      } else {
        const errorData = await res.json();
        alert(`Failed to submit response: ${errorData.detail || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error submitting response:", error);
      alert("Failed to submit response. Please try again.");
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  // Function to delete a response
  const handleDeleteResponse = async (responseId) => {
    if (!window.confirm("Are you sure you want to delete this response?")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/responses/${responseId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Remove the response from the list
        setExistingResponses(existingResponses.filter(r => r.response_id !== responseId));
        alert("Response deleted successfully!");
      } else {
        alert("Failed to delete response.");
      }
    } catch (error) {
      console.error("Error deleting response:", error);
      alert("Failed to delete response.");
    }
  };

  // Function to update a response
  const handleUpdateResponse = async (responseId, updatedText, updatedRating) => {
    try {
      const responseData = {
        response: updatedText,
        rating: updatedRating
      };

      const res = await fetch(`${API_BASE}/responses/${responseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(responseData),
      });

      if (res.ok) {
        // Update the response in the list
        setExistingResponses(existingResponses.map(r =>
          r.response_id === responseId
            ? { ...r, response: updatedText, rating: updatedRating }
            : r
        ));
        alert("Response updated successfully!");
      } else {
        alert("Failed to update response.");
      }
    } catch (error) {
      console.error("Error updating response:", error);
      alert("Failed to update response.");
    }
  };

  // Function to handle graph click
  const handleGraphClick = useCallback((e) => {
    // Prevent event bubbling if needed
    e.stopPropagation();

    // Get the clicked SVG container
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();

    // Calculate click position relative to container
    const clickX = e.clientX - rect.left;
    const clickPercent = (clickX / rect.width) * 100;

    // Convert percentage to time
    const timeBase = getTimeBase();
    const clickedTime = (clickPercent / 100) * timeBase;

    // Ensure time is within bounds
    if (clickedTime >= 0 && clickedTime <= timeBase) {
      // Jump videos to clicked time
      if (mainStudentRef.current) {
        mainStudentRef.current.currentTime = clickedTime;
      }
      if (mainTeacherRef.current) {
        mainTeacherRef.current.currentTime = clickedTime;
      }

      // Update state
      setMainCurrentTime(clickedTime);

      // Optional: Add a temporary visual indicator
      const indicator = document.createElement('div');
      indicator.style.position = 'absolute';
      indicator.style.left = `${clickX}px`;
      indicator.style.top = '40px';
      indicator.style.width = '2px';
      indicator.style.height = 'calc(100% - 70px)';
      indicator.style.background = '#ff0000';
      indicator.style.zIndex = '100';
      indicator.style.pointerEvents = 'none';
      indicator.style.animation = 'fadeOut 0.5s forwards';

      // Add to the clicked element
      container.style.position = 'relative';
      container.appendChild(indicator);

      // Remove after animation
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 500);

      console.log(`Jumped to ${formatTime(clickedTime)} (${clickPercent.toFixed(1)}%)`);
    }
  }, [getTimeBase]);

  // Function to handle label click
  const handleLabelClick = (position) => {
    const timeBase = getTimeBase();
    const clickedTime = (position / 100) * timeBase;

    if (clickedTime >= 0 && clickedTime <= timeBase) {
      if (mainStudentRef.current) {
        mainStudentRef.current.currentTime = clickedTime;
      }
      if (mainTeacherRef.current) {
        mainTeacherRef.current.currentTime = clickedTime;
      }
      setMainCurrentTime(clickedTime);
    }
  };

  const handleFilterToggle = (label) => {
    if (label === "all") {
      const allSelected = Object.values(selectedFilters).every((v) => v);
      const newVal = !allSelected;
      setSelectedFilters({
        "very high": newVal,
        high: newVal,
        medium: newVal,
        low: newVal,
        "very low": newVal,
      });
    } else {
      setSelectedFilters((prev) => ({ ...prev, [label]: !prev[label] }));
    }
  };

  const handleWaveToggle = (wave) => {
    if (wave === "all") {
      const allSelected = Object.values(selectedWaves).every((v) => v);
      const newVal = !allSelected;
      setSelectedWaves({
        delta: newVal,
        theta: newVal,
        alpha: newVal,
        beta: newVal,
        gamma: newVal,
      });
    } else {
      setSelectedWaves((prev) => ({ ...prev, [wave]: !prev[wave] }));
    }
  };

  const handleRangeChange = (wave, field, value) => {
    const numValue = parseFloat(value) || 0;
    setWaveRanges(prev => ({
      ...prev,
      [wave]: {
        ...prev[wave],
        [field]: numValue
      }
    }));
  };

  const handleResetRanges = () => {
    setWaveRanges(detectedRanges);
  };

  const handleMainPlaying = () => {
    if (mainIsPlaying) {
      mainStudentRef.current?.pause();
      mainTeacherRef.current?.pause();
    } else {
      mainStudentRef.current?.play();
      mainTeacherRef.current?.play();
    }
    setMainIsPlaying(!mainIsPlaying);
  };
  const change_eeg_values = () => {


  }
  const handleGoBack = () => navigate(-1);

  // Function to jump to a specific segment
  const jumpToSegment = (segment) => {
    if (mainStudentRef.current) {
      mainStudentRef.current.currentTime = segment.start;
      mainStudentRef.current.play();
      setMainIsPlaying(true);
    }
    if (mainTeacherRef.current) {
      mainTeacherRef.current.currentTime = segment.start;
      mainTeacherRef.current.play();
    }
    setMainCurrentTime(segment.start);
  };

  // Function to play all segments sequentially
  const playAllSegments = () => {
    if (segments.length === 0) return;

    const playSegment = (index) => {
      if (index >= segments.length) {
        setMainIsPlaying(false);
        return;
      }

      const seg = segments[index];
      if (mainStudentRef.current) {
        mainStudentRef.current.currentTime = seg.start;
        mainStudentRef.current.play();
        setMainIsPlaying(true);
        setMainCurrentTime(seg.start);

        // Set timeout to play next segment
        const duration = seg.end - seg.start;
        setTimeout(() => {
          playSegment(index + 1);
        }, duration * 1000);
      }
    };

    playSegment(0);
  };



  // Function to go to previous segment
  const goToPreviousSegment = () => {
    const currentSegmentIndex = segments.findIndex(
      seg => mainCurrentTime >= seg.start && mainCurrentTime <= seg.end
    );

    if (currentSegmentIndex > 0) {
      jumpToSegment(segments[currentSegmentIndex - 1]);
    }
  };

  // Function to go to next segment
  const goToNextSegment = () => {
    const currentSegmentIndex = segments.findIndex(
      seg => mainCurrentTime >= seg.start && mainCurrentTime <= seg.end
    );

    if (currentSegmentIndex >= 0 && currentSegmentIndex < segments.length - 1) {
      jumpToSegment(segments[currentSegmentIndex + 1]);
    }
  };

  const allFiltersSelected = Object.values(selectedFilters).every((v) => v);
  const showSegmented = !allFiltersSelected && segments.length > 0;

  if (loading)
    return (
      <div className="loading-screen">
        <p>Loading session results...</p>
      </div>
    );

  if (!results || !results.length)
    return (
      <div className="loading-screen">
        <p>No results found</p>
      </div>
    );

  const data = results[0];
  const timeBase = getTimeBase();
  const playheadX = timeBase > 0 ? (mainCurrentTime / timeBase) * 100 : 0;

  return (
    <div className="view-result-container">
      {/* HEADER */}
      <div className="header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={() => {
              const userRole = localStorage.getItem('userRole') || '';
              if (userRole === 'admin') {
                navigate('/sessions');
              } else if (userRole === 'attendant') {
                navigate('/attendant-dashboard');
              } else {
                navigate(-1);
              }
            }}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#2563eb';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#3b82f6';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            ← Back to Dashboard
          </button>

          <h1 style={{ marginLeft: '300px' }}>Session Results</h1>
        </div>

        {/* <button
          onClick={() => setShowSessionSummary(!showSessionSummary)}
          style={{
            background: showSessionSummary ? '#10b981' : '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = showSessionSummary ? '#059669' : '#2563eb';
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = showSessionSummary ? '#10b981' : '#3b82f6';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          {showSessionSummary ? '📊 Hide Summary' : '📊 Show Summary'}
        </button>
         */}


        <button
          className="filter-toggle-btn"
          onClick={() => setShowFilterSidebar(!showFilterSidebar)}
        >
          {showFilterSidebar ? "✕ Close" : "⚙ Filters"}
        </button>
      </div>

      {/* Session Summary - Conditionally shown */}
      {showSessionSummary && (
        <div style={{
          marginBottom: '20px',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <SessionSummary sessionId={sessionId} />
        </div>
      )}

      {/* ✅ DATA RANGES INFO BANNER */}
      {/* {eegData.length > 0 && (
        <div style={{ 
          background: '#1a1a2e', 
          padding: '12px 16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          fontSize: '13px',
          border: '1px solid #2d3748',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px', marginRight: '10px' }}>📊</span>
            <strong style={{ fontSize: '14px' }}>Brainwave Filter Settings (Logarithmic Scale)</strong>
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '8px' }}>
            {Object.keys(selectedWaves).map(band => (
              <div key={band} style={{ 
                background: selectedWaves[band] ? '#2d3748' : '#1a1a1a',
                padding: '6px 12px', 
                borderRadius: '6px',
                minWidth: '120px',
                opacity: selectedWaves[band] ? 1 : 0.5
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '2px'
                }}>
                  <strong style={{ 
                    textTransform: 'uppercase', 
                    color: waveColors[band]
                  }}>
                    {band} {selectedWaves[band] ? '✓' : '✗'}
                  </strong>
                  <span style={{ opacity: 0.8, fontSize: '11px' }}>µV</span>
                </div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                  {selectedWaves[band] ? (
                    <>
                      {formatValue(waveRanges[band]?.min || 0)} → {formatValue(waveRanges[band]?.max || 0)}
                    </>
                  ) : (
                    <span style={{ color: '#666', fontStyle: 'italic' }}>Hidden</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ 
            marginTop: '10px', 
            padding: '8px', 
            background: '#2d3748', 
            borderRadius: '6px',
            fontSize: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: '#60a5fa' }}>
              ⚙️ Using EEG timeline: {timeBase.toFixed(1)}s (Both graphs synchronized)
            </span>
            <span style={{ color: '#86efac', fontFamily: 'monospace' }}>
              {eegData.length} data points
            </span>
          </div>
        </div>
      )} */}

      {/* ANNOTATIONS */}
      {/* <SessionAnnotations 
        sessionId={sessionId}
        currentTime={mainCurrentTime}
        onJumpToTime={(time) => {
          if (mainStudentRef.current) {
            mainStudentRef.current.currentTime = time;
          }
          if (mainTeacherRef.current) {
            mainTeacherRef.current.currentTime = time;
          }
          setMainCurrentTime(time);
        }}
      /> */}

      {/* NEW: RESPONSES & RATINGS SECTION */}

      {/* FILTER SIDEBAR - COMBINED (Cognitive + Wave Filters) */}
      <div className={`filter-sidebar ${showFilterSidebar ? "open" : ""}`}>
        <h3>Filters</h3>

        {/* Cognitive Load Level Filters */}
        <div className="filter-section">
          <h4 style={{ marginBottom: '10px', color: '#3b82f6', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
            Cognitive Load Level
          </h4>
          <div className="filter-options">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={allFiltersSelected}
                onChange={() => handleFilterToggle("all")}
              />
              <span>Show All Levels</span>
            </label>
            <hr style={{ margin: '10px 0' }} />
            {labelOrder.map((label) => (
              <label key={label} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedFilters[label]}
                  onChange={() => handleFilterToggle(label)}
                />
                <span className="capitalize" style={{
                  color: getLabelColor(label),
                  fontWeight: 'bold'
                }}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Wave Filters */}
        <div className="filter-section" style={{ marginTop: '20px' }}>
          <h4 style={{ marginBottom: '10px', color: '#8b5cf6', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
            Brainwave Filters
          </h4>
          <div className="filter-options">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={Object.values(selectedWaves).every(v => v)}
                onChange={() => handleWaveToggle("all")}
              />
              <span>Show All Waves</span>
            </label>

            {Object.keys(selectedWaves).map((wave) => (
              <div key={wave} style={{ marginBottom: '10px' }}>
                <label className="filter-checkbox" style={{ marginBottom: '5px' }}>
                  <input
                    type="checkbox"
                    checked={selectedWaves[wave]}
                    onChange={() => handleWaveToggle(wave)}
                  />
                  <span className="capitalize" style={{
                    color: waveColors[wave],
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    {wave}
                  </span>
                </label>

                {selectedWaves[wave] && (
                  <div style={{
                    padding: '8px',
                    background: '#eee5e5ff',
                    borderRadius: '4px',
                    fontSize: '30px',
                    marginLeft: '20px'

                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span style={{ fontSize: '20px', opacity: 0.8 }}>Min (µV):</span>
                      <input
                        type="number"
                        // value={waveRanges[wave]?.min || 0}
                        value={null}
                        onChange={(e) => handleRangeChange(wave, 'min', e.target.value)}
                        style={{
                          width: '150px',
                          padding: '2px 5px',
                          background: '#0a0a0aff',
                          border: '1px solid #444',
                          color: 'white',
                          borderRadius: '3px',
                          fontSize: '10px'

                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '20px', opacity: 0.8 }}>Max (µV):</span>
                      <input
                        type="number"
                        // value={waveRanges[wave]?.max || 1000}
                        onChange={(e) => handleRangeChange(wave, 'max', e.target.value)}
                        style={{
                          width: '150px',
                          padding: '2px 5px',
                          background: '#0a0a0aff',
                          border: '1px solid #444',
                          color: 'white',
                          borderRadius: '3px',
                          fontSize: '10px'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* <button
              onClick={handleResetRanges}
              style={{
                width: '100%',
                padding: '6px',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold',
                marginTop: '10px'
              }}
            >
              🔄 Reset to Auto-detected Ranges
            </button> */}
          </div>

          {/* Active Waves Display */}
          <div style={{
            marginTop: '15px',
            padding: '10px',
            background: '#2a2a2a',
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            <strong style={{ display: 'block', marginBottom: '8px', color: '#8b5cf6' }}>
              Active Waves:
            </strong>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
            }}>
              {Object.keys(selectedWaves).map(wave => {
                if (selectedWaves[wave]) {
                  return (
                    <span key={wave} style={{
                      padding: '3px 8px',
                      background: waveColors[wave],
                      color: '#000',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>
                      {wave}
                    </span>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>

        {/* Segments Info */}
        {showSegmented && (
          <div className="segment-info" style={{ marginTop: '20px' }}>
            <h4 style={{ marginBottom: '10px', color: '#10b981', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
              Segments Found
            </h4>
            <strong style={{ display: 'block', marginBottom: '10px' }}>
              {segments.length} segment{segments.length !== 1 ? "s" : ""} found
            </strong>
            <div style={{ marginTop: '10px', maxHeight: '150px', overflowY: 'auto' }}>
              {segments.map((seg, idx) => (
                <button
                  key={idx}
                  onClick={() => jumpToSegment(seg)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '6px',
                    marginBottom: '4px',
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '11px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#3a3a3a'}
                  onMouseLeave={(e) => e.target.style.background = '#2a2a2a'}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      backgroundColor: getLabelColor(seg.labels?.[0] || seg.label),
                      color: '#000',
                      fontWeight: 'bold',
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      minWidth: '60px',
                      textAlign: 'center'
                    }}
                  >
                    {seg.labels?.[0] || seg.label}
                  </span>
                  <span>
                    {formatTime(seg.start)} - {formatTime(seg.end)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="done-btn" onClick={() => setShowFilterSidebar(false)}>
          Done
        </button>
      </div>

      {showFilterSidebar && (
        <div
          className="sidebar-overlay"
          onClick={() => setShowFilterSidebar(false)}
        ></div>
      )}

      {/* MAIN CONTENT - ALWAYS SHOW VIDEOS & GRAPHS */}
      <div className="video-row">
        <div className="panel">
          <h3 className="panel-title">Teacher: {teacherName}</h3>
          <video
            ref={mainTeacherRef}
            src={`${API_BASE}/serve_video?path=${data.teacher_path}`}
            className="small-video"
            controls
          />
        </div>

        <div className="panel">
          <h3 className="panel-title">Student: {studentName}</h3>
          <video
            ref={mainStudentRef}
            muted
            src={`${API_BASE}/serve_video?path=${data.student_path}`}
            className="small-video"
            controls
            preload="metadata"
          />
        </div>
      </div>

      {/* SEGMENTS TIMELINE BAR - Show when segments exist */}
      {showSegmented && segments.length > 0 && (
        <div className="panel" style={{ marginTop: '15px', marginBottom: '15px' }}>
          <h3 className="panel-title">Selected Segments ({segments.length} found)</h3>
          <div style={{
            position: 'relative',
            height: '40px',
            background: '#1a1a2e',
            borderRadius: '8px',
            marginTop: '10px',
            overflow: 'hidden'
          }}>
            {/* Background timeline */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to right, #2d3748, #4a5568)',
              opacity: 0.3
            }}></div>

            {/* Segments as colored bars */}
            {segments.map((seg, idx) => {
              const startPercent = (seg.start / timeBase) * 100;
              const widthPercent = ((seg.end - seg.start) / timeBase) * 100;

              return (
                <div
                  key={idx}
                  onClick={() => jumpToSegment(seg)}
                  style={{
                    position: 'absolute',
                    left: `${startPercent}%`,
                    width: `${widthPercent}%`,
                    top: '5px',
                    bottom: '5px',
                    background: getLabelColor(seg.labels?.[0] || seg.label),
                    borderRadius: '4px',
                    cursor: 'pointer',
                    opacity: 0.8,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.opacity = '1';
                    e.target.style.transform = 'scaleY(1.1)';
                    e.target.style.zIndex = '10';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.opacity = '0.8';
                    e.target.style.transform = 'scaleY(1)';
                    e.target.style.zIndex = '1';
                  }}
                  title={`${seg.labels?.join(', ') || seg.label}: ${formatTime(seg.start)} - ${formatTime(seg.end)}`}
                >
                  <span style={{
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    padding: '0 5px'
                  }}>
                    {widthPercent > 10 ? (seg.labels?.[0] || seg.label) : ''}
                  </span>
                </div>
              );
            })}

            {/* Current time indicator */}
            <div style={{
              position: 'absolute',
              left: `${playheadX}%`,
              top: 0,
              bottom: 0,
              width: '2px',
              background: 'white',
              zIndex: 5
            }}></div>
          </div>

          {/* Segment navigation buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '15px',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {segments.map((seg, idx) => (
                <button
                  key={idx}
                  onClick={() => jumpToSegment(seg)}
                  style={{
                    padding: '8px 12px',
                    background: '#2d3748',
                    border: `2px solid ${getLabelColor(seg.labels?.[0] || seg.label)}`,
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#4a5568';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#2d3748';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: getLabelColor(seg.labels?.[0] || seg.label)
                  }}></span>
                  Segment {idx + 1}: {formatTime(seg.start)}-{formatTime(seg.end)}
                </button>
              ))}
            </div>

            <button
              onClick={playAllSegments}
              style={{
                padding: '8px 16px',
                background: '#10b981',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ▶ Play All Segments
            </button>
          </div>
        </div>
      )}

      {/* ✅ EEG COGNITIVE LOAD GRAPH - With Segment Highlights */}
      <div
        className="eeg-row panel"
        onClick={handleGraphClick}
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        <h3 className="panel-title">
          EEG Cognitive Load Level
          <span style={{ fontSize: '12px', color: '#60a5fa', marginLeft: '10px' }}>
            (Click anywhere on graph to jump to time)
          </span>
        </h3>

        {/* Click indicator overlay */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: 0,
            right: 0,
            bottom: '30px',
            cursor: 'pointer',
            zIndex: 1
          }}
          title="Click to jump to this time"
        ></div>

        <div className="eeg-compact">
          <div className="y-axis-compact">
            {labelOrder.map((label, i) => (
              <div key={i} className="y-label-compact" style={{ color: getLabelColor(label) }}>
                {label}
              </div>
            ))}
          </div>

          <div className="svg-compact">
            <svg className="eeg-svg">
              {/* Segment background highlights */}
              {showSegmented && segments.map((seg, idx) => {
                const startPercent = (seg.start / timeBase) * 100;
                const widthPercent = ((seg.end - seg.start) / timeBase) * 100;

                return (
                  <rect
                    key={`segment-bg-${idx}`}
                    x={`${startPercent}%`}
                    y="0"
                    width={`${widthPercent}%`}
                    height="100%"
                    fill={getLabelColor(seg.labels?.[0] || seg.label)}
                    opacity="0.15"
                  />
                );
              })}

              {/* EEG Line */}
              {eegData.map((point, i) => {
                if (i === 0) return null;
                const prev = eegData[i - 1];
                const x1 = (prev.time / timeBase) * 100;
                const x2 = (point.time / timeBase) * 100;

                return (
                  <line
                    key={i}
                    x1={`${x1}%`}
                    y1={`${getYPosition(prev.label)}%`}
                    x2={`${x2}%`}
                    y2={`${getYPosition(point.label)}%`}
                    stroke="#3b82f6"
                    strokeWidth="3"
                  />
                );
              })}

              {/* Playhead */}
              <line
                x1={`${playheadX}%`}
                y1="0"
                x2={`${playheadX}%`}
                y2="100%"
                stroke="white"
                strokeWidth="2"
              />

              {/* Segment boundary lines */}
              {showSegmented && segments.map((seg, idx) => {
                const startPercent = (seg.start / timeBase) * 100;
                const endPercent = (seg.end / timeBase) * 100;

                return (
                  <g key={`segment-lines-${idx}`}>
                    <line
                      x1={`${startPercent}%`}
                      y1="0"
                      x2={`${startPercent}%`}
                      y2="100%"
                      stroke={getLabelColor(seg.labels?.[0] || seg.label)}
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      opacity="0.7"
                    />
                    <line
                      x1={`${endPercent}%`}
                      y1="0"
                      x2={`${endPercent}%`}
                      y2="100%"
                      stroke={getLabelColor(seg.labels?.[0] || seg.label)}
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      opacity="0.7"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* X-axis - Make labels clickable too */}
        <div className="x-axis-compact">
          {generateTimeLabels(timeBase, 0).map((item, i) => (
            <div
              key={i}
              className="x-label-compact"
              style={{
                left: `${item.position}%`,
                fontSize: '10px',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleLabelClick(item.position);
              }}
              title={`Jump to ${item.time}`}
            >
              {item.time}
            </div>
          ))}
        </div>
      </div>

      {/* ✅ BRAINWAVE FEATURES GRAPH - With Segment Highlights */}
      {eegData.length > 0 && (
        <div
          className="eeg-row panel"
          style={{ marginTop: "18px", cursor: 'pointer', position: 'relative' }}
          onClick={handleGraphClick}
        >
          <h3 className="panel-title">
            Brainwave Features - Filtered View (Logarithmic Scale)
            <span style={{ fontSize: '12px', color: '#60a5fa', marginLeft: '10px' }}>
              (Click anywhere on graph to jump to time)
            </span>
          </h3>

          {/* Click indicator overlay */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: 0,
              right: 0,
              bottom: '30px',
              cursor: 'pointer',
              zIndex: 1
            }}
            title="Click to jump to this time"
          ></div>

          <div className="eeg-compact">
            <div className="y-axis-compact" style={{ fontSize: '11px' }}>
              {getYAxisLabels().map((label, i) => (
                <div key={i} className="y-label-compact" style={{
                  opacity: 0.8,
                  fontSize: i === 0 || i === 5 ? '12px' : '10px'
                }}>
                  {label} µV
                </div>
              ))}
            </div>
            <div className="svg-compact">
              <svg
                className="eeg-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ width: '100%', height: '100%' }}
              >
                {/* Segment background highlights */}
                {showSegmented && segments.map((seg, idx) => {
                  const startPercent = (seg.start / timeBase) * 100;
                  const widthPercent = ((seg.end - seg.start) / timeBase) * 100;

                  return (
                    <rect
                      key={`segment-wave-bg-${idx}`}
                      x={startPercent}
                      y="0"
                      width={widthPercent}
                      height="100"
                      fill={getLabelColor(seg.labels?.[0] || seg.label)}
                      opacity="0.1"
                    />
                  );
                })}

                {/* Horizontal grid lines */}
                <line x1="0" y1="0" x2="100" y2="0" stroke="#333" strokeWidth="0.2" opacity="0.3" />
                <line x1="0" y1="20" x2="100" y2="20" stroke="#333" strokeWidth="0.2" opacity="0.3" />
                <line x1="0" y1="40" x2="100" y2="40" stroke="#333" strokeWidth="0.2" opacity="0.3" />
                <line x1="0" y1="60" x2="100" y2="60" stroke="#333" strokeWidth="0.2" opacity="0.3" />
                <line x1="0" y1="80" x2="100" y2="80" stroke="#333" strokeWidth="0.2" opacity="0.3" />
                <line x1="0" y1="100" x2="100" y2="100" stroke="#333" strokeWidth="0.2" opacity="0.3" />

                {/* Brainwave lines with filters */}
                {selectedWaves.delta && (
                  <polyline
                    points={buildPoints("delta")}
                    fill="none"
                    stroke={waveColors.delta}
                    strokeWidth="1.2"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.9"
                  />
                )}
                {selectedWaves.theta && (
                  <polyline
                    points={buildPoints("theta")}
                    fill="none"
                    stroke={waveColors.theta}
                    strokeWidth="1.2"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.9"
                  />
                )}
                {selectedWaves.alpha && (
                  <polyline
                    points={buildPoints("alpha")}
                    fill="none"
                    stroke={waveColors.alpha}
                    strokeWidth="1.2"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.9"
                  />
                )}
                {selectedWaves.beta && (
                  <polyline
                    points={buildPoints("beta")}
                    fill="none"
                    stroke={waveColors.beta}
                    strokeWidth="1.2"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.9"
                  />
                )}
                {selectedWaves.gamma && (
                  <polyline
                    points={buildPoints("gamma")}
                    fill="none"
                    stroke={waveColors.gamma}
                    strokeWidth="1.2"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.9"
                  />
                )}

                {/* Playhead line */}
                <line
                  x1={playheadX}
                  y1="0"
                  x2={playheadX}
                  y2="100"
                  stroke="white"
                  strokeWidth="0.8"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.8"
                />

                {/* Segment boundary lines */}
                {showSegmented && segments.map((seg, idx) => {
                  const startPercent = (seg.start / timeBase) * 100;
                  const endPercent = (seg.end / timeBase) * 100;

                  return (
                    <g key={`segment-wave-lines-${idx}`}>
                      <line
                        x1={startPercent}
                        y1="0"
                        x2={startPercent}
                        y2="100"
                        stroke={getLabelColor(seg.labels?.[0] || seg.label)}
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                        opacity="0.6"
                        vectorEffect="non-scaling-stroke"
                      />
                      <line
                        x1={endPercent}
                        y1="0"
                        x2={endPercent}
                        y2="100"
                        stroke={getLabelColor(seg.labels?.[0] || seg.label)}
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                        opacity="0.6"
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* X-axis - Make labels clickable too */}
          <div className="x-axis-compact">
            {generateTimeLabels(timeBase, 0).map((item, i) => (
              <div
                key={i}
                className="x-label-compact"
                style={{
                  left: `${item.position}%`,
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLabelClick(item.position);
                }}
                title={`Jump to ${item.time}`}
              >
                {item.time}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '15px',
            fontSize: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {selectedWaves.delta && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '12px', height: '3px', background: waveColors.delta }}></div>
                  Delta
                </span>
              )}
              {selectedWaves.theta && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '12px', height: '3px', background: waveColors.theta }}></div>
                  Theta
                </span>
              )}
              {selectedWaves.alpha && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '12px', height: '3px', background: waveColors.alpha }}></div>
                  Alpha
                </span>
              )}
              {selectedWaves.beta && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '12px', height: '3px', background: waveColors.beta }}></div>
                  Beta
                </span>
              )}
              {selectedWaves.gamma && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '12px', height: '3px', background: waveColors.gamma }}></div>
                  Gamma
                </span>
              )}
            </div>

            {/* Segment labels */}
            {showSegmented && segments.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap',
                marginTop: '10px'
              }}>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>Segments:</span>
                {segments.slice(0, 3).map((seg, idx) => (
                  <span key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '11px'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      background: getLabelColor(seg.labels?.[0] || seg.label),
                      borderRadius: '2px'
                    }}></div>
                    {seg.labels?.[0] || seg.label}
                  </span>
                ))}
                {segments.length > 3 && (
                  <span style={{ color: '#6b7280', fontSize: '11px' }}>
                    +{segments.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN CONTROLS */}
      <div className="controls">
        <input
          type="range"
          min="0"
          max={timeBase || 100}
          value={mainCurrentTime}
          onChange={(e) => {
            const t = parseFloat(e.target.value);
            if (mainStudentRef.current)
              mainStudentRef.current.currentTime = t;
            if (mainTeacherRef.current)
              mainTeacherRef.current.currentTime = t;
            setMainCurrentTime(t);
          }}
          step="0.1"
          className="time-slider"
        />
        <div>
          <h2>High</h2>
          <span>Alpha</span><input type="number" onChange={((e) => { sethighalpha(e.value) })} />
          <span>Beta</span><input type="number" onChange={((e) => { sethighbeta(e.value) })} />
          <span>gamma</span><input type="number" onChange={((e) => { sethighgamma(e.value) })} />
          <span>delta</span><input type="number" onChange={((e) => { sethighdelta(e.value) })} />
          <span>theta</span><input type="number" onChange={((e) => { sethightheta(e.value) })} />

          <h2>Moderate</h2>
          <span>Alpha</span><input type="number" onChange={((e) => { setmodealpha(e.value) })} />
          <span>Beta</span><input type="number" onChange={((e) => { setmodebeta(e.value) })} />
          <span>gamma</span><input type="number" onChange={((e) => { setmmodegamma(e.value) })} />
          <span>delta</span><input type="number" onChange={((e) => { setmodedelta(e.value) })} />
          <span>theta</span><input type="number" onChange={((e) => { setmodetheta(e.value) })} />

          <h2>Low</h2>
          <span>Alpha</span><input type="number" onChange={((e) => { setlowaplpha(e.value) })} />
          <span>Beta</span><input type="number" onChange={((e) => { setlowbeta(e.value) })} />
          <span>gamma</span><input type="number" onChange={((e) => { setlowgamma(e.value) })} />
          <span>delta</span><input type="number" onChange={((e) => { setlowdelta(e.value) })} />
          <span>theta</span><input type="number" onChange={((e) => { setlowtheta(e.value) })} />

        </div>

        <button onClick={() => { change_eeg_labels() }}>Save</button>
        <div className="control-buttons">
          <button onClick={handleMainPlaying} className="play-btn">
            {mainIsPlaying ? "⏸ Pause" : "▶ Play"}
          </button>

          {/* Segment navigation buttons in controls */}
          {showSegmented && segments.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', marginLeft: '20px' }}>
              <button
                onClick={goToPreviousSegment}
                className="play-btn"
                disabled={!segments.some(seg => mainCurrentTime >= seg.start && mainCurrentTime <= seg.end)}
              >
                ⏮ Prev Segment
              </button>

              <button
                onClick={goToNextSegment}
                className="play-btn"
                disabled={!segments.some(seg => mainCurrentTime >= seg.start && mainCurrentTime <= seg.end)}
              >
                Next Segment ⏭
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Go Back Button */}
      <div className="controls" style={{ marginTop: '20px' }}>
        <button onClick={handleGoBack} className="back-btn">
          ← Go Back to Full View
        </button>
      </div>
    </div>
  );
};

export default ViewResults;