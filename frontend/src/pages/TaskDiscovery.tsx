// TaskDiscovery.tsx — Browse tasks near the user (list + map). Core rule: no discovery API call until
// userLocation exists (browser geolocation, ZIP geocode, or localStorage from a past visit).
// Filters + view mode persist in localStorage; changing filters resets pagination to page 1.

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  CardActions,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  LocationOn,
  AccessTime,
  AttachMoney,
  FilterList,
  ViewList,
  Map,
  Clear,
  MyLocation,
  Search,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { discoveryAPI } from '@/services/api.service';
import { Task, TaskCategory, TaskWithDistance } from '@/types/task.types';
import TaskMap from '../components/tasks/TaskMap';

interface DiscoveryFilters {
  radius: number;
  category?: TaskCategory;
  minBudget?: number;
  maxBudget?: number;
  startDate?: string;
  endDate?: string;
  minHours?: number;
  maxHours?: number;
  searchText?: string;
  sortBy: 'proximity' | 'soonest' | 'budget' | 'newest' | 'oldest' | 'title';
  sortOrder: 'asc' | 'desc';
}

interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

/** Rehydrate coords from a previous session so returning users see tasks without re-prompting immediately */
function readStoredLocation(): UserLocation | null {
  try {
    const raw = localStorage.getItem('userLocation');
    if (!raw) return null;
    const loc = JSON.parse(raw) as { latitude?: number; longitude?: number; address?: string };
    if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      return { latitude: loc.latitude, longitude: loc.longitude, address: loc.address };
    }
  } catch {
    /* ignore invalid storage */
  }
  return null;
}

const TaskDiscovery: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'feed' | 'map'>('feed');
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(() =>
    typeof window !== 'undefined' ? readStoredLocation() : null
  );
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Location permission and ZIP fallback state
  const [zipCode, setZipCode] = useState<string>('');
  const [showZipDialog, setShowZipDialog] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');

  const [filters, setFilters] = useState<DiscoveryFilters>({
    radius: 3,
    sortBy: 'proximity',
    sortOrder: 'asc',
  });

  const navigate = useNavigate();

  useEffect(() => {
    getCurrentLocation();
    loadSavedFilters();
  }, []);


  // When location or filters change, refetch; early return above prevents API calls with no coords
  useEffect(() => {
    if (!userLocation) return;
    searchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page, userLocation]);


  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      setUserLocation({ latitude, longitude });
      setLocationError('');
      setSnackbarMessage('Location access granted!');
      setSnackbarOpen(true);
      
      // Save location to localStorage
      localStorage.setItem('userLocation', JSON.stringify({ latitude, longitude }));
    } catch (err: unknown) {
      const geoError = err as { code?: number; message?: string };
      
      if (geoError.code === 1) {
        setLocationError('Location access denied. Please enter your ZIP code to discover nearby tasks.');
      } else if (geoError.code === 2) {
        setLocationError('Location unavailable. Please enter your ZIP code to discover nearby tasks.');
      } else if (geoError.code === 3) {
        setLocationError('Location request timed out. Please enter your ZIP code to discover nearby tasks.');
      } else {
        setLocationError('Unable to get your location. Please enter your ZIP code to discover nearby tasks.');
      }
      
      // Don't automatically show the dialog - let user click "Search by ZIP" button
    } finally {
      setLoading(false);
    }
  };

  const loadSavedFilters = () => {
    const savedFilters = localStorage.getItem('discoveryFilters');
    const savedView = localStorage.getItem('discoveryView');
    
    if (savedFilters) {
      setFilters(JSON.parse(savedFilters));
    }
    if (savedView) {
      setViewMode(savedView as 'feed' | 'map');
    }
  };

  const saveFilters = (newFilters: DiscoveryFilters) => {
    localStorage.setItem('discoveryFilters', JSON.stringify(newFilters));
    setFilters(newFilters);
  };

  const saveViewMode = (mode: 'feed' | 'map') => {
    localStorage.setItem('discoveryView', mode);
    setViewMode(mode);
  };

  const searchTasks = async () => {
    // Guard: avoids useless or misleading API calls before we know where "nearby" is
    if (!userLocation) {
      return;
    }

    setLoading(true);
    setError('');

    const latitude = userLocation.latitude;
    const longitude = userLocation.longitude;

    try {
      const response = await discoveryAPI.discoverTasks({
        latitude,
        longitude,
        radius: filters.radius,
        category: filters.category,
        minBudget: filters.minBudget,
        maxBudget: filters.maxBudget,
        startDate: filters.startDate,
        endDate: filters.endDate,
        minHours: filters.minHours,
        maxHours: filters.maxHours,
        searchText: filters.searchText,
        page: pagination.page,
        limit: pagination.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      setTasks(response.tasks);
      setPagination(response.pagination);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } };
      setError(apiError.response?.data?.error || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<DiscoveryFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    saveFilters(updatedFilters);
    // New filter set should start at page 1 so results match the first "page" of the new query
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    const defaultFilters: DiscoveryFilters = {
      radius: 3,
      sortBy: 'proximity',
      sortOrder: 'asc',
    };
    saveFilters(defaultFilters);
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Handle ZIP code submission
  const handleZipSubmit = async () => {
    if (!zipCode.trim()) {
      setLocationError('Please enter a valid ZIP code');
      return;
    }

    setLoading(true);
    setLocationError(''); // Clear any previous errors
    
    try {
      // Use a geocoding service to convert ZIP to coordinates
      const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.places && data.places.length > 0) {
          const place = data.places[0];
          
          setUserLocation({
            latitude: parseFloat(place.latitude),
            longitude: parseFloat(place.longitude),
            address: `${place['place name']}, ${place.state}`
          });
          setLocationError('');
          setShowZipDialog(false);
          setSnackbarMessage(`Location set to ${place['place name']}, ${place.state}`);
          setSnackbarOpen(true);
          
          // Save location to localStorage
          localStorage.setItem('userLocation', JSON.stringify({ 
            latitude: parseFloat(place.latitude), 
            longitude: parseFloat(place.longitude),
            address: `${place['place name']}, ${place.state}`
          }));
        } else {
          setLocationError('Invalid ZIP code. Please try again.');
        }
      } else {
        setLocationError('Unable to find location for this ZIP code. Please try again.');
      }
    } catch {
      setLocationError('Unable to get location from ZIP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 10) / 10} mi`;
    }
    return `${Math.round(distance * 10) / 10} mi`;
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(budget);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!userLocation) {
    if (loading) {
      return (
        <Container maxWidth="md" sx={{ py: 8 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress />
            <Typography color="text.secondary">Getting your location…</Typography>
          </Box>
        </Container>
      );
    }

    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <MyLocation sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Please set your location
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            We need your location to show nearby tasks. Enable location access or search by ZIP code — we will not load tasks until a location is set.
          </Typography>
          <Button
            variant="contained"
            startIcon={<MyLocation />}
            onClick={getCurrentLocation}
            sx={{ mr: 2 }}
          >
            Use My Location
          </Button>
          <Button
            variant="outlined"
            startIcon={<Search />}
            onClick={() => {
              setShowZipDialog(true);
              setLocationError('Please enter your ZIP code to discover nearby tasks.');
            }}
          >
            Search by ZIP
          </Button>
        </Paper>

        {/* Fallback ZIP Input - Always visible when showZipDialog is true */}
        {showZipDialog && (
          <Paper sx={{ 
            p: 4, 
            mt: 3, 
            backgroundColor: '#f5f5f5', 
            border: '2px solid #1976d2',
            borderRadius: 2,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
          }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
              Enter Your Location
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
              {locationError || 'Please enter your ZIP code to discover nearby tasks.'}
            </Typography>
            <TextField
              fullWidth
              label="ZIP Code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="e.g., 02115"
              sx={{ mb: 3 }}
              variant="outlined"
            />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowZipDialog(false)} variant="outlined">
                Cancel
              </Button>
              <Button onClick={handleZipSubmit} variant="contained" disabled={loading}>
                {loading ? 'Finding Location...' : 'Find Tasks'}
              </Button>
            </Box>
          </Paper>
        )}

      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Discover Tasks
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant={showFilters ? 'contained' : 'outlined'}
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && saveViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="feed">
              <ViewList />
            </ToggleButton>
            <ToggleButton value="map">
              <Map />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {showFilters && (
        <Paper sx={{ p: 3, mb: 3, position: 'relative', zIndex: 1 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <FormControl fullWidth sx={{ position: 'relative', zIndex: 10 }}>
                <InputLabel 
                  sx={{ 
                    backgroundColor: 'white',
                    px: 1,
                    '&.Mui-focused': {
                      backgroundColor: 'white',
                    }
                  }}
                >
                  Category
                </InputLabel>
                <Select
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange({ category: e.target.value as TaskCategory })}
                  MenuProps={{
                    style: {
                      zIndex: 9999,
                    },
                  }}
                  sx={{
                    '& .MuiSelect-select': {
                      paddingRight: '40px',
                      minHeight: '1.4375em',
                      display: 'flex',
                      alignItems: 'center',
                    },
                    '& .MuiInputBase-input': {
                      padding: '16.5px 14px',
                    },
                  }}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {Object.values(TaskCategory).map((category) => (
                    <MenuItem key={category} value={category}>
                      {category.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <FormControl fullWidth>
                <InputLabel 
                  sx={{ 
                    backgroundColor: 'white',
                    px: 1,
                    '&.Mui-focused': {
                      backgroundColor: 'white',
                    }
                  }}
                >
                  Sort By
                </InputLabel>
                <Select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange({ sortBy: e.target.value as 'proximity' | 'soonest' | 'budget' | 'newest' | 'oldest' | 'title' })}
                  sx={{
                    '& .MuiSelect-select': {
                      paddingRight: '40px',
                      minHeight: '1.4375em',
                      display: 'flex',
                      alignItems: 'center',
                    },
                    '& .MuiInputBase-input': {
                      padding: '16.5px 14px',
                    },
                  }}
                >
                  <MenuItem value="proximity">Proximity</MenuItem>
                  <MenuItem value="soonest">Soonest Start</MenuItem>
                  <MenuItem value="budget">Budget</MenuItem>
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="oldest">Oldest First</MenuItem>
                  <MenuItem value="title">Title A-Z</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '150px', minHeight: '56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography gutterBottom sx={{ mb: 1 }}>Radius: {filters.radius} miles</Typography>
              <Slider
                value={filters.radius}
                onChange={(_, value) => handleFilterChange({ radius: value as number })}
                min={1}
                max={50}
                step={1}
                marks={[
                  { value: 1, label: '1 mi' },
                  { value: 10, label: '10 mi' },
                  { value: 25, label: '25 mi' },
                  { value: 50, label: '50 mi' },
                ]}
              />
            </Box>
          </Box>
          
          {/* Budget filters on a separate row */}
          <Box sx={{ mt: 2 }}>
            <Box sx={{ minHeight: '56px', display: 'flex', alignItems: 'center' }}>
              <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                <TextField
                  label="Min Budget"
                  type="number"
                  value={filters.minBudget || ''}
                  onChange={(e) => handleFilterChange({ minBudget: e.target.value ? Number(e.target.value) : undefined })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Max Budget"
                  type="number"
                  value={filters.maxBudget || ''}
                  onChange={(e) => handleFilterChange({ maxBudget: e.target.value ? Number(e.target.value) : undefined })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  sx={{ flex: 1 }}
                />
              </Stack>
            </Box>
          </Box>
          
          {/* Advanced filters */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Advanced Filters
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField
                label="Search Tasks"
                placeholder="Search in titles and descriptions..."
                value={filters.searchText || ''}
                onChange={(e) => handleFilterChange({ searchText: e.target.value })}
                sx={{ flex: 1 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Min Hours"
                type="number"
                value={filters.minHours || ''}
                onChange={(e) => handleFilterChange({ minHours: e.target.value ? Number(e.target.value) : undefined })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">⏱️</InputAdornment>,
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Max Hours"
                type="number"
                value={filters.maxHours || ''}
                onChange={(e) => handleFilterChange({ maxHours: e.target.value ? Number(e.target.value) : undefined })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">⏱️</InputAdornment>,
                }}
                sx={{ flex: 1 }}
              />
            </Stack>
          </Box>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={clearFilters}
            >
              Clear All
            </Button>
            <Typography variant="body2" color="text.secondary">
              {pagination.total} tasks found
            </Typography>
          </Box>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'feed' ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {tasks.map((task) => (
            <Box key={task.taskId} sx={{ flex: '1 1 300px', minWidth: '280px' }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Typography variant="h6" component="h3" noWrap>
                      {task.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Chip
                        label={task.category.replace('_', ' ')}
                        size="small"
                        color="primary"
                      />
                      {'skillMatch' in task && (task as TaskWithDistance).skillMatch?.isGoodMatch && (
                        <Chip
                          label="Suggested match"
                          size="small"
                          color="success"
                          variant="filled"
                          sx={{ 
                            fontSize: '0.7rem',
                            height: '20px',
                            backgroundColor: '#4caf50',
                            color: 'white'
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {task.description.length > 100 
                      ? `${task.description.substring(0, 100)}...` 
                      : task.description
                    }
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">
                        {task.location ? `${task.location.city}, ${task.location.state}` : (task.addressMasked || 'Location available')}
                      </Typography>
                      {'distance' in task && (task as TaskWithDistance).distance && (
                        <Typography variant="body2" color="primary">
                          {formatDistance((task as TaskWithDistance).distance ?? 0)}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AttachMoney fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight="bold">
                        {formatBudget(task.budget)}
                      </Typography>
                    </Box>
                    {task.taskDate && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTime fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatDate(task.taskDate)}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    onClick={() => navigate(`/task/${task.taskId}`)}
                  >
                    View Details
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/task/${task.taskId}`)}
                  >
                    Place Bid
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ height: '600px', width: '100%' }}>
          <TaskMap
            tasks={tasks as TaskWithDistance[]}
            userLocation={userLocation || undefined}
            onTaskClick={(task) => {
              navigate(`/task/${task.taskId}`);
            }}
          />
        </Box>
      )}

      {!loading && tasks.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No tasks found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No tasks found in your area. Try increasing radius or changing filters.
          </Typography>
        </Paper>
      )}

      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Stack direction="row" spacing={1}>
            <Button
              disabled={!pagination.hasPrev}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <Typography sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
              Page {pagination.page} of {pagination.totalPages}
            </Typography>
            <Button
              disabled={!pagination.hasNext}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </Stack>
        </Box>
      )}

      {/* Location Permission Dialog */}
      <Dialog 
        open={showZipDialog} 
        onClose={() => setShowZipDialog(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{ zIndex: 9999 }}
        PaperProps={{
          sx: {
            position: 'relative',
            zIndex: 9999,
            backgroundColor: 'white',
            border: '2px solid #1976d2',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }
        }}
      >
        <DialogTitle>
          Enter Your Location
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            {locationError || 'To discover nearby tasks, we need to know your location.'}
          </Typography>
          <TextField
            fullWidth
            label="ZIP Code"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            placeholder="e.g., 02115"
            variant="outlined"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowZipDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleZipSubmit} variant="contained" disabled={loading}>
            {loading ? 'Finding Location...' : 'Find Tasks'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default TaskDiscovery;
