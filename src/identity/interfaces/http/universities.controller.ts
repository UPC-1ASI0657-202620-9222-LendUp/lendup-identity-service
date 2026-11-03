import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IdentityService } from '../../application/identity.service';

@ApiTags('Universidades')
@Controller('api/v1/universidades')
export class UniversitiesController {
  constructor(private readonly identity: IdentityService) {}

  @Get()
  listar() {
    return this.identity.universidades();
  }
}
