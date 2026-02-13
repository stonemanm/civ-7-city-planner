import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import CityPlanner from './city_planner.jsx'

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <CityPlanner />
  </React.StrictMode>
);