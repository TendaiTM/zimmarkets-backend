import { Controller, Get, Post, Put, Body, Param, UseGuards, HttpCode, HttpStatus, Query, DefaultValuePipe, ParseIntPipe, ParseBoolPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuctionsService } from './auctions.service';
import { Auction } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { SupabaseGuard } from '../auth/supabase.guard';
import { User } from '../common/decorators/user.decorator';
import { PlaceBidDto } from './dto/place-bid.dto';

@ApiTags('auctions')
@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  // ✅ Get all auctions with pagination and filtering
  @Get()
  @ApiOperation({ 
    summary: 'Get all auctions with pagination and filtering',
    description: 'Retrieve auctions with various filters, sorting, and pagination options'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', example: 'active' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category', example: 'Vehicles' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in title/description', example: 'car' })
  @ApiQuery({ name: 'minPrice', required: false, description: 'Minimum current bid', example: 100 })
  @ApiQuery({ name: 'maxPrice', required: false, description: 'Maximum current bid', example: 1000 })
  @ApiQuery({ name: 'endingSoon', required: false, description: 'Show auctions ending in <1 hour', example: true })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field', enum: ['created_at', 'auction_end', 'current_bid', 'bid_count'] })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort direction', enum: ['asc', 'desc'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Auctions retrieved successfully',
    schema: {
      example: {
        auctions: [],
        total: 0,
        page: 1,
        totalPages: 0
      }
    }
  })
  async getAllAuctions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('endingSoon') endingSoon?: boolean,
    @Query('sortBy') sortBy?: 'created_at' | 'auction_end' | 'current_bid' | 'bid_count',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ): Promise<{
    auctions: Auction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Parse numeric query parameters
    const minPriceNum = minPrice ? Number(minPrice) : undefined;
    const maxPriceNum = maxPrice ? Number(maxPrice) : undefined;
    
    return this.auctionsService.getAllAuctions(
      page,
      limit,
      status,
      category,
      search,
      minPriceNum,
      maxPriceNum,
      endingSoon,
      sortBy,
      sortOrder
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get auction by ID' })
  @ApiParam({ name: 'id', description: 'Auction ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Auction found', type: Auction })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  async findOne(@Param('id') id: string): Promise<Auction> {
    return this.auctionsService.findById(id);
  }

  @Get('listing/:listingId')
  @ApiOperation({ summary: 'Get auction by listing ID' })
  @ApiParam({ name: 'listingId', description: 'Listing ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Auction found', type: Auction })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  async findByListingId(@Param('listingId') listingId: string): Promise<Auction> {
    return this.auctionsService.findByListingId(listingId);
  }

  @Get('active/list')
  @ApiOperation({ summary: 'Get all active auctions' })
  @ApiResponse({ status: 200, description: 'List of active auctions', type: [Auction] })
  async getActiveAuctions(): Promise<Auction[]> {
    return this.auctionsService.getActiveAuctions();
  }

  @Post(':id/bids')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Place a bid on an auction' })
  @ApiParam({ name: 'id', description: 'Auction ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 201, description: 'Bid placed successfully', type: Bid })
  @ApiResponse({ status: 400, description: 'Bid amount too low or invalid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Auction not found or not active' })
  @HttpCode(HttpStatus.CREATED)
  async placeBid(
    @Param('id') auctionId: string,
    @User() user: any,
    @Body() placeBidDto: PlaceBidDto
  ): Promise<Bid> {
    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }
    
    return this.auctionsService.placeBid(
      auctionId, 
      user.id, 
      placeBidDto.bid_amount,
      placeBidDto.currency || 'USD'
    ); 
  }

  @Get(':id/bids')
  @ApiOperation({ summary: 'Get all bids for an auction' })
  @ApiParam({ name: 'id', description: 'Auction ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'List of bids', type: [Bid] })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  async getBids(@Param('id') auctionId: string): Promise<Bid[]> {
    return this.auctionsService.getAuctionBids(auctionId);
  }

  @Put(':id/end')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'End an auction' })
  @ApiParam({ name: 'id', description: 'Auction ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Auction ended successfully', type: Auction })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  async endAuction(
    @Param('id') auctionId: string
  ): Promise<Auction> {
    return this.auctionsService.endAuction(auctionId);
  }

  @Get('user/my-bids')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get auctions the user has bid on' })
  @ApiResponse({ status: 200, description: 'List of auctions with user bids', type: [Auction] })
  async getUserBidAuctions(@User() user: any): Promise<Auction[]> {
    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }
    return this.auctionsService.getUserBidAuctions(user.id);
  }

  @Get('user/my-auctions')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get auctions created by the user' })
  @ApiResponse({ status: 200, description: 'List of user auctions', type: [Auction] })
  async getUserAuctions(@User() user: any): Promise<Auction[]> {
    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }
    return this.auctionsService.getUserAuctions(user.id);
  }
}