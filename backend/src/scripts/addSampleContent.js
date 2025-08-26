const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import using ES modules syntax via ts-node
const { Manual } = require('../models/index.ts');

const sampleContent = `
Manual de Operaciones de Seguridad Industrial

1. INTRODUCCIÓN
Este manual establece los procedimientos de seguridad industrial que deben seguirse en todas las operaciones de la empresa. La seguridad es responsabilidad de todos los empleados y debe ser prioritaria en cada actividad.

2. EQUIPOS DE PROTECCIÓN PERSONAL (EPP)
- Casco de seguridad: Obligatorio en todas las áreas de producción
- Gafas de protección: Requeridas cuando exista riesgo de proyección de partículas
- Guantes: Según el tipo de trabajo (químicos, mecánicos, eléctricos)
- Calzado de seguridad: Con puntera de acero en áreas de riesgo
- Mascarillas: Cuando exista exposición a vapores o polvos

3. PROCEDIMIENTOS DE EMERGENCIA
En caso de emergencia, seguir estos pasos:
1. Mantener la calma
2. Evaluar la situación
3. Alertar al personal de seguridad
4. Evacuar siguiendo las rutas establecidas
5. Dirigirse al punto de encuentro

4. MANEJO DE SUSTANCIAS QUÍMICAS
- Leer siempre las hojas de seguridad (MSDS)
- Usar EPP apropiado
- Almacenar según las especificaciones
- Nunca mezclar productos sin autorización
- Reportar inmediatamente cualquier derrame

5. PREVENCIÓN DE ACCIDENTES
- Mantener áreas de trabajo limpias y ordenadas
- Reportar condiciones inseguras inmediatamente
- Seguir todos los procedimientos establecidos
- Participar en capacitaciones de seguridad
- Usar herramientas en buen estado

6. INSPECCIONES DE SEGURIDAD
Se realizarán inspecciones regulares para:
- Verificar el uso correcto de EPP
- Identificar riesgos potenciales
- Evaluar el cumplimiento de procedimientos
- Proponer mejoras en seguridad

7. RESPONSABILIDADES
Todos los empleados deben:
- Cumplir con las normas de seguridad
- Reportar incidentes y accidentes
- Participar en entrenamientos
- Cuidar su seguridad y la de sus compañeros

8. PRIMEROS AUXILIOS
En caso de accidente:
- Evaluar la situación sin ponerse en riesgo
- Llamar a los servicios de emergencia si es necesario
- Aplicar primeros auxilios básicos si está capacitado
- Documentar el incidente

La seguridad no es casualidad, es el resultado del trabajo en equipo y el compromiso de todos.
`;

async function addSampleContent() {
  try {
    // Find the most recent manual
    const manual = await Manual.findOne({
      order: [['created_at', 'DESC']]
    });

    if (manual) {
      // Update with sample content
      manual.extracted_text = sampleContent.trim();
      manual.status = 'ready';
      await manual.save();
      
      console.log(`Updated manual "${manual.title}" with sample content`);
    } else {
      console.log('No manual found');
    }
  } catch (error) {
    console.error('Error adding sample content:', error);
  }
}

addSampleContent();