// TaskMap.tsx — Leaflet map: task markers (clustered), user recenter, fullscreen. Consumes tasks with distance from discovery.
// Default marker images are patched below (common react-leaflet bundler issue).

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Box, Stack, Fab, Tooltip, Typography } from '@mui/material';
import { MyLocation, Fullscreen, FullscreenExit } from '@mui/icons-material';
import { Task, TaskWithDistance } from '../../types/task.types';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Fix for default markers in react-leaflet
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Import marker clustering
import 'leaflet.markercluster';

// Use the Task type from the types file

interface TaskMapProps {
  tasks: TaskWithDistance[];
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  onTaskClick?: (task: TaskWithDistance) => void;
}

// Custom marker icon
const createCustomIcon = (color: string = '#1976d2') => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path fill="${color}" stroke="#fff" stroke-width="1.5" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0z"/>
        <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
      </svg>
    `)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

// Component to center map on user location
const MapController: React.FC<{ userLocation?: { latitude: number; longitude: number } }> = ({ userLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      map.setView([userLocation.latitude, userLocation.longitude], 13);
    }
  }, [map, userLocation]);

  return null;
};

// Component to handle marker clustering
const MarkerCluster: React.FC<{ 
  tasks: Task[]; 
  userLocation?: { latitude: number; longitude: number };
  onTaskClick?: (task: Task) => void;
  getCategoryColor: (category: string) => string;
  formatDate: (dateString?: string) => string;
}> = ({ tasks, userLocation, onTaskClick, getCategoryColor, formatDate }) => {
  const map = useMap();

  useEffect(() => {
    // Create marker cluster group
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    });

    // Add user location marker
    if (userLocation) {
      const userMarker = L.marker([userLocation.latitude, userLocation.longitude], {
        icon: createCustomIcon('#4caf50')
      }).bindPopup(`
        <div style="font-weight: bold; color: #4caf50;">
          Your Location
        </div>
      `);
      clusterGroup.addLayer(userMarker);
    }

    // Add task markers
    tasks.filter(task => task.location).forEach((task) => {
      const marker = L.marker([task.location!.latitude, task.location!.longitude], {
        icon: createCustomIcon(getCategoryColor(task.category))
      }).bindPopup(`
        <div style="min-width: 250px;">
          <h3 style="margin: 0 0 8px 0; font-size: 1rem; font-weight: bold;">${task.title}</h3>
          <p style="margin: 0 0 8px 0; color: #666; font-size: 0.875rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${task.description}
          </p>
          <div style="display: flex; gap: 8px; margin: 8px 0; flex-wrap: wrap;">
            <span style="background: ${getCategoryColor(task.category)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">
              ${task.category.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
            </span>
            ${(task as TaskWithDistance).distance ? `<span style="border: 1px solid #ccc; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">${(task as TaskWithDistance).distance!.toFixed(1)} mi</span>` : ''}
            ${(task as TaskWithDistance).skillMatch?.isGoodMatch ? `<span style="background: #4caf50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">Good Match</span>` : ''}
          </div>
          <div style="display: flex; gap: 16px; margin: 8px 0; font-size: 0.875rem;">
            <span style="color: green; font-weight: bold;">$${task.budget}</span>
            <span style="color: #666;">${formatDate(task.taskDate)}</span>
          </div>
          <p style="margin: 8px 0 0 0; color: #666; font-size: 0.75rem;">
            by ${task.poster?.name || 'Unknown'}
          </p>
          <button onclick="window.taskClick && window.taskClick('${task.taskId}')" style="width: 100%; margin-top: 8px; padding: 8px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
            View Details
          </button>
        </div>
      `);

      // Store task click handler globally
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).taskClick = (taskId: string) => {
        const task = tasks.find(t => t.taskId === taskId);
        if (task && onTaskClick) {
          onTaskClick(task);
        }
      };

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, tasks, userLocation, onTaskClick, getCategoryColor, formatDate]);

  return null;
};

const TaskMap: React.FC<TaskMapProps> = ({ tasks, userLocation, onTaskClick }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Default center (Boston area)
  const defaultCenter: [number, number] = [42.3601, -71.0589];
  const center = userLocation 
    ? [userLocation.latitude, userLocation.longitude] as [number, number]
    : defaultCenter;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'HOME_REPAIR': '#f44336',
      'CLEANING': '#2196f3',
      'MOVING': '#ff9800',
      'DELIVERY': '#4caf50',
      'ASSEMBLY': '#9c27b0',
      'YARD_WORK': '#8bc34a',
      'PET_CARE': '#ff5722',
      'TECH_SUPPORT': '#607d8b',
      'TUTORING': '#795548',
      'OTHER': '#9e9e9e'
    };
    return colors[category] || '#1976d2';
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const centerOnUserLocation = () => {
    // This will be handled by the MapController component
    console.log('Center on user location requested');
  };

  return (
    <Box sx={{ 
      height: isFullscreen ? '100vh' : '100%', 
      width: '100%', 
      position: 'relative',
      zIndex: isFullscreen ? 9999 : 'auto'
    }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        whenReady={() => {
          // Map is ready, we can access it through the MapController
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController userLocation={userLocation} />
        
        {/* Use clustering for better performance */}
        <MarkerCluster 
          tasks={tasks}
          userLocation={userLocation}
          onTaskClick={onTaskClick}
          getCategoryColor={getCategoryColor}
          formatDate={formatDate}
        />
      </MapContainer>

      {/* Map controls */}
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1000 }}>
        <Stack spacing={1}>
          {userLocation && (
            <Tooltip title="Center on your location">
              <Fab 
                size="small" 
                color="primary" 
                onClick={centerOnUserLocation}
                sx={{ backgroundColor: 'white', color: 'primary.main' }}
              >
                <MyLocation />
              </Fab>
            </Tooltip>
          )}
          
          <Tooltip title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
            <Fab 
              size="small" 
              color="primary" 
              onClick={toggleFullscreen}
              sx={{ backgroundColor: 'white', color: 'primary.main' }}
            >
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </Fab>
          </Tooltip>
        </Stack>
      </Box>

      {/* Task count indicator */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 16, 
        left: 16, 
        zIndex: 1000,
        backgroundColor: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <Typography variant="body2" color="text.secondary">
          {tasks.filter(task => task.location).length} tasks found
        </Typography>
      </Box>
    </Box>
  );
};

export default TaskMap;
