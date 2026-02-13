import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CityPlanner from './city_planner.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CityPlanner />
  </StrictMode>,
)
