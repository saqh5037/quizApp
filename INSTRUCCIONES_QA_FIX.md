# Instrucciones para Resolver el Error de Video Upload en QA

## El Problema
El backend en QA no está funcionando debido a un problema de compilación con Babel/TypeScript. Esto impide que la carga de videos funcione correctamente, mostrando un error 500 con archivos que contienen caracteres especiales.

## Solución Rápida

### Opción 1: Copiar y Ejecutar el Script
1. Conéctate al servidor QA:
```bash
ssh dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com
```

2. Navega al directorio del proyecto:
```bash
cd /home/dynamtek/aristoTEST
```

3. Crea el script de fix:
```bash
nano fix-backend.sh
```

4. Copia el contenido del archivo `fix-backend-remote.sh` que está en este repositorio

5. Guarda y cierra (Ctrl+X, Y, Enter)

6. Dale permisos de ejecución:
```bash
chmod +x fix-backend.sh
```

7. Ejecuta el script:
```bash
./fix-backend.sh
```

### Opción 2: Transferir el Script por SCP
Si tienes acceso SSH configurado:
```bash
scp fix-backend-remote.sh dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com:/home/dynamtek/aristoTEST/fix-backend.sh
ssh dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com "cd /home/dynamtek/aristoTEST && chmod +x fix-backend.sh && ./fix-backend.sh"
```

## Verificación

Después de ejecutar el script, verifica que el backend esté funcionando:

1. Desde el servidor:
```bash
pm2 status aristotest-backend
curl http://localhost:3001/api/v1/auth/login
```

2. Desde tu máquina local:
```bash
curl http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1/auth/login
```

3. Prueba la carga de videos en:
http://ec2-52-55-189-120.compute-1.amazonaws.com/videos/upload

## Si Sigue Sin Funcionar

1. Revisa los logs:
```bash
pm2 logs aristotest-backend --lines 100
```

2. Intenta reiniciar manualmente:
```bash
pm2 delete aristotest-backend
cd /home/dynamtek/aristoTEST/backend
pm2 start npm --name aristotest-backend -- start
```

3. Si el problema persiste, usa ts-node directamente:
```bash
cd /home/dynamtek/aristoTEST/backend
npm install --save-dev ts-node tsconfig-paths
pm2 delete aristotest-backend
pm2 start npx --name aristotest-backend -- ts-node -r tsconfig-paths/register src/server.ts
```

## Cambios Realizados

1. **Sanitización de Nombres de Archivo**: Se agregó una función que elimina acentos y caracteres especiales de los nombres de archivos antes de enviarlos a MinIO.

2. **Archivo Agregado**: `backend/src/utils/filename.utils.ts`

3. **Archivo Modificado**: `backend/src/services/video-upload.service.ts`

## Notas Importantes

- El problema principal era que archivos con nombres como "AristoTest__Capacitación_con_IA.mp4" causaban errores en los headers HTTP
- La solución sanitiza estos nombres a "AristoTest_Capacitacion_con_IA.mp4"
- El backend debe apuntar a la base de datos PostgreSQL en: ec2-3-91-26-178.compute-1.amazonaws.com