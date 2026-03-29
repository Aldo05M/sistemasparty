// /api/spotify.js
export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Missing query' });
  }

  // Obtén las credenciales de las variables de entorno
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  // 1. Obtener token de acceso
  const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!tokenResp.ok) {
    return res.status(500).json({ error: 'No se pudo obtener token de Spotify' });
  }

  const { access_token } = await tokenResp.json();

  // 2. Buscar canciones
  const searchResp = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=5`, {
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  });

  if (!searchResp.ok) {
    return res.status(500).json({ error: 'No se pudo buscar en Spotify' });
  }

  const data = await searchResp.json();
  const tracks = (data.tracks && data.tracks.items) ? data.tracks.items : [];

  // 3. Mapear resultados
  const resultados = tracks.map(track => ({
    nombre: track.name,
    artista: track.artists[0]?.name || '',
    spotify_id: track.id,
    preview: track.preview_url,
    album_cover: track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || ''
  }));

  res.status(200).json({ data: resultados });
}
