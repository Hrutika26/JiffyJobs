import { Response } from 'express';
import { AuthRequest } from '../types';
import * as bidService from '../services/bid.service';
import { CreateBidRequest, WithdrawBidRequest, AcceptBidRequest, BidFilter, BidSortOptions } from '../types';

// Place a bid on a task
export const placeBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const bidData: CreateBidRequest = req.body;

    // Validation
    if (!bidData.taskId || !bidData.amount) {
      res.status(400).json({ error: 'Missing required fields: taskId, amount' });
      return;
    }

    if (typeof bidData.amount !== 'number' || bidData.amount <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number' });
      return;
    }

    if (bidData.note && typeof bidData.note === 'string' && bidData.note.length > 500) {
      res.status(400).json({ error: 'Note cannot exceed 500 characters' });
      return;
    }

    const bid = await bidService.placeBid(req.user.userId, bidData);

    res.status(201).json({
      message: 'Bid placed successfully',
      bid,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Withdraw a bid
export const withdrawBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { bidId } = req.params;
    const withdrawData: WithdrawBidRequest = { bidId };

    if (!bidId) {
      res.status(400).json({ error: 'Bid ID is required' });
      return;
    }

    await bidService.withdrawBid(req.user.userId, withdrawData);

    res.status(200).json({
      message: 'Bid withdrawn successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Accept a bid (poster only)
export const acceptBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { bidId } = req.params;
    const acceptData: AcceptBidRequest = { bidId };

    if (!bidId) {
      res.status(400).json({ error: 'Bid ID is required' });
      return;
    }

    const contract = await bidService.acceptBid(req.user.userId, acceptData);

    res.status(200).json({
      message: 'Bid accepted successfully',
      contract,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Get bids for a task
export const getTaskBids = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { taskId } = req.params;
    const { status, sortBy, sortOrder } = req.query;

    if (!taskId) {
      res.status(400).json({ error: 'Task ID is required' });
      return;
    }

    // Build filter
    const filter: BidFilter = {};
    if (status && typeof status === 'string') {
      filter.status = status as any;
    }

    // Build sort options
    let sort: BidSortOptions | undefined;
    if (sortBy && sortOrder) {
      sort = {
        field: sortBy as any,
        order: sortOrder as 'asc' | 'desc'
      };
    }

    const bids = await bidService.getTaskBids(req.user.userId, taskId, filter, sort);

    res.status(200).json({
      message: 'Bids retrieved successfully',
      bids,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Get helper's bids
export const getHelperBids = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { status, taskId, sortBy, sortOrder } = req.query;

    // Build filter
    const filter: BidFilter = {};
    if (status && typeof status === 'string') {
      filter.status = status as any;
    }
    if (taskId && typeof taskId === 'string') {
      filter.taskId = taskId;
    }

    // Build sort options
    let sort: BidSortOptions | undefined;
    if (sortBy && sortOrder) {
      sort = {
        field: sortBy as any,
        order: sortOrder as 'asc' | 'desc'
      };
    }

    const bids = await bidService.getHelperBids(req.user.userId, filter, sort);

    res.status(200).json({
      message: 'Bids retrieved successfully',
      bids,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Get contract for a task
export const getTaskContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { taskId } = req.params;

    if (!taskId) {
      res.status(400).json({ error: 'Task ID is required' });
      return;
    }

    const contract = await bidService.getTaskContract(taskId);

    if (!contract) {
      res.status(404).json({ error: 'Contract not found' });
      return;
    }

    res.status(200).json({
      message: 'Contract retrieved successfully',
      contract,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Get contract by ID
export const getContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contractId } = req.params;

    if (!contractId) {
      res.status(400).json({ error: 'Contract ID is required' });
      return;
    }

    const contract = await bidService.getContract(contractId);

    if (!contract) {
      res.status(404).json({ error: 'Contract not found' });
      return;
    }

    res.status(200).json({
      message: 'Contract retrieved successfully',
      contract,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Update contract
export const updateContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contractId } = req.params;
    const { startDate, endDate, terms } = req.body;

    if (!contractId) {
      res.status(400).json({ error: 'Contract ID is required' });
      return;
    }

    const updates: any = {};
    if (startDate) updates.startDate = new Date(startDate);
    if (endDate) updates.endDate = new Date(endDate);
    if (terms) updates.terms = terms;

    const contract = await bidService.updateContract(contractId, updates);

    res.status(200).json({
      message: 'Contract updated successfully',
      contract,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Deactivate contract
export const deactivateContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contractId } = req.params;

    if (!contractId) {
      res.status(400).json({ error: 'Contract ID is required' });
      return;
    }

    await bidService.deactivateContract(contractId);

    res.status(200).json({
      message: 'Contract deactivated successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
