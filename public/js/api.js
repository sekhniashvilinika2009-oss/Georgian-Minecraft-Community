const Api = (() => {
  function token() {
    return localStorage.getItem('token');
  }

  async function request(method, url, body) {
    const headers = { 'Content-Type': 'application/json' };
    const t = token();
    if (t) headers['Authorization'] = `Bearer ${t}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }

    if (!res.ok) {
      const message = (data && data.error) || `Request failed (${res.status})`;
      throw new Error(message);
    }
    return data;
  }

  return {
    get: (url) => request('GET', url),
    post: (url, body) => request('POST', url, body),
    put: (url, body) => request('PUT', url, body),
    del: (url) => request('DELETE', url),
    setToken: (t) => localStorage.setItem('token', t),
    clearToken: () => localStorage.removeItem('token'),
    hasToken: () => !!token(),
  };
})();
