import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly supabaseService: SupabaseService // ✅ ADDED: Supabase injection
  ) {}

  async findAll(): Promise<Category[]> {
    const supabase = this.supabaseService.getClient();
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select(`
        *,
        children:categories!parent_id (*),
        parent:categories!parent_id (*)
      `)
      .eq('is_active', true)
      .is('parent_id', null) // Get top-level categories by default
      .order('name', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch categories: ${error.message}`);
    }

    return categories || [];
  }

  async findOne(id: string): Promise<Category> {
    const supabase = this.supabaseService.getClient();
    
    const { data: category, error } = await supabase
      .from('categories')
      .select(`
        *,
        children:categories!parent_id (*),
        parent:categories!parent_id (*)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(categoryData: Partial<Category>): Promise<Category> {
    const supabase = this.supabaseService.getClient();
    
    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        ...categoryData,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create category: ${error.message}`);
    }

    return category;
  }

  async update(id: string, updateData: Partial<Category>): Promise<Category> {
    const supabase = this.supabaseService.getClient();
    
    // Check if category exists
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    const { data: category, error } = await supabase
      .from('categories')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update category: ${error.message}`);
    }

    return category;
  }

  async remove(id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    const { error } = await supabase
      .from('categories')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new BadRequestException(`Failed to delete category: ${error.message}`);
    }
  }

  // ✅ ADDED: Additional useful methods

  async getCategoryTree(): Promise<Category[]> {
    const supabase = this.supabaseService.getClient();
    
    // Get all active categories
    const { data: allCategories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch category tree: ${error.message}`);
    }

    // Build hierarchical structure
    const categoryMap = new Map();
    const rootCategories: Category[] = [];

    // First pass: create map
    allCategories?.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Second pass: build tree
    allCategories?.forEach(category => {
      const node = categoryMap.get(category.id);
      if (category.parent_id && categoryMap.has(category.parent_id)) {
        const parent = categoryMap.get(category.parent_id);
        parent.children.push(node);
      } else {
        rootCategories.push(node);
      }
    });

    return rootCategories;
  }

  async findByParent(parentId: string | null): Promise<Category[]> {
    const supabase = this.supabaseService.getClient();
    
    const query = supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (parentId === null) {
      query.is('parent_id', null);
    } else {
      query.eq('parent_id', parentId);
    }

    const { data: categories, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch categories: ${error.message}`);
    }

    return categories || [];
  }

  async getCategoryStats(): Promise<{
    total: number;
    active: number;
    withProducts: number;
    topLevel: number;
  }> {
    const supabase = this.supabaseService.getClient();
    
    // Get category counts
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, is_active, parent_id', { count: 'exact' });

    if (catError) {
      throw new BadRequestException(`Failed to get category stats: ${catError.message}`);
    }

    // Get counts of listings per category
    const { data: listingCounts } = await supabase
      .from('listings')
      .select('category_id')
      .eq('status', 'active');

    // Count listings per category
    const categoryListingCount = new Map();
    listingCounts?.forEach(item => {
      const count = categoryListingCount.get(item.category_id) || 0;
      categoryListingCount.set(item.category_id, count + 1);
    });

    const stats = {
      total: categories?.length || 0,
      active: categories?.filter(c => c.is_active).length || 0,
      withProducts: Array.from(categoryListingCount.keys()).length,
      topLevel: categories?.filter(c => !c.parent_id).length || 0,
    };

    return stats;
  }

  async searchCategories(query: string): Promise<Category[]> {
    const supabase = this.supabaseService.getClient();
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('name', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to search categories: ${error.message}`);
    }

    return categories || [];
  }
}