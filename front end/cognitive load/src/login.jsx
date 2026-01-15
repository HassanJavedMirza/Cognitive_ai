import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css"; // Import CSS
import logo from "./assets/logo4.png"
function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // New state for password visibility
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://127.0.0.1:8000/login_Check", {
        email,
        password,
      });

      if (res.data.message === "Login Successful!") {
        localStorage.setItem("userId", res.data.id);
        localStorage.setItem("role", res.data.role);

        const dashboards = {
          admin: "/AdminDashboard",
          teacher: "/TeacherDashboard",
          student: "/StudentDashboard",
          attendant: "/AttendentDashboard",
          editor:"/Editor"
        };
        navigate(dashboards[res.data.role], { state: { id: res.data.id } });
      } else {
        setError("Invalid inputs!");
      }
    } catch (error) {
      setError("Something went wrong or Invalid credentials");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="page">
      {/* HEADER */}
      <div className="header">
    
        <div className="logo-placeholder"> 
          <img src={logo} alt="App logo" style={{ width: "200px", height: "100px", objectFit: "contain" }} />
          
        </div>

        <h1 className="title">
          Cognitive AI  <span className="hand-emoji"></span>
        </h1>
        
        {/* <p className="subtitle">Monitor cognitive load with ease and accuracy.</p> */}
      </div>
    
    <br />
      
      {/* BODY */}
      <div className="body">
        <div className="input-container">
          <span className="icon">✉️</span> {/* Email icon - replace with actual icon font/SVG */}
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>
    
        <div className="input-container">
          <span className="icon">🔒</span> {/* Password icon - replace with actual icon font/SVG */}
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}  
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
         
           
          <span 
            className="icon password-toggle-icon" 
            onClick={togglePasswordVisibility}
          >
            {/* {showPassword ? "🙈" : "👁️"} Toggle icon - replace with actual icon font/SVG */}
          </span>
        </div>
       
        <button onClick={handleLogin} className="submitBtn">
          Log In
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

export default LoginPage;