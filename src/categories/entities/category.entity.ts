import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Category {
  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Electronic devices and gadgets',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Parent category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  parent_id?: string;

  @ApiPropertyOptional({
    description: 'Parent category details',
    type: () => Category,
  })
  parent?: Category;

  @ApiPropertyOptional({
    description: 'Child categories',
    type: () => [Category],
  })
  children?: Category[];

  @ApiPropertyOptional({
    description: 'Category image URL',
    example: 'https://example.com/category-electronics.jpg',
  })
  image_url?: string;

  @ApiProperty({
    description: 'Is category active?',
    example: true,
    default: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updated_at: string;

}