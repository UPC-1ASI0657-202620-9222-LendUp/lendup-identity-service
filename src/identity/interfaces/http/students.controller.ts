import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IdentityService } from '../../application/identity.service';
import { FirebaseIdentity } from '../../domain/identity.model';
import { FirebaseAuthGuard } from '../../infrastructure/firebase/firebase-auth.guard';
import { CurrentIdentity } from './current-identity.decorator';
import {
  AceptarTerminosDto, ActualizarEstudianteDto, RegistrarEstudianteDto,
  SolicitarVerificacionDto
} from './student.dto';

@ApiTags('Estudiantes')
@ApiBearerAuth('firebase')
@UseGuards(FirebaseAuthGuard)
@Controller('api/v1/estudiantes')
export class StudentsController {
  constructor(private readonly identity: IdentityService) {}

  @Post()
  registrar(@CurrentIdentity() user: FirebaseIdentity, @Body() input: RegistrarEstudianteDto) {
    return this.identity.registrar(user, {
      correo_institucional: input.correo_institucional,
      nombre: input.nombre,
      campus: input.campus || '',
      carrera: input.carrera,
      ciclo: input.ciclo,
      telefono: input.telefono,
      fotoUrl: input.foto_url || null
    });
  }

  @Get('me')
  me(@CurrentIdentity() user: FirebaseIdentity) {
    return this.identity.me(user);
  }

  @Put('me')
  actualizar(@CurrentIdentity() user: FirebaseIdentity, @Body() input: ActualizarEstudianteDto) {
    return this.identity.actualizarMiPerfil(user, {
      ...('nombre' in input ? { nombre: input.nombre } : {}),
      ...('campus' in input ? { campus: input.campus } : {}),
      ...('carrera' in input ? { carrera: input.carrera } : {}),
      ...('ciclo' in input ? { ciclo: input.ciclo } : {}),
      ...('telefono' in input ? { telefono: input.telefono } : {}),
      ...('foto_url' in input ? { fotoUrl: input.foto_url } : {})
    });
  }

  @Post('me/verificacion')
  solicitarVerificacion(
    @CurrentIdentity() user: FirebaseIdentity,
    @Body() input: SolicitarVerificacionDto
  ) {
    return this.identity.solicitarMiVerificacion(user, input.verificacion_referencia);
  }

  @Post('me/aceptacion-terminos')
  @HttpCode(HttpStatus.OK)
  aceptarTerminos(@CurrentIdentity() user: FirebaseIdentity, @Body() input: AceptarTerminosDto) {
    return this.identity.aceptarTerminos(user, input);
  }

  @Get(':id')
  obtener(@CurrentIdentity() user: FirebaseIdentity, @Param('id') id: string) {
    return this.identity.buscarPerfilPublico(user, id);
  }
}
