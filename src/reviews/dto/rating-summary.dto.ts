import { ApiProperty } from '@nestjs/swagger';

export class RatingSummaryDto {
  @ApiProperty({
    description: 'Average rating',
    example: 4.5,
    minimum: 1,
    maximum: 5,
  })
  average: number;

  @ApiProperty({
    description: 'Total number of reviews',
    example: 42,
  })
  count: number;

  @ApiProperty({
    description: 'Rating distribution (1-5 stars)',
    example: { 1: 2, 2: 3, 3: 5, 4: 15, 5: 17 },
  })
  distribution: Record<number, number>;

  @ApiProperty({
    description: 'Percentage of each rating',
    example: { 1: 4.8, 2: 7.1, 3: 11.9, 4: 35.7, 5: 40.5 },
  })
  percentages: Record<number, number>;
}