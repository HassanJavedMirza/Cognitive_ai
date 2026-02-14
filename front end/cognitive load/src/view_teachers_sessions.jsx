import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const View_teachers_sessions = () => {

  const location = useLocation();
  const { tid } = location.state || {};

  const [teacher_id, set_teacher_id] = useState(null);
  const [sessions, setSessions] = useState([]);
 
  // Set teacher_id once on mount
  useEffect(() => {
    if (tid) {
      console.log("Received tid:", tid);
      set_teacher_id(tid);
    }
  }, [tid]);

  
  useEffect(() => {
    if (!teacher_id) return; 

    const fetchSessions = async () => {
      try {
        const results = await axios.get(
          `${API_BASE}/get_teachers_sessions_by_id/${teacher_id}`
        );

        console.log("API Response:", results.data);
        setSessions(results.data);
        

      } catch (error) {
        console.error("Error while fetching:", error);
      }
    };

    fetchSessions();
  }, [teacher_id]); 

  return (
    <div>
      
      <h1>All Sessions of Teacher {teacher_id}</h1>

      {
      sessions.length === 0 ? (
        <p>No sessions found.</p>
      ) : (
       
       <ul>
          {sessions.map((s, i) => (
            <li key={i}>{s.session_name}</li>
          ))}
        </ul>
      )
      }
    </div>
  );
};

export default View_teachers_sessions;
