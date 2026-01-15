import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import "./task.css"
function Task(){

const location=useLocation();
// const sid=location.state.s_id;
 const navigate = useNavigate();
 useEffect(() => {
        const fetchSessions = async () => {
            try {
                const response = await fetch("http://localhost:8000/all_Sessions");
                const data = await response.json();
                console.log(data[1]);
            } catch (error) {
                console.error("Error fetching sessions:", error);
            }
        };

        fetchSessions();
    }, []); // runs once on mount

 const change_eeg_labels = () => {
      fetch(`http://localhost:8000/serve_csv?path=${eegPath}&t=${Date.now()}`)
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
            const alpha_wave=idx("alpha");
            const beta_wave=idx("beta");
            const delta_wave=idx("beta");
            const theta_wave=idx("theta");
            const gemma_wave=idx("beta");
            
            console.log(alpha_wave);

            const timeStr = parts[timeIdx]?.trim();
            const label = parts[labelIdx]?.trim().toLowerCase();
            
            
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
          console.log("⏱️ Max EEG time:", data.length > 0 ? data[data.length-1].time : 0);
        })
        .catch((err) => console.error("Error loading EEG:", err));
    };

return(
    <div>
    <header>
        <button 
        onClick={() => navigate("/AdminDashboard")}
        >Dashboard</button>
        <h1>Cognitive AI</h1>
        
        <button
             onClick={() => {
              if (window.confirm("Are you sure you want to logout?")) {
                navigate("/");
              }
            }}
        >
            Logout</button>
    </header>
    </div>
)
}
export default Task;