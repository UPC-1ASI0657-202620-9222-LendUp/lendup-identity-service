import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { IdentityService } from './identity/application/identity.service';
import { IDENTITY_REPOSITORY } from './identity/application/identity.repository';
import { FirebaseAuthGuard } from './identity/infrastructure/firebase/firebase-auth.guard';
import { FirebaseAuthProvider } from './identity/infrastructure/firebase/firebase-auth.provider';
import { MySqlIdentityRepository } from './identity/infrastructure/persistence/mysql-identity.repository';
import { MySqlPoolProvider } from './identity/infrastructure/persistence/mysql.provider';
import { StudentsController } from './identity/interfaces/http/students.controller';
import { TermsController } from './identity/interfaces/http/terms.controller';
import { UniversitiesController } from './identity/interfaces/http/universities.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController, StudentsController, UniversitiesController, TermsController],
  providers: [
    MySqlPoolProvider,
    FirebaseAuthProvider,
    FirebaseAuthGuard,
    IdentityService,
    { provide: IDENTITY_REPOSITORY, useClass: MySqlIdentityRepository }
  ]
})
export class AppModule {}
