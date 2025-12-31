import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Auction } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuctionsService {
  constructor(
    private readonly supabaseService: SupabaseService 
  ) {}

  async findById(id: string): Promise<Auction> {
    const supabase = this.supabaseService.getClient();
  
    const { data: auction, error } = await supabase
      .from('auctions')
      .select(`
        *,
        listing:listings (
          *,
          seller:seller_id (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !auction) {
      throw new NotFoundException('Auction not found');
    }

    // Calculate time remaining
    const now = new Date();
    const endTime = new Date(auction.auction_end);
    const timeRemaining = Math.max(0, endTime.getTime() - now.getTime());
    
    return {
      ...auction,
      time_remaining: timeRemaining,
      ending_soon: timeRemaining < 3600000, // Less than 1 hour
      is_expired: timeRemaining === 0,
    };
  }

  async findByListingId(listingId: string): Promise<Auction> {
    const supabase = this.supabaseService.getClient();
  
    const { data: auction, error } = await supabase
      .from('auctions')
      .select(`
        *,
        listing:listings (
          *,
          seller:seller_id (*)
        )
      `)
      .eq('listing_id', listingId)
      .single();

    if (error || !auction) {
      throw new NotFoundException('Auction not found for this listing');
    }

    return this.enrichAuctionData(auction);
  }

  // ✅ Get all auctions with pagination and filtering (UPDATED for new table)
  async getAllAuctions(
    page: number = 1,
    limit: number = 20,
    status?: string,
    category?: string,
    search?: string,
    minPrice?: number,
    maxPrice?: number,
    endingSoon?: boolean,
    sortBy?: 'created_at' | 'auction_end' | 'current_bid' | 'bid_count',
    sortOrder?: 'asc' | 'desc'
  ): Promise<{
    auctions: Auction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const supabase = this.supabaseService.getClient();
    
    const offset = (page - 1) * limit;

    // Build the base query with count
    let query = supabase
      .from('auctions')
      .select(`
        *,
        listing:listings (
          *,
          seller:seller_id (*)
        )
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('listing.category', category);
    }

    if (search) {
      query = query.or(`listing.title.ilike.%${search}%,listing.description.ilike.%${search}%`);
    }

    if (minPrice !== undefined) {
      query = query.gte('current_bid', minPrice);
    }

    if (maxPrice !== undefined) {
      query = query.lte('current_bid', maxPrice);
    }

    // Filter for ending soon (less than 1 hour remaining)
    if (endingSoon) {
      const oneHourFromNow = new Date();
      oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
      query = query.lte('auction_end', oneHourFromNow.toISOString())
                  .gte('auction_end', new Date().toISOString()); // Not expired yet
    } else {
      query = query.gte('auction_end', new Date().toISOString());
    }

    // Apply sorting
    const sortField = sortBy || 'created_at';
    const order = sortOrder || 'desc';
    
    if (sortField === 'auction_end') {
      query = query.order('auction_end', { ascending: order === 'asc' });
    } else if (sortField === 'current_bid') {
      query = query.order('current_bid', { ascending: order === 'asc' });
    } else if (sortField === 'bid_count') {
      query = query.order('bid_count', { ascending: order === 'asc' });
    } else {
      query = query.order('created_at', { ascending: order === 'asc' });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: auctions, error, count } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch auctions: ${error.message}`);
    }

    // Add calculated fields
    const enrichedAuctions = (auctions || []).map(auction => this.enrichAuctionData(auction));

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      auctions: enrichedAuctions,
      total,
      page,
      totalPages,
    };
  }

  async placeBid(auctionId: string, bidderId: string, bidAmount: number, currency: string = 'USD'): Promise<Bid> {
    const supabase = this.supabaseService.getClient();
    
    // Get auction details
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select(`
        status,
        auction_end,
        current_bid,
        starting_price,
        bid_count, 
        listing_id,
        listing:listings (seller_id)
      `)
      .eq('id', auctionId)
      .single();

    if (auctionError || !auction) {
      throw new NotFoundException('Auction not found');
    }

    const listing = Array.isArray(auction.listing) ? auction.listing[0] : auction.listing;

    // Check if auction is still active
    if (auction.status !== 'active') {
      throw new BadRequestException('Auction is not active');
    }

    // Check if auction has ended
    if (new Date(auction.auction_end) < new Date()) {
      throw new BadRequestException('Auction has ended');
    }

    // Check if bidder is the seller
    if (listing && listing.seller_id === bidderId) {
      throw new BadRequestException('You cannot bid on your own auction');
    }

    // Calculate minimum bid
    const currentBid = auction.current_bid || auction.starting_price;
    const minIncrement = Math.max(currentBid * 0.05, 1); // 5% minimum increment or $1
    
    if (bidAmount <= currentBid) {
      throw new BadRequestException(`Bid must be higher than current bid ($${currentBid.toFixed(2)})`);
    }

    if (bidAmount < currentBid + minIncrement) {
      throw new BadRequestException(`Bid must increase by at least $${minIncrement.toFixed(2)}`);
    }

    // Start transaction (Supabase doesn't have explicit transactions, but we'll handle it)
    try {
      // Create the bid (you need a bids table)
      const bidId = uuidv4();
      const { data: bid, error: bidError } = await supabase
        .from('bids') // Assuming you have a bids table
        .insert({
          id: bidId,
          auction_id: auctionId,
          bidder_id: bidderId,
          bid_amount: bidAmount,
          bid_currency: currency || 'USD',
          bid_time: new Date().toISOString(),
          is_winning: false,
        })
        .select()
        .single();

      if (bidError) {
        console.warn('Bids table not found, updating auction only');
      }

      const currentBidCount = auction.bid_count || 0;

      // Update auction current bid and bid count
      const { error: updateError } = await supabase
        .from('auctions')
        .update({
          current_bid: bidAmount,
          bid_count: currentBidCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', auctionId);

      if (updateError) {
        throw new BadRequestException(`Failed to update auction: ${updateError.message}`);
      }

      return {
        id: bid.id,
        auction_id: bid.auction_id,
        bidder_id: bid.bidder_id,
        bid_amount: bid.bid_amount,
        bid_currency: bid.bid_currency,
        bid_time: bid.bid_time,
        is_winning: bid.is_winning,
        status: 'active',
      } as Bid;
      
    } catch (error) {
      throw new BadRequestException(`Failed to place bid: ${error.message}`);
    }
  }

  async getAuctionBids(auctionId: string): Promise<Bid[]> {
    const supabase = this.supabaseService.getClient();
    
    try {
      const { data: bids, error } = await supabase
        .from('bids') // Assuming you have a bids table
        .select(`
          *,
          bidder:seller_id (*)
        `)
        .eq('auction_id', auctionId)
        .order('bid_amount', { ascending: false });

      if (error) {
        console.warn('Bids table not found, returning empty array');
        return [];
      }

      return (bids || []).map(bid => ({
        id: bid.id,
        auction_id: bid.auction_id,
        bidder_id: bid.bidder_id,
        bid_amount: bid.bid_amount,
        bid_currency: bid.bid_currency,
        bid_time: bid.bid_time,
        is_winning: bid.is_winning,
        status: bid.is_winning ? 'winning' : 'active', // Derive status from is_winning
        bidder: bid.bidder,
        created_at: bid.created_at,
      }));

    } catch (error) {
      console.error('Error fetching bids:', error);
      return [];
    }
  }

  async endAuction(auctionId: string): Promise<Auction> {
    const supabase = this.supabaseService.getClient();
    
    // Get auction and highest bid
    let highestBid: any = null;
    
    try {
      const { data: bids } = await supabase
        .from('bids')
        .select('*')
        .eq('auction_id', auctionId)
        .order('bid_amount', { ascending: false })
        .limit(1)
        .single();

      highestBid = bids;
    } catch (error) {
      console.log('No bids found for auction:', auctionId);
    }

    let updateData: any = {
      status: 'ended',
      updated_at: new Date().toISOString(),
    };

    if (highestBid) {
      updateData.winning_bidder_id = highestBid.bidder_id;
      
      await supabase
        .from('bids')
        .update({ is_winning: true })
        .eq('id', highestBid.id);

      // Update listing status to sold
      const { data: auction } = await supabase
        .from('auctions')
        .select('listing_id')
        .eq('id', auctionId)
        .single();

      if (auction) {
        await supabase
          .from('listings')
          .update({ status: 'sold' })
          .eq('id', auction.listing_id);
      }
    }

    const { data: auction, error } = await supabase
      .from('auctions')
      .update(updateData)
      .eq('id', auctionId)
      .select(`
        *,
        listing:listings (*)
      `)
      .single();

    if (error) {
      throw new BadRequestException(`Failed to end auction: ${error.message}`);
    }

    return this.enrichAuctionData(auction);
  }

  async getActiveAuctions(): Promise<Auction[]> {
    const supabase = this.supabaseService.getClient();
    
    const now = new Date().toISOString();
    
    const { data: auctions, error } = await supabase
      .from('auctions')
      .select(`
        *,
        listing:listings (
          *,
          seller:seller_id (*)
        )
      `)
      .eq('status', 'active')
      .gte('auction_end', now) // Not ended yet
      .order('auction_end', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch active auctions: ${error.message}`);
    }

    return (auctions || []).map(auction => this.enrichAuctionData(auction));
  }

  async getUserBidAuctions(userId: string): Promise<Auction[]> {
    const supabase = this.supabaseService.getClient();
    
    try {
      // Get auctions where user has placed bids
      const { data: bids, error: bidsError } = await supabase
        .from('bids')
        .select('auction_id')
        .eq('bidder_id', userId);

      if (bidsError || !bids || bids.length === 0) {
        return [];
      }

      const auctionIds = bids.map(bid => bid.auction_id);
      
      const { data: auctions, error } = await supabase
        .from('auctions')
        .select(`
          *,
          listing:listings (
            *,
            seller:seller_id (*)
          )
        `)
        .in('id', auctionIds)
        .order('auction_end', { ascending: true });

      if (error) {
        return [];
      }

      return (auctions || []).map(auction => this.enrichAuctionData(auction));
    } catch (error) {
      return [];
    }
  }

  async getUserAuctions(userId: string): Promise<Auction[]> {
    const supabase = this.supabaseService.getClient();
    
    const { data: auctions, error } = await supabase
      .from('auctions')
      .select(`
        *,
        listing:listings!inner (
          *,
          seller:seller_id (*)
        )
      `)
      .eq('listing.seller_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch user auctions: ${error.message}`);
    }

    return (auctions || []).map(auction => this.enrichAuctionData(auction));
  }

  async extendAuction(auctionId: string, additionalMinutes: number): Promise<Auction> {
    const supabase = this.supabaseService.getClient();
    
    // Get current end time
    const { data: auction } = await supabase
      .from('auctions')
      .select('auction_end, status')
      .eq('id', auctionId)
      .single();

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.status !== 'active') {
      throw new BadRequestException('Only active auctions can be extended');
    }

    // Calculate new end time (max 24 hours extension)
    const maxExtension = 24 * 60; // 24 hours in minutes
    if (additionalMinutes > maxExtension) {
      throw new BadRequestException(`Cannot extend auction by more than ${maxExtension} minutes (24 hours)`);
    }

    const currentEnd = new Date(auction.auction_end);
    const newEndTime = new Date(currentEnd.getTime() + additionalMinutes * 60000);

    // Update auction end time
    const { data: updatedAuction, error } = await supabase
      .from('auctions')
      .update({
        auction_end: newEndTime.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to extend auction: ${error.message}`);
    }

    return this.enrichAuctionData(updatedAuction);
  }

  async cancelAuction(auctionId: string, reason: string): Promise<Auction> {
    const supabase = this.supabaseService.getClient();
    
    // Check if auction has bids
    const { data: bids } = await supabase
      .from('bids')
      .select('id')
      .eq('auction_id', auctionId)
      .limit(1);

    if (bids && bids.length > 0) {
      throw new BadRequestException('Cannot cancel auction with existing bids');
    }

    const { data: auction, error } = await supabase
      .from('auctions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId)
      .eq('status', 'active') // Can only cancel active auctions
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to cancel auction: ${error.message}`);
    }

    return this.enrichAuctionData(auction);
  }

  async getAuctionStats(): Promise<{
    total: number;
    active: number;
    ended: number;
    cancelled: number;
    totalBids: number;
    totalValue: number;
    averageBidsPerAuction: number;
  }> {
    const supabase = this.supabaseService.getClient();
    
    // Get auction counts
    const { data: auctions, error: aucError } = await supabase
      .from('auctions')
      .select('status', { count: 'exact' });

    if (aucError) {
      throw new BadRequestException(`Failed to get auction stats: ${aucError.message}`);
    }

    // Get total bids count
    let totalBids = 0;
    try {
      const { count } = await supabase
        .from('bids')
        .select('*', { count: 'exact' });
      totalBids = count || 0;
    } catch (error) {
      const { data: auctionsWithBids } = await supabase
        .from('auctions')
        .select('bid_count');
      
      totalBids = auctionsWithBids?.reduce((sum, auc) => sum + (auc.bid_count || 0), 0) || 0;
    }

    // Get total value of ended auctions
    const { data: endedAuctions } = await supabase
      .from('auctions')
      .select('current_bid')
      .eq('status', 'ended')
      .not('current_bid', 'is', null);

    const totalValue = endedAuctions?.reduce((sum, auc) => sum + (auc.current_bid || 0), 0) || 0;

    const total = auctions?.length || 0;
    const stats = {
      total,
      active: auctions?.filter(a => a.status === 'active').length || 0,
      ended: auctions?.filter(a => a.status === 'ended').length || 0,
      cancelled: auctions?.filter(a => a.status === 'cancelled').length || 0,
      totalBids,
      totalValue,
      averageBidsPerAuction: total > 0 ? totalBids / total : 0,
    };

    return stats;
  }

  async checkAndEndExpiredAuctions(): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    const now = new Date().toISOString();
    
    // Find expired active auctions
    const { data: expiredAuctions } = await supabase
      .from('auctions')
      .select('id')
      .eq('status', 'active')
      .lt('auction_end', now);

    if (!expiredAuctions || expiredAuctions.length === 0) return;

    // End each expired auction
    for (const auction of expiredAuctions) {
      try {
        await this.endAuction(auction.id);
      } catch (error) {
        console.error(`Failed to end auction ${auction.id}:`, error);
      }
    }
  }

  // Helper method to enrich auction data with calculated fields
  private enrichAuctionData(auction: any): Auction {
    const now = new Date();
    const endTime = new Date(auction.auction_end);
    const timeRemaining = Math.max(0, endTime.getTime() - now.getTime());
    
    return {
      ...auction,
      time_remaining: timeRemaining,
      ending_soon: timeRemaining < 3600000, // Less than 1 hour
      is_expired: timeRemaining === 0 && auction.status === 'active',
      minutes_remaining: Math.floor(timeRemaining / 60000),
      hours_remaining: Math.floor(timeRemaining / 3600000),
      days_remaining: Math.floor(timeRemaining / 86400000),
    };
  }
}