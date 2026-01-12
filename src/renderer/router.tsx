/**
 * React Router Configuration
 * Routes for all main pages
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectSetup } from './pages/ProjectSetup';
import { SubdivisionPlanner } from './pages/SubdivisionPlanner';
import { ExportPage } from './pages/Export';
import { Import } from './components/Import/Import';

// Placeholder components - will be implemented in later phases
const SocialClubDesigner = () => <div>Social Club Designer - Coming in Phase 5</div>;
const FinancialAnalysis = () => <div>Financial Analysis - Coming in Phase 6</div>;

export const RouterProvider: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/project-setup" replace />} />
        <Route path="/project-setup" element={<ProjectSetup />} />
        <Route path="/subdivision" element={<SubdivisionPlanner />} />
        <Route path="/social-club" element={<SocialClubDesigner />} />
        <Route path="/financial" element={<FinancialAnalysis />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/import" element={<Import />} />
      </Routes>
    </BrowserRouter>
  );
};
