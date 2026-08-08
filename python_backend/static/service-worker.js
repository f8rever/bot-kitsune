self.addEventListener('fetch', function(event) {
    const url = new URL(event.request.url);

    // Verifique se a URL é a específica do hCaptcha
    if (url.hostname === 'api.hcaptcha.com' && url.pathname === '/checksiteconfig') {
        // Recupere os parâmetros de query da URL original
        const params = new URLSearchParams(url.search);

        // Altere o valor do parâmetro 'host'
        params.set('host', '127.0.0.1');

        // Construa a nova URL com o parâmetro 'host' modificado
        const newUrl = `${url.origin}${url.pathname}?${params}`;

        // Crie uma nova requisição com a URL modificada
        const modifiedRequest = new Request(newUrl, {
            method: event.request.method,
            headers: event.request.headers,
            body: event.request.body,
            mode: 'cors', // Mantenha o modo CORS se necessário
            credentials: event.request.credentials,
        });

        // Faça a requisição com a URL modificada
        event.respondWith(fetch(modifiedRequest));
    } else {
        // Prossiga com a requisição original se não for o caso específico
        event.respondWith(fetch(event.request));
    }
});
