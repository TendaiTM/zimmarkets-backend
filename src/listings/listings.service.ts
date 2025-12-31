import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Listing } from './entities/listing.entity';
import { CreateListingDto, ListingType } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ListingsService {
  private readonly IMAGE_BUCKET = 'listing-images';

  constructor(
    private readonly supabaseService: SupabaseService
  ) {}

  // ==================== LISTING CRUD ====================

  async createListing( listingData: CreateListingDto & { seller_id: string },files?: Express.Multer.File[]): Promise<Listing> {
    const supabase = this.supabaseService.getClient();

    // Generate unique listing ID
    const listingId = uuidv4();
    
    // Initialize image URLs array
    let allImageUrls: string[] = listingData.image_urls || [];

    // Upload images if provided
    if (files && files.length > 0) {
      try {
        console.log(`Uploading ${files.length} image(s) for listing ${listingId}`);
        
        // Upload all images using listingId as folder
        const uploadedUrls = await this.uploadMultipleImagesToSupabase(files, listingId);
        console.log('Uploaded image URLs:', uploadedUrls);
        
        // Combine uploaded URLs with existing ones
        allImageUrls = [...allImageUrls, ...uploadedUrls];
      } catch (error) {
        console.error('Image upload failed:', error);
        throw new BadRequestException(`Image upload failed: ${error.message}`);
      }
    }

    
    // Create listing payload with ALL data
    const listingPayload = {
      id: listingId,
      title: listingData.title,
      description: listingData.description,
      condition: listingData.condition,
      price_amount: listingData.price_amount,
      price_currency: listingData.price_currency,
      listing_type: listingData.listing_type,
      city: listingData.city,
      suburb: listingData.suburb,
      category: listingData.category,
      seller_id: listingData.seller_id, 
      image_urls: allImageUrls,
      status: 'active',
      view_count: 0,
      created_at: new Date().toISOString(),
    };
    
    console.log('Creating listing with payload:', listingPayload);

    try {
      // Step 1: Create the main listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert(listingPayload)
        .select(`
          *,
          seller:seller_id (*)
        `)
        .single();

      if (listingError) {
        console.error('❌ Create listing error:', listingError);
        console.error('❌ Error details:', {
          message: listingError.message,
          details: listingError.details,
          hint: listingError.hint,
          code: listingError.code
        });
        
        // Cleanup: Delete uploaded images if listing creation fails
        if (allImageUrls.length > 0) {
          await this.deleteListingImagesFromStorage(listingId);
        }
        
        throw new BadRequestException(`Failed to create listing: ${listingError.message}`);
      }

    console.log('Listing created successfully, ID:', listing.id);


    if (listingData.listing_type === ListingType.AUCTION) {
      console.log('Creating auction record for listing:', listing.id);
      
      // Validate auction_end is provided
      if (!listingData.auction_end) {
        await supabase.from('listings').delete().eq('id', listing.id);
        if (allImageUrls.length > 0) {
          await this.deleteListingImagesFromStorage(listingId);
        }
        throw new BadRequestException('auction_end is required for auction listings');
      }

      // Create auction record
      const { error: auctionError } = await supabase
        .from('auctions')
        .insert({
          id: uuidv4(), // Or you can use listing.id if 1:1 relationship
          listing_id: listing.id,
          auction_end: listingData.auction_end,
          starting_price: listingData.price_amount,
          current_bid: listingData.price_amount, // Starting bid is the same as starting price
          bid_count: 0,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });


        if (auctionError) {
          console.error('❌ Create auction error:', auctionError);
          
          // Rollback: Delete the listing since auction creation failed
          await supabase.from('listings').delete().eq('id', listing.id);
          
          // Cleanup images
          if (allImageUrls.length > 0) {
            await this.deleteListingImagesFromStorage(listingId);
          }
          
          throw new BadRequestException(`Failed to create auction record: ${auctionError.message}`);
        }

        console.log('Auction record created successfully');
      }

      // Step 3: Fetch the complete listing with auction data if applicable
      let finalListing;

      if (listingData.listing_type === ListingType.AUCTION) {
        // Fetch listing with auction data joined
        const { data: listingWithAuction, error: fetchError } = await supabase
          .from('listings')
          .select(`
            *,
            seller:seller_id (*),
            auction:auctions (*)
          `)
          .eq('id', listing.id)
          .single();
          
        if (fetchError) {
          console.error('Error fetching listing with auction data:', fetchError);
          finalListing = listing; // Fallback to original listing
        } else {
          finalListing = listingWithAuction;
        }
      } else {
        finalListing = listing;
      }
      
      return this.parseListingData(finalListing);
      
    } catch (error) {
      // General error handling
      console.error('❌ Overall error in createListing:', error);
      
      // Cleanup images if any error occurred
      if (allImageUrls.length > 0) {
        await this.deleteListingImagesFromStorage(listingId);
      }
      throw error; // Re-throw the error
    }
  }

  async updateImagePaths(listingId: string, imageUrls: string[]): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    const { error } = await supabase
      .from('listings')
      .update({ 
        image_urls: imageUrls,
        updated_at: new Date().toISOString()
      })
      .eq('id', listingId);

    if (error) {
      console.error('Failed to update image paths:', error);
    }
  }

  async findById(id: string): Promise<Listing> {
    const supabase = this.supabaseService.getClient();
    
    const { data: listing, error } = await supabase
      .from('listings')
      .select(`
        *,
        seller:seller_id (*)
      `)
      .eq('id', id)
      .single();

    if (error || !listing) {
      console.error('Error fetching listing:', error);
      throw new NotFoundException('Listing not found');
    }

    return this.parseListingData(listing);
  }

  async findAll(filters: any): Promise<{ data: Listing[]; total: number }> {
    const supabase = this.supabaseService.getClient();
    
    const { 
      page = 1, 
      limit = 20, 
      category, 
      search, 
      minPrice, 
      maxPrice, 
      condition,
      listing_type,
      seller_id,
      city, 
      suburb,
    } = filters;

    console.log('Parsed filters:', {
      page, limit, category, search, minPrice, maxPrice,
      condition, listing_type, seller_id, city, suburb
    });
    
    let query = supabase
      .from('listings')
      .select(`
        *,
        seller:seller_id (*)
      `, { count: 'exact' })
      .eq('status', 'active');

    console.log('Initial query built');console.log('Initial query built');

    // Apply filters
    if (category) {
      query = query.eq('category', category);
      console.log('Applied category filter:', category);
    }
    if (condition) query = query.eq('condition', condition);
    if (listing_type) query = query.eq('listing_type', listing_type);
    if (seller_id) query = query.eq('seller_id', seller_id);
    if (city) query = query.eq('city', city);
    if (suburb) query = query.eq('suburb', suburb);    
    if (minPrice !== undefined) query = query.gte('price_amount', minPrice);
    if (maxPrice !== undefined) query = query.lte('price_amount', maxPrice);
    if (search) query = query.ilike('title', `%${search}%`);

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    console.log('Executing query...');

    const { data: listings, error, count } = await query;

    console.log('Query executed. Error:', error);
    console.log('Count:', count);
    console.log('Listings found:', listings?.length || 0);

    if (error) {
      throw new BadRequestException(`Failed to fetch listings: ${error.message}`);
    }

    const parsedListings = listings?.map(listing => this.parseListingData(listing)) || [];

    return { 
      data: parsedListings, 
      total: count || 0 
    };
  }

  async updateListing(id: string, updateData: UpdateListingDto, files?: Express.Multer.File[]): Promise<Listing> {
    const supabase = this.supabaseService.getClient();
    
    // Check if listing exists
    const { data: existingListing } = await supabase
      .from('listings')
      .select('id, image_urls')
      .eq('id', id)
      .single();

    if (!existingListing) {
      throw new NotFoundException('Listing not found');
    }

    const {category, imagesToDelete, ...updateFields } = updateData;
    const updatePayload: any = {
      ...updateFields,
      updated_at: new Date().toISOString(),
    };

    if (category !== undefined) {
      updatePayload.category = category;
    }

    let finalImageUrls: string[] = existingListing.image_urls || [];

    if (imagesToDelete && imagesToDelete.length > 0) {
      console.log(`Deleting ${imagesToDelete.length} images from listing ${id}`);
      
      // Filter out images marked for deletion
      finalImageUrls = finalImageUrls.filter(
        url => !imagesToDelete.includes(url)
      );
      
      // NEW: Optionally delete images from storage
      try {
        await this.deleteSpecificImagesFromStorage(id, imagesToDelete);
      } catch (storageError) {
        console.warn('Could not delete images from storage:', storageError);
        // Continue with update even if storage deletion fails
      }
    }
    
    // Handle image uploads if new files are provided
    if (files && files.length > 0) {
      try {
        const uploadedImageUrls = await this.uploadMultipleImagesToSupabase(files, id);
        finalImageUrls = [...finalImageUrls, ...uploadedImageUrls];
      } catch (error) {
        console.error('Image upload failed during update:', error);
        throw new BadRequestException(`Image upload failed: ${error.message}`);
      }
    } 
    // If images are provided as URLs in updateData
    else if (updateData.image_urls !== undefined) {
      finalImageUrls = updateData.image_urls;
    }

    updatePayload.image_urls = finalImageUrls;

    if (updatePayload.imagesToDelete) {
        delete updatePayload.imagesToDelete;
      }

    // Update main listing fields
    const { data: listing, error } = await supabase
      .from('listings')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update listing: ${error.message}`);
    }

    return this.findById(id);
  }

  async deleteListing(id: string, userId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    // Check if listing exists and get seller info
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('seller_id, image_urls')
      .eq('id', id)
      .single();

    if (fetchError || !listing) {
      throw new NotFoundException('Listing not found');
    }

    // Check ownership
    if (listing.seller_id !== userId) {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (user?.role !== 'admin') {
        throw new UnauthorizedException('You can only delete your own listings');
      }
    }

    // Delete images from storage
    try {
      await this.deleteListingImagesFromStorage(id);
    } catch (storageError) {
      console.error('Error deleting images from storage:', storageError);
    }

    // Delete bids
    await supabase
      .from('bids')
      .delete()
      .eq('listing_id', id);

    // Delete the listing
    const { error: deleteError } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new InternalServerErrorException('Failed to delete listing');
    }
  }

  async deleteListingImagesFromStorage(listingId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    // List all files in the listing's folder
    const { data: files, error } = await supabase.storage
      .from(this.IMAGE_BUCKET)
      .list(listingId);

    if (error) {
      console.error('Error listing storage files:', error);
      return;
    }

    if (files && files.length > 0) {
      const filePaths = files.map(file => `${listingId}/${file.name}`);
      
      const { error: deleteError } = await supabase.storage
        .from(this.IMAGE_BUCKET)
        .remove(filePaths);

      if (deleteError) {
        console.error('Error deleting storage files:', deleteError);
      } else {
        console.log(`Deleted ${filePaths.length} images from storage for listing ${listingId}`);
      }
    }
  }

  async findByUserId(userId: string): Promise<Listing[]> {
    const supabase = this.supabaseService.getClient();
    
    const { data: listings, error } = await supabase
      .from('listings')
      .select(`
        *,
        seller:seller_id (*)
      `)
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch user listings: ${error.message}`);
    }

    return listings?.map(listing => this.parseListingData(listing)) || [];
  }

  async getActiveAuctions(): Promise<Listing[]> {
    const supabase = this.supabaseService.getClient();
    
    const now = new Date().toISOString();
    
    const { data: auctions, error } = await supabase
      .from('listings')
      .select(`
        *,
        seller:seller_id (*),
        bids:bids (*)
      `)
      .eq('listing_type', 'auction')
      .eq('status', 'active')
      .gte('auction_end', now)
      .order('auction_end', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch auctions: ${error.message}`);
    }

    return auctions?.map(auction => this.parseListingData(auction)) || [];
  }

  async searchListings(searchParams: {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    city?: string;
    suburb?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Listing[]> {
    const supabase = this.supabaseService.getClient();
    
    let query = supabase
      .from('listings')
      .select(`
        *,
        seller:seller_id (*)
      `)
      .eq('status', 'active');

    if (searchParams.query) {
      query = query.or(`title.ilike.%${searchParams.query}%,description.ilike.%${searchParams.query}%`);
    }

    if (searchParams.category) {
      query = query.eq('category', searchParams.category); // Changed from category_id to category
    }

    if (searchParams.minPrice !== undefined) {
      query = query.gte('price_amount', searchParams.minPrice);
    }

    if (searchParams.maxPrice !== undefined) {
      query = query.lte('price_amount', searchParams.maxPrice);
    }

    if (searchParams.condition) {
      query = query.eq('condition', searchParams.condition);
    }

    if (searchParams.city) {
      query = query.eq('city', searchParams.city);
    }

    if (searchParams.suburb) {
      query = query.eq('suburb', searchParams.suburb);
    }

    const sortField = searchParams.sortBy || 'created_at';
    const sortOrder = searchParams.sortOrder || 'desc';
    
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    const { data: listings, error } = await query;

    if (error) {
      throw new BadRequestException(`Search failed: ${error.message}`);
    }

    return listings?.map(listing => this.parseListingData(listing)) || [];
  }

  // ==================== AUXILIARY METHODS ====================

  async incrementViews(id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    const { data: listing } = await supabase
      .from('listings')
      .select('view_count')
      .eq('id', id)
      .single();

    if (listing) {
      await supabase
        .from('listings')
        .update({
          view_count: (listing.view_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    }
  }

  async placeBid(listingId: string, userId: string, amount: number): Promise<any> {
    const supabase = this.supabaseService.getClient();
    
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('listing_type, auction_end, price_amount, seller_id')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.listing_type !== 'auction') {
      throw new BadRequestException('This listing is not an auction');
    }

    if (listing.seller_id === userId) {
      throw new BadRequestException('You cannot bid on your own listing');
    }

    if (listing.auction_end && new Date(listing.auction_end) < new Date()) {
      throw new BadRequestException('Auction has ended');
    }

    const { data: highestBid } = await supabase
      .from('bids')
      .select('amount')
      .eq('listing_id', listingId)
      .order('amount', { ascending: false })
      .limit(1)
      .single();

    const currentPrice = highestBid?.amount || listing.price_amount;
    
    if (amount <= currentPrice) {
      throw new BadRequestException(`Bid amount must be higher than current price ($${currentPrice})`);
    }

    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .insert({
        listing_id: listingId,
        bidder_id: userId,
        amount,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bidError) {
      throw new BadRequestException(`Failed to place bid: ${bidError.message}`);
    }

    await supabase
      .from('listings')
      .update({
        price_amount: amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId);

    return bid;
  }

  async getHighestBid(listingId: string): Promise<number> {
    const supabase = this.supabaseService.getClient();
    
    const { data: highestBid } = await supabase
      .from('bids')
      .select('amount')
      .eq('listing_id', listingId)
      .order('amount', { ascending: false })
      .limit(1)
      .single();

    return highestBid?.amount || 0;
  }

  async closeExpiredAuctions(): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    const now = new Date().toISOString();
    
    const { data: expiredListings } = await supabase
      .from('listings')
      .select('id')
      .eq('listing_type', 'auction')
      .eq('status', 'active')
      .lt('auction_end', now);

    if (!expiredListings || expiredListings.length === 0) return;

    for (const listing of expiredListings) {
      await supabase
        .from('listings')
        .update({
          status: 'expired',
          updated_at: now,
        })
        .eq('id', listing.id);
    }
  }

  // ==================== IMAGE UPLOAD METHODS ====================

  private async uploadFileToSupabase(file: Express.Multer.File, folderName: string): Promise<string> {
  
    let supabase: any;

    try {
      supabase = this.supabaseService.getAdminClient();
      console.log('📦 Using admin client for storage upload');
    } catch (error) {
      console.warn('⚠️ Admin client not available, using regular client');
      supabase = this.supabaseService.getClient();
    }
    
    // Generate unique filename with timestamp
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folderName}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;

     console.log('📤 Uploading file to path:', fileName);
    
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(this.IMAGE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        statusCode: error.statusCode
      });

      if (error.statusCode === '403') {
        throw new Error(`Storage access denied. Check RLS policies or use service role key: ${error.message}`);
      } else if (error.message.includes('row-level security policy')) {
        throw new Error(`RLS policy violation. Bucket "${this.IMAGE_BUCKET}" may have RLS enabled. Disable in Supabase dashboard or use admin client: ${error.message}`);
      } else {
        throw new Error(`File upload failed: ${error.message}`);
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(this.IMAGE_BUCKET)
      .getPublicUrl(data.path);

    return publicUrl;
  }

  private async uploadMultipleImagesToSupabase(files: Express.Multer.File[], folderName: string): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFileToSupabase(file, folderName));
    return await Promise.all(uploadPromises);
  }

  private async deleteSpecificImagesFromStorage(listingId: string, imageUrls: string[]): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    // Extract file paths from URLs
    const filePaths = imageUrls.map(url => {
      // Extract the path part from the URL
      // Assuming URLs are like: https://storage.supabase.co/bucket-name/listing-id/filename.jpg
      const parts = url.split('/');
      // Get the last two parts: listing-id/filename.jpg
      const path = parts.slice(-2).join('/');
      return decodeURIComponent(path); // Decode any URL encoding
    }).filter(path => path.startsWith(`${listingId}/`)); // Safety check
    
    if (filePaths.length === 0) return;
    
    const { error } = await supabase.storage
      .from(this.IMAGE_BUCKET)
      .remove(filePaths);

    if (error) {
      console.error('Error deleting specific images from storage:', error);
    } else {
      console.log(`Deleted ${filePaths.length} specific images from storage for listing ${listingId}`);
    }
  }

  // ==================== DATA PARSING ====================

  private parseListingData(listing: any): Listing {
    try {
      
      // Parse images from image_urls array
      let imagesArray: Array<{
        id: string;
        image_url: string;
        is_primary: boolean;
        alt_text?: string;
      }> = [];
      
      if (listing.image_urls && Array.isArray(listing.image_urls) && listing.image_urls.length > 0) {
        console.log(`Found ${listing.image_urls.length} images in image_urls array`);
        
        imagesArray = listing.image_urls.map((url: string, index: number) => {
          const cleanedUrl = this.cleanImageUrl(url);
          console.log(`Image ${index}: ${cleanedUrl}`);
          
          return {
            id: `image-${index}`,
            image_url: cleanedUrl,
            is_primary: index === 0,
            alt_text: `Image ${index + 1} of ${listing.title || 'listing'}`
          };
        });
        
        console.log(`✅ Parsed ${imagesArray.length} images from image_urls array`);
      } 
      else {
        console.warn('⚠️ No images found for listing', listing.id);
      }
      
      // Handle seller data
      let sellerData = listing.seller;
      if (listing.seller && listing.seller_id && typeof listing.seller === 'object') {
        sellerData = listing.seller;
      }

      let auctionData: any | null = null;
      let auctionEnd: string | null = null;

      if (listing.listing_type === ListingType.AUCTION) {
        if (listing.auction && Array.isArray(listing.auction) && listing.auction.length > 0) {
          auctionData = listing.auction[0];
          auctionEnd = auctionData.auction_end;
        } else if (listing.auction && typeof listing.auction === 'object') {
          auctionData = listing.auction;
          auctionEnd = auctionData.auction_end;
        }
      }

      
      const parsedListing: any = {
        ...listing,
        images: imagesArray,
        seller: sellerData,
        category: typeof listing.category === 'string' 
          ? listing.category 
          : 'Uncategorized',
      };

      if (auctionData) {
        parsedListing.auction = auctionData;
        parsedListing.auction_end = auctionData?.auction_end || auctionEnd;
      }
      
      return parsedListing;

    } catch (error) {
      console.error('Error parsing listing data:', error);
      console.error('Problematic listing:', listing);
      return {
        ...listing,
        images: [],
        category: typeof listing.category === 'string' ? listing.category : 'Uncategorized'
      };
    }
  }

  private cleanImageUrl(url: string): string {
    if (!url) return '';
    return url;
  }
}