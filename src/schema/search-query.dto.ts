import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class SearchQueryDto {
  @IsString()
  @IsNotEmpty()
  q: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  from?: number
}
