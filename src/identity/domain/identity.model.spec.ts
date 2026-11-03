import { dominioDeCorreo, normalizarCorreo } from './identity.model';

describe('Dominio universitario', () => {
  it('normaliza el correo y extrae el dominio exacto', () => {
    expect(normalizarCorreo('  Alumna@UPC.EDU.PE ')).toBe('alumna@upc.edu.pe');
    expect(dominioDeCorreo('  Alumna@UPC.EDU.PE ')).toBe('upc.edu.pe');
  });

  it('rechaza correos sin un único @ y con espacios', () => {
    expect(dominioDeCorreo('usuario-sin-arroba')).toBeNull();
    expect(dominioDeCorreo('a@b@c')).toBeNull();
    expect(dominioDeCorreo('a @upc.edu.pe')).toBeNull();
    expect(dominioDeCorreo('@upc.edu.pe')).toBeNull();
    expect(dominioDeCorreo('alumno@')).toBeNull();
  });
});
