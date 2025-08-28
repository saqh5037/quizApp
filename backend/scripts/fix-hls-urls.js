const Minio = require('minio');

const client = new Minio.Client({
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'aristotest',
    secretKey: 'AristoTest2024!'
});

const bucketName = 'aristotest-videos';
const hostUrl = 'http://192.168.1.125:9000';

async function updateHLSFiles() {
    console.log('Actualizando archivos HLS con URLs correctas...');
    
    // Lista de videos a actualizar
    const videos = [];
    for (let i = 1; i <= 50; i++) {
        videos.push(i);
    }
    
    let updated = 0;
    
    for (const videoId of videos) {
        try {
            // Descargar master.m3u8
            const masterPath = `videos/hls/${videoId}/master.m3u8`;
            
            const dataStream = await client.getObject(bucketName, masterPath).catch(err => null);
            if (!dataStream) continue;
            
            let content = '';
            for await (const chunk of dataStream) {
                content += chunk;
            }
            
            // Verificar si necesita actualización
            if (content.includes('localhost')) {
                // Reemplazar localhost con la IP correcta
                const updatedContent = content.replace(/http:\/\/localhost:9000/g, hostUrl);
                
                // Subir el archivo actualizado
                await client.putObject(bucketName, masterPath, Buffer.from(updatedContent), {
                    'Content-Type': 'application/vnd.apple.mpegurl'
                });
                
                console.log(`✅ Actualizado master.m3u8 del video ${videoId}`);
                updated++;
                
                // Actualizar también los playlists de cada calidad
                const qualities = ['360p', '480p', '720p'];
                for (const quality of qualities) {
                    const playlistPath = `videos/hls/${videoId}/${quality}/playlist.m3u8`;
                    
                    const playlistStream = await client.getObject(bucketName, playlistPath).catch(err => null);
                    if (!playlistStream) continue;
                    
                    let playlistContent = '';
                    for await (const chunk of playlistStream) {
                        playlistContent += chunk;
                    }
                    
                    if (playlistContent.includes('localhost')) {
                        const updatedPlaylist = playlistContent.replace(/http:\/\/localhost:9000/g, hostUrl);
                        
                        await client.putObject(bucketName, playlistPath, Buffer.from(updatedPlaylist), {
                            'Content-Type': 'application/vnd.apple.mpegurl'
                        });
                        console.log(`  ✅ Actualizado playlist ${quality}`);
                    }
                }
            }
            
        } catch (error) {
            // Silenciar errores de videos que no existen
        }
    }
    
    console.log(`\n✅ Proceso completado. ${updated} videos actualizados.`);
}

updateHLSFiles().catch(console.error);