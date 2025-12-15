import { IsString, IsOptional, Matches } from 'class-validator'

export class SearchHeadersDto {
  @IsOptional()
  @IsString()
  'x-client-name'?: string

  @IsOptional()
  @IsString()
  'x-client-version'?: string

  @IsOptional()
  @IsString()
  'x-session-id'?: string

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/, {
    message:
      'x-wallet-address must be a valid 43-character Arweave address (base64url format)'
  })
  'x-wallet-address'?: string
}
