import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  UseInterceptors,
  UploadedFiles,
  HttpCode, 
  HttpStatus,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiConsumes 
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ListingsService } from './listings.service';
import { SupabaseGuard } from '../auth/supabase.guard';
import { User } from '../common/decorators/user.decorator';
import { CreateListingDto, Condition, ListingType } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ListingFiltersDto } from './dto/listing-filters.dto';

@ApiTags('listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  @UseGuards(SupabaseGuard)
  @UseInterceptors(FilesInterceptor('images', 10))
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBearerAuth('JWT-auth')
  //@ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new listing with images' })
  @ApiResponse({ status: 201, description: 'Listing created successfully with images' })
  @ApiResponse({ status: 401, description: 'Unauthorized - user not authenticated' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data or files' })
  async createListing(
    @User() user: any, 
    @Body() listingData: CreateListingDto,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    console.log('Creating listing with data:', listingData);
    console.log('Uploading files:', files?.length || 0);
    
    if (listingData.listing_type === ListingType.AUCTION && !listingData.auction_end) {
      throw new BadRequestException('auction_end is required for auction listings');
    }
    
    if (listingData.auction_end) {
      const auctionEndDate = new Date(listingData.auction_end);
      if (isNaN(auctionEndDate.getTime())) {
        throw new BadRequestException('Invalid auction_end date format. Use ISO string format (YYYY-MM-DDTHH:mm:ss.sssZ).');
      }
      if (auctionEndDate <= new Date()) {
        throw new BadRequestException('auction_end must be in the future');
      }
    }
    
    // Validate files if provided
    if (files && files.length > 0) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      files.forEach(file => {
        if (!file.mimetype.startsWith('image/')) {
          throw new BadRequestException(`File ${file.originalname} is not an image`);
        }
        if (file.size > maxSize) {
          throw new BadRequestException(`Image ${file.originalname} exceeds 5MB size limit`);
        }
      });
    }
    
    return this.listingsService.createListing({
      ...listingData,
      seller_id: user.id
    }, files);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all listings with filters',
    description: 'Retrieve paginated listings with optional filters for search, category, price range, etc.'
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
    type: String,
    example: 'Electronics'
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in title and description',
    type: String,
    example: 'iPhone'
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    description: 'Minimum price filter',
    type: Number,
    example: 100
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    description: 'Maximum price filter',
    type: Number,
    example: 1000
  })
  @ApiQuery({
    name: 'condition',
    required: false,
    description: 'Filter by condition',
    enum: Object.values(Condition),
    example: Condition.NEW
  })
  @ApiQuery({
    name: 'listing_type',
    required: false,
    description: 'Filter by listing type',
    enum: Object.values(ListingType),
    example: ListingType.AUCTION
  })
  @ApiQuery({
    name: 'seller_id',
    required: false,
    description: 'Filter by seller ID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiQuery({
    name: 'city',
    required: false,
    description: 'Filter by city',
    type: String,
    example: 'New York'
  })
  @ApiQuery({
    name: 'suburb',
    required: false,
    description: 'Filter by suburb',
    type: String,
    example: 'New York'
  })
  @ApiQuery({
    type: PaginationDto,
    required: false,
    description: 'Pagination parameters'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Listings retrieved successfully',
  })
  async getListings(
    @Query(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false })) pagination: PaginationDto,
    @Query() filters: ListingFiltersDto
  ) {
    return this.listingsService.findAll({ 
      ...pagination, 
      ...filters 
    });
  }


  @Get(':id')
  @ApiOperation({ 
    summary: 'Get listing by ID',
    description: 'Retrieve detailed information about a specific listing'
  })
  @ApiParam({
    name: 'id',
    description: 'Listing ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Listing retrieved successfully',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Listing not found',
  })
  async getListing(@Param('id') id: string) {
    const listing = await this.listingsService.findById(id);
    await this.listingsService.incrementViews(id);
    return listing;
  }

  @Put(':id')
  @UseGuards(SupabaseGuard)
  @UseInterceptors(FilesInterceptor('images', 10))
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBearerAuth('JWT-auth')
  //@ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update listing with optional images', description: 'Update an existing listing. Can update any fields and optionally upload new images.' })
  @ApiResponse({ status: 200, description: 'Listing updated successfully',})
  @ApiResponse({ status: 401, description: 'Unauthorized - not listing owner', })
  @ApiResponse({ status: 404, description: 'Listing not found',})
  async updateListing(
    @User() user: any,
    @Param('id') id: string, 
    @Body() updateData: UpdateListingDto,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    console.log('Update data:', updateData);
    console.log('Uploading files for update:', files?.length || 0);

    if (updateData.imagesToDelete && updateData.imagesToDelete.length > 0) {
      console.log(`Marking ${updateData.imagesToDelete.length} images for deletion`);
    }
    
    // ✅ Validate that auction_end is required when updating to auction listing
    if (updateData.listing_type === 'auction' && !updateData.auction_end) {
      throw new BadRequestException('auction_end is required when updating to auction listing');
    }
    
    // ✅ Validate auction_end date format if provided
    if (updateData.auction_end) {
      const auctionEndDate = new Date(updateData.auction_end);
      if (isNaN(auctionEndDate.getTime())) {
        throw new BadRequestException('Invalid auction_end date format. Use ISO string format (YYYY-MM-DDTHH:mm:ss.sssZ).');
      }
      // Ensure auction_end is in the future if provided
      if (auctionEndDate <= new Date()) {
        throw new BadRequestException('auction_end must be in the future');
      }
    }
    
    // Validate files if provided
    if (files && files.length > 0) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      files.forEach(file => {
        if (!file.mimetype.startsWith('image/')) {
          throw new BadRequestException(`File ${file.originalname} is not an image`);
        }
        if (file.size > maxSize) {
          throw new BadRequestException(`Image ${file.originalname} exceeds 5MB size limit`);
        }
      });
    }

    if (updateData.imagesToDelete && updateData.imagesToDelete.length > 0) {
      if (!Array.isArray(updateData.imagesToDelete)) {
        throw new BadRequestException('imagesToDelete must be an array of strings');
      }
      
      updateData.imagesToDelete.forEach((url, index) => {
        if (typeof url !== 'string') {
          throw new BadRequestException(`imagesToDelete[${index}] must be a string`);
        }
      });
    }
    
    return this.listingsService.updateListing(id, updateData, files);
  }

  @Delete(':id')
  @UseGuards(SupabaseGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete listing',description: 'Delete a listing (only by owner or admin) - Images will also be deleted from storage'})
  @ApiResponse({ status: 204, description: 'Listing deleted successfully (including images)',})
  @ApiResponse({ status: 401, description: 'Unauthorized - not listing owner', })
  @ApiResponse({ status: 404, description: 'Listing not found', })
  async deleteListing(@Param('id') id: string, @User() user: any) {
    return this.listingsService.deleteListing(id, user.id);
  }

  @Get('user/:userId')
  @ApiOperation({ 
    summary: 'Get listings by user',
    description: 'Retrieve all listings for a specific user'
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Listings retrieved successfully',
  })
  async getListingsByUser(@Param('userId') userId: string) {
    return this.listingsService.findByUserId(userId);
  }

  @Post(':id/bid')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Place a bid on auction listing',
    description: 'Place a bid on an auction listing'
  })
  @ApiParam({
    name: 'id',
    description: 'Listing ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', example: 150.50 }
      },
      required: ['amount']
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Bid placed successfully',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid bid amount or listing not an auction',
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Listing not found',
  })
  async placeBid(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @User() user: any
  ) {
    return this.listingsService.placeBid(id, user.id, amount);
  }

  @Get('auctions/active')
  @ApiOperation({ 
    summary: 'Get active auctions',
    description: 'Retrieve all active auction listings'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Active auctions retrieved successfully',
  })
  async getActiveAuctions() {
    return this.listingsService.getActiveAuctions();
  }

  @Get('search/advanced')
  @ApiOperation({ 
    summary: 'Advanced search listings',
    description: 'Search listings with multiple filters and sorting options'
  })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Search query for title and description',
    type: String,
    example: 'iPhone'
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
    type: String,
    example: 'Electronics'
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    description: 'Minimum price',
    type: Number,
    example: 100
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    description: 'Maximum price',
    type: Number,
    example: 1000
  })
  @ApiQuery({
    name: 'condition',
    required: false,
    description: 'Filter by condition',
    enum: Object.values(Condition),
    example: Condition.NEW
  })
  @ApiQuery({
    name: 'city',
    required: false,
    description: 'Filter by city',
    type: String,
    example: 'Harare'
  })
  @ApiQuery({
    name: 'suburb',
    required: false,
    description: 'Filter by suburb',
    type: String,
    example: 'Mkoba'
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field to sort by',
    enum: ['created_at', 'price_amount', 'title'],
    example: 'created_at'
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Search results retrieved successfully',
  })
  async searchListings(
    @Query('query') query?: string,
    @Query('category') category?: string,
    @Query('minPrice', new DefaultValuePipe(undefined), ParseIntPipe) minPrice?: number,
    @Query('maxPrice', new DefaultValuePipe(undefined), ParseIntPipe) maxPrice?: number,
    @Query('condition') condition?: string,
    @Query('city') city?: string,
    @Query('suburb') suburb?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    return this.listingsService.searchListings({
      query,
      category,
      minPrice,
      maxPrice,
      condition,
      city,
      suburb,
      sortBy,
      sortOrder
    });
  }
}