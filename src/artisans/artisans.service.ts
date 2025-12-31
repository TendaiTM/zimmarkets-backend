// src/artisans/artisans.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateArtisanDto, ServiceDto, PortfolioImageDto, EmploymentType } from './dto/create-artisan.dto';
import { UpdateArtisanDto } from './dto/update-artisan.dto';
import { ArtisanFilterDto } from './dto/artisan-filter.dto';

@Injectable()
export class ArtisansService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.getClient();
  }

  async createArtisan(userId: string, createArtisanDto: CreateArtisanDto) {
    // Check if artisan already exists for this user
    const { data: existingArtisan } = await this.supabase
      .from('artisans')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingArtisan) {
      throw new BadRequestException('Artisan profile already exists for this user');
    }

    // Create artisan profile
    const artisanData = {
      user_id: userId,
      business_name: createArtisanDto.businessName,
      description: createArtisanDto.description,
      type_of_employment: createArtisanDto.typeOfEmployment,
      years_of_experience: createArtisanDto.yearsOfExperience,
      address: createArtisanDto.address,
      suburb: createArtisanDto.suburb,
      city: createArtisanDto.city,
      country: createArtisanDto.country || 'Zimbabwe',
      phone_number: createArtisanDto.phoneNumber,
      whatsapp_number: createArtisanDto.whatsappNumber,
      email: createArtisanDto.email,
      is_available: true,
    };

    const { data: artisan, error: artisanError } = await this.supabase
      .from('artisans')
      .insert(artisanData)
      .select()
      .single();

    if (artisanError) throw new BadRequestException(artisanError.message);

    // Create services if provided
    if (createArtisanDto.services && createArtisanDto.services.length > 0) {
      const servicesData = createArtisanDto.services.map(service => ({
        artisan_id: artisan.id,
        service_name: service.serviceName,
        category: service.category,
        description: service.description,
        hourly_rate: service.hourlyRate,
        fixed_rate: service.fixedRate,
        currency: service.currency || 'USD',
        is_active: true,
      }));

      const { error: servicesError } = await this.supabase
        .from('artisan_services')
        .insert(servicesData);

      if (servicesError) {
        // Rollback artisan creation
        await this.supabase.from('artisans').delete().eq('id', artisan.id);
        throw new BadRequestException(servicesError.message);
      }
    }

    // Add portfolio images if provided
    if (createArtisanDto.portfolioImages && createArtisanDto.portfolioImages.length > 0) {
      const portfolioData = createArtisanDto.portfolioImages.map(image => ({
        artisan_id: artisan.id,
        image_url: image.imageUrl,
        title: image.title,
        description: image.description,
        tags: image.tags || [],
        featured: false,
        display_order: 0,
      }));

      const { error: portfolioError } = await this.supabase
        .from('artisan_portfolio')
        .insert(portfolioData);

      if (portfolioError) {
        console.error('Portfolio creation error:', portfolioError);
      }
    }

    // Create statistics record
    await this.supabase
      .from('artisan_statistics')
      .insert({
        artisan_id: artisan.id,
        total_views: 0,
        total_contacts: 0,
        total_bookings: 0,
        total_completed_jobs: 0,
        response_rate: 0,
        average_response_time: null,
      });

    return this.findById(artisan.id);
  }

  async findAll(filters: ArtisanFilterDto) {
    // Set defaults for pagination and sorting
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const sortBy = filters.sortBy || 'rating';
    const sortOrder = filters.sortOrder || 'desc';

    let query = this.supabase
      .from('artisans')
      .select(`
        *,
        artisan_services(*),
        artisan_portfolio(*),
        artisan_availability(*),
        artisan_statistics(*),
        user:users(id, username, avatar_url)
      `)
      .eq('is_available', true);

    // Apply filters
    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }

    if (filters.suburb) {
      query = query.ilike('suburb', `%${filters.suburb}%`);
    }

    if (filters.typeOfEmployment) {
      query = query.eq('type_of_employment', filters.typeOfEmployment);
    }

    if (filters.minExperience !== undefined) {
      query = query.gte('years_of_experience', filters.minExperience);
    }

    if (filters.minRating !== undefined) {
      query = query.gte('rating', filters.minRating);
    }

    if (filters.isVerified !== undefined) {
      query = query.eq('is_verified', filters.isVerified);
    }

    if (filters.isAvailable !== undefined) {
      query = query.eq('is_available', filters.isAvailable);
    }

    // Service filtering
    if (filters.service) {
      // First get artisan IDs that have this service
      const { data: services } = await this.supabase
        .from('artisan_services')
        .select('artisan_id')
        .ilike('service_name', `%${filters.service}%`)
        .eq('is_active', true);
      
      if (services && services.length > 0) {
        const artisanIds = services.map(s => s.artisan_id);
        query = query.in('id', artisanIds);
      } else {
        // If no services match, return empty result
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }
    }

    // Multiple services filtering
    if (filters.services && filters.services.length > 0) {
      const { data: services } = await this.supabase
        .from('artisan_services')
        .select('artisan_id')
        .in('service_name', filters.services)
        .eq('is_active', true);
      
      if (services && services.length > 0) {
        const artisanIds = services.map(s => s.artisan_id);
        query = query.in('id', artisanIds);
      } else {
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    if (error) throw new BadRequestException(error.message);

    // Get total count for pagination metadata
    const { count: totalCount } = await this.supabase
      .from('artisans')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true);

    return {
      data,
      meta: {
        total: totalCount || 0,
        page,
        limit,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    };
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .from('artisans')
      .select(`
        *,
        artisan_services(*),
        artisan_portfolio(*),
        artisan_availability(*),
        artisan_verification(*),
        artisan_reviews(
          *,
          customer:users(id, username, avatar_url)
        ),
        artisan_statistics(*),
        user:users(id, username, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Artisan not found');
    }

    // Increment view count
    try {
      await this.supabase.rpc('increment_artisan_views', { artisan_id: id });
    } catch (err) {
      console.warn('Failed to increment view count:', err);
    }

    return data;
  }

  async findByUserId(userId: string) {
    const { data, error } = await this.supabase
      .from('artisans')
      .select(`
        *,
        artisan_services(*),
        artisan_portfolio(*),
        artisan_availability(*),
        artisan_verification(*),
        artisan_reviews(*),
        artisan_statistics(*)
      `)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Artisan profile not found');
    }

    return data;
  }

  async updateArtisan(userId: string, updateArtisanDto: UpdateArtisanDto) {
    // Check if artisan exists
    const { data: existingArtisan } = await this.supabase
      .from('artisans')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!existingArtisan) {
      throw new NotFoundException('Artisan profile not found');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Add provided fields to update
    if (updateArtisanDto.businessName !== undefined) {
      updateData.business_name = updateArtisanDto.businessName;
    }
    if (updateArtisanDto.description !== undefined) {
      updateData.description = updateArtisanDto.description;
    }
    if (updateArtisanDto.typeOfEmployment !== undefined) {
      updateData.type_of_employment = updateArtisanDto.typeOfEmployment;
    }
    if (updateArtisanDto.yearsOfExperience !== undefined) {
      updateData.years_of_experience = updateArtisanDto.yearsOfExperience;
    }
    if (updateArtisanDto.address !== undefined) {
      updateData.address = updateArtisanDto.address;
    }
    if (updateArtisanDto.suburb !== undefined) {
      updateData.suburb = updateArtisanDto.suburb;
    }
    if (updateArtisanDto.city !== undefined) {
      updateData.city = updateArtisanDto.city;
    }
    if (updateArtisanDto.phoneNumber !== undefined) {
      updateData.phone_number = updateArtisanDto.phoneNumber;
    }
    if (updateArtisanDto.whatsappNumber !== undefined) {
      updateData.whatsapp_number = updateArtisanDto.whatsappNumber;
    }
    if (updateArtisanDto.email !== undefined) {
      updateData.email = updateArtisanDto.email;
    }

    const { data, error } = await this.supabase
      .from('artisans')
      .update(updateData)
      .eq('id', existingArtisan.id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async updateAvailability(userId: string, isAvailable: boolean) {
    const { data: artisan } = await this.supabase
      .from('artisans')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!artisan) {
      throw new NotFoundException('Artisan profile not found');
    }

    const { data, error } = await this.supabase
      .from('artisans')
      .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
      .eq('id', artisan.id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async addService(userId: string, serviceDto: ServiceDto) {
    const { data: artisan } = await this.supabase
      .from('artisans')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!artisan) {
      throw new NotFoundException('Artisan profile not found');
    }

    const { data, error } = await this.supabase
      .from('artisan_services')
      .insert({
        artisan_id: artisan.id,
        service_name: serviceDto.serviceName,
        category: serviceDto.category,
        description: serviceDto.description,
        hourly_rate: serviceDto.hourlyRate,
        fixed_rate: serviceDto.fixedRate,
        currency: serviceDto.currency || 'USD',
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async updateService(serviceId: string, userId: string, serviceDto: Partial<ServiceDto>) {
    // Verify the service belongs to the user's artisan profile
    const { data: service } = await this.supabase
      .from('artisan_services')
      .select('artisan_id')
      .eq('id', serviceId)
      .single();

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Check if the artisan belongs to the user
    const { data: artisan } = await this.supabase
      .from('artisans')
      .select('id')
      .eq('id', service.artisan_id)
      .eq('user_id', userId)
      .single();

    if (!artisan) {
      throw new NotFoundException('Service not found or unauthorized');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (serviceDto.serviceName !== undefined) {
      updateData.service_name = serviceDto.serviceName;
    }
    if (serviceDto.description !== undefined) {
      updateData.description = serviceDto.description;
    }
    if (serviceDto.hourlyRate !== undefined) {
      updateData.hourly_rate = serviceDto.hourlyRate;
    }
    if (serviceDto.fixedRate !== undefined) {
      updateData.fixed_rate = serviceDto.fixedRate;
    }

    const { data, error } = await this.supabase
      .from('artisan_services')
      .update(updateData)
      .eq('id', serviceId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async addPortfolioImage(userId: string, portfolioDto: PortfolioImageDto) {
    const { data: artisan } = await this.supabase
      .from('artisans')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!artisan) {
      throw new NotFoundException('Artisan profile not found');
    }

    const { data, error } = await this.supabase
      .from('artisan_portfolio')
      .insert({
        artisan_id: artisan.id,
        image_url: portfolioDto.imageUrl,
        title: portfolioDto.title,
        description: portfolioDto.description,
        tags: portfolioDto.tags || [],
        featured: false,
        display_order: 0,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async getCategories() {
    const { data, error } = await this.supabase
      .from('artisan_services')
      .select('category')
      .eq('is_active', true)
      .order('category');

    if (error) throw new BadRequestException(error.message);

    // Extract unique categories
    const categories = [...new Set(data.map(item => item.category))];
    
    return {
      categories,
      count: categories.length,
    };
  }

  async searchArtisans(query: string, filters: Partial<ArtisanFilterDto>) {
    let searchQuery = this.supabase
      .from('artisans')
      .select(`
        *,
        artisan_services(*),
        artisan_portfolio(*),
        user:users(id, username, avatar_url)
      `)
      .or(`business_name.ilike.%${query}%,description.ilike.%${query}%,city.ilike.%${query}%,suburb.ilike.%${query}%`)
      .eq('is_available', true);

    // Apply additional filters
    if (filters.minRating !== undefined) {
      searchQuery = searchQuery.gte('rating', filters.minRating);
    }

    if (filters.city) {
      searchQuery = searchQuery.ilike('city', `%${filters.city}%`);
    }

    if (filters.suburb) {
      searchQuery = searchQuery.ilike('suburb', `%${filters.suburb}%`);
    }

    const { data, error } = await searchQuery.limit(50);

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async deleteArtisan(userId: string) {
    const { data: artisan } = await this.supabase
      .from('artisans')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!artisan) {
      throw new NotFoundException('Artisan profile not found');
    }

    const { error } = await this.supabase
      .from('artisans')
      .update({ is_available: false, updated_at: new Date().toISOString() })
      .eq('id', artisan.id);

    if (error) throw new BadRequestException(error.message);

    return { message: 'Artisan profile deactivated successfully' };
  }

  async getPopularSuburbs(limit: number = 10) {
    // Fixed: Use a different approach to get popular suburbs
    const { data, error } = await this.supabase
      .from('artisans')
      .select('suburb, city')
      .eq('is_available', true)
      .not('suburb', 'is', null);

    if (error) throw new BadRequestException(error.message);

    // Group and count in memory (simpler approach)
    const suburbCounts: Record<string, { suburb: string; city: string; count: number }> = {};

    data.forEach((artisan) => {
      const key = `${artisan.suburb}|${artisan.city}`;
      if (!suburbCounts[key]) {
        suburbCounts[key] = {
          suburb: artisan.suburb,
          city: artisan.city,
          count: 0,
        };
      }
      suburbCounts[key].count++;
    });

    // Convert to array, sort by count descending, and take top N
    const result = Object.values(suburbCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return result;
  }

  async getArtisansBySuburb(city: string, suburb: string, filters: Partial<ArtisanFilterDto>) {
    return this.findAll({
      ...filters,
      city,
      suburb,
      page: filters.page || 1,
      limit: filters.limit || 20,
    } as ArtisanFilterDto);
  }

  async getTopRatedArtisans(limit: number = 10) {
    const { data, error } = await this.supabase
      .from('artisans')
      .select(`
        *,
        artisan_services(*),
        user:users(id, username, avatar_url)
      `)
      .eq('is_available', true)
      .gte('rating', 4.0)
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async getArtisanStats(userId: string) {
    const artisan = await this.findByUserId(userId);
    
    const { data: stats, error } = await this.supabase
      .from('artisan_statistics')
      .select('*')
      .eq('artisan_id', artisan.id)
      .single();

    if (error) throw new BadRequestException(error.message);

    return {
      ...stats,
      artisan: {
        id: artisan.id,
        businessName: artisan.business_name,
        rating: artisan.rating,
        totalReviews: artisan.total_reviews,
      }
    };
  }
}