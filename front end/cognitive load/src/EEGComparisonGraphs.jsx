import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function EEGComparisonGraphs({ session1, session2, comparisonData, studentSessions }) {
  
  // Define the activity levels with colors
  const activityLevels = {
    'VERY_HIGH': { 
      label: 'Very High', 
      color: '#D0021B',
      description: 'Very high activity, intense focus or stress'
    },
    'HIGH': { 
      label: 'High', 
      color: '#FF6B6B',
      description: 'Elevated activity, engaged or alert'
    },
    'MEDIUM': { 
      label: 'Medium', 
      color: '#F5A623',
      description: 'Normal/balanced brain activity'
    },
    'LOW': { 
      label: 'Low', 
      color: '#7BCC70',
      description: 'Below average activity'
    },
    'VERY_LOW': { 
      label: 'Very Low', 
      color: '#4A90E2',
      description: 'Low brain activity, possibly relaxed or unfocused'
    }
  };

  // Parse EEG data from your file format
  const parseEEGData = (eegData) => {
    if (!eegData || !Array.isArray(eegData)) return null;
    
    // Assuming eegData is an array of objects like:
    // [{Time: "20:28:00", Delta: 4899.39, Theta: 3282.7, Alpha: 489.61, Beta: 281.39, Gamma: 1161.34, Label: "Very High"}, ...]
    
    const waves = {
      Delta: [],
      Theta: [],
      Alpha: [],
      Beta: [],
      Gamma: []
    };
    
    const labels = [];
    const timeLabels = [];
    const labelValues = [];
    
    eegData.forEach((row, index) => {
      // Parse values
      const delta = parseFloat(row.Delta || row.delta || 0);
      const theta = parseFloat(row.Theta || row.theta || 0);
      const alpha = parseFloat(row.Alpha || row.alpha || 0);
      const beta = parseFloat(row.Beta || row.beta || 0);
      const gamma = parseFloat(row.Gamma || row.gamma || 0);
      const label = row.Label || row.label || 'UNKNOWN';
      
      // Use time from data or create index-based time
      const time = row.Time || row.time || `${Math.floor(index/60)}:${(index%60).toString().padStart(2, '0')}:00`;
      timeLabels.push(time);
      
      waves.Delta.push(delta);
      waves.Theta.push(theta);
      waves.Alpha.push(alpha);
      waves.Beta.push(beta);
      waves.Gamma.push(gamma);
      labels.push(label);
      
      // Convert label to numeric value for plotting
      let labelValue;
      switch(label.toUpperCase()) {
        case 'VERY HIGH':
          labelValue = 5;
          break;
        case 'HIGH':
          labelValue = 4;
          break;
        case 'MEDIUM':
          labelValue = 3;
          break;
        case 'LOW':
          labelValue = 2;
          break;
        case 'VERY LOW':
          labelValue = 1;
          break;
        default:
          labelValue = 0;
      }
      labelValues.push(labelValue);
    });
    
    // Calculate metrics
    const totalPoints = waves.Delta.length;
    const avgDelta = waves.Delta.reduce((a, b) => a + b, 0) / totalPoints;
    const avgTheta = waves.Theta.reduce((a, b) => a + b, 0) / totalPoints;
    const avgAlpha = waves.Alpha.reduce((a, b) => a + b, 0) / totalPoints;
    const avgBeta = waves.Beta.reduce((a, b) => a + b, 0) / totalPoints;
    const avgGamma = waves.Gamma.reduce((a, b) => a + b, 0) / totalPoints;
    
    const betaAlphaRatio = avgBeta / (avgAlpha || 1);
    const totalPower = avgDelta + avgTheta + avgAlpha + avgBeta + avgGamma;
    
    return {
      waves,
      timeLabels,
      labels,
      labelValues,
      totalPoints,
      metrics: {
        avgDelta,
        avgTheta,
        avgAlpha,
        avgBeta,
        avgGamma,
        betaAlphaRatio,
        totalPower,
        attention: Math.min(avgBeta * 0.1, 100),
        meditation: Math.min(avgAlpha * 0.15, 100)
      }
    };
  };

  // Classify overall session based on wave patterns
  const classifySession = (data) => {
    if (!data) return 'UNKNOWN';
    
    const metrics = data.metrics;
    const betaAlphaRatio = metrics.betaAlphaRatio || 0;
    const totalPower = metrics.totalPower || 0;
    
    // Classification based on your data patterns
    if (betaAlphaRatio > 2 && totalPower > 10000) return 'VERY_HIGH';
    if (betaAlphaRatio > 1.5 && totalPower > 5000) return 'HIGH';
    if (betaAlphaRatio > 0.8 && betaAlphaRatio < 1.2) return 'MEDIUM';
    if (betaAlphaRatio < 0.8 && totalPower < 2000) return 'LOW';
    if (betaAlphaRatio < 0.5 && totalPower < 1000) return 'VERY_LOW';
    
    // Fallback to most common label
    const labelCounts = {};
    data.labels.forEach(label => {
      const normalized = label.toUpperCase().replace(' ', '_');
      labelCounts[normalized] = (labelCounts[normalized] || 0) + 1;
    });
    
    let maxLabel = 'UNKNOWN';
    let maxCount = 0;
    Object.entries(labelCounts).forEach(([label, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxLabel = label;
      }
    });
    
    return maxLabel;
  };

  // Create time series chart with waves and labels
  const createTimeSeriesChart = (sessionData, sessionName) => {
    if (!sessionData) return null;
    
    const { timeLabels, waves, labelValues } = sessionData;
    
    const chartData = {
      labels: timeLabels,
      datasets: [
        {
          label: 'Delta',
          data: waves.Delta,
          borderColor: '#4A90E2',
          backgroundColor: 'rgba(74, 144, 226, 0.1)',
          borderWidth: 1,
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Theta',
          data: waves.Theta,
          borderColor: '#7BCC70',
          backgroundColor: 'rgba(123, 204, 112, 0.1)',
          borderWidth: 1,
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Alpha',
          data: waves.Alpha,
          borderColor: '#F5A623',
          backgroundColor: 'rgba(245, 166, 35, 0.1)',
          borderWidth: 1,
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Beta',
          data: waves.Beta,
          borderColor: '#FF6B6B',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          borderWidth: 1,
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Gamma',
          data: waves.Gamma,
          borderColor: '#9013FE',
          backgroundColor: 'rgba(144, 19, 254, 0.1)',
          borderWidth: 1,
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Activity Label',
          data: labelValues,
          borderColor: '#2C3E50',
          backgroundColor: labelValues.map(val => {
            const colors = ['#4A90E2', '#7BCC70', '#F5A623', '#FF6B6B', '#D0021B'];
            return colors[val - 1] || '#000';
          }),
          borderWidth: 3,
          pointRadius: 8,
          pointHoverRadius: 12,
          pointStyle: 'rectRot',
          yAxisID: 'y1',
          type: 'line'
        }
      ]
    };
    
    const options = {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Time'
          },
          ticks: {
            maxTicksLimit: 20 // Limit number of time labels shown
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Wave Amplitude (μV)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Activity Level'
          },
          min: 0,
          max: 6,
          ticks: {
            callback: function(value) {
              const labels = {
                1: 'Very Low',
                2: 'Low',
                3: 'Medium',
                4: 'High',
                5: 'Very High'
              };
              return labels[value] || '';
            }
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label === 'Activity Label') {
                const labelText = ['Very Low', 'Low', 'Medium', 'High', 'Very High'][context.raw - 1] || 'Unknown';
                return `Label: ${labelText}`;
              }
              return `${label}: ${context.parsed.y.toFixed(2)} μV`;
            }
          }
        }
      }
    };
    
    return { data: chartData, options };
  };

  // Create wave comparison chart
  const createWaveComparisonChart = (session1Data, session2Data) => {
    if (!session1Data || !session2Data) return null;
    
    const waveTypes = ['Delta', 'Theta', 'Alpha', 'Beta', 'Gamma'];
    const session1Metrics = session1Data.metrics;
    const session2Metrics = session2Data.metrics;
    
    const chartData = {
      labels: waveTypes,
      datasets: [
        {
          label: 'Session 1',
          data: [
            session1Metrics.avgDelta,
            session1Metrics.avgTheta,
            session1Metrics.avgAlpha,
            session1Metrics.avgBeta,
            session1Metrics.avgGamma
          ],
          backgroundColor: activityLevels[classifySession(session1Data)]?.color || '#4A90E2',
          borderColor: activityLevels[classifySession(session1Data)]?.color || '#4A90E2',
          borderWidth: 1
        },
        {
          label: 'Session 2',
          data: [
            session2Metrics.avgDelta,
            session2Metrics.avgTheta,
            session2Metrics.avgAlpha,
            session2Metrics.avgBeta,
            session2Metrics.avgGamma
          ],
          backgroundColor: activityLevels[classifySession(session2Data)]?.color || '#F5A623',
          borderColor: activityLevels[classifySession(session2Data)]?.color || '#F5A623',
          borderWidth: 1
        }
      ]
    };
    
    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Average Wave Frequency Comparison'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Amplitude (μV)'
          }
        }
      }
    };
    
    return { data: chartData, options };
  };

  // Create label distribution chart
  const createLabelDistributionChart = (session1Data, session2Data) => {
    if (!session1Data || !session2Data) return null;
    
    const countLabels = (data) => {
      const counts = {
        'VERY_HIGH': 0,
        'HIGH': 0,
        'MEDIUM': 0,
        'LOW': 0,
        'VERY_LOW': 0
      };
      
      data.labels.forEach(label => {
        const normalized = label.toUpperCase().replace(' ', '_');
        if (counts[normalized] !== undefined) {
          counts[normalized]++;
        }
      });
      
      return counts;
    };
    
    const session1Counts = countLabels(session1Data);
    const session2Counts = countLabels(session2Data);
    
    const labelNames = Object.keys(activityLevels).map(key => activityLevels[key].label);
    
    const chartData = {
      labels: labelNames,
      datasets: [
        {
          label: 'Session 1',
          data: Object.keys(session1Counts).map(key => session1Counts[key]),
          backgroundColor: Object.keys(session1Counts).map(key => activityLevels[key]?.color || '#ccc'),
          borderColor: Object.keys(session1Counts).map(key => activityLevels[key]?.color || '#ccc'),
          borderWidth: 1
        },
        {
          label: 'Session 2',
          data: Object.keys(session2Counts).map(key => session2Counts[key]),
          backgroundColor: Object.keys(session2Counts).map(key => activityLevels[key]?.color || '#ccc'),
          borderColor: Object.keys(session2Counts).map(key => activityLevels[key]?.color || '#ccc'),
          borderWidth: 1
        }
      ]
    };
    
    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Label Distribution Comparison'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Count'
          }
        }
      }
    };
    
    return { data: chartData, options };
  };

  // Create label vs waves correlation chart
  const createLabelWaveCorrelationChart = (sessionData, sessionName) => {
    if (!sessionData) return null;
    
    const { labels, waves } = sessionData;
    
    // Calculate average wave values for each label
    const labelAverages = {};
    const labelCounts = {};
    
    labels.forEach((label, index) => {
      const normalized = label.toUpperCase().replace(' ', '_');
      if (!labelAverages[normalized]) {
        labelAverages[normalized] = {
          Delta: 0,
          Theta: 0,
          Alpha: 0,
          Beta: 0,
          Gamma: 0,
          count: 0
        };
        labelCounts[normalized] = 0;
      }
      
      labelAverages[normalized].Delta += waves.Delta[index];
      labelAverages[normalized].Theta += waves.Theta[index];
      labelAverages[normalized].Alpha += waves.Alpha[index];
      labelAverages[normalized].Beta += waves.Beta[index];
      labelAverages[normalized].Gamma += waves.Gamma[index];
      labelAverages[normalized].count++;
      labelCounts[normalized]++;
    });
    
    // Calculate averages
    Object.keys(labelAverages).forEach(label => {
      const count = labelAverages[label].count;
      labelAverages[label].Delta /= count;
      labelAverages[label].Theta /= count;
      labelAverages[label].Alpha /= count;
      labelAverages[label].Beta /= count;
      labelAverages[label].Gamma /= count;
    });
    
    // Prepare chart data
    const sortedLabels = Object.keys(activityLevels).filter(label => labelCounts[label] > 0);
    const waveTypes = ['Delta', 'Theta', 'Alpha', 'Beta', 'Gamma'];
    
    const datasets = waveTypes.map(wave => ({
      label: wave,
      data: sortedLabels.map(label => labelAverages[label]?.[wave] || 0),
      backgroundColor: {
        'Delta': '#4A90E2',
        'Theta': '#7BCC70',
        'Alpha': '#F5A623',
        'Beta': '#FF6B6B',
        'Gamma': '#9013FE'
      }[wave],
      borderColor: {
        'Delta': '#4A90E2',
        'Theta': '#7BCC70',
        'Alpha': '#F5A623',
        'Beta': '#FF6B6B',
        'Gamma': '#9013FE'
      }[wave],
      borderWidth: 1
    }));
    
    const chartData = {
      labels: sortedLabels.map(label => activityLevels[label]?.label || label),
      datasets
    };
    
    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: `${sessionName}: Average Wave Values by Label`
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Amplitude (μV)'
          }
        }
      }
    };
    
    return { data: chartData, options };
  };

  // Process session data
  const session1Data = useMemo(() => parseEEGData(session1), [session1]);
  const session2Data = useMemo(() => parseEEGData(session2), [session2]);
  
  const session1Chart = useMemo(() => createTimeSeriesChart(session1Data, 'Session 1'), [session1Data]);
  const session2Chart = useMemo(() => createTimeSeriesChart(session2Data, 'Session 2'), [session2Data]);
  const waveComparisonChart = useMemo(() => createWaveComparisonChart(session1Data, session2Data), [session1Data, session2Data]);
  const labelDistributionChart = useMemo(() => createLabelDistributionChart(session1Data, session2Data), [session1Data, session2Data]);
  const session1CorrelationChart = useMemo(() => createLabelWaveCorrelationChart(session1Data, 'Session 1'), [session1Data]);
  const session2CorrelationChart = useMemo(() => createLabelWaveCorrelationChart(session2Data, 'Session 2'), [session2Data]);
  
  // Get session classifications
  const session1Class = session1Data ? classifySession(session1Data) : 'UNKNOWN';
  const session2Class = session2Data ? classifySession(session2Data) : 'UNKNOWN';

  return (
    <div className="eeg-comparison-container">
      <h3 className="eeg-section-title">🧠 EEG Analysis: Waves vs Activity Labels Over Time</h3>
      
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-header">
            <span className="summary-label">Session 1</span>
            <span 
              className="class-badge"
              style={{ backgroundColor: activityLevels[session1Class]?.color || '#ccc' }}
            >
              {activityLevels[session1Class]?.label || 'Unknown'}
            </span>
          </div>
          {session1Data && (
            <div className="wave-summary">
              <div className="wave-metric">
                <span>Data Points:</span>
                <span className="metric-value">{session1Data.totalPoints}</span>
              </div>
              <div className="wave-metric">
                <span>Beta/Alpha Ratio:</span>
                <span className="metric-value">{session1Data.metrics.betaAlphaRatio.toFixed(2)}</span>
              </div>
              <div className="wave-metric">
                <span>Total Power:</span>
                <span className="metric-value">{session1Data.metrics.totalPower.toFixed(0)} μV</span>
              </div>
              <div className="wave-metric">
                <span>Dominant Label:</span>
                <span className="metric-value">
                  {(() => {
                    const labelCounts = {};
                    session1Data.labels.forEach(label => {
                      const normalized = label.toUpperCase().replace(' ', '_');
                      labelCounts[normalized] = (labelCounts[normalized] || 0) + 1;
                    });
                    const maxLabel = Object.entries(labelCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
                    return activityLevels[maxLabel]?.label || maxLabel;
                  })()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="summary-card">
          <div className="summary-header">
            <span className="summary-label">Session 2</span>
            <span 
              className="class-badge"
              style={{ backgroundColor: activityLevels[session2Class]?.color || '#ccc' }}
            >
              {activityLevels[session2Class]?.label || 'Unknown'}
            </span>
          </div>
          {session2Data && (
            <div className="wave-summary">
              <div className="wave-metric">
                <span>Data Points:</span>
                <span className="metric-value">{session2Data.totalPoints}</span>
              </div>
              <div className="wave-metric">
                <span>Beta/Alpha Ratio:</span>
                <span className="metric-value">{session2Data.metrics.betaAlphaRatio.toFixed(2)}</span>
              </div>
              <div className="wave-metric">
                <span>Total Power:</span>
                <span className="metric-value">{session2Data.metrics.totalPower.toFixed(0)} μV</span>
              </div>
              <div className="wave-metric">
                <span>Dominant Label:</span>
                <span className="metric-value">
                  {(() => {
                    const labelCounts = {};
                    session2Data.labels.forEach(label => {
                      const normalized = label.toUpperCase().replace(' ', '_');
                      labelCounts[normalized] = (labelCounts[normalized] || 0) + 1;
                    });
                    const maxLabel = Object.entries(labelCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
                    return activityLevels[maxLabel]?.label || maxLabel;
                  })()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="summary-card">
          <div className="summary-header">
            <span className="summary-label">Comparison</span>
            <span className={`change-indicator ${session1Class === session2Class ? 'similar' : 'different'}`}>
              {session1Class === session2Class ? 'Similar' : 'Different'}
            </span>
          </div>
          {session1Data && session2Data && (
            <div className="comparison-metrics">
              <div className="comparison-metric">
                <span>Beta Change:</span>
                <span className={`metric-value ${
                  session2Data.metrics.avgBeta > session1Data.metrics.avgBeta ? 'positive' : 'negative'
                }`}>
                  {((session2Data.metrics.avgBeta - session1Data.metrics.avgBeta) / session1Data.metrics.avgBeta * 100).toFixed(1)}%
                </span>
              </div>
              <div className="comparison-metric">
                <span>Label Match:</span>
                <span className="metric-value">
                  {(() => {
                    let matches = 0;
                    const minLength = Math.min(session1Data.labels.length, session2Data.labels.length);
                    for (let i = 0; i < minLength; i++) {
                      if (session1Data.labels[i] === session2Data.labels[i]) matches++;
                    }
                    return `${((matches / minLength) * 100).toFixed(1)}%`;
                  })()}
                </span>
              </div>
              <div className="comparison-metric">
                <span>Total Power Δ:</span>
                <span className={`metric-value ${
                  session2Data.metrics.totalPower > session1Data.metrics.totalPower ? 'positive' : 'negative'
                }`}>
                  {((session2Data.metrics.totalPower - session1Data.metrics.totalPower) / 1000).toFixed(1)}k μV
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Time Series Charts */}
      <div className="eeg-section">
        <h4>📈 Session 1: Wave Patterns vs Activity Labels Over Time</h4>
        <p className="section-description">
          All 5 frequency bands (Delta, Theta, Alpha, Beta, Gamma) plotted against activity labels
        </p>
        {session1Chart ? (
          <div className="chart-container">
            <Line data={session1Chart.data} options={session1Chart.options} />
          </div>
        ) : (
          <div className="no-data">No session 1 data available</div>
        )}
      </div>

      <div className="eeg-section">
        <h4>📈 Session 2: Wave Patterns vs Activity Labels Over Time</h4>
        <p className="section-description">
          All 5 frequency bands (Delta, Theta, Alpha, Beta, Gamma) plotted against activity labels
        </p>
        {session2Chart ? (
          <div className="chart-container">
            <Line data={session2Chart.data} options={session2Chart.options} />
          </div>
        ) : (
          <div className="no-data">No session 2 data available</div>
        )}
      </div>

      {/* Wave Comparison */}
      <div className="eeg-section">
        <h4>📊 Average Wave Frequency Comparison</h4>
        <p className="section-description">
          Comparison of average amplitude for each frequency band between sessions
        </p>
        {waveComparisonChart ? (
          <div className="chart-container">
            <Bar data={waveComparisonChart.data} options={waveComparisonChart.options} />
          </div>
        ) : (
          <div className="no-data">No comparison data available</div>
        )}
      </div>

      {/* Label Distribution */}
      <div className="eeg-section">
        <h4>📊 Activity Label Distribution Comparison</h4>
        <p className="section-description">
          Frequency of each activity label in both sessions
        </p>
        {labelDistributionChart ? (
          <div className="chart-container">
            <Bar data={labelDistributionChart.data} options={labelDistributionChart.options} />
          </div>
        ) : (
          <div className="no-data">No label distribution data available</div>
        )}
      </div>

      {/* Label-Wave Correlation */}
      <div className="correlation-section">
        <div className="correlation-chart">
          <h4>🔗 Session 1: Wave Values by Activity Label</h4>
          {session1CorrelationChart ? (
            <div className="chart-container">
              <Bar data={session1CorrelationChart.data} options={session1CorrelationChart.options} />
            </div>
          ) : (
            <div className="no-data">No correlation data available</div>
          )}
        </div>
        
        <div className="correlation-chart">
          <h4>🔗 Session 2: Wave Values by Activity Label</h4>
          {session2CorrelationChart ? (
            <div className="chart-container">
              <Bar data={session2CorrelationChart.data} options={session2CorrelationChart.options} />
            </div>
          ) : (
            <div className="no-data">No correlation data available</div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="legend-section">
        <h5>📖 Activity Level Guide</h5>
        <div className="legend-grid">
          {Object.values(activityLevels).map((level, index) => (
            <div key={index} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: level.color }}></div>
              <div className="legend-content">
                <strong>{level.label}</strong>
                <small>{level.description}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CSS Styles */}
      <style jsx>{`
        .eeg-comparison-container {
          padding: 20px;
          background: #f8f9fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }
        
        .eeg-section-title {
          font-size: 24px;
          margin-bottom: 30px;
          color: #2c3e50;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 10px;
        }
        
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .summary-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.15);
        }
        
        .summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        
        .summary-label {
          font-weight: 600;
          color: #2c3e50;
          font-size: 18px;
        }
        
        .class-badge {
          padding: 6px 12px;
          border-radius: 20px;
          color: white;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .wave-summary, .comparison-metrics {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .wave-metric, .comparison-metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }
        
        .wave-metric:not(:last-child), .comparison-metric:not(:last-child) {
          border-bottom: 1px solid #f5f5f5;
        }
        
        .wave-metric span:first-child, .comparison-metric span:first-child {
          color: #666;
          font-size: 14px;
        }
        
        .metric-value {
          font-weight: 600;
          font-size: 16px;
          color: #2c3e50;
        }
        
        .metric-value.positive {
          color: #4CAF50;
        }
        
        .metric-value.negative {
          color: #F44336;
        }
        
        .change-indicator {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: bold;
        }
        
        .change-indicator.similar {
          background: #e8f5e9;
          color: #4CAF50;
        }
        
        .change-indicator.different {
          background: #ffebee;
          color: #F44336;
        }
        
        .eeg-section {
          background: white;
          border-radius: 12px;
          padding: 25px;
          margin-bottom: 25px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .eeg-section h4 {
          margin-top: 0;
          color: #2c3e50;
          margin-bottom: 10px;
          font-size: 20px;
        }
        
        .section-description {
          color: #666;
          margin-bottom: 20px;
          font-size: 14px;
          line-height: 1.5;
        }
        
        .chart-container {
          height: 400px;
          position: relative;
        }
        
        .no-data {
          text-align: center;
          padding: 60px;
          color: #999;
          background: #f8f9fa;
          border-radius: 8px;
          border: 2px dashed #e0e0e0;
          font-size: 16px;
        }
        
        .correlation-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
          margin-bottom: 25px;
        }
        
        .correlation-chart {
          background: white;
          border-radius: 12px;
          padding: 25px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .correlation-chart h4 {
          margin-top: 0;
          color: #2c3e50;
          margin-bottom: 20px;
          font-size: 18px;
        }
        
        .legend-section {
          background: white;
          padding: 25px;
          border-radius: 12px;
          margin-top: 20px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .legend-section h5 {
          margin-top: 0;
          color: #2c3e50;
          margin-bottom: 20px;
          font-size: 18px;
        }
        
        .legend-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          transition: transform 0.2s;
        }
        
        .legend-item:hover {
          transform: translateX(5px);
          background: #f0f0f0;
        }
        
        .legend-color {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          flex-shrink: 0;
        }
        
        .legend-content {
          flex: 1;
        }
        
        .legend-content strong {
          display: block;
          margin-bottom: 4px;
          color: #2c3e50;
          font-size: 14px;
        }
        
        .legend-content small {
          color: #666;
          font-size: 12px;
          line-height: 1.4;
          display: block;
        }
        
        @media (max-width: 992px) {
          .correlation-section {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
        
        @media (max-width: 768px) {
          .summary-cards {
            grid-template-columns: 1fr;
          }
          
          .eeg-section, .correlation-chart {
            padding: 20px;
          }
          
          .chart-container {
            height: 350px;
          }
        }
        
        @media (max-width: 480px) {
          .eeg-comparison-container {
            padding: 15px;
          }
          
          .eeg-section-title {
            font-size: 20px;
          }
          
          .chart-container {
            height: 300px;
          }
        }
      `}</style>
    </div>
  );
}

export default EEGComparisonGraphs;