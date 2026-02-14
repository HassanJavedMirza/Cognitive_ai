import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api/axiosInstance";
import "./AdminDashboard.css";

function SimpleAdminDashboard() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        setIsLoading(true);
        const adminId = localStorage.getItem("userId");
        if (!adminId) {
          navigate("/", { replace: true });
          return;
        }

        const res = await api.get(`/admins_by_id/${adminId}`);
        setAdminName(res.data.name);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdmin();
  }, [navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    navigate("/", { replace: true });
  };

  const handleProfileClick = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-container" style={{ backgroundColor: "lightcoral" }}>
      {/* Enhanced Header */}
      <header style={{ height: 100 }}>
        <div className="header-left">
          <div className="logo-circle">
            <span className="logo-icon">🧠</span>
          </div>
          <div className="brand-container">
            <h1 className="brand-name">Cognitive AI Admin</h1>
            <p className="brand-sub">Smart Classroom Control Panel</p>
          </div>
        </div>

        {adminName && (
          <div className="header-right" ref={dropdownRef}>
            <div className="welcome-text">
              <span className="welcome-label">Welcome back,</span>
              <span className="welcome-name">{adminName}</span>
            </div>

            {/* Profile Section with Dropdown */}
            <div className="profile-section">
              <button
                className="profile-btn"
                onClick={handleProfileClick}
                aria-expanded={showProfileDropdown}
                aria-label="Profile menu"
                aria-haspopup="true"
              >
                <div className="profile-avatar">
                  {adminName.charAt(0).toUpperCase()}
                </div>
                <span className="profile-name">{adminName}</span>
                <span className={`dropdown-arrow ${showProfileDropdown ? 'up' : 'down'}`}>
                  ▼
                </span>
              </button>

              {/* Dropdown Menu */}
              {showProfileDropdown && (
                <div className="profile-dropdown" role="menu">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {/* {adminName.charAt(0).toUpperCase()} */}
                    </div>
                    <div className="dropdown-user-info">
                      {/* <div className="dropdown-user-name">{adminName}</div> */}
                      {/* <div className="dropdown-user-role">Administrator</div> */}
                    </div>
                  </div>

                  <div className="dropdown-divider"></div>

                  <div className="dropdown-menu">
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        navigate("/admin-settings");
                      }}
                      role="menuitem"
                    >
                      <span className="dropdown-icon">⚙️</span>
                      <span>Settings</span>
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        navigate("/help");
                      }}
                      role="menuitem"
                    >
                      <span className="dropdown-icon">❓</span>
                      <span>Help & Support</span>
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        // Edit profile functionality
                        alert('Edit profile feature coming soon!');
                      }}
                      role="menuitem"
                    >
                      <span className="dropdown-icon">👤</span>
                      <span>Edit Profile</span>
                    </button>

                    <div className="dropdown-divider"></div>

                    <button
                      className="dropdown-item logout"
                      onClick={handleLogout}
                      role="menuitem"
                    >
                      <span className="dropdown-icon">🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="admin-main">
        {/* Dashboard Intro */}
        <section className="admin-intro" style={{ width: 1100 }}>
          <h2>Dashboard Overview</h2>
          <p>Manage sessions, teachers, and students efficiently</p>
        </section>

        {/* Statistics Cards (Optional)
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">--</div>
              <div className="stat-label">Total Sessions</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">👨‍🏫</div>
            <div className="stat-content">
              <div className="stat-value">--</div>
              <div className="stat-label">Active Teachers</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🎓</div>
            <div className="stat-content">
              <div className="stat-value">--</div>
              <div className="stat-label">Sections</div>
            </div>
          </div>
        </div> */}

        {/* Navigation Cards */}
        <div className="admin-nav">
          <div
            className="nav-card"
            onClick={() => navigate("/Sessions")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate("/Sessions")}
          >
            <div className="nav-icon">📅</div>
            <h3>Sessions</h3>
            <p className="nav-description">View and manage all classroom sessions</p>
            {/* <div className="nav-hover-indicator"></div> */}
            <div className="nav-arrow">→</div>
          </div>

          <div
            className="nav-card"
            onClick={() => navigate("/View_teachers")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate("/View_teachers")}
          >
            <div className="nav-icon">👨‍🏫</div>
            <h3>Teachers</h3>
            <p className="nav-description">Manage teacher accounts and details</p>
            {/* <div className="nav-hover-indicator"></div> */}
            <div className="nav-arrow">→</div>
          </div>

          <div
            className="nav-card"
            onClick={() => navigate("/View_sections")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate("/View_sections")}
          >
            <div className="nav-icon">🎓</div>
            <h3>Sections</h3>
            <p className="nav-description">Handle class sections and groups</p>
            {/* <div className="nav-hover-indicator"></div> */}
            <div className="nav-arrow">→</div>
          </div>
          <div>

          </div>
        </div>

        {/* Quick Links */}

      </main>

      {/* Footer */}
      <footer className="admin-footer">
        <p>© {new Date().getFullYear()} Cognitive AI Admin Dashboard. All rights reserved.</p>
        <p className="footer-links">
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/privacy"); }}>Privacy Policy</a>
          <span className="separator">•</span>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/terms"); }}>Terms of Service</a>
          <span className="separator">•</span>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/contact"); }}>Contact Support</a>
        </p>
      </footer>
    </div>
  );
}

export default SimpleAdminDashboard;