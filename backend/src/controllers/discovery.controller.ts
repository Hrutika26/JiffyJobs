import { Response } from 'express';
import { AuthRequest } from '../types';
import * as discoveryService from '../services/discovery.service';
import { DiscoveryFilter } from '../types/task.types';

export const discoverTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Parse query parameters
    const {
      latitude,
      longitude,
      radius,
      category,
      minBudget,
      maxBudget,
      startDate,
      endDate,
      searchText,
      minHours,
      maxHours,
      page,
      limit,
      sortBy,
      sortOrder
    } = req.query;

    // Validate required parameters
    if (!latitude || !longitude) {
      res.status(400).json({ 
        error: 'Location coordinates (latitude, longitude) are required' 
      });
      return;
    }

    const rawSearch = typeof searchText === 'string' ? searchText.trim() : '';
    const parsedMinHours = minHours !== undefined && minHours !== '' ? parseInt(minHours as string, 10) : undefined;
    const parsedMaxHours = maxHours !== undefined && maxHours !== '' ? parseInt(maxHours as string, 10) : undefined;

    // Build filter object
    const filters: DiscoveryFilter = {
      latitude: parseFloat(latitude as string),
      longitude: parseFloat(longitude as string),
      radius: radius ? parseFloat(radius as string) : 3,
      category: category as any,
      minBudget: minBudget ? parseFloat(minBudget as string) : undefined,
      maxBudget: maxBudget ? parseFloat(maxBudget as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      searchText: rawSearch.length > 0 ? rawSearch : undefined,
      minHours: parsedMinHours !== undefined && !isNaN(parsedMinHours) ? parsedMinHours : undefined,
      maxHours: parsedMaxHours !== undefined && !isNaN(parsedMaxHours) ? parsedMaxHours : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      sortBy: (sortBy as any) || 'proximity',
      sortOrder: (sortOrder as any) || 'asc'
    };

    // Validate numeric parameters
    if (filters.latitude === undefined || filters.longitude === undefined || 
        isNaN(filters.latitude) || isNaN(filters.longitude)) {
      res.status(400).json({ error: 'Invalid latitude or longitude' });
      return;
    }

    if (filters.radius !== undefined && (filters.radius < 0 || filters.radius > 100)) {
      res.status(400).json({ error: 'Radius must be between 0 and 100 miles' });
      return;
    }

    if (filters.page !== undefined && filters.page < 1) {
      res.status(400).json({ error: 'Page must be greater than 0' });
      return;
    }

    if (filters.limit !== undefined && (filters.limit < 1 || filters.limit > 100)) {
      res.status(400).json({ error: 'Limit must be between 1 and 100' });
      return;
    }

    const result = await discoveryService.discoverTasks(req.user.userId, filters);

    res.status(200).json({
      message: 'Tasks discovered successfully',
      ...result
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to discover tasks' });
    }
  }
};

export const getNearbyTasksCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude) {
      res.status(400).json({ 
        error: 'Location coordinates (latitude, longitude) are required' 
      });
      return;
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const rad = radius ? parseFloat(radius as string) : 3;

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ error: 'Invalid latitude or longitude' });
      return;
    }

    const count = await discoveryService.getNearbyTasksCount(
      req.user.userId,
      lat,
      lng,
      rad
    );

    res.status(200).json({ count });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to get nearby tasks count' });
    }
  }
};
