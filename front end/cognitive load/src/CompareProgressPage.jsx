import React, { useState, useEffect, useMemo } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CompareProgress.css';

function CompareProgressPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { studentId, studentName, section } = location.state || {};

  const [availableSessions, setAvailableSessions] = useState([]);
  const [selectedSession1, setSelectedSession1] = useState('');
  const [selectedSession2, setSelectedSession2] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [error, setError] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [labelStats, setLabelStats] = useState({ session1: [], session2: [] });
  const [brainwaveStats, setBrainwaveStats] = useState({ session1: [], session2: [] });
  const [cognitiveScores, setCognitiveScores] = useState({
    session1: 0,
    session2: 0,
    difference: 0,
    improvement: false
  });

  // Fetch student sessions
  useEffect(() => {
    const fetchSessions = async () => {
      if (!studentId) return;

      setLoading(true);
      setError(null);

      try {
        console.log('Fetching sessions for student:', studentId);
        const response = await axios.get(
          `${API_BASE}/Students_session/${studentId}`
        );

        console.log('Sessions response:', response.data);

        if (Array.isArray(response.data)) {
          setAvailableSessions(response.data);

          // Set default selections if we have at least 2 sessions
          if (response.data.length >= 2) {
            setSelectedSession1(response.data[0].session_id.toString());
            setSelectedSession2(response.data[1].session_id.toString());
          }
        } else {
          setError('Invalid sessions data received');
        }
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError(err.message || 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [studentId]);

  // Fetch comparison data when both sessions are selected
  useEffect(() => {
    const fetchComparison = async () => {
      if (!selectedSession1 || !selectedSession2 || selectedSession1 === selectedSession2) {
        return;
      }

      setLoadingComparison(true);
      setComparisonData(null);
      setLabelStats({ session1: [], session2: [] });
      setBrainwaveStats({ session1: [], session2: [] });
      setCognitiveScores({ session1: 0, session2: 0, difference: 0, improvement: false });

      try {
        console.log('Comparing sessions:', selectedSession1, selectedSession2);

        // Fetch data for both sessions in parallel
        const [session1Data, session2Data] = await Promise.all([
          fetchSessionData(selectedSession1),
          fetchSessionData(selectedSession2)
        ]);

        console.log('Session 1 full data:', session1Data);
        console.log('Session 2 full data:', session2Data);

        // Compare the data
        const comparison = compareSessions(session1Data, session2Data);
        setComparisonData(comparison);

        // Try to fetch and process EEG data if paths exist
        if (session1Data.eegFilePath && session2Data.eegFilePath &&
          session1Data.eegFilePath !== 'null' && session2Data.eegFilePath !== 'null') {
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

    fetchComparison();
  }, [selectedSession1, selectedSession2]);

  // Fetch all data for a single session
  const fetchSessionData = async (sessionId) => {
    try {
      console.log(`Fetching data for session ${sessionId}`);

      // 1. Get session details
      const sessionResponse = await axios.get(
        `${API_BASE}/Sessions_by_sid/${sessionId}`
      );

      // 2. Get session results (including EEG path) - USING THE NEW ENDPOINT
      let sessionResults = null;
      let eegFilePath = null;
      try {
        const resultsResponse = await axios.get(
          `${API_BASE}/teacher_session_results_by_sid/${sessionId}`
        );

        console.log(`Results for session ${sessionId}:`, resultsResponse.data);

        if (Array.isArray(resultsResponse.data) && resultsResponse.data.length > 0) {
          sessionResults = resultsResponse.data[0];
          eegFilePath = sessionResults.eeg_path;
        } else if (resultsResponse.data && !resultsResponse.data.error) {
          sessionResults = resultsResponse.data;
          eegFilePath = resultsResponse.data.eeg_path;
        }
      } catch (resultsError) {
        console.log(`No session results for session ${sessionId}:`, resultsError.message);
      }

      // 3. Get admin response/rating
      let adminResponse = null;
      try {
        const responseCheck = await axios.get(
          `${API_BASE}/sessions/${sessionId}/check-response`
        );
        adminResponse = responseCheck.data;
      } catch (respError) {
        console.log(`No admin response for session ${sessionId}:`, respError.message);
      }

      return {
        sessionId,
        sessionDetails: sessionResponse.data,
        sessionResults,
        adminResponse,
        eegFilePath
      };

    } catch (error) {
      console.error(`Error fetching data for session ${sessionId}:`, error);
      throw error;
    }
  };

  // Fetch and process EEG data
  const fetchAndProcessEEGData = async (session1Data, session2Data) => {
    try {
      // Fetch raw EEG data for both sessions
      const [eegData1, eegData2] = await Promise.all([
        fetchEEGDataFromPath(session1Data.eegFilePath, session1Data.sessionId),
        fetchEEGDataFromPath(session2Data.eegFilePath, session2Data.sessionId)
      ]);

      console.log('EEG Data 1:', eegData1);
      console.log('EEG Data 2:', eegData2);

      if (eegData1 && eegData2) {
        // Process label statistics
        processLabelStatistics(eegData1, eegData2);

        // Process brainwave statistics
        processBrainwaveStatistics(eegData1, eegData2);

        // Calculate cognitive scores
        calculateCognitiveScores(eegData1, eegData2);
      }
    } catch (error) {
      console.error('Error fetching EEG data:', error);
    }
  };

  // Fetch EEG data from file path
  const fetchEEGDataFromPath = async (filePath, sessionId) => {
    try {
      if (!filePath || filePath === 'null') {
        return null;
      }

      console.log(`Fetching EEG data for session ${sessionId}`);

      // Try the new endpoint first
      try {
        const response = await axios.get(
          `${API_BASE}/api/eeg-data/${sessionId}`,
          { timeout: 10000 }
        );

        if (response.data && response.data.data) {
          console.log(`Got EEG data for session ${sessionId}: ${response.data.row_count} rows`);
          return response.data;
        } else if (response.data.error) {
          console.log(`EEG data error: ${response.data.error}`);
          return null;
        }
      } catch (error) {
        console.log(`EEG endpoint failed: ${error.message}`);

        // Fallback to summary endpoint
        try {
          const summaryResponse = await axios.get(
            `${API_BASE}/api/session_summary/${sessionId}`,
            { timeout: 5000 }
          );

          if (summaryResponse.data && !summaryResponse.data.error) {
            console.log(`Got EEG summary for session ${sessionId}`);
            return summaryResponse.data;
          }
        } catch (summaryError) {
          console.log(`Summary endpoint also failed: ${summaryError.message}`);
        }
      }

      return null;

    } catch (error) {
      console.error(`Error fetching EEG data:`, error);
      return null;
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

  // Process label statistics
  const processLabelStatistics = (eegData1, eegData2) => {
    try {
      const getLabelStats = (eegData, sessionName) => {
        if (!eegData || !eegData.data || !Array.isArray(eegData.data)) {
          return [];
        }

        const csvData = eegData.data;
        const labelColumn = findColumn(csvData, ['Label', 'label', 'Prediction', 'prediction', 'Cognitive_State', 'cognitive_state']);

        if (!labelColumn) {
          console.log(`No label column found for ${sessionName}`);
          return [];
        }

        const labelCounts = {};
        let totalRows = 0;

        // Count occurrences of each label
        csvData.forEach(row => {
          const label = String(row[labelColumn]).toLowerCase().trim();
          if (label) {
            labelCounts[label] = (labelCounts[label] || 0) + 1;
            totalRows++;
          }
        });

        // Convert to array with percentages
        return Object.entries(labelCounts)
          .map(([label, count]) => ({
            label: label.charAt(0).toUpperCase() + label.slice(1),
            count,
            percentage: totalRows > 0 ? ((count / totalRows) * 100).toFixed(1) : 0
          }))
          .sort((a, b) => b.count - a.count); // Sort by count descending
      };

      const session1Labels = getLabelStats(eegData1, 'Session 1');
      const session2Labels = getLabelStats(eegData2, 'Session 2');

      console.log('Label stats session 1:', session1Labels);
      console.log('Label stats session 2:', session2Labels);

      setLabelStats({
        session1: session1Labels,
        session2: session2Labels
      });

    } catch (error) {
      console.error('Error processing label statistics:', error);
    }
  };

  // Process brainwave statistics
  const processBrainwaveStatistics = (eegData1, eegData2) => {
    try {
      const getBrainwaveStats = (eegData, sessionName) => {
        if (!eegData || !eegData.data || !Array.isArray(eegData.data)) {
          return [];
        }

        const csvData = eegData.data;

        // Find brainwave columns
        const brainwaveColumns = {
          delta: findColumn(csvData, ['Delta', 'delta']),
          theta: findColumn(csvData, ['Theta', 'theta']),
          alpha: findColumn(csvData, ['Alpha', 'alpha']),
          beta: findColumn(csvData, ['Beta', 'beta']),
          gamma: findColumn(csvData, ['Gamma', 'gamma'])
        };

        // Calculate statistics for each brainwave
        const stats = [];
        const brainwaveNames = ['Delta', 'Theta', 'Alpha', 'Beta', 'Gamma'];

        brainwaveNames.forEach(band => {
          const column = brainwaveColumns[band.toLowerCase()];
          if (column) {
            const values = csvData
              .map(row => parseFloat(row[column]))
              .filter(val => !isNaN(val));

            if (values.length > 0) {
              const sum = values.reduce((a, b) => a + b, 0);
              const avg = sum / values.length;
              const min = Math.min(...values);
              const max = Math.max(...values);

              stats.push({
                band,
                average: avg.toFixed(4),
                min: min.toFixed(4),
                max: max.toFixed(4),
                readings: values.length
              });
            }
          }
        });

        return stats;
      };

      const session1Waves = getBrainwaveStats(eegData1, 'Session 1');
      const session2Waves = getBrainwaveStats(eegData2, 'Session 2');

      console.log('Brainwave stats session 1:', session1Waves);
      console.log('Brainwave stats session 2:', session2Waves);

      setBrainwaveStats({
        session1: session1Waves,
        session2: session2Waves
      });

    } catch (error) {
      console.error('Error processing brainwave statistics:', error);
    }
  };

  // Calculate cognitive scores
  const calculateCognitiveScores = (eegData1, eegData2) => {
    try {
      const calculateScore = (eegData) => {
        if (!eegData || !eegData.data || !Array.isArray(eegData.data)) {
          return 0;
        }

        const csvData = eegData.data;
        const labelColumn = findColumn(csvData, ['Label', 'label', 'Prediction', 'prediction', 'Cognitive_State', 'cognitive_state']);

        if (!labelColumn) return 50; // Default score if no labels

        // Define label weights
        const labelWeights = {
          'distracted': 10,
          'drowsy': 15,
          'very low': 20,
          'low': 30,
          'neutral': 50,
          'medium': 60,
          'relaxed': 70,
          'alert': 80,
          'focused': 90,
          'high': 90,
          'concentrated': 95,
          'very high': 100
        };

        let totalWeight = 0;
        let totalCount = 0;

        csvData.forEach(row => {
          const label = String(row[labelColumn]).toLowerCase().trim();
          if (label && labelWeights[label]) {
            totalWeight += labelWeights[label];
            totalCount++;
          }
        });

        if (totalCount === 0) return 50;

        // Also consider brainwave data if available
        let brainwaveBonus = 0;
        const brainwaveColumns = {
          alpha: findColumn(csvData, ['Alpha', 'alpha']),
          beta: findColumn(csvData, ['Beta', 'beta'])
        };

        if (brainwaveColumns.alpha && brainwaveColumns.beta) {
          const alphaValues = csvData
            .map(row => parseFloat(row[brainwaveColumns.alpha]))
            .filter(val => !isNaN(val));
          const betaValues = csvData
            .map(row => parseFloat(row[brainwaveColumns.beta]))
            .filter(val => !isNaN(val));

          if (alphaValues.length > 0 && betaValues.length > 0) {
            const alphaAvg = alphaValues.reduce((a, b) => a + b, 0) / alphaValues.length;
            const betaAvg = betaValues.reduce((a, b) => a + b, 0) / betaValues.length;

            // Higher beta/alpha ratio indicates better focus (research-based)
            const ratio = betaAvg / alphaAvg;
            brainwaveBonus = Math.min(20, Math.max(0, (ratio - 0.5) * 10));
          }
        }

        const baseScore = totalWeight / totalCount;
        const finalScore = Math.min(100, Math.max(0, baseScore + brainwaveBonus));

        return Math.round(finalScore);
      };

      const score1 = calculateScore(eegData1);
      const score2 = calculateScore(eegData2);
      const difference = score2 - score1;

      console.log('Cognitive scores:', { score1, score2, difference });

      setCognitiveScores({
        session1: score1,
        session2: score2,
        difference,
        improvement: difference > 0
      });

    } catch (error) {
      console.error('Error calculating cognitive scores:', error);
    }
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
    const response1 = session1Data.adminResponse?.response || 'No response';
    const response2 = session2Data.adminResponse?.response || 'No response';

    // Check EEG file availability
    const hasEEG1 = !!session1Data.eegFilePath && session1Data.eegFilePath !== 'null';
    const hasEEG2 = !!session2Data.eegFilePath && session2Data.eegFilePath !== 'null';

    // Generate insights
    const insights = generateInsights(ratingComparison, hasEEG1, hasEEG2);

    return {
      session1: session1Data,
      session2: session2Data,
      ratingComparison,
      responseComparison: { session1: response1, session2: response2 },
      hasEEG1,
      hasEEG2,
      insights
    };
  };

  // Generate insights
  const generateInsights = (ratingComparison, hasEEG1, hasEEG2) => {
    const insights = [];

    if (ratingComparison.improvement) {
      insights.push(`Admin rating improved from ${ratingComparison.session1}/5 to ${ratingComparison.session2}/5`);
    } else if (ratingComparison.difference < 0) {
      insights.push(`Admin rating decreased from ${ratingComparison.session1}/5 to ${ratingComparison.session2}/5`);
    }

    if (cognitiveScores.improvement) {
      insights.push(`Cognitive score improved by ${cognitiveScores.difference} points`);
    } else if (cognitiveScores.difference < 0) {
      insights.push(`Cognitive score decreased by ${Math.abs(cognitiveScores.difference)} points`);
    }

    if (hasEEG2 && !hasEEG1) {
      insights.push('EEG data now available for analysis');
    }

    return insights;
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
    return stars;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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
  };

  if (!studentId) {
    return (
      <div className="error-page">
        <h2>Error</h2>
        <p>Student information is missing. Please go back and select a student.</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="compare-progress-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button
            className="btn-back"
            onClick={() => navigate("/View_sections")}
          >
            ← Back to Sections
          </button>
          <h1 className="page-title" style={{ marginLeft: 260 }}>Session Comparison</h1>
        </div>
        <div className="header-info">
          <span className="student-name" style={{ color: 'white' }}>Student: {studentName}</span>
          <span className="section" style={{ color: 'white' }}> Section: {section}</span>
        </div>
      </div>

      {/* Session Selection */}
      <div className="session-selection-section">
        <div className="selection-card">
          <h3>Select Sessions to Compare</h3>

          {loading && <div className="loading-message">Loading sessions...</div>}
          {error && <div className="error-message">{error}</div>}

          <div className="selection-fields">
            <div className="select-group">
              <label>Session 1:</label>
              <select
                value={selectedSession1}
                onChange={(e) => setSelectedSession1(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Select Session --</option>
                {availableSessions.map(session => (
                  <option
                    key={session.session_id}
                    value={session.session_id}
                    disabled={session.session_id.toString() === selectedSession2}
                  >
                    {formatDate(session.date)} - {session.venue}
                  </option>
                ))}
              </select>
            </div>

            <div className="vs-text">VS</div>

            <div className="select-group">
              <label>Session 2:</label>
              <select
                value={selectedSession2}
                onChange={(e) => setSelectedSession2(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Select Session --</option>
                {availableSessions.map(session => (
                  <option
                    key={session.session_id}
                    value={session.session_id}
                    disabled={session.session_id.toString() === selectedSession1}
                  >
                    {formatDate(session.date)} - {session.venue}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
                {comparisonData.session1.sessionDetails[0] && (
                  <>
                    <p><strong>Date:</strong> {formatDate(comparisonData.session1.sessionDetails[0].date)}</p>
                    <p><strong>Venue:</strong> {comparisonData.session1.sessionDetails[0].venue}</p>
                    <p><strong>Time:</strong> {comparisonData.session1.sessionDetails[0].start_time} - {comparisonData.session1.sessionDetails[0].end_time}</p>
                    <p><strong>EEG File:</strong> {comparisonData.hasEEG1 ? 'Available ✓' : 'Not available ✗'}</p>
                    {comparisonData.session1.sessionResults && (
                      <p><strong>Results ID:</strong> {comparisonData.session1.sessionResults.result_id}</p>
                    )}
                  </>
                )}
              </div>

              <div className="session-detail-card">
                <h4>Session 2 Details</h4>
                {comparisonData.session2.sessionDetails[0] && (
                  <>
                    <p><strong>Date:</strong> {formatDate(comparisonData.session2.sessionDetails[0].date)}</p>
                    <p><strong>Venue:</strong> {comparisonData.session2.sessionDetails[0].venue}</p>
                    <p><strong>Time:</strong> {comparisonData.session2.sessionDetails[0].start_time} - {comparisonData.session2.sessionDetails[0].end_time}</p>
                    <p><strong>EEG File:</strong> {comparisonData.hasEEG2 ? 'Available ✓' : 'Not available ✗'}</p>
                    {comparisonData.session2.sessionResults && (
                      <p><strong>Results ID:</strong> {comparisonData.session2.sessionResults.result_id}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Cognitive Scores Comparison */}
          {cognitiveScores.session1 > 0 && cognitiveScores.session2 > 0 && (
            <div className="comparison-section">
              <h3>Cognitive Scores Comparison</h3>
              <div className="table-responsive">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Session 1</th>
                      <th>Session 2</th>
                      <th>Difference</th>
                      <th>Interpretation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Cognitive Score</strong></td>
                      <td className="score-cell">{cognitiveScores.session1}/100</td>
                      <td className="score-cell">{cognitiveScores.session2}/100</td>
                      <td className={`difference-cell ${cognitiveScores.improvement ? 'positive' : 'negative'}`}>
                        {cognitiveScores.difference > 0 ? '+' : ''}
                        {cognitiveScores.difference}
                      </td>
                      <td>
                        {cognitiveScores.improvement ?
                          <span className="positive">Improvement ✓</span> :
                          <span className="negative">Decline ✗</span>
                        }
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Performance Level</strong></td>
                      <td>{getPerformanceLevel(cognitiveScores.session1)}</td>
                      <td>{getPerformanceLevel(cognitiveScores.session2)}</td>
                      <td colSpan="2">
                        {getPerformanceChange(cognitiveScores.session1, cognitiveScores.session2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="score-description">
                <p><strong>How cognitive score is calculated:</strong></p>
                <ul>
                  <li>Based on EEG cognitive state labels (distracted: 10, neutral: 50, focused: 90, etc.)</li>
                  <li>Considers Beta/Alpha brainwave ratio for focus assessment</li>
                  <li>Score range: 0-100 (higher is better)</li>
                  <li>90-100: Excellent focus, 70-89: Good focus, 50-69: Moderate, below 50: Needs improvement</li>
                </ul>
              </div>
            </div>
          )}

          {/* Label Statistics */}
          {labelStats.session1.length > 0 && labelStats.session2.length > 0 && (
            <div className="comparison-section">
              <h3>Cognitive State Distribution</h3>
              <p className="chart-description">
                Shows frequency and percentage of each cognitive state detected during the sessions.
              </p>

              <div className="stats-tables-container">
                <div className="stats-table-wrapper">
                  <h4>Session 1 - Cognitive States</h4>
                  <div className="table-responsive">
                    <table className="stats-table">
                      <thead>
                        <tr>
                          <th>Cognitive State</th>
                          <th>Count</th>
                          <th>Percentage</th>
                          <th>Score Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labelStats.session1.map((stat, index) => (
                          <tr key={index}>
                            <td>{stat.label}</td>
                            <td>{stat.count}</td>
                            <td>{stat.percentage}%</td>
                            <td>{getLabelWeight(stat.label)}</td>
                          </tr>
                        ))}
                        {labelStats.session1.length > 0 && (
                          <tr className="total-row">
                            <td><strong>Total</strong></td>
                            <td><strong>{labelStats.session1.reduce((sum, stat) => sum + stat.count, 0)}</strong></td>
                            <td><strong>100%</strong></td>
                            <td>-</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="stats-table-wrapper">
                  <h4>Session 2 - Cognitive States</h4>
                  <div className="table-responsive">
                    <table className="stats-table">
                      <thead>
                        <tr>
                          <th>Cognitive State</th>
                          <th>Count</th>
                          <th>Percentage</th>
                          <th>Score Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labelStats.session2.map((stat, index) => (
                          <tr key={index}>
                            <td>{stat.label}</td>
                            <td>{stat.count}</td>
                            <td>{stat.percentage}%</td>
                            <td>{getLabelWeight(stat.label)}</td>
                          </tr>
                        ))}
                        {labelStats.session2.length > 0 && (
                          <tr className="total-row">
                            <td><strong>Total</strong></td>
                            <td><strong>{labelStats.session2.reduce((sum, stat) => sum + stat.count, 0)}</strong></td>
                            <td><strong>100%</strong></td>
                            <td>-</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="label-analysis">
                <h4>Analysis:</h4>
                <ul>
                  {getLabelAnalysis(labelStats.session1, labelStats.session2)}
                </ul>
              </div>
            </div>
          )}

          {/* Brainwave Statistics */}
          {brainwaveStats.session1.length > 0 && brainwaveStats.session2.length > 0 && (
            <div className="comparison-section">
              <h3>Brainwave Frequency Analysis</h3>
              <p className="chart-description">
                Average values of different brainwave frequencies measured during the sessions.
              </p>

              <div className="stats-tables-container">
                <div className="stats-table-wrapper">
                  <h4>Session 1 - Brainwave Frequencies</h4>
                  <div className="table-responsive">
                    <table className="stats-table">
                      <thead>
                        <tr>
                          <th>Brainwave</th>
                          <th>Frequency Range</th>
                          <th>Average Value</th>
                          <th>Min</th>
                          <th>Max</th>
                          <th>Readings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brainwaveStats.session1.map((stat, index) => (
                          <tr key={index}>
                            <td><strong>{stat.band}</strong></td>
                            <td>{getFrequencyRange(stat.band)}</td>
                            <td>{stat.average}</td>
                            <td>{stat.min}</td>
                            <td>{stat.max}</td>
                            <td>{stat.readings}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="stats-table-wrapper">
                  <h4>Session 2 - Brainwave Frequencies</h4>
                  <div className="table-responsive">
                    <table className="stats-table">
                      <thead>
                        <tr>
                          <th>Brainwave</th>
                          <th>Frequency Range</th>
                          <th>Average Value</th>
                          <th>Min</th>
                          <th>Max</th>
                          <th>Readings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brainwaveStats.session2.map((stat, index) => (
                          <tr key={index}>
                            <td><strong>{stat.band}</strong></td>
                            <td>{getFrequencyRange(stat.band)}</td>
                            <td>{stat.average}</td>
                            <td>{stat.min}</td>
                            <td>{stat.max}</td>
                            <td>{stat.readings}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="brainwave-guide">
                <h4>Brainwave Interpretation:</h4>
                <div className="guide-grid">
                  <div className="guide-item">
                    <strong>Delta (0.5-4 Hz):</strong> Deep sleep, unconscious processing. Lower is better when awake.
                  </div>
                  <div className="guide-item">
                    <strong>Theta (4-8 Hz):</strong> Drowsiness, meditation, creativity. Moderate levels ideal.
                  </div>
                  <div className="guide-item">
                    <strong>Alpha (8-13 Hz):</strong> Relaxed, calm state. Good for retention.
                  </div>
                  <div className="guide-item">
                    <strong>Beta (13-30 Hz):</strong> Alert, focused, active thinking. Higher indicates focus.
                  </div>
                  <div className="guide-item">
                    <strong>Gamma (30-100 Hz):</strong> High-level processing, insight, learning.
                  </div>
                </div>
                <div className="brainwave-analysis">
                  <h5>Focus Indicator:</h5>
                  <p>Beta/Alpha Ratio: {calculateBetaAlphaRatio(brainwaveStats.session1, brainwaveStats.session2)}</p>
                  <p>Higher ratio (Beta ÷ Alpha) indicates better focus and attention.</p>
                </div>
              </div>
            </div>
          )}

          {/* Rating Comparison */}
          <div className="comparison-section">
            <h3>Admin Ratings & Responses</h3>
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
            <h3>Admin Responses</h3>
            <div className="response-comparison-grid">
              <div className="response-card">
                <h4>Session 1 Response</h4>
                <div className="response-content">
                  {comparisonData.responseComparison.session1}
                </div>
              </div>

              <div className="response-card">
                <h4>Session 2 Response</h4>
                <div className="response-content">
                  {comparisonData.responseComparison.session2}
                </div>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="summary-card">
            <h2>Comparison Summary</h2>
            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-label">Cognitive Score Change</div>
                <div className={`summary-value ${cognitiveScores.improvement ? 'positive' : 'negative'}`}>
                  {cognitiveScores.difference > 0 ? '+' : ''}{cognitiveScores.difference} points
                </div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Admin Rating Change</div>
                <div className={`summary-value ${comparisonData.ratingComparison.improvement ? 'positive' : 'negative'}`}>
                  {comparisonData.ratingComparison.difference > 0 ? '+' : ''}{comparisonData.ratingComparison.difference.toFixed(1)}
                </div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Overall Progress</div>
                <div className={`summary-value ${cognitiveScores.improvement ? 'positive' : 'negative'}`}>
                  {cognitiveScores.improvement ? 'Improving' : 'Declining'}
                </div>
              </div>
            </div>
          </div>

          {/* Insights */}
          {comparisonData.insights.length > 0 && (
            <div className="comparison-section">
              <h3>Key Insights</h3>
              <div className="insights-card">
                <ul className="insights-list">
                  {comparisonData.insights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                  {/* Add cognitive score insights */}
                  {cognitiveScores.session1 > 0 && cognitiveScores.session2 > 0 && (
                    <>
                      <li>Session 1 cognitive score: {cognitiveScores.session1}/100 ({getPerformanceLevel(cognitiveScores.session1)})</li>
                      <li>Session 2 cognitive score: {cognitiveScores.session2}/100 ({getPerformanceLevel(cognitiveScores.session2)})</li>
                      <li>Focus improvement: {calculateFocusImprovement(labelStats.session1, labelStats.session2)}</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}
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

// Helper functions
const getPerformanceLevel = (score) => {
  if (score >= 90) return 'Excellent Focus';
  if (score >= 70) return 'Good Focus';
  if (score >= 50) return 'Moderate Focus';
  return 'Needs Improvement';
};

const getPerformanceChange = (score1, score2) => {
  const diff = score2 - score1;
  if (diff > 20) return 'Significant improvement';
  if (diff > 10) return 'Moderate improvement';
  if (diff > 0) return 'Slight improvement';
  if (diff > -10) return 'Slight decline';
  if (diff > -20) return 'Moderate decline';
  return 'Significant decline';
};

const getLabelWeight = (label) => {
  const labelWeights = {
    'Distracted': 10,
    'Drowsy': 15,
    'Very Low': 20,
    'Low': 30,
    'Neutral': 50,
    'Medium': 60,
    'Relaxed': 70,
    'Alert': 80,
    'Focused': 90,
    'High': 90,
    'Concentrated': 95,
    'Very High': 100
  };

  return labelWeights[label] || 50;
};

const getLabelAnalysis = (stats1, stats2) => {
  const analysis = [];

  // Find focused states
  const focusedStates1 = stats1.filter(s => ['Focused', 'Concentrated', 'High', 'Very High'].includes(s.label));
  const focusedStates2 = stats2.filter(s => ['Focused', 'Concentrated', 'High', 'Very High'].includes(s.label));

  const focusedPercentage1 = focusedStates1.reduce((sum, s) => sum + parseFloat(s.percentage), 0);
  const focusedPercentage2 = focusedStates2.reduce((sum, s) => sum + parseFloat(s.percentage), 0);

  if (focusedPercentage2 > focusedPercentage1) {
    analysis.push(`Focused states increased from ${focusedPercentage1.toFixed(1)}% to ${focusedPercentage2.toFixed(1)}%`);
  } else if (focusedPercentage2 < focusedPercentage1) {
    analysis.push(`Focused states decreased from ${focusedPercentage1.toFixed(1)}% to ${focusedPercentage2.toFixed(1)}%`);
  }

  // Find distracted states
  const distractedStates1 = stats1.filter(s => ['Distracted', 'Drowsy', 'Very Low'].includes(s.label));
  const distractedStates2 = stats2.filter(s => ['Distracted', 'Drowsy', 'Very Low'].includes(s.label));

  const distractedPercentage1 = distractedStates1.reduce((sum, s) => sum + parseFloat(s.percentage), 0);
  const distractedPercentage2 = distractedStates2.reduce((sum, s) => sum + parseFloat(s.percentage), 0);

  if (distractedPercentage2 < distractedPercentage1) {
    analysis.push(`Distracted states reduced from ${distractedPercentage1.toFixed(1)}% to ${distractedPercentage2.toFixed(1)}%`);
  } else if (distractedPercentage2 > distractedPercentage1) {
    analysis.push(`Distracted states increased from ${distractedPercentage1.toFixed(1)}% to ${distractedPercentage2.toFixed(1)}%`);
  }

  return analysis.map((item, index) => <li key={index}>{item}</li>);
};

const getFrequencyRange = (band) => {
  const ranges = {
    'Delta': '0.5-4 Hz',
    'Theta': '4-8 Hz',
    'Alpha': '8-13 Hz',
    'Beta': '13-30 Hz',
    'Gamma': '30-100 Hz'
  };
  return ranges[band] || '-';
};

const calculateBetaAlphaRatio = (stats1, stats2) => {
  const getBeta = (stats) => stats.find(s => s.band === 'Beta')?.average || 0;
  const getAlpha = (stats) => stats.find(s => s.band === 'Alpha')?.average || 1;

  const ratio1 = parseFloat(getBeta(stats1)) / parseFloat(getAlpha(stats1));
  const ratio2 = parseFloat(getBeta(stats2)) / parseFloat(getAlpha(stats2));

  return `Session 1: ${ratio1.toFixed(2)}, Session 2: ${ratio2.toFixed(2)} (Change: ${((ratio2 - ratio1) / ratio1 * 100).toFixed(1)}%)`;
};

const calculateFocusImprovement = (stats1, stats2) => {
  const focusedStates = ['Focused', 'Concentrated', 'High', 'Very High'];

  const focused1 = stats1.filter(s => focusedStates.includes(s.label));
  const focused2 = stats2.filter(s => focusedStates.includes(s.label));

  const percentage1 = focused1.reduce((sum, s) => sum + parseFloat(s.percentage), 0);
  const percentage2 = focused2.reduce((sum, s) => sum + parseFloat(s.percentage), 0);

  const improvement = percentage2 - percentage1;

  if (improvement > 0) {
    return `Focused states increased by ${improvement.toFixed(1)}%`;
  } else if (improvement < 0) {
    return `Focused states decreased by ${Math.abs(improvement).toFixed(1)}%`;
  }
  return 'No change in focused states';
};

export default CompareProgressPage;