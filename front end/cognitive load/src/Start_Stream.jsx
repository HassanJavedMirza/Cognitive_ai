import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import api from './api/axiosInstance';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import "./stream.css";

function Start_Stream() {
  const [selected, setselected] = useState("");
  const [studentName, setStudentName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [arid_no, setarid_no] = useState("");
  const [time, settime] = useState("");
  const [message, setmessage] = useState("");

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentLabel, setCurrentLabel] = useState("N/A");
  const [deviceConnected, setDeviceConnected] = useState(false);

  // Graphing State
  const [eegHistory, setEegHistory] = useState([]);
  const [currentBands, setCurrentBands] = useState({
    delta: 0,
    theta: 0,
    alpha: 0,
    beta: 0,
    gamma: 0
  });

  // Enhanced graph state for smooth visualization
  const [graphData, setGraphData] = useState(Array.from({ length: 60 }, (_, i) => ({
    time: i,
    delta: 0,
    theta: 0,
    alpha: 0,
    beta: 0,
    gamma: 0
  })));

  const graphUpdateRef = useRef(0);
  const animationFrameRef = useRef(null);

  // Track if video recording has started
  const [videoRecordingStarted, setVideoRecordingStarted] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const videoStartedRef = useRef(false);

  // Results upload state
  const [showResultsUpload, setShowResultsUpload] = useState(false);
  const [teacherVideoFile, setTeacherVideoFile] = useState(null);
  const [uploadingTeacherVideo, setUploadingTeacherVideo] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Camera refs
  const studentVideoRef = useRef(null);
  const studentStreamRef = useRef(null);
  const mediaRecorderStudentRef = useRef(null);
  const recordedChunksStudentRef = useRef([]);
  const [studentVideoBlob, setStudentVideoBlob] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const location = useLocation();
  const sessionid = location.state?.sid;

  // Colors for the brainwave bands (matching your image style)
  const bandColors = {
    delta: '#FF6B6B', // Red
    theta: '#FFD166', // Yellow
    alpha: '#06D6A0', // Green
    beta: '#118AB2', // Blue
    gamma: '#9D4EDD', // Purple
  };

  // --- Enhanced Graph Functions ---

  const updateGraphSmoothly = (newData) => {
    if (!isStreaming || isPaused) return;

    graphUpdateRef.current += 1;

    // Use requestAnimationFrame for smooth updates
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      setGraphData(prev => {
        const newGraphData = [...prev];

        // Remove first point and add new point at the end
        newGraphData.shift();

        // Add new data point
        newGraphData.push({
          time: graphUpdateRef.current,
          delta: newData.delta || 0,
          theta: newData.theta || 0,
          alpha: newData.alpha || 0,
          beta: newData.beta || 0,
          gamma: newData.gamma || 0
        });

        return newGraphData;
      });
    });
  };

  // Initialize graph with empty data
  const initializeGraph = () => {
    const initialData = Array.from({ length: 60 }, (_, i) => ({
      time: i,
      delta: 0,
      theta: 0,
      alpha: 0,
      beta: 0,
      gamma: 0
    }));
    setGraphData(initialData);
    graphUpdateRef.current = 0;
  };

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // --- EEG & Camera Setup Functions ---

  const connectEEGDevice = async () => {
    setmessage("🔄 Connecting to EEG device...");

    try {
      const response = await fetch(`${API_BASE}/api/eeg/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDeviceConnected(true);
        setmessage("✅ EEG device connected successfully! Ready to start recording.");
        return true;
      } else {
        setmessage(`❌ EEG connection failed: ${data.error || data.message || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      setmessage('❌ Error connecting to EEG device. Make sure the device is on and connected.');
      console.error('Error connecting EEG:', error);
      return false;
    }
  };

  const setupCamera = async () => {
    setmessage("📷 Setting up camera...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      studentStreamRef.current = stream;

      if (studentVideoRef.current) {
        studentVideoRef.current.srcObject = stream;
      }

      setIsCameraReady(true);
      setmessage("✅ Camera ready (hidden). Waiting for EEG data...");
      return true;
    } catch (error) {
      setmessage(`❌ Camera setup failed: ${error.message}`);
      console.error('Error accessing camera:', error);
      return false;
    }
  };

  const startVideoRecording = () => {
    if (videoStartedRef.current) {
      console.log('⚠️ Video recording already started');
      return;
    }

    if (!studentStreamRef.current) {
      console.error('❌ No camera stream available');
      return;
    }

    console.log('🎥 Starting video recording (EEG data detected)');

    recordedChunksStudentRef.current = [];
    const recorderStudent = new MediaRecorder(studentStreamRef.current, {
      mimeType: 'video/webm;codecs=vp9,opus'
    });

    recorderStudent.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksStudentRef.current.push(event.data);
      }
    };

    recorderStudent.onstop = () => {
      const blob = new Blob(recordedChunksStudentRef.current, { type: 'video/webm' });
      setStudentVideoBlob(blob);
      console.log('✅ Student video recorded, size:', blob.size);
    };

    mediaRecorderStudentRef.current = recorderStudent;
    recorderStudent.start(1000);

    videoStartedRef.current = true;
    setVideoRecordingStarted(true);
    setmessage('🎬 Recording synchronized! Both EEG and video are now recording.');
  };

  // --- Status Polling & Live Data Logic ---

  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/eeg/status`);
        const data = await response.json();

        setStatus(data.status);
        setElapsedTime(data.elapsed_time);
        setTotalDuration(data.total_duration);
        setCurrentLabel(data.current_label);
        setDeviceConnected(data.device_connected || data.status === 'recording');
        setIsPaused(data.status === 'paused');

        // --- Enhanced Live Graph Logic ---
        if (data.latest_eeg) {
          const newBands = {
            delta: data.latest_eeg.delta || 0,
            theta: data.latest_eeg.theta || 0,
            alpha: data.latest_eeg.alpha || 0,
            beta: data.latest_eeg.beta || 0,
            gamma: data.latest_eeg.gamma || 0,
          };

          // Update Raw Values for Dashboard
          setCurrentBands(newBands);

          // Update smooth graph
          updateGraphSmoothly(newBands);

          // Keep original history for backup
          const newPoint = {
            time: formatTime(data.elapsed_time),
            ...newBands
          };

          setEegHistory(prev => {
            const updated = [...prev, newPoint];
            if (updated.length > 30) return updated.slice(updated.length - 30);
            return updated;
          });
        }

        // --- Video Sync Logic ---
        if (
          data.status === 'recording' &&
          data.elapsed_time >= 3 &&
          data.device_connected === true &&
          !videoStartedRef.current
        ) {
          console.log('✅ EEG data detected! Starting video recording now...');
          startVideoRecording();
        }

        // --- Status Messages ---
        if (data.status === 'completed') {
          stopRecording();
          setIsStreaming(false);
          setShowResultsUpload(true);
          setmessage('✅ Recording completed! Upload teacher video now or skip to upload later.');
        } else if (data.status === 'error' || data.status === 'stopped') {
          stopRecording();
          setIsStreaming(false);
          setShowResultsUpload(true);
          setmessage('⏹ Recording stopped. Upload teacher video now or skip for later.');
        }
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    }, 1000); // Polling every 1 second

    return () => clearInterval(interval);
  }, [isStreaming, isPaused]);

  // --- Helper Functions ---

  const initializeRecording = async () => {
    if (!selected || !studentName || !teacherName || !arid_no || !time) {
      setmessage("❌ Please fill all fields!");
      return;
    }

    setmessage("🔄 Initializing recording setup...");

    const eegConnected = await connectEEGDevice();
    if (!eegConnected) return;

    const cameraReady = await setupCamera();
    if (!cameraReady) return;

    setmessage("✅ Setup complete! Click 'Start Recording' to begin.");
  };

  const convertToSeconds = (value, unit) => {
    const num = parseInt(value);
    if (unit === "minutes") return num * 60;
    if (unit === "hours") return num * 3600;
    return num;
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stopRecording = () => {
    if (mediaRecorderStudentRef.current && mediaRecorderStudentRef.current.state !== 'inactive') {
      mediaRecorderStudentRef.current.stop();
      console.log('🛑 Video recording stopped');
    }

    if (studentStreamRef.current) {
      studentStreamRef.current.getTracks().forEach(track => track.stop());
    }

    videoStartedRef.current = false;
    setVideoRecordingStarted(false);
    setIsCameraReady(false);
  };

  const startStreaming = async () => {
    if (!isCameraReady || !deviceConnected) {
      setmessage("❌ Please complete setup first!");
      return;
    }

    const duration = convertToSeconds(time, selected);

    try {
      setmessage("🎬 Starting EEG recording...\n⏳ Video will auto-start when first EEG data arrives...");

      videoStartedRef.current = false;
      setVideoRecordingStarted(false);
      setEegHistory([]); // Reset graph
      initializeGraph(); // Initialize smooth graph

      const response = await fetch(`${API_BASE}/api/eeg/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: studentName,
          teacher_name: teacherName,
          arid_no: arid_no,
          duration: duration
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsStreaming(true);
        setTotalDuration(duration);
      } else {
        setmessage(data.error || '❌ Failed to start streaming');
      }
    } catch (error) {
      setmessage('❌ Error connecting to backend');
      console.error('Error:', error);
    }
  };

  const pauseStreaming = async () => {
    try {
      await fetch(`${API_BASE}/api/eeg/pause`, { method: 'POST' });
      if (mediaRecorderStudentRef.current?.state === 'recording') {
        mediaRecorderStudentRef.current.pause();
      }
      setIsPaused(true);
    } catch (error) {
      console.error('Error pausing:', error);
    }
  };

  const resumeStreaming = async () => {
    try {
      await fetch(`${API_BASE}/api/eeg/resume`, { method: 'POST' });
      if (mediaRecorderStudentRef.current?.state === 'paused') {
        mediaRecorderStudentRef.current.resume();
      }
      setIsPaused(false);
    } catch (error) {
      console.error('Error resuming:', error);
    }
  };

  const stopStreaming = async () => {
    try {
      await fetch(`${API_BASE}/api/eeg/stop`, { method: 'POST' });
      stopRecording();
      setIsStreaming(false);
      setShowResultsUpload(true);
      setmessage('⏹ Recording stopped. Upload teacher video now or skip for later.');
    } catch (error) {
      console.error('Error stopping:', error);
    }
  };

  const handleTeacherVideoUpload = async (skipTeacherVideo = false) => {
    if (!skipTeacherVideo && !teacherVideoFile) {
      setmessage('❌ Please select teacher video file first!');
      return;
    }

    if (!studentVideoBlob) {
      setmessage('❌ Student video not recorded properly!');
      return;
    }

    setUploadingTeacherVideo(true);
    setmessage(skipTeacherVideo
      ? '⏳ Saving session data without teacher video...'
      : '⏳ Uploading all files...');

    try {
      const statusResponse = await fetch(`${API_BASE}/api/eeg/status`);
      const statusData = await statusResponse.json();

      const eegFilePath = statusData.predicted_file || statusData.output_filename;

      let eegFileBlob = null;
      if (eegFilePath) {
        try {
          const eegResponse = await fetch(`${API_BASE}/api/get_eeg_file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_path: eegFilePath })
          });
          if (eegResponse.ok) eegFileBlob = await eegResponse.blob();
        } catch (err) {
          console.error('⚠️ Could not fetch EEG file:', err);
        }
      }

      if (!eegFileBlob || eegFileBlob.size === 0) {
        setmessage("❌ EEG file not found! Cannot complete the upload.");
        setUploadingTeacherVideo(false);
        return;
      }

      const eegFilename = `${studentName}_${arid_no}_EEG.csv`;

      const formData = new FormData();
      formData.append('session_id', sessionid);
      formData.append('student_name', studentName);
      formData.append('teacher_name', teacherName);
      formData.append('arid_no', arid_no);
      formData.append('eeg_file', eegFileBlob, eegFilename);

      const studentFilename = `${studentName}_${arid_no}_student.webm`;
      formData.append('student_video', studentVideoBlob, studentFilename);

      if (!skipTeacherVideo) {
        formData.append('teacher_video', teacherVideoFile);
      }

      const response = await fetch(`${API_BASE}/api/upload_video`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUploadComplete(true);
        setmessage(`✅ Upload successful! \n💾 ${data.db_message || 'Saved to database'}`);
      } else {
        setmessage(`❌ Upload failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setmessage(`❌ Error uploading files: ${error.message}`);
    } finally {
      setUploadingTeacherVideo(false);
    }
  };

  const resetForm = () => {
    setShowResultsUpload(false);
    setTeacherVideoFile(null);
    setUploadComplete(false);
    setStudentVideoBlob(null);
    setStudentName("");
    setTeacherName("");
    setarid_no("");
    settime("");
    setselected("");
    setIsCameraReady(false);
    setDeviceConnected(false);
    videoStartedRef.current = false;
    setVideoRecordingStarted(false);
    setIsStreaming(false);
    setEegHistory([]);
    initializeGraph(); // Reset graph
    setmessage("✅ Ready for new recording");

    if (studentStreamRef.current) {
      studentStreamRef.current.getTracks().forEach(track => track.stop());
      studentStreamRef.current = null;
    }
  };

  // Custom tooltip for the graph
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-white text-sm font-semibold mb-2">Time: {label}s</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.dataKey}: <span className="font-mono">{entry.value.toFixed(1)} µV</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <h1 className="text-4xl font-bold text-white text-center mb-8">
            🧠 EEG + Video Synchronized Recording
          </h1>

          <video
            ref={studentVideoRef}
            autoPlay
            muted
            playsInline
            style={{ display: 'none' }}
          />

          {!isStreaming && !showResultsUpload ? (
            <div className="space-y-8">
              {/* Input Fields */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white text-sm font-semibold mb-2">Student's Name</label>
                  <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Enter student name" className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-white text-sm font-semibold mb-2">Teacher's Name</label>
                  <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Enter teacher name" className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-white text-sm font-semibold mb-2">Student's ARID No</label>
                  <input type="text" value={arid_no} onChange={(e) => setarid_no(e.target.value)} placeholder="Enter ARID number" className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-white text-sm font-semibold mb-2">Duration</label>
                    <input type="number" value={time} onChange={(e) => settime(e.target.value)} placeholder="Enter duration" className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-white text-sm font-semibold mb-2">Unit</label>
                    <select value={selected} onChange={(e) => setselected(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">Choose...</option>
                      <option value="seconds">Seconds</option>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Setup Status */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-2xl font-semibold text-white mb-4">⚙️ Recording Setup</h3>
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${deviceConnected ? 'bg-green-500' : 'bg-gray-600'}`}>{deviceConnected ? '✓' : '1'}</div>
                    <span className="text-white">EEG Device Connection</span>
                    <span className={`ml-auto ${deviceConnected ? 'text-green-400' : 'text-yellow-400'}`}>{deviceConnected ? 'Connected' : 'Not Connected'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCameraReady ? 'bg-green-500' : 'bg-gray-600'}`}>{isCameraReady ? '✓' : '2'}</div>
                    <span className="text-white">Camera Setup</span>
                    <span className={`ml-auto ${isCameraReady ? 'text-green-400' : 'text-yellow-400'}`}>{isCameraReady ? 'Ready' : 'Not Ready'}</span>
                  </div>
                </div>
                <button onClick={initializeRecording} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all">🔌 Connect EEG & Setup Camera</button>
              </div>

              <button onClick={startStreaming} disabled={!deviceConnected || !isCameraReady} className={`w-full py-4 rounded-xl font-bold text-xl transition-all ${deviceConnected && isCameraReady ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>🎬 Start Synchronized Recording</button>
            </div>
          ) : showResultsUpload ? (
            <div className="space-y-6">
              {/* Upload Results UI */}
              <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-6 text-center">
                <h2 className="text-2xl font-bold text-green-400 mb-2">✅ Recording Completed!</h2>
                <p className="text-white">Student video and EEG data have been recorded. Ready to upload.</p>
              </div>
              {!uploadComplete ? (
                <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                  <h3 className="text-xl font-semibold text-white mb-4">📹 Upload Teacher Video (Optional)</h3>
                  <input type="file" accept="video/*" onChange={(e) => setTeacherVideoFile(e.target.files[0])} disabled={uploadingTeacherVideo} className="block w-full text-white mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white hover:file:bg-blue-600 file:cursor-pointer" />
                  <div className="flex gap-4">
                    <button onClick={() => handleTeacherVideoUpload(false)} disabled={!teacherVideoFile || uploadingTeacherVideo} className="flex-1 py-3 rounded-lg font-semibold bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-600">{uploadingTeacherVideo ? '⏳ Uploading...' : '📤 Upload Teacher Video'}</button>
                    <button onClick={() => handleTeacherVideoUpload(true)} disabled={uploadingTeacherVideo} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-lg disabled:bg-gray-600">⭐️ Skip for Later</button>
                  </div>
                </div>
              ) : (
                <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-6 text-center">
                  <h2 className="text-2xl font-bold text-green-400 mb-4">🎉 Session Complete!</h2>
                  <button onClick={resetForm} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg">🔄 Start New Recording</button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* LIVE STREAMING VIEW */}

              {/* Status Header */}
              <div className="bg-white/10 rounded-xl p-4 border border-white/20 flex justify-between items-center">
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-white/60 text-xs uppercase tracking-wide">EEG Status</div>
                    <div className={`font-bold ${deviceConnected ? 'text-green-400' : 'text-yellow-400'}`}>
                      {deviceConnected ? '● LIVE' : 'Connecting...'}
                    </div>
                  </div>
                  <div className="text-center border-l border-white/10 pl-6">
                    <div className="text-white/60 text-xs uppercase tracking-wide">Video Status</div>
                    <div className={`font-bold ${videoRecordingStarted ? 'text-green-400' : 'text-yellow-400'}`}>
                      {videoRecordingStarted ? '● REC' : 'Waiting...'}
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-white/60 text-xs uppercase tracking-wide">Time Elapsed</div>
                  <div className="text-3xl font-mono text-white tracking-widest">
                    {formatTime(elapsedTime)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white/60 text-xs uppercase tracking-wide">Cognitive Load</div>
                  <div className="text-2xl font-bold text-blue-400">{currentLabel}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-6">

                {/* Left Col: Band Power Cards */}
                <div className="md:col-span-1 space-y-3">
                  <h3 className="text-white text-lg font-semibold mb-2">Band Power (µV)</h3>

                  <div className="bg-white/5 p-3 rounded-lg border-l-4 border-purple-500">
                    <div className="text-xs text-white/60">Gamma (Concentration)</div>
                    <div className="text-xl font-mono text-white">{currentBands.gamma.toFixed(1)}</div>
                  </div>

                  <div className="bg-white/5 p-3 rounded-lg border-l-4 border-blue-500">
                    <div className="text-xs text-white/60">Beta (Active Thinking)</div>
                    <div className="text-xl font-mono text-white">{currentBands.beta.toFixed(1)}</div>
                  </div>

                  <div className="bg-white/5 p-3 rounded-lg border-l-4 border-green-500">
                    <div className="text-xs text-white/60">Alpha (Relaxation)</div>
                    <div className="text-xl font-mono text-white">{currentBands.alpha.toFixed(1)}</div>
                  </div>

                  <div className="bg-white/5 p-3 rounded-lg border-l-4 border-yellow-500">
                    <div className="text-xs text-white/60">Theta (Drowsiness)</div>
                    <div className="text-xl font-mono text-white">{currentBands.theta.toFixed(1)}</div>
                  </div>

                  <div className="bg-white/5 p-3 rounded-lg border-l-4 border-red-500">
                    <div className="text-xs text-white/60">Delta (Sleep)</div>
                    <div className="text-xl font-mono text-white">{currentBands.delta.toFixed(1)}</div>
                  </div>
                </div>

                {/* Right Col: Enhanced Live Graph */}
                {/* Right Col: Enhanced Live Graph */}
                <div className="md:col-span-3 bg-slate-900/50 rounded-xl border border-slate-700/50 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white text-lg font-semibold">Live EEG Data Stream</h3>
                    <div className="text-xs text-white/60">
                      {isPaused ? '⏸️ PAUSED' : '● LIVE'}
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={graphData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#374151"
                          horizontal={true}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="time"
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF', fontSize: 11 }}
                          tickFormatter={(value) => `${value}s`}
                          domain={[0, 60]}
                          ticks={[0, 10, 20, 30, 40, 50, 60]}
                        />
                        <YAxis
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF', fontSize: 11 }}
                          label={{ value: 'µV', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />

                        {/* Gamma - Purple */}
                        <Area
                          type="monotone"
                          dataKey="gamma"
                          stroke={bandColors.gamma}
                          fill={`url(#colorGamma)`}
                          strokeWidth={2}
                          fillOpacity={0.1}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls
                          isAnimationActive={true}
                          animationDuration={300}
                        />

                        {/* Beta - Blue */}
                        <Area
                          type="monotone"
                          dataKey="beta"
                          stroke={bandColors.beta}
                          fill={`url(#colorBeta)`}
                          strokeWidth={2}
                          fillOpacity={0.1}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls
                          isAnimationActive={true}
                          animationDuration={300}
                        />

                        {/* Alpha - Green */}
                        <Area
                          type="monotone"
                          dataKey="alpha"
                          stroke={bandColors.alpha}
                          fill={`url(#colorAlpha)`}
                          strokeWidth={2}
                          fillOpacity={0.1}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls
                          isAnimationActive={true}
                          animationDuration={300}
                        />

                        {/* Theta - Yellow */}
                        <Area
                          type="monotone"
                          dataKey="theta"
                          stroke={bandColors.theta}
                          fill={`url(#colorTheta)`}
                          strokeWidth={2}
                          fillOpacity={0.1}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls
                          isAnimationActive={true}
                          animationDuration={300}
                        />

                        {/* Delta - Red */}
                        <Area
                          type="monotone"
                          dataKey="delta"
                          stroke={bandColors.delta}
                          fill={`url(#colorDelta)`}
                          strokeWidth={2}
                          fillOpacity={0.1}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls
                          isAnimationActive={true}
                          animationDuration={300}
                        />

                        {/* Gradient Definitions */}
                        <defs>
                          <linearGradient id="colorGamma" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={bandColors.gamma} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={bandColors.gamma} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorBeta" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={bandColors.beta} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={bandColors.beta} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorAlpha" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={bandColors.alpha} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={bandColors.alpha} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorTheta" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={bandColors.theta} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={bandColors.theta} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorDelta" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={bandColors.delta} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={bandColors.delta} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Controls */}
              <div className="flex gap-3 mt-4">
                {!isPaused ? (
                  <button onClick={pauseStreaming} disabled={!videoRecordingStarted} className={`flex-1 font-semibold py-3 rounded-lg ${videoRecordingStarted ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>⏸ Pause</button>
                ) : (
                  <button onClick={resumeStreaming} disabled={!videoRecordingStarted} className={`flex-1 font-semibold py-3 rounded-lg ${videoRecordingStarted ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>▶ Resume</button>
                )}
                <button onClick={stopStreaming} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg">⏹ Stop Recording</button>
              </div>
            </div>
          )}

          {message && (
            <div className={`mt-6 p-4 rounded-lg border-2 whitespace-pre-line ${message.includes('❌') || message.includes('Error') ? 'bg-red-500/20 border-red-500 text-red-200' : message.includes('⚠️') ? 'bg-yellow-500/20 border-yellow-500 text-yellow-200' : message.includes('✅') || message.includes('Success') ? 'bg-green-500/20 border-green-500 text-green-200' : 'bg-blue-500/20 border-blue-500 text-blue-200'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Start_Stream;