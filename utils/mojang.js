// Resolves a Minecraft username to a UUID and a skin render URL.
//
// Mojang's own API (api.mojang.com) actively blocks/403s requests coming
// from datacenter / cloud-hosting IP ranges (Render, Railway, Heroku, AWS,
// etc.) as an anti-bot measure. It still works fine from a home connection,
// which is why this can look "broken" only once deployed. So: try Mojang
// first (works locally, and for anyone whose IP isn't blocked), and fall
// back to PlayerDB (https://playerdb.co) which proxies/caches the same data
// and is reliable from cloud servers. Both are free, no API key needed.

function toDashedUuid(id) {
  const clean = id.replace(/-/g, '');
  return [
    clean.slice(0, 8),
    clean.slice(8, 12),
    clean.slice(12, 16),
    clean.slice(16, 20),
    clean.slice(20),
  ].join('-');
}

async function resolveViaMojang(ign) {
  const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(ign)}`, {
    headers: { 'User-Agent': 'mc-player-hub' },
  });

  if (res.status === 204 || res.status === 404) {
    return { notFound: true };
  }
  if (!res.ok) {
    return { failed: true }; // e.g. 403 from a datacenter IP - let the caller fall back
  }

  const data = await res.json(); // { id: "<uuid-no-dashes>", name: "<exact-case IGN>" }
  const dashedUuid = toDashedUuid(data.id);

  return {
    ign: data.name,
    uuid: dashedUuid,
    skinUrl: `https://crafatar.com/renders/body/${data.id}?overlay`,
  };
}

async function resolveViaPlayerDb(ign) {
  const res = await fetch(`https://playerdb.co/api/player/minecraft/${encodeURIComponent(ign)}`, {
    headers: {
      'User-Agent': 'mc-player-hub (https://github.com/sekhniashvilinika2009-oss/Georgian-Minecraft-Community)',
    },
  });

  if (res.status === 404) {
    return null; // no such player
  }
  if (!res.ok) {
    throw new Error(`PlayerDB API error: ${res.status}`);
  }

  const data = await res.json();
  if (!data.success || !data.data?.player) {
    return null;
  }

  const player = data.data.player;
  const rawId = (player.raw_id || player.id || '').replace(/-/g, '');
  const dashedUuid = toDashedUuid(rawId);

  return {
    ign: player.username,
    uuid: dashedUuid,
    skinUrl: `https://crafatar.com/renders/body/${rawId}?overlay`,
  };
}

async function resolveIgn(ign) {
  try {
    const mojangResult = await resolveViaMojang(ign);
    if (mojangResult.notFound) return null;
    if (!mojangResult.failed) return mojangResult;
    // fall through to PlayerDB if Mojang failed (e.g. blocked cloud IP)
  } catch (err) {
    // network error talking to Mojang - fall through to PlayerDB
  }

  return resolveViaPlayerDb(ign);
}

module.exports = { resolveIgn };
