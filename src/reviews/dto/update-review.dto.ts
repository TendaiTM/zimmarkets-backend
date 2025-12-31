import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max, IsString, Length } from 'class-validator';

export class UpdateReviewDto {
  @ApiPropertyOptional({
    description: 'Rating (1-5 stars)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: 'Review comment (max 1000 characters)',
    example: 'Updated: Good experience overall, minor packaging issue.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  comment?: string;
}