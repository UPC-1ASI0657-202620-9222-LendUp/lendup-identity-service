import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

@ApiTags('Documentos')
@Controller('api/v1/documentos/terminos')
export class TermsController {
  @Get()
  obtener() {
    const version = process.env.TERMS_VERSION || '2026-10-04';
    return {
      titulo: 'Términos y Condiciones de LendUp',
      version_terminos: version,
      version_descargo: version,
      publicado_en: '2026-10-04',
      idioma: 'es',
      contenido: readFileSync(resolve(process.cwd(), 'docs', 'terminos-lendup.txt'), 'utf8')
    };
  }
}
