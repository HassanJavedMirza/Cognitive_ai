
import { Routes, Route } from "react-router-dom";
import LoginPage from "./login";
import AdminDashboard from "./AdminDashboard";
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard";
import AttendentDashboard from "./AttendentDashboard";
import Sessions from "./Sessions";
import View_sections from "./View_sections";
import View_teachers from "./View_teachers";
import NewSession from "./NewSession";
import View_Results from "./view_results"
import Upload_Results from './Upload_Results';
import View_teachers_sessions from './view_teachers_sessions';
import Start_Stream from "./Start_Stream";
import Task from "./task";
import CompareProgressPage from "./CompareProgressPage";
import TeacherCompareSessions from "./TeacherCompareSessions";
import Editor from "./Editor";
function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/AdminDashboard" element={<AdminDashboard />} />
      <Route path="/TeacherDashboard" element={<TeacherDashboard />} />
      <Route path="/StudentDashboard" element={<StudentDashboard />} />
      <Route path="/AttendentDashboard" element={<AttendentDashboard />} />
      <Route path="/Sessions" element={<Sessions />} />
      <Route path="/View_teachers" element={<View_teachers />} />
      <Route path="/View_sections" element={<View_sections />} />
      <Route path="/new-session" element={<NewSession />} />
      <Route path="/view_results" element={<View_Results />} />
      <Route path="/Upload_Results" element={<Upload_Results/>}/>
      <Route path="/view_teachers_sessions" element={<View_teachers_sessions/>}/>
      <Route path="/start_stream" element={<Start_Stream />}></Route>
      <Route path="/task" element={<Task/>}></Route>
      <Route path="/CompareProgressPage" element={<CompareProgressPage/>}></Route>
      <Route path="/TeacherCompareSessions" element={<TeacherCompareSessions/>}></Route>
      <Route path="/Editor" element={<Editor/>}></Route>
    </Routes>
  );
}

export default App;
