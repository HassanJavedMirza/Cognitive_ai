import { useEffect, useState, useRef } from "react";
import { useNavigate,useLocation } from "react-router-dom";
import axios from "axios";
import "./Editor"
const Editor=()=>{
  
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = location.state || {};

 
    return(
        <div>
            <header className="admin-header">
            <div style={{width:1000,fontSize:30,marginRight:300}}>
                {/* <span onClick={()=>navigate(-1)}>back</span> */}
               <span style={{color:"white" , marginRight:240}}>Cognitive AI</span> Welcome to Editor Dashboard

         
            </div>
            </header>
          <div style={{backgroundColor:"lightblue", height:1000}}>
              <button 
                onClick={() => navigate("/Sessions")}
                style={{alignItems:"center", alignContent:"center", marginLeft:530, marginTop:200, width:300, height:200,fontSize:20}}
                >
                  View  Sessions
                </button>   
          </div>
        
        
        </div>
    )
}
export default Editor;