// import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
// import { useParams, useLocation, useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid,
//   Tooltip, Legend, ResponsiveContainer, LineChart, Line
// } from 'recharts';
// import './TeacherCompareSessions.css';

// function TeacherCompareSessionsPage() {
//   const { teacherId: paramTeacherId } = useParams();
//   const location = useLocation();
//   const navigate = useNavigate();
  
//   const teacherId = paramTeacherId || location.state?.teacher_id || location.state?.teacherId;
  
//   const [teacherInfo, setTeacherInfo] = useState({ name: '' });
//   const [availableSessions, setAvailableSessions] = useState([]);
//   const [selectedSession1, setSelectedSession1] = useState('');
//   const [selectedSession2, setSelectedSession2] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [loadingComparison, setLoadingComparison] = useState(false);
//   const [error, setError] = useState('');
//   const [comparisonData, setComparisonData] = useState(null);
  
//   // Chart data states
//   const [ratingChartData, setRatingChartData] = useState([]);
//   const [labelTimeChartData, setLabelTimeChartData] = useState([]);
//   const [brainwaveChartData, setBrainwaveChartData] = useState([]);
//   const [brainwaveTrendData, setBrainwaveTrendData] = useState([]);
//   const [brainwaveStats, setBrainwaveStats] = useState(null);
  
//   // Session EEG data
//   const [session1EEGData, setSession1EEGData] = useState(null);
//   const [session2EEGData, setSession2EEGData] = useState(null);
//   const [selectedEEGSession, setSelectedEEGSession] = useState(null);
//   const [loadingEEGData, setLoadingEEGData] = useState(false);
  
//   // EEG Analysis State
//   const [eegAnalysis, setEegAnalysis] = useState({
//     labelDistribution: null,
//     brainwaveComparison: null,
//     hasEEG1: false,
//     hasEEG2: false
//   });

//   // Fetch teacher data
//   useEffect(() => {
//     if (teacherId) {
//       fetchTeacherData();
//     } else {
//       setError('Teacher ID is missing. Please navigate from the teachers list page.');
//     }
//   }, [teacherId]);

//   const fetchTeacherData = async () => {
//     setLoading(true);
//     setError('');
    
//     try {
//       // 1. Fetch teacher details
//       const teacherRes = await axios.get(`${API_BASE}/get_one_teacher/${teacherId}`);
      
//       if (teacherRes.data.error) {
//         throw new Error(teacherRes.data.error);
//       }
      
//       setTeacherInfo(teacherRes.data);
      
//       // 2. Get teacher sessions with details
//       const sessionsRes = await axios.get(`${API_BASE}/teacher_sessions_with_details/${teacherId}`);
      
//       if (sessionsRes.data.error) {
//         throw new Error(sessionsRes.data.error);
//       }
      
//       const enhancedSessions = sessionsRes.data.map(session => ({
//         ...session,
//         displayName: `${formatDate(session.date)} - ${session.student_name} (${session.course_name})`
//       }));
      
//       setAvailableSessions(enhancedSessions);
      
//       // Auto-select first two sessions if available
//       if (enhancedSessions.length >= 2) {
//         setSelectedSession1(enhancedSessions[0].session_id.toString());
//         setSelectedSession2(enhancedSessions[1].session_id.toString());
//       }
      
//     } catch (err) {
//       console.error('Error fetching teacher data:', err);
//       setError(`Failed to load data: ${err.message || 'Check your connection'}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Fetch comparison data when sessions are selected
//   useEffect(() => {
//     if (selectedSession1 && selectedSession2 && selectedSession1 !== selectedSession2) {
//       fetchComparisonData();
//     }
//   }, [selectedSession1, selectedSession2]);

//   const fetchComparisonData = async () => {
//     setLoadingComparison(true);
//     setComparisonData(null);
//     setLabelTimeChartData([]);
//     setBrainwaveChartData([]);
//     setBrainwaveTrendData([]);
//     setEegAnalysis({
//       labelDistribution: null,
//       brainwaveComparison: null,
//       hasEEG1: false,
//       hasEEG2: false
//     });
    
//     try {
//       // Fetch data for both sessions in parallel
//       const [session1Data, session2Data] = await Promise.all([
//         fetchSessionDetails(selectedSession1),
//         fetchSessionDetails(selectedSession2)
//       ]);
      
//       // Compare the sessions
//       const comparison = compareSessions(session1Data, session2Data);
//       setComparisonData(comparison);
      
//       // Prepare rating chart data
//       prepareRatingChartData(session1Data, session2Data);
      
//       // Fetch EEG data for both sessions if available
//       await fetchBothSessionsEEGData(session1Data, session2Data);
      
//       // Analyze EEG data
//       await analyzeEEGData(comparison);
      
//     } catch (err) {
//       setError(`Comparison failed: ${err.message}`);
//     } finally {
//       setLoadingComparison(false);
//     }
//   };

//   const fetchBothSessionsEEGData = async (session1Data, session2Data) => {
//     try {
//       // Fetch both sessions EEG data in parallel
//       const [eegData1, eegData2] = await Promise.all([
//         session1Data.hasEEG ? fetchEEGDataForSession(selectedSession1) : Promise.resolve(null),
//         session2Data.hasEEG ? fetchEEGDataForSession(selectedSession2) : Promise.resolve(null)
//       ]);
      
//       // Store raw EEG data
//       setSession1EEGData(eegData1);
//       setSession2EEGData(eegData2);
      
//       // Process EEG data for charts if both have data
//       if (eegData1 && eegData2) {
//         processEEGDataForCharts(eegData1, eegData2);
//       }
      
//     } catch (err) {
//       console.error('Error fetching EEG data:', err);
//     }
//   };

//   const analyzeEEGData = async (comparison) => {
//     try {
//       // Fetch EEG data for both sessions in parallel
//       const [eegData1, eegData2] = await Promise.all([
//         comparison.session1.hasEEG ? fetchEEGDataForSession(selectedSession1) : Promise.resolve(null),
//         comparison.session2.hasEEG ? fetchEEGDataForSession(selectedSession2) : Promise.resolve(null)
//       ]);
      
//       const hasEEG1 = eegData1 && !eegData1.error;
//       const hasEEG2 = eegData2 && !eegData2.error;
      
//       let labelDistribution = null;
//       let brainwaveComparison = null;
      
//       if (hasEEG1 || hasEEG2) {
//         // Analyze label distribution
//         labelDistribution = analyzeLabelDistribution(eegData1, eegData2);
        
//         // Analyze brainwave data
//         brainwaveComparison = analyzeBrainwaveData(eegData1, eegData2);
//       }
      
//       setEegAnalysis({
//         labelDistribution,
//         brainwaveComparison,
//         hasEEG1,
//         hasEEG2
//       });
      
//     } catch (err) {
//       console.error('Error analyzing EEG data:', err);
//     }
//   };

//   const analyzeLabelDistribution = (eegData1, eegData2) => {
//     try {
//       const getLabelCounts = (eegData) => {
//         if (!eegData || eegData.error || !eegData.data) return {};
        
//         const labelColumn = findColumn(eegData.data, ['Label', 'label', 'Prediction', 'prediction', 'Cognitive_State', 'cognitive_state']);
//         if (!labelColumn) return {};
        
//         // Initialize all possible cognitive states
//         const counts = {
//           'Very High': 0,
//           'High': 0,
//           'Medium': 0,
//           'Low': 0,
//           'Very Low': 0
//         };
        
//         for (const row of eegData.data) {
//           const label = row[labelColumn];
//           if (label) {
//             const normalizedLabel = normalizeLabel(label);
//             if (counts.hasOwnProperty(normalizedLabel)) {
//               counts[normalizedLabel] = (counts[normalizedLabel] || 0) + 1;
//             }
//           }
//         }
        
//         return counts;
//       };
      
//       const counts1 = getLabelCounts(eegData1);
//       const counts2 = getLabelCounts(eegData2);
      
//       // Always include all 5 cognitive states
//       const allLabels = ['Very High', 'High', 'Medium', 'Low', 'Very Low'];
      
//       const tableData = allLabels.map(label => ({
//         label,
//         session1Count: counts1[label] || 0,
//         session2Count: counts2[label] || 0,
//         session1Percentage: counts1[label] ? ((counts1[label] / (Object.values(counts1).reduce((a, b) => a + b, 0) || 1)) * 100).toFixed(1) : '0.0',
//         session2Percentage: counts2[label] ? ((counts2[label] / (Object.values(counts2).reduce((a, b) => a + b, 0) || 1)) * 100).toFixed(1) : '0.0'
//       }));
      
//       // Create chart data for visualization
//       const chartData = allLabels.map(label => ({
//         label,
//         session1: counts1[label] || 0,
//         session2: counts2[label] || 0
//       }));
      
//       return {
//         tableData,
//         chartData,
//         totalSession1: Object.values(counts1).reduce((a, b) => a + b, 0),
//         totalSession2: Object.values(counts2).reduce((a, b) => a + b, 0)
//       };
      
//     } catch (error) {
//       console.error('Error analyzing label distribution:', error);
//       return null;
//     }
//   };

//   const normalizeLabel = (label) => {
//     if (!label) return 'Medium';
    
//     const labelStr = String(label).toLowerCase().trim();
    
//     // Check for Very High first (most specific)
//     if (labelStr.includes('very high')) {
//       return 'Very High';
//     }
    
//     // Check for Very Low
//     if (labelStr.includes('very low')) {
//       return 'Very Low';
//     }
    
//     // Check for High
//     if (labelStr.includes('high') || labelStr.includes('focused') || labelStr.includes('alert') || labelStr.includes('concentrated')) {
//       return 'High';
//     }
    
//     // Check for Low
//     if (labelStr.includes('low') || labelStr.includes('neutral')) {
//       return 'Low';
//     }
    
//     // Check for Medium
//     if (labelStr.includes('medium') || labelStr.includes('relaxed') || labelStr.includes('normal')) {
//       return 'Medium';
//     }
    
//     // Check for distracted/drowsy
//     if (labelStr.includes('distracted') || labelStr.includes('drowsy')) {
//       return 'Very Low';
//     }
    
//     // Default to Medium for unknown labels
//     return 'Medium';
//   };

//   const analyzeBrainwaveData = (eegData1, eegData2) => {
//     try {
//       const getBrainwaveAverages = (eegData) => {
//         if (!eegData || eegData.error || !eegData.data) return null;
        
//         const bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
//         const result = {};
        
//         bands.forEach(band => {
//           const col = findColumn(eegData.data, [band, band.charAt(0).toUpperCase() + band.slice(1)]);
//           if (col) {
//             const values = eegData.data
//               .map(row => parseFloat(row[col]))
//               .filter(val => !isNaN(val));
            
//             if (values.length > 0) {
//               result[band] = {
//                 average: values.reduce((a, b) => a + b, 0) / values.length,
//                 max: Math.max(...values),
//                 min: Math.min(...values),
//                 count: values.length
//               };
//             }
//           }
//         });
        
//         return result;
//       };
      
//       const averages1 = getBrainwaveAverages(eegData1);
//       const averages2 = getBrainwaveAverages(eegData2);
      
//       if (!averages1 && !averages2) return null;
      
//       // Create table data
//       const bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
//       const tableData = bands.map(band => ({
//         band: band.charAt(0).toUpperCase() + band.slice(1),
//         session1Avg: averages1?.[band]?.average?.toFixed(2) || 'N/A',
//         session2Avg: averages2?.[band]?.average?.toFixed(2) || 'N/A',
//         session1Range: averages1?.[band] ? `${averages1[band].min.toFixed(1)}-${averages1[band].max.toFixed(1)}` : 'N/A',
//         session2Range: averages2?.[band] ? `${averages2[band].min.toFixed(1)}-${averages2[band].max.toFixed(1)}` : 'N/A'
//       }));
      
//       // Create chart data
//       const chartData = bands.map(band => ({
//         band: band.charAt(0).toUpperCase() + band.slice(1),
//         session1: averages1?.[band]?.average || 0,
//         session2: averages2?.[band]?.average || 0
//       }));
      
//       return {
//         tableData,
//         chartData,
//         hasData1: !!averages1,
//         hasData2: !!averages2
//       };
      
//     } catch (error) {
//       console.error('Error analyzing brainwave data:', error);
//       return null;
//     }
//   };

//   const fetchEEGDataForSession = async (sessionId) => {
//     try {
//       const response = await axios.get(`${API_BASE}/api/eeg-data/${sessionId}`);
      
//       if (response.data.error) {
//         console.log(`No EEG data for session ${sessionId}:`, response.data.error);
//         return null;
//       }
      
//       return response.data;
      
//     } catch (err) {
//       console.error(`Error fetching EEG data for session ${sessionId}:`, err);
//       return null;
//     }
//   };

//   // Process EEG data for charts
//   const processEEGDataForCharts = (eegData1, eegData2) => {
//     try {
//       // Process Label vs Time chart
//       processLabelTimeChartData(eegData1, eegData2);
      
//       // Process Brainwave comparison chart
//       processBrainwaveChartData(eegData1, eegData2);
      
//     } catch (error) {
//       console.error('Error processing EEG data:', error);
//     }
//   };

//   // Process EEG data for Label vs Time chart (like student page)
//   const processLabelTimeChartData = (eegData1, eegData2) => {
//     try {
//       // Extract Time and Label data from EEG
//       const extractLabelData = (eegData, sessionName) => {
//         if (!eegData) return [];
        
//         let dataPoints = [];
        
//         // Handle CSV data structure
//         if (eegData.data && Array.isArray(eegData.data)) {
//           const csvData = eegData.data;
          
//           // Find Time and Label columns (case-insensitive)
//           const timeColumn = findColumn(csvData, ['Time', 'time', 'Timestamp', 'timestamp']);
//           const labelColumn = findColumn(csvData, ['Label', 'label', 'Prediction', 'prediction', 'Cognitive_State', 'cognitive_state', 'Cognitive State']);
          
//           console.log(`Label chart - Time column: ${timeColumn}, Label column: ${labelColumn}`);
          
//           if (timeColumn && labelColumn) {
//             // Take a sample of data points for performance
//             const sampleSize = Math.min(csvData.length, 100);
//             const step = Math.max(1, Math.floor(csvData.length / sampleSize));
            
//             for (let i = 0; i < csvData.length; i += step) {
//               const row = csvData[i];
//               const time = row[timeColumn];
//               const label = row[labelColumn];
              
//               if (time !== undefined && label !== undefined) {
//                 // Map label to both value and text
//                 const labelInfo = mapLabelToValueAndText(label);
//                 dataPoints.push({
//                   time: formatTimeDisplay(time),
//                   timeRaw: time,
//                   label: labelInfo.text,  // Full label text
//                   labelValue: labelInfo.value,  // Numerical value for chart
//                   session: sessionName,
//                   index: i
//                 });
//               }
//             }
//           } else {
//             console.log('Could not find Time/Label columns. Available columns:', 
//               csvData.length > 0 ? Object.keys(csvData[0]) : []);
//           }
//         }
        
//         return dataPoints;
//       };
      
//       const data1 = extractLabelData(eegData1, 'Session 1');
//       const data2 = extractLabelData(eegData2, 'Session 2');
      
//       console.log('Label data 1:', data1.length, 'points');
//       console.log('Label data 2:', data2.length, 'points');
      
//       if (data1.length === 0 || data2.length === 0) {
//         console.log('Not enough label data for chart');
//         return;
//       }
      
//       // Combine data for comparison chart with both lines
//       const combinedData = [];
//       const maxPoints = Math.min(data1.length, data2.length, 50);
      
//       for (let i = 0; i < maxPoints; i++) {
//         const point1 = data1[i];
//         const point2 = data2[i];
        
//         if (point1 && point2) {
//           combinedData.push({
//             time: point1.time,
//             timeIndex: i,
//             session1Label: point1.label,  // Text label
//             session1Value: point1.labelValue,  // Numerical value
//             session2Label: point2.label,  // Text label
//             session2Value: point2.labelValue,  // Numerical value
//             // For dual line display
//             session1Line: point1.labelValue,
//             session2Line: point2.labelValue
//           });
//         }
//       }
      
//       console.log('Combined Label Time chart data:', combinedData);
//       setLabelTimeChartData(combinedData);
      
//     } catch (error) {
//       console.error('Error processing label time chart data:', error);
//     }
//   };

//   // Map label to numerical value and text
//   const mapLabelToValueAndText = (label) => {
//     const labelStr = String(label).toLowerCase().trim();
    
//     if (labelStr.includes('very high')) {
//       return { value: 5, text: 'Very High' };
//     }
//     if (labelStr.includes('very low') || labelStr.includes('distracted') || labelStr.includes('drowsy')) {
//       return { value: 1, text: 'Very Low' };
//     }
//     if (labelStr.includes('high') || labelStr.includes('focused') || labelStr.includes('alert') || labelStr.includes('concentrated')) {
//       return { value: 4, text: 'High' };
//     }
//     if (labelStr.includes('low') || labelStr.includes('neutral')) {
//       return { value: 2, text: 'Low' };
//     }
//     if (labelStr.includes('medium') || labelStr.includes('relaxed') || labelStr.includes('normal')) {
//       return { value: 3, text: 'Medium' };
//     }
    
//     // Default to Medium
//     return { value: 3, text: 'Medium' };
//   };

//   // Process EEG data for Brainwave comparison chart
//   const processBrainwaveChartData = (eegData1, eegData2) => {
//     try {
//       // Extract brainwave frequencies
//       const extractBrainwaveData = (eegData, sessionName) => {
//         const brainwaves = {
//           delta: { sum: 0, count: 0 },
//           theta: { sum: 0, count: 0 },
//           alpha: { sum: 0, count: 0 },
//           beta: { sum: 0, count: 0 },
//           gamma: { sum: 0, count: 0 }
//         };
        
//         if (!eegData || !eegData.data || !Array.isArray(eegData.data)) {
//           console.log('No EEG data available for brainwave extraction');
//           return brainwaves;
//         }
        
//         const csvData = eegData.data;
        
//         // Find brainwave columns
//         const deltaCol = findColumn(csvData, ['Delta', 'delta']);
//         const thetaCol = findColumn(csvData, ['Theta', 'theta']);
//         const alphaCol = findColumn(csvData, ['Alpha', 'alpha']);
//         const betaCol = findColumn(csvData, ['Beta', 'beta']);
//         const gammaCol = findColumn(csvData, ['Gamma', 'gamma']);
        
//         console.log('Brainwave columns found:', { deltaCol, thetaCol, alphaCol, betaCol, gammaCol });
        
//         // Sample data for performance
//         const sampleSize = Math.min(csvData.length, 100);
//         const step = Math.max(1, Math.floor(csvData.length / sampleSize));
        
//         for (let i = 0; i < csvData.length; i += step) {
//           const row = csvData[i];
          
//           if (deltaCol && row[deltaCol]) {
//             brainwaves.delta.sum += parseFloat(row[deltaCol]) || 0;
//             brainwaves.delta.count++;
//           }
//           if (thetaCol && row[thetaCol]) {
//             brainwaves.theta.sum += parseFloat(row[thetaCol]) || 0;
//             brainwaves.theta.count++;
//           }
//           if (alphaCol && row[alphaCol]) {
//             brainwaves.alpha.sum += parseFloat(row[alphaCol]) || 0;
//             brainwaves.alpha.count++;
//           }
//           if (betaCol && row[betaCol]) {
//             brainwaves.beta.sum += parseFloat(row[betaCol]) || 0;
//             brainwaves.beta.count++;
//           }
//           if (gammaCol && row[gammaCol]) {
//             brainwaves.gamma.sum += parseFloat(row[gammaCol]) || 0;
//             brainwaves.gamma.count++;
//           }
//         }
        
//         return {
//           delta: brainwaves.delta.count > 0 ? brainwaves.delta.sum / brainwaves.delta.count : 0,
//           theta: brainwaves.theta.count > 0 ? brainwaves.theta.sum / brainwaves.theta.count : 0,
//           alpha: brainwaves.alpha.count > 0 ? brainwaves.alpha.sum / brainwaves.alpha.count : 0,
//           beta: brainwaves.beta.count > 0 ? brainwaves.beta.sum / brainwaves.beta.count : 0,
//           gamma: brainwaves.gamma.count > 0 ? brainwaves.gamma.sum / brainwaves.gamma.count : 0
//         };
//       };
      
//       const brainwaves1 = extractBrainwaveData(eegData1, 'Session 1');
//       const brainwaves2 = extractBrainwaveData(eegData2, 'Session 2');
      
//       // Create chart data
//       const chartData = [
//         { band: 'Delta', session1: brainwaves1.delta, session2: brainwaves2.delta },
//         { band: 'Theta', session1: brainwaves1.theta, session2: brainwaves2.theta },
//         { band: 'Alpha', session1: brainwaves1.alpha, session2: brainwaves2.alpha },
//         { band: 'Beta', session1: brainwaves1.beta, session2: brainwaves2.beta },
//         { band: 'Gamma', session1: brainwaves1.gamma, session2: brainwaves2.gamma }
//       ];
      
//       console.log('Brainwave chart data:', chartData);
//       setBrainwaveChartData(chartData);
      
//     } catch (error) {
//       console.error('Error processing brainwave chart data:', error);
//     }
//   };

//   // Helper function to find columns
//   const findColumn = (data, possibleNames) => {
//     if (!data || data.length === 0) return null;
    
//     const firstRow = data[0];
//     for (const name of possibleNames) {
//       if (firstRow.hasOwnProperty(name)) {
//         return name;
//       }
//     }
//     return null;
//   };

//   // Fetch EEG data for individual session display
//   const fetchAndDisplayEEGData = async (sessionId, sessionLabel = 'session1') => {
//     setLoadingEEGData(true);
//     setError('');
//     setBrainwaveTrendData([]);
//     setBrainwaveStats(null);
    
//     try {
//       const response = await axios.get(`${API_BASE}/api/eeg-data/${sessionId}`);
      
//       if (response.data.error) {
//         setError(`No EEG data available for this session: ${response.data.error}`);
//         return null;
//       }
      
//       // Set the selected EEG session
//       setSelectedEEGSession(sessionLabel);
      
//       // Process EEG data for time series visualization
//       processIndividualEEGData(response.data, sessionLabel);
      
//       return response.data;
      
//     } catch (err) {
//       console.error(`Error fetching EEG data:`, err);
//       setError(`Failed to load EEG data: ${err.message}`);
//       return null;
//     } finally {
//       setLoadingEEGData(false);
//     }
//   };

//   // Process individual session EEG data
//   const processIndividualEEGData = (eegData, sessionLabel) => {
//     let dataArray = [];
    
//     if (Array.isArray(eegData.data)) {
//       dataArray = eegData.data;
//     } else if (Array.isArray(eegData)) {
//       dataArray = eegData;
//     }
    
//     if (dataArray.length === 0) {
//       setError('No brainwave data found in EEG response.');
//       return;
//     }
    
//     // Create time series data
//     const timeSeriesData = [];
//     const brainwaveStats = {
//       delta: { sum: 0, count: 0, min: Infinity, max: -Infinity },
//       theta: { sum: 0, count: 0, min: Infinity, max: -Infinity },
//       alpha: { sum: 0, count: 0, min: Infinity, max: -Infinity },
//       beta: { sum: 0, count: 0, min: Infinity, max: -Infinity },
//       gamma: { sum: 0, count: 0, min: Infinity, max: -Infinity }
//     };
    
//     // Find brainwave columns
//     const deltaCol = findColumn(dataArray, ['Delta', 'delta']);
//     const thetaCol = findColumn(dataArray, ['Theta', 'theta']);
//     const alphaCol = findColumn(dataArray, ['Alpha', 'alpha']);
//     const betaCol = findColumn(dataArray, ['Beta', 'beta']);
//     const gammaCol = findColumn(dataArray, ['Gamma', 'gamma']);
//     const timeCol = findColumn(dataArray, ['Time', 'time', 'Timestamp', 'timestamp']);
    
//     // Sample data for performance
//     const sampleSize = Math.min(dataArray.length, 100);
//     const step = Math.max(1, Math.floor(dataArray.length / sampleSize));
    
//     for (let i = 0; i < dataArray.length; i += step) {
//       const row = dataArray[i];
//       const timestamp = timeCol ? row[timeCol] : i;
      
//       const delta = deltaCol ? parseFloat(row[deltaCol]) || 0 : 0;
//       const theta = thetaCol ? parseFloat(row[thetaCol]) || 0 : 0;
//       const alpha = alphaCol ? parseFloat(row[alphaCol]) || 0 : 0;
//       const beta = betaCol ? parseFloat(row[betaCol]) || 0 : 0;
//       const gamma = gammaCol ? parseFloat(row[gammaCol]) || 0 : 0;
      
//       // Update statistics
//       updateStats(brainwaveStats, 'delta', delta);
//       updateStats(brainwaveStats, 'theta', theta);
//       updateStats(brainwaveStats, 'alpha', alpha);
//       updateStats(brainwaveStats, 'beta', beta);
//       updateStats(brainwaveStats, 'gamma', gamma);
      
//       timeSeriesData.push({
//         index: i,
//         time: timestamp,
//         timestamp: formatTimeDisplay(timestamp),
//         delta,
//         theta,
//         alpha,
//         beta,
//         gamma,
//         session: sessionLabel
//       });
//     }
    
//     // Calculate averages
//     Object.keys(brainwaveStats).forEach(band => {
//       const stats = brainwaveStats[band];
//       stats.average = stats.count > 0 ? stats.sum / stats.count : 0;
//     });
    
//     setBrainwaveTrendData(timeSeriesData);
//     setBrainwaveStats(brainwaveStats);
//   };

//   const updateStats = (stats, band, value) => {
//     stats[band].sum += value;
//     stats[band].count++;
//     stats[band].min = Math.min(stats[band].min, value);
//     stats[band].max = Math.max(stats[band].max, value);
//   };

//   const fetchSessionDetails = async (sessionId) => {
//     try {
//       // Get session details
//       const sessionRes = await axios.get(`${API_BASE}/Sessions_by_sid/${sessionId}`);
//       const sessionData = Array.isArray(sessionRes.data) ? sessionRes.data[0] : sessionRes.data;
      
//       // Get admin response
//       let adminResponse = { rating: 0, response: 'No feedback provided' };
//       try {
//         const responseRes = await axios.get(`${API_BASE}/sessions/${sessionId}/check-response`);
//         if (responseRes.data && responseRes.data.has_response) {
//           adminResponse = responseRes.data;
//         }
//       } catch (err) {
//         console.log('No admin response:', err.message);
//       }
      
//       // Get EEG summary if available
//       let eegSummary = null;
//       let hasEEG = false;
//       try {
//         const summaryRes = await axios.get(`${API_BASE}/api/session_summary/${sessionId}`);
//         if (!summaryRes.data.error) {
//           eegSummary = summaryRes.data;
//           hasEEG = true;
//         }
//       } catch (err) {
//         console.log('No EEG summary:', err.message);
//       }
      
//       return {
//         sessionId,
//         sessionData,
//         adminResponse,
//         eegSummary,
//         hasEEG
//       };
      
//     } catch (err) {
//       throw new Error(`Failed to fetch session: ${err.message}`);
//     }
//   };

//   const compareSessions = (session1Data, session2Data) => {
//     const rating1 = session1Data.adminResponse.rating || 0;
//     const rating2 = session2Data.adminResponse.rating || 0;
    
//     return {
//       session1: session1Data,
//       session2: session2Data,
//       ratingComparison: {
//         session1: rating1,
//         session2: rating2,
//         difference: rating2 - rating1,
//         improvement: rating2 > rating1
//       }
//     };
//   };

//   const prepareRatingChartData = (session1, session2) => {
//     setRatingChartData([
//       { session: 'Session 1', rating: session1.adminResponse.rating || 0 },
//       { session: 'Session 2', rating: session2.adminResponse.rating || 0 }
//     ]);
//   };

//   const formatDate = (dateString) => {
//     if (!dateString) return 'Unknown date';
//     try {
//       return new Date(dateString).toLocaleDateString('en-US', {
//         year: 'numeric',
//         month: 'short',
//         day: 'numeric'
//       });
//     } catch {
//       return dateString;
//     }
//   };

//   const formatTimeDisplay = (time) => {
//     if (typeof time === 'number') {
//       if (time < 60) return `${time}s`;
//       const minutes = Math.floor(time / 60);
//       const seconds = time % 60;
//       return `${minutes}m ${seconds}s`;
//     }
    
//     if (typeof time === 'string') {
//       // Handle HH:MM:SS format
//       if (time.includes(':')) {
//         const parts = time.split(':').map(Number);
//         if (parts.length === 3) {
//           if (parts[0] > 0) return `${parts[0]}m ${parts[1]}s`;
//           if (parts[1] > 0) return `${parts[1]}m ${parts[2]}s`;
//           return `${parts[2]}s`;
//         }
//       }
//       // Try to parse as number
//       const numTime = parseFloat(time);
//       if (!isNaN(numTime)) {
//         return formatTimeDisplay(numTime);
//       }
//     }
    
//     return String(time);
//   };

//   const renderStars = (rating) => {
//     const stars = [];
//     for (let i = 1; i <= 5; i++) {
//       stars.push(
//         <span key={i} className={i <= rating ? 'star-filled' : 'star-empty'}>
//           ★
//         </span>
//       );
//     }
//     return <div className="stars-container">{stars}</div>;
//   };

//   // Custom tooltip for EEG label chart
//   const LabelChartTooltip = ({ active, payload, label }) => {
//     if (active && payload && payload.length) {
//       const session1Data = payload.find(p => p.dataKey === 'session1Line');
//       const session2Data = payload.find(p => p.dataKey === 'session2Line');
      
//       return (
//         <div className="custom-tooltip">
//           <p className="time-label"><strong>Time: {label}</strong></p>
//           {session1Data && (
//             <p style={{ color: session1Data.color }}>
//               <strong>Session 1:</strong> {session1Data.payload.session1Label}
//             </p>
//           )}
//           {session2Data && (
//             <p style={{ color: session2Data.color }}>
//               <strong>Session 2:</strong> {session2Data.payload.session2Label}
//             </p>
//           )}
//         </div>
//       );
//     }
//     return null;
//   };

//   // Custom tooltip for brainwave chart
//   const BrainwaveTooltip = ({ active, payload, label }) => {
//     if (active && payload && payload.length) {
//       return (
//         <div className="custom-tooltip">
//           <p className="band-label">Brainwave: {label}</p>
//           {payload.map((entry, index) => (
//             <p key={index} style={{ color: entry.color }}>
//               {entry.name}: {entry.value.toFixed(4)} μV
//             </p>
//           ))}
//         </div>
//       );
//     }
//     return null;
//   };

//   // Custom tooltip for brainwave time series
//   const BrainwaveTimeSeriesTooltip = ({ active, payload, label }) => {
//     if (active && payload && payload.length) {
//       const data = payload[0].payload;
//       return (
//         <div className="custom-tooltip">
//           <p className="tooltip-label"><strong>Time: {label}</strong></p>
//           <p className="tooltip-value">Delta: {data.delta.toFixed(2)} μV</p>
//           <p className="tooltip-value">Theta: {data.theta.toFixed(2)} μV</p>
//           <p className="tooltip-value">Alpha: {data.alpha.toFixed(2)} μV</p>
//           <p className="tooltip-value">Beta: {data.beta.toFixed(2)} μV</p>
//           <p className="tooltip-value">Gamma: {data.gamma.toFixed(2)} μV</p>
//         </div>
//       );
//     }
//     return null;
//   };

//   if (!teacherId) {
//     return (
//       <div className="error-container">
//         <h2>Error: Teacher ID Required</h2>
//         <p>Please navigate to this page from the Teachers List page.</p>
//         <button 
//           className="back-button"
//           onClick={() => navigate('/View_teachers')}
//         >
//           Go to Teachers List
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="teacher-comparison-page">
//       {/* Header */}
//       <header className="page-header">
//         <button 
//           className="back-button"
//           onClick={() => navigate('/View_teachers')}
//         >
//           ← Back to Teachers
//         </button>
//         <div className="header-content">
//           <h1>Teacher Session Comparison</h1>
//           <div className="teacher-info">
//             <span className="teacher-name">Teacher: {teacherInfo.name || `ID: ${teacherId}`}</span>
//             <span className="session-count">Sessions: {availableSessions.length}</span>
//           </div>
//         </div>
//       </header>

//       {/* Session Selection */}
//       <section className="session-selection">
//         <div className="selection-card">
//           <h2>Select Two Sessions to Compare</h2>
          
//           {loading && <div className="loading">Loading teacher sessions...</div>}
//           {error && <div className="error">{error}</div>}
          
//           <div className="selection-row">
//             <div className="select-container">
//               <label>First Session:</label>
//               <select
//                 value={selectedSession1}
//                 onChange={(e) => setSelectedSession1(e.target.value)}
//                 disabled={loading || availableSessions.length === 0}
//               >
//                 <option value="">-- Select Session --</option>
//                 {availableSessions.map(session => (
//                   <option
//                     key={session.session_id}
//                     value={session.session_id}
//                     disabled={session.session_id.toString() === selectedSession2}
//                   >
//                     {session.displayName} {session.has_eeg ? '📊' : ''}
//                   </option>
//                 ))}
//               </select>
//             </div>
            
//             <div className="vs-label">VS</div>
            
//             <div className="select-container">
//               <label>Second Session:</label>
//               <select
//                 value={selectedSession2}
//                 onChange={(e) => setSelectedSession2(e.target.value)}
//                 disabled={loading || availableSessions.length === 0}
//               >
//                 <option value="">-- Select Session --</option>
//                 {availableSessions.map(session => (
//                   <option
//                     key={session.session_id}
//                     value={session.session_id}
//                     disabled={session.session_id.toString() === selectedSession1}
//                   >
//                     {session.displayName} {session.has_eeg ? '📊' : ''}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           </div>
          
//           {availableSessions.length < 2 && !loading && (
//             <div className="warning">
//               Need at least 2 sessions to compare..
//             </div>
//           )}
//         </div>
//       </section>

//       {/* Loading Comparison */}
//       {loadingComparison && (
//         <div className="loading-overlay">
//           <div className="spinner"></div>
//           <p>Comparing sessions...</p>
//         </div>
//       )}

//       {/* Comparison Results */}
//       {comparisonData && !loadingComparison && (
//         <div className="comparison-results">
//           {/* Session Details */}
//           <section className="session-details-section">
//             <h3>Session Details</h3>
//             <div className="details-grid">
//               <div className="detail-card">
//                 <h4>Session 1</h4>
//                 <p><strong>Date:</strong> {formatDate(comparisonData.session1.sessionData.date)}</p>
//                 <p><strong>Student:</strong> {comparisonData.session1.sessionData.student_name}</p>
//                 <p><strong>Course:</strong> {comparisonData.session1.sessionData.course_name}</p>
//                 <p><strong>Venue:</strong> {comparisonData.session1.sessionData.venue}</p>
//                 <p><strong>Time:</strong> {comparisonData.session1.sessionData.start_time} - {comparisonData.session1.sessionData.end_time}</p>
//                 <p><strong>EEG Data:</strong> {comparisonData.session1.hasEEG ? 'Available ✓' : 'Not available'}</p>
//               </div>
              
//               <div className="detail-card">
//                 <h4>Session 2</h4>
//                 <p><strong>Date:</strong> {formatDate(comparisonData.session2.sessionData.date)}</p>
//                 <p><strong>Student:</strong> {comparisonData.session2.sessionData.student_name}</p>
//                 <p><strong>Course:</strong> {comparisonData.session2.sessionData.course_name}</p>
//                 <p><strong>Venue:</strong> {comparisonData.session2.sessionData.venue}</p>
//                 <p><strong>Time:</strong> {comparisonData.session2.sessionData.start_time} - {comparisonData.session2.sessionData.end_time}</p>
//                 <p><strong>EEG Data:</strong> {comparisonData.session2.hasEEG ? 'Available ✓' : 'Not available'}</p>
//               </div>
//             </div>
            
//             {/* EEG Data Controls */}
//             {(comparisonData.session1.hasEEG || comparisonData.session2.hasEEG) && (
//               <section className="eeg-data-section">
//                 <h3>EEG Brainwave Data Analysis</h3>
//                 <div className="eeg-controls">
//                   <button 
//                     className="eeg-button"
//                     onClick={() => fetchAndDisplayEEGData(selectedSession1, 'session1')}
//                     disabled={!comparisonData?.session1?.hasEEG || loadingEEGData}
//                   >
//                     {loadingEEGData && selectedEEGSession === 'session1' ? 'Loading...' : 'View Session 1 EEG Details'}
//                   </button>
                  
//                   <button 
//                     className="eeg-button"
//                     onClick={() => fetchAndDisplayEEGData(selectedSession2, 'session2')}
//                     disabled={!comparisonData?.session2?.hasEEG || loadingEEGData}
//                   >
//                     {loadingEEGData && selectedEEGSession === 'session2' ? 'Loading...' : 'View Session 2 EEG Details'}
//                   </button>
//                 </div>
//               </section>
//             )}
//           </section>

//           {/* 1. COMBINED LABELS OVER TIME CHART (Both sessions in one graph) */}
//           {labelTimeChartData.length > 0 && (
//             <section className="eeg-comparison-section combined-chart-section">
//               <h3>Cognitive States Comparison Over Time (Both Sessions)</h3>
//               <p className="section-description">
//                 Line chart showing how cognitive states change over time in both sessions on the same graph.
//                 Y-axis shows labels: Very Low (1), Low (2), Medium (3), High (4), Very High (5)
//               </p>
              
//               <div className="chart-container">
//                 <ResponsiveContainer width="100%" height={400}>
//                   <LineChart data={labelTimeChartData}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis 
//                       dataKey="time" 
//                       label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
//                       tick={{ fontSize: 12 }}
//                     />
//                     <YAxis 
//                       label={{ value: 'Cognitive State', angle: -90, position: 'insideLeft' }}
//                       domain={[0.5, 5.5]}
//                       ticks={[1, 2, 3, 4, 5]}
//                       tickFormatter={(value) => {
//                         const labels = {
//                           1: 'Very Low',
//                           2: 'Low',
//                           3: 'Medium',
//                           4: 'High',
//                           5: 'Very High'
//                         };
//                         return labels[value] || value;
//                       }}
//                     />
//                     <Tooltip content={<LabelChartTooltip />} />
//                     <Legend />
//                     <Line 
//                       type="monotone" 
//                       dataKey="session1Line" 
//                       name="Session 1 Cognitive State" 
//                       stroke="#3366cc" 
//                       strokeWidth={2}
//                       dot={{ r: 3 }}
//                       activeDot={{ r: 6 }}
//                     />
//                     <Line 
//                       type="monotone" 
//                       dataKey="session2Line" 
//                       name="Session 2 Cognitive State" 
//                       stroke="#dc3912" 
//                       strokeWidth={2}
//                       dot={{ r: 3 }}
//                       activeDot={{ r: 6 }}
//                     />
//                   </LineChart>
//                 </ResponsiveContainer>
//               </div>
              
//               <div className="label-legend">
//                 <div className="legend-title">Cognitive State Scale:</div>
//                 <div className="legend-items">
//                   <div className="legend-item">
//                     <div className="legend-color" style={{backgroundColor: '#ff6b6b'}}></div>
//                     <span>1 = Very Low / Distracted</span>
//                   </div>
//                   <div className="legend-item">
//                     <div className="legend-color" style={{backgroundColor: '#ffd166'}}></div>
//                     <span>2 = Low / Neutral</span>
//                   </div>
//                   <div className="legend-item">
//                     <div className="legend-color" style={{backgroundColor: '#06d6a0'}}></div>
//                     <span>3 = Medium / Relaxed</span>
//                   </div>
//                   <div className="legend-item">
//                     <div className="legend-color" style={{backgroundColor: '#118ab2'}}></div>
//                     <span>4 = High / Focused</span>
//                   </div>
//                   <div className="legend-item">
//                     <div className="legend-color" style={{backgroundColor: '#8338ec'}}></div>
//                     <span>5 = Very High</span>
//                   </div>
//                 </div>
//               </div>
//             </section>
//           )}

//           {/* 2. EEG COGNITIVE STATE ANALYSIS TABLE */}
//           {eegAnalysis.labelDistribution && (
//             <section className="eeg-analysis-section">
//               <h3>EEG Cognitive State Analysis</h3>
//               <div className="analysis-description">
//                 <p>Distribution of cognitive states detected during each session.</p>
//                 <div className="data-summary">
//                   <span>Session 1: {eegAnalysis.labelDistribution.totalSession1} data points</span>
//                   <span>Session 2: {eegAnalysis.labelDistribution.totalSession2} data points</span>
//                 </div>
//               </div>
              
//               <div className="table-container">
//                 <table className="data-table">
//                   <thead>
//                     <tr>
//                       <th>Cognitive State</th>
//                       <th>Session 1 Count</th>
//                       <th>Session 1 %</th>
//                       <th>Session 2 Count</th>
//                       <th>Session 2 %</th>
//                       <th>Comparison</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {['Very High', 'High', 'Medium', 'Low', 'Very Low'].map((label) => {
//                       const row = eegAnalysis.labelDistribution.tableData.find(r => r.label === label) || {
//                         label,
//                         session1Count: 0,
//                         session2Count: 0,
//                         session1Percentage: '0.0',
//                         session2Percentage: '0.0'
//                       };
                      
//                       // Highlight Very High and Very Low rows
//                       const isVeryHigh = label === 'Very High';
//                       const isVeryLow = label === 'Very Low';
//                       const rowClass = isVeryHigh ? 'very-high-row' : isVeryLow ? 'very-low-row' : '';
                      
//                       return (
//                         <tr key={label} className={rowClass}>
//                           <td>
//                             <strong>{row.label}</strong>
//                             {(isVeryHigh || isVeryLow) && (
//                               <span className="label-badge">
//                                 {isVeryHigh ? '⭐' : '⚠️'}
//                               </span>
//                             )}
//                           </td>
//                           <td>{row.session1Count}</td>
//                           <td>{row.session1Percentage}%</td>
//                           <td>{row.session2Count}</td>
//                           <td>{row.session2Percentage}%</td>
//                           <td className={`comparison-indicator ${
//                             parseFloat(row.session1Percentage) > parseFloat(row.session2Percentage) ? 'higher' :
//                             parseFloat(row.session1Percentage) < parseFloat(row.session2Percentage) ? 'lower' : 'equal'
//                           }`}>
//                             {parseFloat(row.session1Percentage) > parseFloat(row.session2Percentage) ? '↑' :
//                              parseFloat(row.session1Percentage) < parseFloat(row.session2Percentage) ? '↓' : '='}
//                             <span className="difference-text">
//                               {Math.abs(parseFloat(row.session1Percentage) - parseFloat(row.session2Percentage)).toFixed(1)}%
//                             </span>
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
              
//               {/* Visual Chart for Label Distribution */}
//               <div className="chart-container">
//                 <h4>Cognitive State Distribution Comparison</h4>
//                 <ResponsiveContainer width="100%" height={300}>
//                   <BarChart data={['Very High', 'High', 'Medium', 'Low', 'Very Low'].map(label => {
//                     const row = eegAnalysis.labelDistribution.tableData.find(r => r.label === label) || {
//                       label,
//                       session1: 0,
//                       session2: 0
//                     };
//                     return row;
//                   })}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="label" />
//                     <YAxis />
//                     <Tooltip />
//                     <Legend />
//                     <Bar dataKey="session1" fill="#3366cc" name="Session 1" />
//                     <Bar dataKey="session2" fill="#dc3912" name="Session 2" />
//                   </BarChart>
//                 </ResponsiveContainer>
//               </div>
              
//               {/* Add summary insights */}
//               <div className="eeg-summary-insights">
//                 <h4>Key Insights from Cognitive States:</h4>
//                 <div className="insight-grid">
//                   {['Very High', 'High', 'Medium', 'Low', 'Very Low'].map((label) => {
//                     const row = eegAnalysis.labelDistribution.tableData.find(r => r.label === label) || {
//                       label,
//                       session1Percentage: '0.0',
//                       session2Percentage: '0.0'
//                     };
                    
//                     let icon = '';
//                     if (label === 'Very High') icon = '⭐';
//                     else if (label === 'High') icon = '🚀';
//                     else if (label === 'Medium') icon = '⚖️';
//                     else if (label === 'Low') icon = '📉';
//                     else if (label === 'Very Low') icon = '⚠️';
                    
//                     return (
//                       <div key={label} className="insight-item">
//                         <span className="insight-icon">{icon}</span>
//                         <span>
//                           <strong>{label}:</strong> 
//                           Session 1: {row.session1Percentage}%, Session 2: {row.session2Percentage}%
//                         </span>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             </section>
//           )}

//           {/* 3. BRAINWAVE FREQUENCY ANALYSIS */}
//           {eegAnalysis.brainwaveComparison && (
//             <section className="eeg-analysis-section">
//               <h3>Brainwave Frequency Analysis</h3>
//               <div className="analysis-description">
//                 <p>Average brainwave frequencies (μV) detected during each session.</p>
//               </div>
              
//               <div className="table-container">
//                 <table className="data-table">
//                   <thead>
//                     <tr>
//                       <th>Brainwave Band</th>
//                       <th>Session 1 Average (μV)</th>
//                       <th>Session 1 Range</th>
//                       <th>Session 2 Average (μV)</th>
//                       <th>Session 2 Range</th>
//                       <th>Difference</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {eegAnalysis.brainwaveComparison.tableData.map((row, index) => (
//                       <tr key={index}>
//                         <td><strong>{row.band}</strong></td>
//                         <td>{row.session1Avg}</td>
//                         <td>{row.session1Range}</td>
//                         <td>{row.session2Avg}</td>
//                         <td>{row.session2Range}</td>
//                         <td className={`difference-indicator ${
//                           row.session1Avg !== 'N/A' && row.session2Avg !== 'N/A' 
//                             ? parseFloat(row.session1Avg) > parseFloat(row.session2Avg) ? 'higher' :
//                               parseFloat(row.session1Avg) < parseFloat(row.session2Avg) ? 'lower' : 'neutral'
//                             : 'neutral'
//                         }`}>
//                           {row.session1Avg !== 'N/A' && row.session2Avg !== 'N/A' 
//                             ? `${(parseFloat(row.session1Avg) - parseFloat(row.session2Avg)).toFixed(2)}`
//                             : 'N/A'}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
              
//               {/* Brainwave Guide */}
//               <div className="brainwave-guide">
//                 <h4>Brainwave Frequency Meanings:</h4>
//                 <div className="guide-grid">
//                   <div className="guide-item">
//                     <strong>Delta (0.5-4 Hz):</strong> Deep sleep, unconscious processing
//                   </div>
//                   <div className="guide-item">
//                     <strong>Theta (4-8 Hz):</strong> Drowsiness, meditation, creativity
//                   </div>
//                   <div className="guide-item">
//                     <strong>Alpha (8-13 Hz):</strong> Relaxed, calm, reflective state
//                   </div>
//                   <div className="guide-item">
//                     <strong>Beta (13-30 Hz):</strong> Alert, focused, active thinking
//                   </div>
//                   <div className="guide-item">
//                     <strong>Gamma (30-100 Hz):</strong> High-level processing, insight
//                   </div>
//                 </div>
//               </div>
              
//               {/* Visual Chart */}
//               <div className="chart-container">
//                 <h4>Average Brainwave Comparison</h4>
//                 <ResponsiveContainer width="100%" height={300}>
//                   <BarChart data={eegAnalysis.brainwaveComparison.chartData}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="band" />
//                     <YAxis label={{ value: 'Average (μV)', angle: -90, position: 'insideLeft' }} />
//                     <Tooltip />
//                     <Legend />
//                     <Bar dataKey="session1" fill="#3366cc" name="Session 1" />
//                     <Bar dataKey="session2" fill="#dc3912" name="Session 2" />
//                   </BarChart>
//                 </ResponsiveContainer>
//               </div>
//             </section>
//           )}

//           {/* 4. BRAINWAVE COMPARISON CHART (Existing) */}
//           {brainwaveChartData.length > 0 && (
//             <section className="eeg-comparison-section">
//               <h3>Brainwave Frequency Comparison</h3>
//               <p className="section-description">
//                 Bar chart comparing average brainwave frequencies between sessions.
//               </p>
              
//               <div className="chart-container">
//                 <ResponsiveContainer width="100%" height={350}>
//                   <BarChart data={brainwaveChartData}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="band" />
//                     <YAxis label={{ value: 'Average Value (μV)', angle: -90, position: 'insideLeft' }} />
//                     <Tooltip content={<BrainwaveTooltip />} />
//                     <Legend />
//                     <Bar dataKey="session1" fill="#3366cc" name="Session 1" />
//                     <Bar dataKey="session2" fill="#dc3912" name="Session 2" />
//                   </BarChart>
//                 </ResponsiveContainer>
//               </div>
//             </section>
//           )}

//           {/* EEG Brainwave Time Series Section (Individual Session) */}
//           {brainwaveTrendData.length > 0 && (
//             <section className="eeg-time-series-section">
//               <h3>EEG Brainwave Activity - Session {selectedEEGSession === 'session1' ? '1' : '2'}</h3>
//               <p className="section-description">
//                 Shows brainwave activity throughout the session ({brainwaveTrendData.length} data points)
//               </p>
              
//               {/* Brainwave Statistics */}
//               {brainwaveStats && (
//                 <div className="brainwave-stats">
//                   <h4>Brainwave Statistics (μV)</h4>
//                   <div className="stats-grid">
//                     {Object.entries(brainwaveStats).map(([band, stats]) => (
//                       <div key={band} className="stat-card">
//                         <div className="stat-header">
//                           <span className="stat-band">{band.charAt(0).toUpperCase() + band.slice(1)}</span>
//                           <span className="stat-range">{stats.min.toFixed(1)} - {stats.max.toFixed(1)}</span>
//                         </div>
//                         <div className="stat-value">{stats.average.toFixed(2)} μV</div>
//                         <div className="stat-label">Average</div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
              
//               {/* Multi-line chart for brainwaves */}
//               <div className="chart-container">
//                 <h4>Brainwave Activity Over Time</h4>
//                 <ResponsiveContainer width="100%" height={400}>
//                   <LineChart data={brainwaveTrendData}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis 
//                       dataKey="timestamp" 
//                       label={{ value: 'Time (min:sec)', position: 'insideBottom', offset: -5 }}
//                       interval="preserveStartEnd"
//                     />
//                     <YAxis label={{ value: 'Amplitude (μV)', angle: -90, position: 'insideLeft' }} />
//                     <Tooltip content={<BrainwaveTimeSeriesTooltip />} />
//                     <Legend />
//                     <Line 
//                       type="monotone" 
//                       dataKey="delta" 
//                       stroke="#8884d8" 
//                       strokeWidth={2}
//                       dot={false}
//                       name="Delta (0.5-4Hz)"
//                     />
//                     <Line 
//                       type="monotone" 
//                       dataKey="theta" 
//                       stroke="#82ca9d" 
//                       strokeWidth={2}
//                       dot={false}
//                       name="Theta (4-8Hz)"
//                     />
//                     <Line 
//                       type="monotone" 
//                       dataKey="alpha" 
//                       stroke="#ffc658" 
//                       strokeWidth={2}
//                       dot={false}
//                       name="Alpha (8-13Hz)"
//                     />
//                     <Line 
//                       type="monotone" 
//                       dataKey="beta" 
//                       stroke="#ff8042" 
//                       strokeWidth={2}
//                       dot={false}
//                       name="Beta (13-30Hz)"
//                     />
//                     <Line 
//                       type="monotone" 
//                       dataKey="gamma" 
//                       stroke="#0088fe" 
//                       strokeWidth={2}
//                       dot={false}
//                       name="Gamma (30-100Hz)"
//                     />
//                   </LineChart>
//                 </ResponsiveContainer>
//               </div>
//             </section>
//           )}

//           {/* Ratings Comparison */}
//           <section className="ratings-section">
//             <h3>Admin Ratings Comparison</h3>
//             <div className="chart-container">
//               <ResponsiveContainer width="100%" height={300}>
//                 <BarChart data={ratingChartData}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="session" />
//                   <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
//                   <Tooltip />
//                   <Legend />
//                   <Bar dataKey="rating" fill="#4f46e5" name="Admin Rating" />
//                 </BarChart>
//               </ResponsiveContainer>
//             </div>
            
//             <div className="ratings-table">
//               <table>
//                 <thead>
//                   <tr>
//                     <th>Metric</th>
//                     <th>Session 1</th>
//                     <th>Session 2</th>
//                     <th>Difference</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   <tr>
//                     <td><strong>Admin Rating</strong></td>
//                     <td>
//                       {renderStars(comparisonData.ratingComparison.session1)}
//                       <div className="rating-value">{comparisonData.ratingComparison.session1}/5</div>
//                     </td>
//                     <td>
//                       {renderStars(comparisonData.ratingComparison.session2)}
//                       <div className="rating-value">{comparisonData.ratingComparison.session2}/5</div>
//                     </td>
//                     <td className={`difference ${comparisonData.ratingComparison.improvement ? 'positive' : 'negative'}`}>
//                       {comparisonData.ratingComparison.difference > 0 ? '+' : ''}
//                       {comparisonData.ratingComparison.difference.toFixed(1)}
//                     </td>
//                   </tr>
//                 </tbody>
//               </table>
//             </div>
//           </section>

//           {/* Admin Feedback */}
//           <section className="feedback-section">
//             <h3>Admin Feedback</h3>
//             <div className="feedback-grid">
//               <div className="feedback-card">
//                 <h4>Session 1 Feedback</h4>
//                 <div className="feedback-content">
//                   {comparisonData.session1.adminResponse.response || 'No feedback provided'}
//                   {comparisonData.session1.adminResponse.rating > 0 && (
//                     <div className="feedback-rating">
//                       Rating: {comparisonData.session1.adminResponse.rating}/5
//                     </div>
//                   )}
//                 </div>
//               </div>
              
//               <div className="feedback-card">
//                 <h4>Session 2 Feedback</h4>
//                 <div className="feedback-content">
//                   {comparisonData.session2.adminResponse.response || 'No feedback provided'}
//                   {comparisonData.session2.adminResponse.rating > 0 && (
//                     <div className="feedback-rating">
//                       Rating: {comparisonData.session2.adminResponse.rating}/5
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </section>

//           {/* Insights */}
//           <section className="insights-section">
//             <h3>Teaching Insights</h3>
//             <div className="insights-card">
//               <div className="insight-item">
//                 <div className="insight-icon">⭐</div>
//                 <div className="insight-content">
//                   <strong>Admin Rating:</strong> {comparisonData.ratingComparison.improvement 
//                     ? `Improved from ${comparisonData.ratingComparison.session1}/5 to ${comparisonData.ratingComparison.session2}/5`
//                     : comparisonData.ratingComparison.difference === 0 
//                       ? `Remained at ${comparisonData.ratingComparison.session1}/5`
//                       : `Declined from ${comparisonData.ratingComparison.session1}/5 to ${comparisonData.ratingComparison.session2}/5`}
//                 </div>
//               </div>
              
//               {labelTimeChartData.length > 0 && (
//                 <div className="insight-item">
//                   <div className="insight-icon">📊</div>
//                   <div className="insight-content">
//                     <strong>EEG Cognitive States:</strong> Compare cognitive engagement patterns in the charts above
//                   </div>
//                 </div>
//               )}
              
//               {eegAnalysis.labelDistribution && (
//                 <div className="insight-item">
//                   <div className="insight-icon">🧠</div>
//                   <div className="insight-content">
//                     <strong>Focus Analysis:</strong> Check Very High and Very Low focus percentages in the EEG analysis table
//                   </div>
//                 </div>
//               )}
              
//               {brainwaveChartData.length > 0 && (
//                 <div className="insight-item">
//                   <div className="insight-icon">⚡</div>
//                   <div className="insight-content">
//                     <strong>Brainwave Patterns:</strong> Check brainwave frequency comparison in the bar charts
//                   </div>
//                 </div>
//               )}
//             </div>
//           </section>
//         </div>
//       )}

//       {/* No EEG Data Warning */}
//       {comparisonData && comparisonData.session1.hasEEG === false && comparisonData.session2.hasEEG === false && (
//         <div className="eeg-warning">
//           <h4>⚠️ No EEG Data Available</h4>
//           <p>EEG data is not available for these sessions. Detailed brainwave analysis cannot be performed.</p>
//           <p><strong>To enable EEG comparison:</strong> Ensure EEG recording was completed for both sessions.</p>
//         </div>
//       )}
//     </div>
//   );
// }

// export default TeacherCompareSessionsPage;


import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './TeacherCompareSessions.css';

function TeacherCompareSessionsPage() {
  const { teacherId: paramTeacherId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const teacherId = paramTeacherId || location.state?.teacher_id || location.state?.teacherId;
  
  const [teacherInfo, setTeacherInfo] = useState({ name: '' });
  const [availableSessions, setAvailableSessions] = useState([]);
  const [selectedSession1, setSelectedSession1] = useState('');
  const [selectedSession2, setSelectedSession2] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [error, setError] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [eegChartData, setEegChartData] = useState([]);
  const [brainwaveChartData, setBrainwaveChartData] = useState([]);
  const [eegAnalysis, setEegAnalysis] = useState({
    labelDistribution: null,
    brainwaveComparison: null,
    hasEEG1: false,
    hasEEG2: false
  });

  // Fetch teacher data
  useEffect(() => {
    if (teacherId) {
      fetchTeacherData();
    } else {
      setError('Teacher ID is missing. Please navigate from the teachers list page.');
    }
  }, [teacherId]);

  // Fetch comparison data when sessions are selected
  useEffect(() => {
    if (selectedSession1 && selectedSession2 && selectedSession1 !== selectedSession2) {
      fetchComparisonData();
    }
  }, [selectedSession1, selectedSession2]);

  const fetchTeacherData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching teacher data:', teacherId);
      
      // 1. Fetch teacher details
      const teacherRes = await axios.get(`${API_BASE}/get_one_teacher/${teacherId}`);
      
      if (teacherRes.data.error) {
        throw new Error(teacherRes.data.error);
      }
      
      setTeacherInfo(teacherRes.data);
      
      // 2. Get teacher sessions with details
      const sessionsRes = await axios.get(`${API_BASE}/teacher_sessions_with_details/${teacherId}`);
      
      if (sessionsRes.data.error) {
        throw new Error(sessionsRes.data.error);
      }
      
      const enhancedSessions = sessionsRes.data.map(session => ({
        ...session,
        displayName: `${formatDate(session.date)} - ${session.student_name} (${session.course_name})`
      }));
      
      console.log('Teacher sessions:', enhancedSessions);
      setAvailableSessions(enhancedSessions);
      
      // Auto-select first two sessions if available
      if (enhancedSessions.length >= 2) {
        setSelectedSession1(enhancedSessions[0].session_id.toString());
        setSelectedSession2(enhancedSessions[1].session_id.toString());
      }
      
    } catch (err) {
      console.error('Error fetching teacher data:', err);
      setError(`Failed to load data: ${err.message || 'Check your connection'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparisonData = async () => {
    setLoadingComparison(true);
    setComparisonData(null);
    setEegChartData([]);
    setBrainwaveChartData([]);
    setEegAnalysis({
      labelDistribution: null,
      brainwaveComparison: null,
      hasEEG1: false,
      hasEEG2: false
    });
    
    try {
      console.log('Comparing sessions:', selectedSession1, selectedSession2);
      
      // Fetch data for both sessions in parallel
      const [session1Data, session2Data] = await Promise.all([
        fetchSessionDetails(selectedSession1),
        fetchSessionDetails(selectedSession2)
      ]);
      
      console.log('Session 1 data:', session1Data);
      console.log('Session 2 data:', session2Data);
      
      // Compare the sessions
      const comparison = compareSessions(session1Data, session2Data);
      setComparisonData(comparison);
      
      // Try to fetch and process EEG data if available
      if (session1Data.hasEEG || session2Data.hasEEG) {
        try {
          await fetchAndProcessEEGData(session1Data, session2Data);
        } catch (eegError) {
          console.log('Could not process EEG data:', eegError.message);
        }
      }
      
    } catch (err) {
      console.error('Error in comparison:', err);
      setError('Failed to compare sessions: ' + err.message);
    } finally {
      setLoadingComparison(false);
    }
  };

  const fetchSessionDetails = async (sessionId) => {
    try {
      console.log(`Fetching data for session ${sessionId}`);
      
      // 1. Get session details
      const sessionRes = await axios.get(`${API_BASE}/Sessions_by_sid/${sessionId}`);
      const sessionData = Array.isArray(sessionRes.data) ? sessionRes.data[0] : sessionRes.data;
      
      // 2. Get admin response
      let adminResponse = { rating: 0, response: 'No feedback provided' };
      try {
        const responseRes = await axios.get(`${API_BASE}/sessions/${sessionId}/check-response`);
        if (responseRes.data && responseRes.data.has_response) {
          adminResponse = responseRes.data;
        }
      } catch (err) {
        console.log('No admin response:', err.message);
      }
      
      // 3. Check EEG availability
      let hasEEG = false;
      try {
        const summaryRes = await axios.get(`${API_BASE}/api/session_summary/${sessionId}`);
        if (!summaryRes.data.error) {
          hasEEG = true;
        }
      } catch (err) {
        console.log('No EEG summary:', err.message);
      }
      
      return {
        sessionId,
        sessionData,
        adminResponse,
        hasEEG
      };
      
    } catch (err) {
      console.error(`Error fetching session details:`, err);
      throw new Error(`Failed to fetch session: ${err.message}`);
    }
  };

  const fetchAndProcessEEGData = async (session1Data, session2Data) => {
    try {
      // Fetch EEG data for both sessions in parallel
      const [eegData1, eegData2] = await Promise.all([
        session1Data.hasEEG ? fetchEEGDataForSession(session1Data.sessionId) : Promise.resolve(null),
        session2Data.hasEEG ? fetchEEGDataForSession(session2Data.sessionId) : Promise.resolve(null)
      ]);
      
      console.log('EEG Data 1:', eegData1);
      console.log('EEG Data 2:', eegData2);
      
      const hasEEG1 = eegData1 && !eegData1.error;
      const hasEEG2 = eegData2 && !eegData2.error;
      
      if (hasEEG1 || hasEEG2) {
        // Process for Label vs Time chart
        processLabelChartData(eegData1, eegData2);
        
        // Process for Brainwave comparison chart
        processBrainwaveChartData(eegData1, eegData2);
        
        // Analyze EEG data
        const labelDistribution = analyzeLabelDistribution(eegData1, eegData2);
        const brainwaveComparison = analyzeBrainwaveData(eegData1, eegData2);
        
        setEegAnalysis({
          labelDistribution,
          brainwaveComparison,
          hasEEG1,
          hasEEG2
        });
      }
      
    } catch (error) {
      console.error('Error fetching EEG data:', error);
    }
  };

  const fetchEEGDataForSession = async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE}/api/eeg-data/${sessionId}`);
      
      if (response.data.error) {
        return { error: response.data.error };
      }
      
      return response.data;
      
    } catch (err) {
      console.error(`Error fetching EEG data for session ${sessionId}:`, err);
      return { error: err.message };
    }
  };

  // Helper function to find columns
  const findColumn = (data, possibleNames) => {
    if (!data || data.length === 0) return null;
    
    const firstRow = data[0];
    for (const name of possibleNames) {
      if (firstRow.hasOwnProperty(name)) {
        return name;
      }
    }
    return null;
  };

  // Process EEG data for Label vs Time chart
  const processLabelChartData = (eegData1, eegData2) => {
    try {
      // Extract Time and Label data from EEG
      const extractLabelData = (eegData, sessionName) => {
        if (!eegData) return [];
        
        let dataPoints = [];
        
        // Handle CSV data structure
        if (eegData.data && Array.isArray(eegData.data)) {
          const csvData = eegData.data;
          
          // Find Time and Label columns (case-insensitive)
          const timeColumn = findColumn(csvData, ['Time', 'time', 'Timestamp', 'timestamp']);
          const labelColumn = findColumn(csvData, ['Label', 'label', 'Prediction', 'prediction', 'Cognitive_State', 'cognitive_state', 'Cognitive State']);
          
          console.log(`Label chart - Time column: ${timeColumn}, Label column: ${labelColumn}`);
          
          if (timeColumn && labelColumn) {
            // Take a sample of data points for performance
            const sampleSize = Math.min(csvData.length, 100);
            const step = Math.max(1, Math.floor(csvData.length / sampleSize));
            
            for (let i = 0; i < csvData.length; i += step) {
              const row = csvData[i];
              const time = row[timeColumn];
              const label = row[labelColumn];
              
              if (time !== undefined && label !== undefined) {
                const labelInfo = mapLabelToValueAndText(label);
                dataPoints.push({
                  time: formatTimeDisplay(time),
                  timeRaw: time,
                  label: labelInfo.text,
                  labelValue: labelInfo.value,
                  session: sessionName,
                  index: i
                });
              }
            }
          }
        }
        
        return dataPoints;
      };
      
      const data1 = extractLabelData(eegData1, 'Session 1');
      const data2 = extractLabelData(eegData2, 'Session 2');
      
      console.log('Label data 1:', data1.length, 'points');
      console.log('Label data 2:', data2.length, 'points');
      
      if (data1.length === 0 || data2.length === 0) {
        console.log('Not enough label data for chart');
        return;
      }
      
      // Combine data for comparison chart
      const combinedData = [];
      const maxPoints = Math.min(data1.length, data2.length, 50);
      
      for (let i = 0; i < maxPoints; i++) {
        const point1 = data1[i];
        const point2 = data2[i];
        
        if (point1 && point2) {
          combinedData.push({
            time: point1.time,
            session1Label: point1.label,
            session1Value: point1.labelValue,
            session2Label: point2.label,
            session2Value: point2.labelValue,
            // For dual line display
            session1Line: point1.labelValue,
            session2Line: point2.labelValue
          });
        }
      }
      
      console.log('Combined chart data:', combinedData.length, 'points');
      setEegChartData(combinedData);
      
    } catch (error) {
      console.error('Error processing label chart data:', error);
    }
  };

  // Process EEG data for Brainwave comparison chart
  const processBrainwaveChartData = (eegData1, eegData2) => {
    try {
      // Extract brainwave frequencies
      const extractBrainwaveData = (eegData, sessionName) => {
        const brainwaves = {
          delta: { sum: 0, count: 0 },
          theta: { sum: 0, count: 0 },
          alpha: { sum: 0, count: 0 },
          beta: { sum: 0, count: 0 },
          gamma: { sum: 0, count: 0 }
        };
        
        if (!eegData || !eegData.data || !Array.isArray(eegData.data)) {
          console.log('No EEG data available for brainwave extraction');
          return brainwaves;
        }
        
        const csvData = eegData.data;
        
        // Find brainwave columns
        const deltaCol = findColumn(csvData, ['Delta', 'delta']);
        const thetaCol = findColumn(csvData, ['Theta', 'theta']);
        const alphaCol = findColumn(csvData, ['Alpha', 'alpha']);
        const betaCol = findColumn(csvData, ['Beta', 'beta']);
        const gammaCol = findColumn(csvData, ['Gamma', 'gamma']);
        
        console.log('Brainwave columns found:', { deltaCol, thetaCol, alphaCol, betaCol, gammaCol });
        
        // Sample data for performance
        const sampleSize = Math.min(csvData.length, 100);
        const step = Math.max(1, Math.floor(csvData.length / sampleSize));
        
        for (let i = 0; i < csvData.length; i += step) {
          const row = csvData[i];
          
          if (deltaCol && row[deltaCol]) {
            brainwaves.delta.sum += parseFloat(row[deltaCol]) || 0;
            brainwaves.delta.count++;
          }
          if (thetaCol && row[thetaCol]) {
            brainwaves.theta.sum += parseFloat(row[thetaCol]) || 0;
            brainwaves.theta.count++;
          }
          if (alphaCol && row[alphaCol]) {
            brainwaves.alpha.sum += parseFloat(row[alphaCol]) || 0;
            brainwaves.alpha.count++;
          }
          if (betaCol && row[betaCol]) {
            brainwaves.beta.sum += parseFloat(row[betaCol]) || 0;
            brainwaves.beta.count++;
          }
          if (gammaCol && row[gammaCol]) {
            brainwaves.gamma.sum += parseFloat(row[gammaCol]) || 0;
            brainwaves.gamma.count++;
          }
        }
        
        return {
          delta: brainwaves.delta.count > 0 ? brainwaves.delta.sum / brainwaves.delta.count : 0,
          theta: brainwaves.theta.count > 0 ? brainwaves.theta.sum / brainwaves.theta.count : 0,
          alpha: brainwaves.alpha.count > 0 ? brainwaves.alpha.sum / brainwaves.alpha.count : 0,
          beta: brainwaves.beta.count > 0 ? brainwaves.beta.sum / brainwaves.beta.count : 0,
          gamma: brainwaves.gamma.count > 0 ? brainwaves.gamma.sum / brainwaves.gamma.count : 0
        };
      };
      
      const brainwaves1 = extractBrainwaveData(eegData1, 'Session 1');
      const brainwaves2 = extractBrainwaveData(eegData2, 'Session 2');
      
      // Create chart data
      const chartData = [
        { band: 'Delta', session1: brainwaves1.delta, session2: brainwaves2.delta },
        { band: 'Theta', session1: brainwaves1.theta, session2: brainwaves2.theta },
        { band: 'Alpha', session1: brainwaves1.alpha, session2: brainwaves2.alpha },
        { band: 'Beta', session1: brainwaves1.beta, session2: brainwaves2.beta },
        { band: 'Gamma', session1: brainwaves1.gamma, session2: brainwaves2.gamma }
      ];
      
      console.log('Brainwave chart data:', chartData);
      setBrainwaveChartData(chartData);
      
    } catch (error) {
      console.error('Error processing brainwave chart data:', error);
    }
  };

  // Analyze label distribution
  const analyzeLabelDistribution = (eegData1, eegData2) => {
    try {
      const getLabelCounts = (eegData) => {
        if (!eegData || eegData.error || !eegData.data) return {};
        
        const labelColumn = findColumn(eegData.data, ['Label', 'label', 'Prediction', 'prediction', 'Cognitive_State', 'cognitive_state']);
        if (!labelColumn) return {};
        
        // Initialize all possible cognitive states
        const counts = {
          'Very High': 0,
          'High': 0,
          'Medium': 0,
          'Low': 0,
          'Very Low': 0
        };
        
        for (const row of eegData.data) {
          const label = row[labelColumn];
          if (label) {
            const normalizedLabel = normalizeLabel(label);
            if (counts.hasOwnProperty(normalizedLabel)) {
              counts[normalizedLabel] = (counts[normalizedLabel] || 0) + 1;
            }
          }
        }
        
        return counts;
      };
      
      const counts1 = getLabelCounts(eegData1);
      const counts2 = getLabelCounts(eegData2);
      
      // Always include all 5 cognitive states
      const allLabels = ['Very High', 'High', 'Medium', 'Low', 'Very Low'];
      
      const tableData = allLabels.map(label => ({
        label,
        session1Count: counts1[label] || 0,
        session2Count: counts2[label] || 0,
        session1Percentage: counts1[label] ? ((counts1[label] / (Object.values(counts1).reduce((a, b) => a + b, 0) || 1)) * 100).toFixed(1) : '0.0',
        session2Percentage: counts2[label] ? ((counts2[label] / (Object.values(counts2).reduce((a, b) => a + b, 0) || 1)) * 100).toFixed(1) : '0.0'
      }));
      
      // Create chart data for visualization
      const chartData = allLabels.map(label => ({
        label,
        session1: counts1[label] || 0,
        session2: counts2[label] || 0
      }));
      
      return {
        tableData,
        chartData,
        totalSession1: Object.values(counts1).reduce((a, b) => a + b, 0),
        totalSession2: Object.values(counts2).reduce((a, b) => a + b, 0)
      };
      
    } catch (error) {
      console.error('Error analyzing label distribution:', error);
      return null;
    }
  };

  const normalizeLabel = (label) => {
    if (!label) return 'Medium';
    
    const labelStr = String(label).toLowerCase().trim();
    
    if (labelStr.includes('very high')) {
      return 'Very High';
    }
    if (labelStr.includes('very low') || labelStr.includes('distracted') || labelStr.includes('drowsy')) {
      return 'Very Low';
    }
    if (labelStr.includes('high') || labelStr.includes('focused') || labelStr.includes('alert') || labelStr.includes('concentrated')) {
      return 'High';
    }
    if (labelStr.includes('low') || labelStr.includes('neutral')) {
      return 'Low';
    }
    if (labelStr.includes('medium') || labelStr.includes('relaxed') || labelStr.includes('normal')) {
      return 'Medium';
    }
    
    return 'Medium';
  };

  const analyzeBrainwaveData = (eegData1, eegData2) => {
    try {
      const getBrainwaveAverages = (eegData) => {
        if (!eegData || eegData.error || !eegData.data) return null;
        
        const bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
        const result = {};
        
        bands.forEach(band => {
          const col = findColumn(eegData.data, [band, band.charAt(0).toUpperCase() + band.slice(1)]);
          if (col) {
            const values = eegData.data
              .map(row => parseFloat(row[col]))
              .filter(val => !isNaN(val));
            
            if (values.length > 0) {
              result[band] = {
                average: values.reduce((a, b) => a + b, 0) / values.length,
                max: Math.max(...values),
                min: Math.min(...values),
                count: values.length
              };
            }
          }
        });
        
        return result;
      };
      
      const averages1 = getBrainwaveAverages(eegData1);
      const averages2 = getBrainwaveAverages(eegData2);
      
      if (!averages1 && !averages2) return null;
      
      // Create table data
      const bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
      const tableData = bands.map(band => ({
        band: band.charAt(0).toUpperCase() + band.slice(1),
        session1Avg: averages1?.[band]?.average?.toFixed(2) || 'N/A',
        session2Avg: averages2?.[band]?.average?.toFixed(2) || 'N/A',
        session1Range: averages1?.[band] ? `${averages1[band].min.toFixed(1)}-${averages1[band].max.toFixed(1)}` : 'N/A',
        session2Range: averages2?.[band] ? `${averages2[band].min.toFixed(1)}-${averages2[band].max.toFixed(1)}` : 'N/A'
      }));
      
      // Create chart data
      const chartData = bands.map(band => ({
        band: band.charAt(0).toUpperCase() + band.slice(1),
        session1: averages1?.[band]?.average || 0,
        session2: averages2?.[band]?.average || 0
      }));
      
      return {
        tableData,
        chartData,
        hasData1: !!averages1,
        hasData2: !!averages2
      };
      
    } catch (error) {
      console.error('Error analyzing brainwave data:', error);
      return null;
    }
  };

  // Map label to numerical value and text
  const mapLabelToValueAndText = (label) => {
    const labelStr = String(label).toLowerCase().trim();
    
    if (labelStr.includes('very high')) {
      return { value: 5, text: 'Very High' };
    }
    if (labelStr.includes('very low') || labelStr.includes('distracted') || labelStr.includes('drowsy')) {
      return { value: 1, text: 'Very Low' };
    }
    if (labelStr.includes('high') || labelStr.includes('focused') || labelStr.includes('alert') || labelStr.includes('concentrated')) {
      return { value: 4, text: 'High' };
    }
    if (labelStr.includes('low') || labelStr.includes('neutral')) {
      return { value: 2, text: 'Low' };
    }
    if (labelStr.includes('medium') || labelStr.includes('relaxed') || labelStr.includes('normal')) {
      return { value: 3, text: 'Medium' };
    }
    
    return { value: 3, text: 'Medium' };
  };

  // Compare two sessions
  const compareSessions = (session1Data, session2Data) => {
    console.log('Comparing sessions data:', session1Data, session2Data);
    
    // Compare ratings
    const rating1 = session1Data.adminResponse?.rating || 0;
    const rating2 = session2Data.adminResponse?.rating || 0;
    const ratingComparison = {
      session1: rating1,
      session2: rating2,
      difference: rating2 - rating1,
      improvement: rating2 > rating1
    };
    
    // Compare responses
    const response1 = session1Data.adminResponse?.response || 'No feedback provided';
    const response2 = session2Data.adminResponse?.response || 'No feedback provided';
    
    // Generate insights
    const insights = generateInsights(ratingComparison);
    
    return {
      session1: session1Data,
      session2: session2Data,
      ratingComparison,
      responseComparison: { session1: response1, session2: response2 },
      insights
    };
  };

  // Generate insights
  const generateInsights = (ratingComparison) => {
    const insights = [];
    
    if (ratingComparison.improvement) {
      insights.push(`Rating improved from ${ratingComparison.session1}/5 to ${ratingComparison.session2}/5`);
    } else if (ratingComparison.difference < 0) {
      insights.push(`Rating decreased from ${ratingComparison.session1}/5 to ${ratingComparison.session2}/5`);
    } else if (ratingComparison.difference === 0) {
      insights.push(`Rating remained the same at ${ratingComparison.session1}/5`);
    }
    
    return insights;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format time for display
  const formatTimeDisplay = (time) => {
    if (typeof time === 'number') {
      if (time < 60) return `${time}s`;
      const minutes = Math.floor(time / 60);
      const seconds = time % 60;
      return `${minutes}m ${seconds}s`;
    }
    
    if (typeof time === 'string') {
      // Handle HH:MM:SS format
      if (time.includes(':')) {
        const parts = time.split(':').map(Number);
        if (parts.length === 3) {
          if (parts[0] > 0) return `${parts[0]}m ${parts[1]}s`;
          if (parts[1] > 0) return `${parts[1]}m ${parts[2]}s`;
          return `${parts[2]}s`;
        }
      }
      // Try to parse as number
      const numTime = parseFloat(time);
      if (!isNaN(numTime)) {
        return formatTimeDisplay(numTime);
      }
    }
    
    return String(time);
  };

  // Helper function to render stars
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'star-filled' : 'star-empty'}>
          ★
        </span>
      );
    }
    return <div className="stars-container">{stars}</div>;
  };

  // Custom tooltip for EEG label chart
  const LabelChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const session1Data = payload.find(p => p.dataKey === 'session1Line');
      const session2Data = payload.find(p => p.dataKey === 'session2Line');
      
      return (
        <div className="custom-tooltip">
          <p className="time-label"><strong>Time: {label}</strong></p>
          {session1Data && (
            <p style={{ color: session1Data.color }}>
              <strong>Session 1:</strong> {session1Data.payload.session1Label}
            </p>
          )}
          {session2Data && (
            <p style={{ color: session2Data.color }}>
              <strong>Session 2:</strong> {session2Data.payload.session2Label}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for brainwave chart
  const BrainwaveTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="band-label">Brainwave: {label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(4)} μV
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!teacherId) {
    return (
      <div className="error-container">
        <h2>Error: Teacher ID Required</h2>
        <p>Please navigate to this page from the Teachers List page.</p>
        <button 
          className="back-button"
          onClick={() => navigate('/View_teachers')}
        >
          Go to Teachers List
        </button>
      </div>
    );
  }

  return (
    <div className="teacher-comparison-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button 
            className="btn-back"
            onClick={() => navigate("/View_teachers")}
          >
            ← Back to Teachers
          </button>
          <h1 className="page-title">Teacher Session Comparison</h1>
        </div>
        <div className="header-info">
          <span className="teacher-name">Teacher: {teacherInfo.name || `ID: ${teacherId}`}</span>
          <span className="session-count">Sessions: {availableSessions.length}</span>
        </div>
      </div>

      {/* Session Selection */}
      <div className="session-selection-section">
        <div className="selection-card">
          <h3>Select Two Sessions to Compare</h3>
          
          {loading && <div className="loading-message">Loading teacher sessions...</div>}
          {error && <div className="error-message">{error}</div>}
          
          <div className="selection-fields">
            <div className="select-group">
              <label>First Session:</label>
              <select
                value={selectedSession1}
                onChange={(e) => setSelectedSession1(e.target.value)}
                disabled={loading || availableSessions.length === 0}
              >
                <option value="">-- Select Session --</option>
                {availableSessions.map(session => (
                  <option
                    key={session.session_id}
                    value={session.session_id}
                    disabled={session.session_id.toString() === selectedSession2}
                  >
                    {session.displayName} {session.has_eeg ? '📊' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="vs-text">VS</div>

            <div className="select-group">
              <label>Second Session:</label>
              <select
                value={selectedSession2}
                onChange={(e) => setSelectedSession2(e.target.value)}
                disabled={loading || availableSessions.length === 0}
              >
                <option value="">-- Select Session --</option>
                {availableSessions.map(session => (
                  <option
                    key={session.session_id}
                    value={session.session_id}
                    disabled={session.session_id.toString() === selectedSession1}
                  >
                    {session.displayName} {session.has_eeg ? '📊' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {availableSessions.length < 2 && !loading && (
            <div className="warning">
              Need at least 2 sessions to compare...
            </div>
          )}

          {selectedSession1 === selectedSession2 && selectedSession1 && (
            <div className="error-message">
              Please select two different sessions for comparison
            </div>
          )}
        </div>
      </div>

      {/* Loading Comparison */}
      {loadingComparison && (
        <div className="loading-comparison">
          <div className="loading-spinner"></div>
          <p>Loading comparison data...</p>
        </div>
      )}

      {/* Comparison Results */}
      {comparisonData && !loadingComparison && (
        <div className="comparison-results">
          {/* Session Details */}
          <div className="comparison-section">
            <h3>Session Details</h3>
            <div className="session-details-comparison">
              <div className="session-detail-card">
                <h4>Session 1 Details</h4>
                <p><strong>Date:</strong> {formatDate(comparisonData.session1.sessionData.date)}</p>
                <p><strong>Student:</strong> {comparisonData.session1.sessionData.student_name}</p>
                <p><strong>Course:</strong> {comparisonData.session1.sessionData.course_name}</p>
                <p><strong>Venue:</strong> {comparisonData.session1.sessionData.venue}</p>
                <p><strong>Time:</strong> {comparisonData.session1.sessionData.start_time} - {comparisonData.session1.sessionData.end_time}</p>
                <p><strong>EEG Data:</strong> {comparisonData.session1.hasEEG ? 'Available ✓' : 'Not available ✗'}</p>
              </div>
              
              <div className="session-detail-card">
                <h4>Session 2 Details</h4>
                <p><strong>Date:</strong> {formatDate(comparisonData.session2.sessionData.date)}</p>
                <p><strong>Student:</strong> {comparisonData.session2.sessionData.student_name}</p>
                <p><strong>Course:</strong> {comparisonData.session2.sessionData.course_name}</p>
                <p><strong>Venue:</strong> {comparisonData.session2.sessionData.venue}</p>
                <p><strong>Time:</strong> {comparisonData.session2.sessionData.start_time} - {comparisonData.session2.sessionData.end_time}</p>
                <p><strong>EEG Data:</strong> {comparisonData.session2.hasEEG ? 'Available ✓' : 'Not available ✗'}</p>
              </div>
            </div>
          </div>

          {/* Rating Comparison */}
          <div className="comparison-section">
            <h3>Admin Ratings & Feedback</h3>
            <div className="table-responsive">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Session 1</th>
                    <th>Session 2</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Admin Rating</strong></td>
                    <td>
                      <div className="stars">
                        {renderStars(comparisonData.ratingComparison.session1)}
                      </div>
                      <div className="rating-value">{comparisonData.ratingComparison.session1}/5</div>
                    </td>
                    <td>
                      <div className="stars">
                        {renderStars(comparisonData.ratingComparison.session2)}
                      </div>
                      <div className="rating-value">{comparisonData.ratingComparison.session2}/5</div>
                    </td>
                    <td className={`difference-cell ${comparisonData.ratingComparison.improvement ? 'positive' : 'negative'}`}>
                      {comparisonData.ratingComparison.difference > 0 ? '+' : ''}
                      {comparisonData.ratingComparison.difference.toFixed(1)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Responses */}
          <div className="comparison-section">
            <h3>Admin Feedback</h3>
            <div className="response-comparison-grid">
              <div className="response-card">
                <h4>Session 1 Feedback</h4>
                <div className="response-content">
                  {comparisonData.responseComparison.session1}
                </div>
              </div>
              
              <div className="response-card">
                <h4>Session 2 Feedback</h4>
                <div className="response-content">
                  {comparisonData.responseComparison.session2}
                </div>
              </div>
            </div>
          </div>

          {/* 1. EEG LABEL vs TIME CHART */}
          {eegChartData.length > 0 && (
            <div className="comparison-section">
              <h3>Cognitive States Comparison Over Time (Both Sessions)</h3>
              <p className="chart-description">
                Line chart showing how cognitive states change over time in both sessions on the same graph.
                Y-axis shows labels: Very Low (1), Low (2), Medium (3), High (4), Very High (5)
              </p>
              
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={eegChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      label={{ value: 'Cognitive State', angle: -90, position: 'insideLeft' }}
                      domain={[0.5, 5.5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tickFormatter={(value) => {
                        const labels = {
                          1: 'Very Low',
                          2: 'Low',
                          3: 'Medium',
                          4: 'High',
                          5: 'Very High'
                        };
                        return labels[value] || value;
                      }}
                    />
                    <Tooltip content={<LabelChartTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="session1Line" 
                      name="Session 1 Cognitive State" 
                      stroke="#3366cc" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="session2Line" 
                      name="Session 2 Cognitive State" 
                      stroke="#dc3912" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="label-legend">
                <div className="legend-title">Cognitive State Scale:</div>
                <div className="legend-items">
                  <div className="legend-item">
                    <div className="legend-color" style={{backgroundColor: '#ff6b6b'}}></div>
                    <span>1 = Very Low / Distracted</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{backgroundColor: '#ffd166'}}></div>
                    <span>2 = Low / Neutral</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{backgroundColor: '#06d6a0'}}></div>
                    <span>3 = Medium / Relaxed</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{backgroundColor: '#118ab2'}}></div>
                    <span>4 = High / Focused</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{backgroundColor: '#8338ec'}}></div>
                    <span>5 = Very High</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. EEG COGNITIVE STATE ANALYSIS TABLE */}
          {eegAnalysis.labelDistribution && (
            <div className="comparison-section">
              <h3>EEG Cognitive State Analysis</h3>
              <p className="chart-description">
                Distribution of cognitive states detected during each session.
              </p>
              
              <div className="data-summary">
                <span>Session 1: {eegAnalysis.labelDistribution.totalSession1} data points</span>
                <span>Session 2: {eegAnalysis.labelDistribution.totalSession2} data points</span>
              </div>
              
              <div className="table-responsive">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Cognitive State</th>
                      <th>Session 1 Count</th>
                      <th>Session 1 %</th>
                      <th>Session 2 Count</th>
                      <th>Session 2 %</th>
                      <th>Comparison</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Very High', 'High', 'Medium', 'Low', 'Very Low'].map((label) => {
                      const row = eegAnalysis.labelDistribution.tableData.find(r => r.label === label) || {
                        label,
                        session1Count: 0,
                        session2Count: 0,
                        session1Percentage: '0.0',
                        session2Percentage: '0.0'
                      };
                      
                      const isVeryHigh = label === 'Very High';
                      const isVeryLow = label === 'Very Low';
                      const rowClass = isVeryHigh ? 'very-high-row' : isVeryLow ? 'very-low-row' : '';
                      
                      return (
                        <tr key={label} className={rowClass}>
                          <td>
                            <strong>{row.label}</strong>
                            {(isVeryHigh || isVeryLow) && (
                              <span className="label-badge">
                                {isVeryHigh ? '⭐' : '⚠️'}
                              </span>
                            )}
                          </td>
                          <td>{row.session1Count}</td>
                          <td>{row.session1Percentage}%</td>
                          <td>{row.session2Count}</td>
                          <td>{row.session2Percentage}%</td>
                          <td className={`comparison-indicator ${
                            parseFloat(row.session1Percentage) > parseFloat(row.session2Percentage) ? 'higher' :
                            parseFloat(row.session1Percentage) < parseFloat(row.session2Percentage) ? 'lower' : 'equal'
                          }`}>
                            {parseFloat(row.session1Percentage) > parseFloat(row.session2Percentage) ? '↑' :
                             parseFloat(row.session1Percentage) < parseFloat(row.session2Percentage) ? '↓' : '='}
                            <span className="difference-text">
                              {Math.abs(parseFloat(row.session1Percentage) - parseFloat(row.session2Percentage)).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Visual Chart for Label Distribution */}
              <div className="chart-container">
                <h4>Cognitive State Distribution Comparison</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={['Very High', 'High', 'Medium', 'Low', 'Very Low'].map(label => {
                    const row = eegAnalysis.labelDistribution.tableData.find(r => r.label === label) || {
                      label,
                      session1: 0,
                      session2: 0
                    };
                    return row;
                  })}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="session1" fill="#3366cc" name="Session 1" />
                    <Bar dataKey="session2" fill="#dc3912" name="Session 2" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Insights */}
              <div className="eeg-summary-insights">
                <h4>Key Insights from Cognitive States:</h4>
                <div className="insight-grid">
                  {['Very High', 'High', 'Medium', 'Low', 'Very Low'].map((label) => {
                    const row = eegAnalysis.labelDistribution.tableData.find(r => r.label === label) || {
                      label,
                      session1Percentage: '0.0',
                      session2Percentage: '0.0'
                    };
                    
                    let icon = '';
                    if (label === 'Very High') icon = '⭐';
                    else if (label === 'High') icon = '🚀';
                    else if (label === 'Medium') icon = '⚖️';
                    else if (label === 'Low') icon = '📉';
                    else if (label === 'Very Low') icon = '⚠️';
                    
                    return (
                      <div key={label} className="insight-item">
                        <span className="insight-icon">{icon}</span>
                        <span>
                          <strong>{label}:</strong> 
                          Session 1: {row.session1Percentage}%, Session 2: {row.session2Percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3. BRAINWAVE FREQUENCY ANALYSIS */}
          {brainwaveChartData.length > 0 && (
            <div className="comparison-section">
              <h3>Brainwave Frequency Comparison</h3>
              <p className="chart-description">
                Bar chart comparing average brainwave frequencies between sessions.
              </p>
              
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={brainwaveChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="band" />
                    <YAxis label={{ value: 'Average Value (μV)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip content={<BrainwaveTooltip />} />
                    <Legend />
                    <Bar dataKey="session1" fill="#3366cc" name="Session 1" />
                    <Bar dataKey="session2" fill="#dc3912" name="Session 2" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="brainwave-guide">
                <h4>Brainwave Frequency Meanings:</h4>
                <div className="guide-grid">
                  <div className="guide-item">
                    <strong>Delta (0.5-4 Hz):</strong> Deep sleep, unconscious processing
                  </div>
                  <div className="guide-item">
                    <strong>Theta (4-8 Hz):</strong> Drowsiness, meditation, creativity
                  </div>
                  <div className="guide-item">
                    <strong>Alpha (8-13 Hz):</strong> Relaxed, calm, reflective state
                  </div>
                  <div className="guide-item">
                    <strong>Beta (13-30 Hz):</strong> Alert, focused, active thinking
                  </div>
                  <div className="guide-item">
                    <strong>Gamma (30-100 Hz):</strong> High-level processing, insight
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. BRAINWAVE ANALYSIS TABLE */}
          {eegAnalysis.brainwaveComparison && (
            <div className="comparison-section">
              <h3>Brainwave Frequency Analysis</h3>
              <p className="chart-description">
                Average brainwave frequencies (μV) detected during each session.
              </p>
              
              <div className="table-responsive">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Brainwave Band</th>
                      <th>Session 1 Average (μV)</th>
                      <th>Session 1 Range</th>
                      <th>Session 2 Average (μV)</th>
                      <th>Session 2 Range</th>
                      <th>Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eegAnalysis.brainwaveComparison.tableData.map((row, index) => (
                      <tr key={index}>
                        <td><strong>{row.band}</strong></td>
                        <td>{row.session1Avg}</td>
                        <td>{row.session1Range}</td>
                        <td>{row.session2Avg}</td>
                        <td>{row.session2Range}</td>
                        <td className={`difference-indicator ${
                          row.session1Avg !== 'N/A' && row.session2Avg !== 'N/A' 
                            ? parseFloat(row.session1Avg) > parseFloat(row.session2Avg) ? 'higher' :
                              parseFloat(row.session1Avg) < parseFloat(row.session2Avg) ? 'lower' : 'neutral'
                            : 'neutral'
                        }`}>
                          {row.session1Avg !== 'N/A' && row.session2Avg !== 'N/A' 
                            ? `${(parseFloat(row.session1Avg) - parseFloat(row.session2Avg)).toFixed(2)}`
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Insights */}
          {comparisonData.insights.length > 0 && (
            <div className="comparison-section">
              <h3>Teaching Insights</h3>
              <div className="insights-card">
                <ul className="insights-list">
                  {comparisonData.insights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                  {eegChartData.length > 0 && (
                    <li>EEG cognitive states comparison available in charts above</li>
                  )}
                  {eegAnalysis.labelDistribution && (
                    <li>Check Very High and Very Low focus percentages in EEG analysis table</li>
                  )}
                  {brainwaveChartData.length > 0 && (
                    <li>Brainwave frequency comparison available in charts above</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No EEG Data Warning */}
      {comparisonData && comparisonData.session1.hasEEG === false && comparisonData.session2.hasEEG === false && (
        <div className="comparison-section">
          <h3>EEG Data Status</h3>
          <div className="eeg-warning">
            <h4>⚠️ No EEG Data Available</h4>
            <p>EEG data is not available for these sessions. Detailed brainwave analysis cannot be performed.</p>
            <p><strong>To enable EEG comparison:</strong> Ensure EEG recording was completed for both sessions.</p>
          </div>
        </div>
      )}

      {/* No Sessions Selected */}
      {!loading && !loadingComparison && !comparisonData && (!selectedSession1 || !selectedSession2) && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>Select Two Sessions</h3>
          <p>Please select two different sessions from the dropdowns above to begin comparison.</p>
        </div>
      )}
    </div>
  );
}

export default TeacherCompareSessionsPage;