// src/artisans/artisans.controller.ts
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
  Request,
  HttpStatus,
  ParseIntPipe,
  BadRequestException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiQuery,
  ApiParam,
  ApiBody
} from '@nestjs/swagger';
import { ArtisansService } from './artisans.service';
import { CreateArtisanDto, ServiceDto, PortfolioImageDto } from './dto/create-artisan.dto';
import { UpdateArtisanDto } from './dto/update-artisan.dto';
import { ArtisanFilterDto } from './dto/artisan-filter.dto';
import { SupabaseGuard } from 'src/auth/supabase.guard';

@ApiTags('artisans')
@Controller('artisans')
export class ArtisansController {
  constructor(private readonly artisansService: ArtisansService) {}

  @Post()
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Create artisan profile',
    description: 'Create a new artisan/handy person profile for the authenticated user'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Artisan profile created successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid input or profile already exists' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized' 
  })
  async createArtisan(
    @Request() req,
    @Body() createArtisanDto: CreateArtisanDto
  ) {
    return this.artisansService.createArtisan(req.user.userId, createArtisanDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all artisans',
    description: 'Retrieve a list of artisans with filtering and pagination'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'List of artisans retrieved successfully' 
  })
  async findAll(@Query() filters: ArtisanFilterDto) {
    return this.artisansService.findAll(filters);
  }

  @Get('search')
  @ApiOperation({ 
    summary: 'Search artisans',
    description: 'Search artisans by name, description, city, or suburb'
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'city', required: false, description: 'Filter by city' })
  @ApiQuery({ name: 'suburb', required: false, description: 'Filter by suburb' })
  @ApiQuery({ name: 'minRating', required: false, description: 'Minimum rating', type: Number })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Search results retrieved successfully' 
  })
  async searchArtisans(
    @Query('q') query: string,
    @Query('city') city?: string,
    @Query('suburb') suburb?: string,
    @Query('minRating') minRating?: number
  ) {
    return this.artisansService.searchArtisans(query, { city, suburb, minRating });
  }

  @Get('categories')
  @ApiOperation({ 
    summary: 'Get service categories',
    description: 'Retrieve all unique service categories from artisans'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Categories retrieved successfully' 
  })
  async getCategories() {
    return this.artisansService.getCategories();
  }

  @Get('top-rated')
  @ApiOperation({ 
    summary: 'Get top-rated artisans',
    description: 'Retrieve top-rated artisans (rating >= 4.0)'
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of artisans to return', type: Number })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Top-rated artisans retrieved successfully' 
  })
  async getTopRatedArtisans(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.artisansService.getTopRatedArtisans(limit || 10);
  }

  @Get('suburbs/popular')
  @ApiOperation({ 
    summary: 'Get popular suburbs',
    description: 'Get list of suburbs with most artisans'
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of suburbs to return', type: Number })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Popular suburbs retrieved successfully' 
  })
  async getPopularSuburbs(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.artisansService.getPopularSuburbs(limit || 10);
  }

  @Get('city/:city/suburb/:suburb')
  @ApiOperation({ 
    summary: 'Get artisans by suburb',
    description: 'Retrieve artisans in a specific suburb'
  })
  @ApiParam({ name: 'city', description: 'City name' })
  @ApiParam({ name: 'suburb', description: 'Suburb name' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Artisans retrieved successfully' 
  })
  async getArtisansBySuburb(
    @Param('city') city: string,
    @Param('suburb') suburb: string,
    @Query() filters: Omit<ArtisanFilterDto, 'city' | 'suburb'>
  ) {
    return this.artisansService.getArtisansBySuburb(city, suburb, filters);
  }

  @Get('me')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get current user\'s artisan profile',
    description: 'Retrieve the artisan profile of the authenticated user'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Artisan profile retrieved successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Artisan profile not found' 
  })
  async getMyProfile(@Request() req) {
    return this.artisansService.findByUserId(req.user.userId);
  }

  @Get('me/stats')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get artisan statistics',
    description: 'Get statistics for the authenticated artisan'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Artisan statistics retrieved successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Artisan profile not found' 
  })
  async getMyStats(@Request() req) {
    return this.artisansService.getArtisanStats(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get artisan by ID',
    description: 'Retrieve detailed information about a specific artisan'
  })
  @ApiParam({ name: 'id', description: 'Artisan ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Artisan details retrieved successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Artisan not found' 
  })
  async findById(@Param('id') id: string) {
    return this.artisansService.findById(id);
  }

  @Put('me')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update artisan profile',
    description: 'Update the artisan profile of the authenticated user'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Artisan profile updated successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Artisan profile not found' 
  })
  async updateArtisan(
    @Request() req,
    @Body() updateArtisanDto: UpdateArtisanDto
  ) {
    return this.artisansService.updateArtisan(req.user.userId, updateArtisanDto);
  }

  @Put('me/availability')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update availability',
    description: 'Update the availability status of the artisan'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isAvailable: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Availability updated successfully' 
  })
  async updateAvailability(
    @Request() req,
    @Body('isAvailable') isAvailable: boolean
  ) {
    return this.artisansService.updateAvailability(req.user.userId, isAvailable);
  }

  @Post('me/services')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Add service',
    description: 'Add a new service to the artisan\'s profile'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Service added successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Artisan profile not found' 
  })
  async addService(
    @Request() req,
    @Body() serviceDto: ServiceDto
  ) {
    return this.artisansService.addService(req.user.userId, serviceDto);
  }

  @Put('me/services/:serviceId')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update service',
    description: 'Update an existing service'
  })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Service updated successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Service not found' 
  })
  async updateService(
    @Param('serviceId') serviceId: string,
    @Request() req,
    @Body() serviceDto: Partial<ServiceDto>
  ) {
    return this.artisansService.updateService(serviceId, req.user.userId, serviceDto);
  }

  @Post('me/portfolio')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Add portfolio image',
    description: 'Add a new image to the artisan\'s portfolio'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Portfolio image added successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Artisan profile not found' 
  })
  async addPortfolioImage(
    @Request() req,
    @Body() portfolioDto: PortfolioImageDto
  ) {
    return this.artisansService.addPortfolioImage(req.user.userId, portfolioDto);
  }

  @Delete('me')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Deactivate artisan profile',
    description: 'Deactivate (soft delete) the artisan profile'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Artisan profile deactivated successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Artisan profile not found' 
  })
  async deleteArtisan(@Request() req) {
    return this.artisansService.deleteArtisan(req.user.userId);
  }

  @Get('city/:city')
  @ApiOperation({ 
    summary: 'Get artisans by city',
    description: 'Retrieve artisans in a specific city'
  })
  @ApiParam({ name: 'city', description: 'City name' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Artisans retrieved successfully' 
  })
  async getArtisansByCity(
    @Param('city') city: string,
    @Query() filters: Omit<ArtisanFilterDto, 'city'>
  ) {
    return this.artisansService.findAll({ ...filters, city } as ArtisanFilterDto);
  }

  @Get('service/:service')
  @ApiOperation({ 
    summary: 'Get artisans by service',
    description: 'Retrieve artisans offering a specific service'
  })
  @ApiParam({ name: 'service', description: 'Service name' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Artisans retrieved successfully' 
  })
  async getArtisansByService(
    @Param('service') service: string,
    @Query() filters: Omit<ArtisanFilterDto, 'service'>
  ) {
    return this.artisansService.findAll({ ...filters, service } as ArtisanFilterDto);
  }

  @Get('type/:type')
  @ApiOperation({ 
    summary: 'Get artisans by employment type',
    description: 'Retrieve artisans by type of employment'
  })
  @ApiParam({ name: 'type', description: 'Employment type (employee, self_employed, business_owner)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Artisans retrieved successfully' 
  })
  async getArtisansByType(
    @Param('type') type: string,
    @Query() filters: Omit<ArtisanFilterDto, 'typeOfEmployment'>
  ) {
    // Validate the type parameter
    if (!['employee', 'self_employed', 'business_owner'].includes(type)) {
      throw new BadRequestException('Invalid employment type');
    }
    
    return this.artisansService.findAll({ 
      ...filters, 
      typeOfEmployment: type as any 
    } as ArtisanFilterDto);
  }
}