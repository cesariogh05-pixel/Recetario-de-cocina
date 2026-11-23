export default function manifest() {
    return {
        name: 'Mi Sabor - Recetario de cocina',
        short_name: 'Mi Sabor',
        description: 'Recetario de cocina que permite explorar recetas caseras y guardar tus platillos favoritos.',
        start_url: '/',
        display: 'standalone',
        background_color: '#FAF6EA',
        theme_color: '#805039',
        icons: [
            {
                src: '/iconos/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/iconos/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            }
        ]
    }
}