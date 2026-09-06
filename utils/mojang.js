// Resolves a Minecraft username to a UUID and a skin render URL.
// Uses Mojang's public API for the UUID, Crafatar for the skin render
// (no API key required for either, both are free).

async function resolveIgn(ign) {
  const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(ign)}`);

  if (res.status === 204 || res.status === 404) {
    return null; // no such player
  }
  if (!res.ok) {
    throw new Error(`Mojang API error: ${res.status}`);
  }

  const data = await res.json(); // { id: "<uuid-no-dashes>", name: "<exact-case IGN>" }
  const dashedUuid = [
    data.id.slice(0, 8),
    data.id.slice(8, 12),
    data.id.slice(12, 16),
    data.id.slice(16, 20),
    data.id.slice(20),
  ].join('-');

  return {
    ign: data.name,
    uuid: dashedUuid,
    skinUrl: `https://crafatar.com/renders/body/${data.id}?overlay`,
  };
}

module.exports = { resolveIgn };
