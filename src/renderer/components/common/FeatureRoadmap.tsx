/**
 * Feature Roadmap Component
 * Displays the application feature status and roadmap
 */

import React from 'react';
import './FeatureRoadmap.css';

export interface FeatureStatus {
  id: string;
  name: string;
  description: string;
  status: 'complete' | 'in-progress' | 'planned';
  phase: string;
  priority: 'P1' | 'P2' | 'P3';
}

interface FeatureRoadmapProps {
  compact?: boolean;
}

const FEATURE_ROADMAP: FeatureStatus[] = [
  {
    id: 'land-setup',
    name: 'Land Investment Setup',
    description: 'Configure land parcel parameters, dimensions, location, and costs',
    status: 'complete',
    phase: 'Phase 3',
    priority: 'P1',
  },
  {
    id: 'ai-subdivision',
    name: 'AI-Powered Subdivision Planning',
    description:
      'Generate AI-powered subdivision plans with Gemini, approve plans, and generate visualizations',
    status: 'complete',
    phase: 'Feature 001',
    priority: 'P1',
  },
  {
    id: 'subdivision-calc',
    name: 'Automatic Subdivision Calculation',
    description: 'Calculate subdivision scenarios with social club allocation and parking',
    status: 'in-progress',
    phase: 'Phase 4',
    priority: 'P1',
  },
  {
    id: 'social-club',
    name: 'Social Club Amenities Design',
    description: 'Configure social club amenities, storage units, and maintenance room',
    status: 'complete',
    phase: 'Phase 5',
    priority: 'P2',
  },
  {
    id: 'financial-analysis',
    name: 'Financial Analysis & Pricing',
    description: 'Calculate project costs, pricing scenarios, and profit margins',
    status: 'planned',
    phase: 'Phase 6',
    priority: 'P2',
  },
  {
    id: 'image-management',
    name: 'Image Management',
    description: 'Attach and preview images for land parcels and individual lots',
    status: 'planned',
    phase: 'Phase 8',
    priority: 'P3',
  },
  {
    id: 'project-export',
    name: 'Project Export',
    description: 'Export complete project to disk for backup and sharing',
    status: 'planned',
    phase: 'Phase 9',
    priority: 'P2',
  },
  {
    id: 'project-import',
    name: 'Project Import',
    description: 'Import previously exported projects with full data fidelity',
    status: 'planned',
    phase: 'Phase 10',
    priority: 'P2',
  },
];

export const FeatureRoadmap: React.FC<FeatureRoadmapProps> = ({ compact = false }) => {
  const getStatusIcon = (status: FeatureStatus['status']) => {
    switch (status) {
      case 'complete':
        return '✓';
      case 'in-progress':
        return '⟳';
      case 'planned':
        return '○';
      default:
        return '?';
    }
  };

  const getStatusLabel = (status: FeatureStatus['status']) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'in-progress':
        return 'In Progress';
      case 'planned':
        return 'Planned';
      default:
        return 'Unknown';
    }
  };

  const getPriorityClass = (priority: FeatureStatus['priority']) => {
    return `priority-${priority.toLowerCase()}`;
  };

  if (compact) {
    return (
      <div className="feature-roadmap-compact">
        <div className="roadmap-summary">
          {FEATURE_ROADMAP.map((feature) => (
            <div key={feature.id} className={`feature-status-icon status-${feature.status}`}>
              <span className="icon">{getStatusIcon(feature.status)}</span>
              <span className="tooltip">{feature.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="feature-roadmap">
      <div className="roadmap-header">
        <h2>Feature Roadmap</h2>
        <p className="subtitle">
          Track the development progress of Micro Villas Investment Platform
        </p>
      </div>

      <div className="roadmap-legend">
        <div className="legend-item">
          <span className="status-icon status-complete">✓</span>
          <span>Complete</span>
        </div>
        <div className="legend-item">
          <span className="status-icon status-in-progress">⟳</span>
          <span>In Progress</span>
        </div>
        <div className="legend-item">
          <span className="status-icon status-planned">○</span>
          <span>Planned</span>
        </div>
      </div>

      <div className="roadmap-grid">
        {FEATURE_ROADMAP.map((feature) => (
          <div key={feature.id} className={`feature-card status-${feature.status}`}>
            <div className="feature-header">
              <div className="feature-title">
                <span className="status-icon">{getStatusIcon(feature.status)}</span>
                <h3>{feature.name}</h3>
              </div>
              <div className="feature-badges">
                <span className={`badge priority-badge ${getPriorityClass(feature.priority)}`}>
                  {feature.priority}
                </span>
                <span className="badge phase-badge">{feature.phase}</span>
              </div>
            </div>
            <p className="feature-description">{feature.description}</p>
            <div className="feature-footer">
              <span className={`status-label status-${feature.status}`}>
                {getStatusLabel(feature.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
