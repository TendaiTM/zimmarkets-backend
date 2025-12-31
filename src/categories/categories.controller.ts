import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiBody 
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { SupabaseGuard } from '../auth/supabase.guard';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get all categories',
    description: 'Retrieve all active categories with their hierarchy'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Categories retrieved successfully',
    type: [Category],
  })
  async findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get category by ID',
    description: 'Retrieve a specific category with its parent and children'
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Category retrieved successfully',
    type: Category,
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Category not found',
  })
  async findOne(@Param('id') id: string): Promise<Category> {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Create a new category',
    description: 'Create a new category (admin only)'
  })
  @ApiBody({
    type: Category,
    description: 'Category data',
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Category created successfully',
    type: Category,
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized - admin access required',
  })
  async create(@Body() categoryData: Partial<Category>): Promise<Category> {
    return this.categoriesService.create(categoryData);
  }

  @Put(':id')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update category',
    description: 'Update an existing category (admin only)'
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: Category,
    description: 'Updated category data',
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Category updated successfully',
    type: Category,
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized - admin access required',
  })
  async update(@Param('id') id: string, @Body() updateData: Partial<Category>): Promise<Category> {
    return this.categoriesService.update(id, updateData);
  }

  @Delete(':id')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Delete category',
    description: 'Soft delete a category (sets is_active to false)'
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Category deleted successfully',
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized - admin access required',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}