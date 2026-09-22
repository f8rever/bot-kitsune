let jwtToken = '';
let selectedOfferId = null; // Variable to store the selected offerId
let selectedPrice = null;
let selectedPriceIp = null;
let selectedItemName = null;
let selectedItemId = null;
let selectedInventoryType = null;
let selectedQuantity = 1;

var captchaWidgetId = null; //Store the widget ID for reference


// Criar elementos no DOM para armazenar a chave e o token captcha
var keyElement = document.createElement('div');
keyElement.style.display = 'none'; // Esconder o elemento
keyElement.id = 'hiddenKey';
document.body.appendChild(keyElement);

var tokenElement = document.createElement('div');
tokenElement.style.display = 'none'; // Esconder o elemento
tokenElement.id = 'hiddenToken';
document.body.appendChild(tokenElement);


// Criar elementos no DOM para armazenar USERNAME e PASSWORD
var userElement = document.createElement('div');
userElement.style.display = 'none'; // Esconder o elemento
userElement.id = 'hiddenUserDOM';
document.body.appendChild(userElement);

var passElement = document.createElement('div');
passElement.style.display = 'none'; // Esconder o elemento
passElement.id = 'hiddenPassDOM';
document.body.appendChild(passElement);




// Obtendo os elementos do slider e da caixa de texto
const slider = document.getElementById('gift-quantity-slider');
const numberInput = document.getElementById('gift-quantity-input');

// Atualiza o valor global e sincroniza a caixa de texto com o slider
function updateValueFromSlider() {
    selectedQuantity = parseInt(slider.value, 10); // Atualiza a variável global
    numberInput.value = selectedQuantity; // Sincroniza com a caixa de texto
}

// Atualiza o valor global e sincroniza o slider com a caixa de texto
function updateValueFromNumberInput() {
    let value = parseInt(numberInput.value, 10);

    // Garante que o valor esteja dentro dos limites
    if (value < parseInt(numberInput.min, 10)) {
        value = parseInt(numberInput.min, 10);
    } else if (value > parseInt(numberInput.max, 10)) {
        value = parseInt(numberInput.max, 10);
    }

    selectedQuantity = value; // Atualiza a variável global
    slider.value = selectedQuantity; // Sincroniza com o slider
    numberInput.value = selectedQuantity;
}

// Listeners para atualizar o valor global e sincronizar os elementos
slider.addEventListener('input', updateValueFromSlider);
numberInput.addEventListener('input', updateValueFromNumberInput);

// Função para resetar o valor para 1
function resetQuantity() {
    selectedQuantity = 1; // Atualiza a variável global
    slider.value = selectedQuantity; // Reseta o slider
    numberInput.value = selectedQuantity; // Reseta a caixa de texto
}




function removeSpaces(text) {
    return text.replace(/\s+/g, '');
}

function formatDate(dateString) {
    // Tenta criar um objeto Date a partir da string
    const date = new Date(dateString);
    
    // Verifica se a data é válida
    if (!isNaN(date.getTime())) {
        // Se for uma data válida, retorna a data formatada
        return date.toLocaleString();
    } else {
        // Se não for válida, retorna uma mensagem alternativa
        return "-";  // ou "Awaiting", conforme necessário
    }
}


document.addEventListener('DOMContentLoaded', function () {
    // Adiciona o ouvinte de eventos aos campos de entrada
    const inputs = document.querySelectorAll('#login_api, #key_api');
    inputs.forEach(input => {
        input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                login();  // Chama a função login quando Enter é pressionado
            }
        });
    });
});

function login() {
    const username = removeSpaces(document.getElementById('login_api').value);
    const key = removeSpaces(document.getElementById('key_api').value);

    const data = {
        login_api: username,
        key_api: key
    };

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token) {
            jwtToken = data.access_token;
            localStorage.setItem('jwtToken', jwtToken);
            console.log('Login successful:', data);
            // Carregar conteúdo da página protegida
            //loadProtectedContent();
            window.location.href = '/api_frontend'; // Redirecionamento para /api_frontend

        } else {
            //console.error('Login failed:', data);
            // Exibir mensagem de erro abaixo do botão de login
            const errorMessageElement = document.getElementById('error-message');

            // Verificar o conteúdo da mensagem retornada pelo servidor e ajustar a mensagem de erro
            if (data.message === 'Invalid credentials') {
                errorMessageElement.innerText = 'Invalid credentials. Please check your username and key.';
            } else if (data.message === 'Key expired') {
                errorMessageElement.innerText = 'Your key has expired. Please contact the admin.';
            } else {
                errorMessageElement.innerText = data.message || 'An unexpected error occurred. Please try again.';
            }
        }
    })
    .catch((error) => {
        //console.error('Error:', error);
    });
}




function toggleLoginMode(isSimpleLogin) {
    const usernameInput = document.getElementById('username-password');
    const passwordInput = document.getElementById('password');

    if (isSimpleLogin) {
        // Modo de login simples ativado
        usernameInput.placeholder = 'Username:Password'; // Altera o placeholder
        passwordInput.disabled = true;                  // Desativa o campo de senha
        passwordInput.classList.add('disabled-input');  // Adiciona uma classe para esmaecer o input
    } else {
        // Modo de login simples desativado
        usernameInput.placeholder = 'Username';         // Restaura o placeholder
        passwordInput.disabled = false;                 // Ativa o campo de senha
        passwordInput.classList.remove('disabled-input'); // Remove a classe esmaecedora
    }
}

function updateBalance(rp_spent) {
    fetch('/update_balance', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('jwtToken')
        },
        body: JSON.stringify({ rp_spent: rp_spent })
    })
    .then(response => response.json())
    .then(data => {
        var resultDiv = document.getElementById('result');
        if (data.msg === 'Balance updated successfully') {
            //alert(`Balance updated successfully. New balance: ${data.new_balance}`);
            //document.getElementById('saldo-amount').innerText = data.new_balance;
        } else {
            //alert(`Error: ${data.msg}`);
            console.log('Failed:', data.msg);
        }
    })
    .catch((error) => {
        //console.error('Error:', error);
        //alert('An error occurred while updating the balance.');
    });
}



async function Api(task) {


    
    // Pega o estado do checkbox
    var isSimpleLogin = document.getElementById('simple-login').checked;
    var usernameInput = document.getElementById('username-password');
    var passwordInput = document.getElementById('password');
    var tokensInput = document.getElementById('tokens-url');
    var receiverInput = document.getElementById('nickname-tag');
    var giftMessage = document.getElementById('gift-message').value;
        //var ssidInput = document.getElementById('ssid-cookie');

    
    // Variáveis para armazenar username e password
    var username, password, name, tag;

    const rawUserVal = removeSpaces(usernameInput.value || '');
    if (rawUserVal.includes(':')) {
        // Se contém ':', faz o split inteligente automático mesmo se o toggle estiver desligado
        var credentials = rawUserVal.split(':');
        username = credentials[0];
        password = credentials.slice(1).join(':');
    } else if (isSimpleLogin) {
        alert('Please enter your credentials in the format "username:password".');
        return;
    } else {
        username = rawUserVal;
        password = removeSpaces(passwordInput.value || '');
    }

    if (!username) {
        alert('Please make sure username is entered.');
        return;
    }
    if (!password && !tokensInput.value) {
        alert('Please make sure password or a session token is entered.');
        return;
    }

    // Validando a entrada do nickname-tag
    if (task != 'saldo') {
        // Encode the input value to UTF-8
        let encodedValue = encodeURIComponent(receiverInput.value);

        // Remove unwanted characters (e.g., <0x2066> and <0x2069>)
        let cleanedValue = encodedValue.replace(/%E2%81%A6|%E2%81%A9/g, '');

        // Decode the cleaned value back to readable text
        let decodedValue = decodeURIComponent(cleanedValue);

        //var receiver = removeSpaces(decodedValue);

        var receiver = decodedValue;
        if (!receiver) {
            alert('Please enter a nickname-tag in the format "nickname#tag".');
            return;  // Sai da função se o campo estiver vazio
        } else {
            var parts = receiver.split('#');
            if (parts.length === 2) {
                name = parts[0];
                tag = parts[1];
                if (!name || !tag) {
                    alert('Please make sure both nickname and tag after "#" are entered.');
                    return;  // Sai da função se nome ou tag estiverem vazios
                }
            } else {
                alert('Please enter exactly one "#" character separating nickname and tag.');
                return;  // Sai da função se houver mais ou menos de um '#' no input
            }
        }
    }

    if (task == 'gift' || task == 'order') {
        if ( !selectedOfferId || !selectedPrice || selectedPrice == "Null") {
            
            if(selectedOfferId) {
                selectedPrice = 0;
            }

            else {
                alert('Please select an valid item before proceeding on gift/order.');
                return; // Indica que a verificação falhou
            }
        }
    }
    


    
    var resultDiv = document.getElementById('result');


    resultDiv.innerText = "Verifying Authentication...";

    userpass = `${username}:${password}`;
    if (tokensInput.value === '') {
        lol_token = null
        id_token = null
    }
    else {
        let tokens = extractTokens(tokensInput.value);
        lol_token = tokens.access_token;
        id_token = tokens.id_token;
    }


    
    //ssid_string = ssidInput

    
/*      try {
        result_captcha = await getAuthCaptcha(userpass)
        captcha_solved = result_captcha.captchaResponse
        session_id = result_captcha.session_id
    } catch (error) {
        //console.error("Erro on geting captcha:", error);
        throw error;
    }
    console.log('Captcha response:', result_captcha.captchaResponse);*/

    

    switch (task) {
        case 'saldo':
            document.getElementById('result').innerText = "Fetching the RP balance...";
            break;
        case 'friend':
            document.getElementById('result').innerText = "Sending friend request...";
            break;
        case 'gift':
            document.getElementById('result').innerText = "Sending gift...";
            break;
        case 'order':
            document.getElementById('result').innerText = "Scheduling order...";
            break;
        default:
            break;
    }

    //const selectedCurrency = document.querySelector('input[name="currency"]:checked').value;
    const selectedCurrency = "RP"


    const headers = { 'Content-Type': 'application/json' };
    const savedToken = localStorage.getItem('jwtToken');
    if (savedToken && savedToken !== 'null' && savedToken !== 'undefined') {
        headers['Authorization'] = 'Bearer ' + savedToken;
    }

    // Se username e password estiverem corretos, faz uma requisição AJAX ao servidor
    fetch('/run-script', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            username: username,
            password: password,
            lol_token: lol_token,
            id_token: id_token,
            name: name,
            tag: tag,
            task: task,
            item_name: selectedItemName,
            offer_id: selectedOfferId,
            item_id: selectedItemId,
            inventory_type: selectedInventoryType,
            price: selectedPrice,
            price_ip: selectedPriceIp,
            currency: selectedCurrency,
            quantity: selectedQuantity,
            giftmessage: giftMessage,
        })
    })
    .then(response => response.json())
    .then(data => {
        var resultDiv = document.getElementById('result');
        if (data.status === 'success'){
            resetQuantity()
            console.log('Success:', data);
            var saldoAmount = document.getElementById('saldo-amount');
            resultDiv.innerText = data.message;

            if ('saldo' in data) {
                console.log('Saldo:', data.saldo);
                if (saldoAmount) saldoAmount.innerText = data.saldo;
                const rpCardNum = document.querySelector('.metrics-cards-grid .metric-card:nth-child(1) .metric-number');
                if (rpCardNum) rpCardNum.innerText = `${data.saldo} RP`;
                const headerRpVal = document.getElementById('header-rp-val');
                if (headerRpVal) headerRpVal.innerText = `${data.saldo}`;
            }

            if ('daily_gifts_count' in data) {
                const sentCardNum = document.getElementById('daily-gifts-counter');
                if (sentCardNum) {
                    sentCardNum.innerText = `${data.daily_gifts_count} / 10`;
                    sentCardNum.dataset.current = data.daily_gifts_count;
                }
            }

            if (task === 'gift' || 'rp_spent' in data) {
                const sentCardNum = document.getElementById('daily-gifts-counter');
                if (sentCardNum) {
                    let currentSent = parseInt(sentCardNum.dataset.current, 10) || 0;
                    currentSent += (selectedQuantity || 1);
                    sentCardNum.dataset.current = currentSent;
                    sentCardNum.innerText = `${currentSent} / 10`;
                }
                if (typeof fetchOrders === 'function') {
                    fetchOrders();
                }
            }

            if('rp_spent' in data){
                console.log('Rp spent:', data.rp_spent);
                updateBalance(data.rp_spent);
            }

            if('ip_spent' in data){
                console.log('IP spent:', data.ip_spent);
            }



        }
        else if (data.message == 'Wrong credentials: Invalid username or password') {
            //console.error('Wrong credentials:', data);
            resultDiv.innerText = 'Authentication failed for ' + username;
        }

        else {
            resultDiv.innerText = data.message || ('Gift failed for ' + username);
        }

    })
    .catch((error) => {
        var resultDiv = document.getElementById('result');
        resultDiv.innerText = (error && error.message) ? error.message : ('Error for ' + username);
    });

    }


setInterval(function() {
    window.location.reload();
}, 21600*1000);  // Recarrega a página a cada 10000 milissegundos (ou seja, a cada 10 segundos)







let catalog = {};
let selectedLanguage = 'pt';
try {
    const savedLang = localStorage.getItem('lg_store_language');
    if (savedLang === 'en' || savedLang === 'pt') selectedLanguage = savedLang;
} catch (e) {}

let catalogIndexedItems = [];
let giftCart = [];
try {
    const savedCart = localStorage.getItem('lg_gift_cart');
    if (savedCart) giftCart = JSON.parse(savedCart);
} catch (e) {
    giftCart = [];
}

function changeStoreLanguage(lang) {
    selectedLanguage = lang || 'pt';
    try {
        localStorage.setItem('lg_store_language', selectedLanguage);
    } catch (e) {}
    document.querySelectorAll('.header-lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.id === `btn-lang-${selectedLanguage}`);
    });
    const langSelect = document.getElementById('catalog-language');
    if (langSelect) langSelect.value = selectedLanguage;
    if (typeof window.applyUiTranslations === 'function') {
        window.applyUiTranslations(selectedLanguage);
    }
    if (typeof window.fetchCatalog === 'function') {
        window.fetchCatalog();
    }
}
window.changeStoreLanguage = changeStoreLanguage;

function initCatalogApp() {
    const searchInput = document.getElementById('search-item');
    const categoryRadios = document.querySelectorAll('input[name="category"]');
    const languageSelect = document.getElementById('catalog-language');

    // Category pill/chip visual toggle listener
    categoryRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            document.querySelectorAll('.chip-item, .category-pill').forEach(pill => pill.classList.remove('active'));
            if (this.parentElement) this.parentElement.classList.add('active');
            filterItems();
        });
    });

    function isMythicSkin(item) {
        if (!item) return false;
        const cat = (item.category || '').toLowerCase();
        const inv = (item.inventory_type || '').toUpperCase();
        const isSkin = cat === 'skin' || cat === 'skins' || inv === 'CHAMPION_SKIN' || inv === 'SKIN';
        if (!isSkin) return false;
        
        const nameLower = (item.name || '').toLowerCase();
        
        // Mythic skins in LoL: prestige, mythic/mítica, hextech, ashen knight, crystalis
        if (nameLower.includes('prestige') || nameLower.includes('prestígio') || nameLower.includes('prestigio') ||
            nameLower.includes('mítica') || nameLower.includes('mitica') || nameLower.includes('mythic') ||
            nameLower.includes('hextec') || nameLower.includes('hextech') ||
            nameLower.includes('cavaleiro das cinzas') || nameLower.includes('ashen knight') ||
            nameLower.includes('cristalis') || nameLower.includes('crystalis')) {
            return true;
        }
        return false;
    }
    window.isMythicSkin = isMythicSkin;

    async function fetchCatalog() {
        try {
            const response = await fetch(`/get-catalog?lang=${selectedLanguage}`);
            if (!response.ok) {
                throw new Error('Failed to fetch catalog');
            }
            catalog = await response.json();
            
            catalogIndexedItems = [];
            const seenKeys = new Set();
            for (const category in catalog) {
                if (typeof catalog[category] === 'object' && catalog[category] !== null) {
                    Object.entries(catalog[category]).forEach(([name, details]) => {
                        let effectiveCategory = category;
                        let extraKeywords = '';
                        const nl = name.toLowerCase();
                        if (nl.includes('lenda ascendida') || nl.includes('lenda imortalizada') || nl.includes('risen legend') || nl.includes('immortalized legend') || nl.includes('hall of legends')) {
                            extraKeywords = ' hall of legends hol faker caps';
                        }

                        // Never sell / index mythic skins
                        if (isMythicSkin({ name, category: effectiveCategory, inventory_type: details.inventory_type })) {
                            return;
                        }

                        const uniqueKey = `${name}_${details.offer_id || details.item_id}`;
                        if (seenKeys.has(uniqueKey)) return;
                        seenKeys.add(uniqueKey);

                        catalogIndexedItems.push({
                            name,
                            searchName: normalizeText(name + extraKeywords),
                            price_rp: details.price_rp,
                            price_ip: details.price_ip,
                            offer_id: details.offer_id,
                            item_id: details.item_id,
                            inventory_type: details.inventory_type || effectiveCategory.toUpperCase(),
                            category: effectiveCategory,
                            icon_url: details.icon_url || details.iconUrl || details.icon || details.image || null
                        });
                    });
                }
            }

            // Build Skin -> Chromas lookup map for instant bundle/skin carousel navigation
            window.skinChromasMap = {};
            const chromasCategory = catalog['Chromas'] || {};
            for (const [chromaFullName, chromaDetails] of Object.entries(chromasCategory)) {
                if (chromaFullName.includes('(') && chromaFullName.includes(')')) {
                    const baseSkinName = chromaFullName.substring(0, chromaFullName.lastIndexOf('(')).trim();
                    const chromaColor = chromaFullName.substring(chromaFullName.lastIndexOf('(') + 1, chromaFullName.lastIndexOf(')')).trim();
                    
                    let chromaImg = chromaDetails.icon_url || chromaDetails.iconUrl || '';
                    if (!chromaImg && chromaDetails.item_id) {
                        const cid = Number(chromaDetails.item_id);
                        const champId = Math.floor(cid / 1000);
                        chromaImg = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-chroma-images/${champId}/${cid}.png`;
                    }
                    
                    const k = baseSkinName.toLowerCase();
                    if (!window.skinChromasMap[k]) {
                        window.skinChromasMap[k] = [];
                    }
                    window.skinChromasMap[k].push({
                        fullName: chromaFullName,
                        color: chromaColor,
                        icon_url: chromaImg,
                        item_id: chromaDetails.item_id,
                        offer_id: chromaDetails.offer_id,
                        price_rp: chromaDetails.price_rp || 290
                    });
                }
            }

            // Build Skin -> Splash Art fast lookup map (for Chroma Bundles)
            window.skinToSplashMap = {};
            const skinsCategory = catalog['Skins'] || {};
            for (const [sName, sData] of Object.entries(skinsCategory)) {
                if (sData && sData.icon_url) {
                    window.skinToSplashMap[sName.toLowerCase().trim()] = {
                        splash: sData.icon_url,
                        loading: sData.icon_url.includes('/splash/') ? sData.icon_url.replace('/splash/', '/loading/') : sData.icon_url,
                        name: sName
                    };
                }
            }

            // Build Champion -> All Skins grouped map for the Skins tab carousel
            window.championsSkinsMap = {};
            const champsCategory = catalog['Champions'] || {};
            const idToChamp = {};
            const idToKey = {};
            for (const [cName, cData] of Object.entries(champsCategory)) {
                if (cData && cData.item_id) {
                    idToChamp[cData.item_id] = cName;
                    if (cData.icon_url) {
                        const m = cData.icon_url.match(/\/champion\/([^/]+)\.png/);
                        if (m) idToKey[cData.item_id] = m[1];
                    }
                }
            }

            for (const [sName, sData] of Object.entries(skinsCategory)) {
                if (isMythicSkin({ name: sName, category: 'Skin', inventory_type: 'CHAMPION_SKIN' })) {
                    continue;
                }
                let champ = idToChamp[sData.parent_id];
                let champKey = idToKey[sData.parent_id] || '';
                if (!champKey && sData.icon_url) {
                    const m = sData.icon_url.match(/champion\/splash\/([A-Za-z]+)_/);
                    if (m) champKey = m[1];
                }
                if (!champ) {
                    champ = champKey || sName.split(' ')[0];
                }
                if (!champKey) champKey = champ;

                if (!window.championsSkinsMap[champ]) {
                    const cData = champsCategory[champ] || Object.values(champsCategory).find(c => c && c.item_id === sData.parent_id);
                    const baseItem = {
                        name: champ,
                        championName: champ,
                        isBase: true,
                        item_id: cData ? cData.item_id : (sData.parent_id || 0),
                        offer_id: cData ? cData.offer_id : '',
                        price_rp: (cData && cData.price_rp) ? cData.price_rp : 790,
                        category: 'Skin',
                        inventory_type: 'CHAMPION',
                        icon_url: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champKey}_0.jpg`,
                        splash_url: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champKey}_0.jpg`,
                        loading_url: `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champKey}_0.jpg`,
                        rarity_label: 'CAMPEÃO',
                        rarity_color: '#c8aa6e'
                    };

                    window.championsSkinsMap[champ] = {
                        championName: champ,
                        championKey: champKey,
                        skins: [baseItem],
                        currentSkinIndex: 0
                    };
                }

                const sSplash = sData.icon_url || '';
                const sLoading = sSplash.includes('/splash/') ? sSplash.replace('/splash/', '/loading/') : sSplash;
                window.championsSkinsMap[champ].skins.push({
                    name: sName,
                    ...sData,
                    isBase: false,
                    category: 'Skin',
                    inventory_type: 'CHAMPION_SKIN',
                    icon_url: sSplash,
                    splash_url: sSplash,
                    loading_url: sLoading
                });
            }

            // Pre-sort skins (keeping base champion at slot 0 and skins chronologically)
            for (const champ of Object.values(window.championsSkinsMap)) {
                const baseItem = champ.skins[0];
                const realSkins = champ.skins.slice(1);
                realSkins.sort((a, b) => (Number(a.item_id) || 0) - (Number(b.item_id) || 0));
                champ.skins = [baseItem, ...realSkins];
                champ.currentSkinIndex = 0; // Starts always on base champion ("o boneco")
            }
            window.championsList = Object.values(window.championsSkinsMap);
            window.championsList.sort((a, b) => a.championName.localeCompare(b.championName));

            filterItems();
        } catch (error) {
            console.error('Catalog fetch error:', error);
        }
    }
    window.fetchCatalog = fetchCatalog;

    function normalizeText(text) {
        return (text || '')
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    function matchesCategory(item, sel) {
        if (!sel || sel === 'all') return !isMythicSkin(item);
        const s = sel.toLowerCase();
        const itemCat = (item.category || '').toLowerCase();
        const invType = (item.inventory_type || '').toUpperCase();
        const nameLower = (item.name || '').toLowerCase();

        if (s === 'skin' || s === 'skins') {
            return (itemCat === 'skins' || itemCat === 'skin') && (invType === 'CHAMPION_SKIN' || invType === 'SKIN') && !nameLower.includes('chroma') && !nameLower.includes('croma') && !isMythicSkin(item);
        }
        if (s === 'chroma' || s === 'chromas') {
            return itemCat === 'chromas' || itemCat === 'chroma' || invType === 'CHROMA' || nameLower.includes('chroma') || nameLower.includes('croma');
        }
        if (s === 'bundle' || s === 'bundles') {
            return (itemCat === 'bundles' || itemCat === 'bundle' || invType === 'BUNDLES' || invType === 'BUNDLE') &&
                   !nameLower.includes('chest') && !nameLower.includes('baú') && !nameLower.includes('orb') && !nameLower.includes('orbe');
        }
        if (s === 'pass' || s === 'passes') {
            const isEternal = itemCat === 'eternals' || itemCat === 'eternos' || invType === 'STATSTONE' || nameLower.includes('series') || nameLower.includes('série') || nameLower.includes('starter');
            if (isEternal) return false;
            return itemCat === 'passes' || itemCat === 'pass' || invType === 'EVENT_PASS' || nameLower.includes('pass') || nameLower.includes('passe');
        }
        if (s === 'champion' || s === 'champions') {
            return itemCat === 'champions' || itemCat === 'champion' || invType === 'CHAMPION' || invType === 'CHAMPIONS';
        }
        if (s === 'emote' || s === 'emotes') {
            return itemCat === 'emotes' || itemCat === 'emote' || invType === 'EMOTE';
        }
        if (s === 'icon' || s === 'icons') {
            return itemCat === 'icons' || itemCat === 'icon' || invType === 'SUMMONER_ICON' || invType === 'ICON';
        }
        if (s === 'ward' || s === 'wards') {
            return itemCat === 'wards' || itemCat === 'ward' || invType === 'WARD_SKIN' || invType === 'WARD';
        }
        if (s === 'littlelegends' || s === 'little_legends') {
            return itemCat === 'littlelegends' || itemCat === 'companions' || invType === 'COMPANION' || nameLower.includes('little legend') || nameLower.includes('chibi') || nameLower.includes('pequena lenda');
        }
        if (s === 'tftarena' || s === 'tft_arena' || s === 'arena') {
            return itemCat === 'tftarena' || itemCat === 'tftarenas' || invType === 'TFT_MAP_SKIN' || invType === 'TFTARENA' || nameLower.includes('arena') || nameLower.includes('tabuleiro');
        }
        if (s === 'boost' || s === 'boosts') {
            return itemCat === 'boosts' || itemCat === 'boost' || invType.includes('BOOST') || nameLower.includes('boost');
        }
        if (s === 'eternals' || s === 'eternal' || s === 'eternos') {
            return itemCat === 'eternals' || invType === 'STATSTONE' || nameLower.includes('series') || nameLower.includes('série') || nameLower.includes('eternal') || nameLower.includes('eterno');
        }
        if (s === 'mystery' || s === 'mistério' || s === 'misterio') {
            return invType.includes('MYSTERY') || nameLower.includes('mystery') || nameLower.includes('mistério') || nameLower.includes('misterio');
        }
        if (s === 'hextech' || s === 'hextec') {
            return invType.includes('HEXTECH') || nameLower.includes('hextech') || nameLower.includes('chest') || nameLower.includes('baú') || nameLower.includes('key') || nameLower.includes('chave') || nameLower.includes('orb') || nameLower.includes('orbe');
        }
        return itemCat === s || itemCat.startsWith(s) || s.startsWith(itemCat);
    }

    let selectedActiveCategory = 'all';

    function selectCatalogSubtab(cat, btn) {
        document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');

        const headingEl = document.getElementById('catalogCategoryHeading');
        const sidebarEl = document.getElementById('chromasSidebar');
        const searchInput = document.getElementById('search-item');

        const isEn = selectedLanguage === 'en';
        const catTitlesPt = {
            'all': 'CATÁLOGO', 'Skin': 'SKINS', 'Chroma': 'CHROMAS', 'Bundle': 'PACOTES', 'Pass': 'PASSES',
            'Champion': 'CAMPEÕES', 'Emote': 'EMOTES', 'Icon': 'ÍCONES', 'Ward': 'SENTINELAS',
            'LittleLegends': 'PEQUENAS LENDAS', 'TFTArena': 'TABULEIROS TFT', 'Eternals': 'ETERNALS',
            'Mystery': 'MISTÉRIO', 'Hextech': 'HEXTEC'
        };
        const catTitlesEn = {
            'all': 'CATALOG', 'Skin': 'SKINS', 'Chroma': 'CHROMAS', 'Bundle': 'BUNDLES', 'Pass': 'PASSES',
            'Champion': 'CHAMPIONS', 'Emote': 'EMOTES', 'Icon': 'ICONS', 'Ward': 'WARDS',
            'LittleLegends': 'LITTLE LEGENDS', 'TFTArena': 'TFT ARENAS', 'Eternals': 'ETERNALS',
            'Mystery': 'MYSTERY', 'Hextech': 'HEXTECH'
        };
        const titles = isEn ? catTitlesEn : catTitlesPt;
        if (headingEl) headingEl.textContent = titles[cat] || cat.toUpperCase();

        if (sidebarEl) {
            sidebarEl.style.display = (cat === 'Skin' || cat === 'Chroma') ? 'flex' : 'none';
        }

        if (searchInput) {
            if (isEn) {
                if (cat === 'Skin') searchInput.placeholder = 'Search skins or champions...';
                else if (cat === 'Chroma') searchInput.placeholder = 'Search chromas...';
                else if (cat === 'Champion') searchInput.placeholder = 'Search champions...';
                else searchInput.placeholder = 'Search skins, champions, bundles...';
            } else {
                if (cat === 'Skin') searchInput.placeholder = 'Buscar skin ou campeão...';
                else if (cat === 'Chroma') searchInput.placeholder = 'Buscar chroma...';
                else if (cat === 'Champion') searchInput.placeholder = 'Buscar campeão...';
                else searchInput.placeholder = 'Buscar skin, campeão, pacote...';
            }
        }

        selectedActiveCategory = cat;

        const switcherEl = document.getElementById('skinsViewSwitcher');
        if (switcherEl) {
            switcherEl.style.display = (cat === 'Skin') ? 'inline-flex' : 'none';
        }

        filterItems();
    }
    window.selectCatalogSubtab = selectCatalogSubtab;

    window.selectedSkinViewMode = 'champion'; // 'champion' (default) or 'grid'

    function setSkinViewMode(mode) {
        window.selectedSkinViewMode = mode;
        const btnChamp = document.getElementById('btnViewChamp');
        const btnGrid = document.getElementById('btnViewGrid');
        if (btnChamp && btnGrid) {
            if (mode === 'champion') {
                btnChamp.classList.add('active');
                btnGrid.classList.remove('active');
            } else {
                btnChamp.classList.remove('active');
                btnGrid.classList.add('active');
            }
        }
        filterItems();
    }
    window.setSkinViewMode = setSkinViewMode;

    function filterItems() {
        const rawSearch = searchInput ? searchInput.value : '';
        const searchNormalized = normalizeText(rawSearch).trim();
        const searchTokens = searchNormalized ? searchNormalized.split(/\s+/).filter(Boolean) : [];
        
        // Champion Carousel Mode for the Skins Tab (as requested in audio)
        if (selectedActiveCategory === 'Skin' && window.selectedSkinViewMode === 'champion') {
            filterChampionSkins(searchTokens);
            return;
        }

        let items = catalogIndexedItems;

        if (selectedActiveCategory !== 'all') {
            items = items.filter(item => matchesCategory(item, selectedActiveCategory));
        }

        if (searchTokens.length > 0) {
            items = items.filter(item => {
                const itemNorm = item.searchName;
                return searchTokens.every(token => itemNorm.includes(token));
            });
        }

        // Sidebar filters for Skins and Chromas (Rarity, Sort, Order)
        if (selectedActiveCategory === 'Chroma' || selectedActiveCategory === 'Skin') {
            const rarityFilter = document.getElementById('chroma-rarity-filter');
            const rVal = rarityFilter ? rarityFilter.value.toLowerCase() : '';
            if (rVal) {
                items = items.filter(item => {
                    const info = getItemRarityInfo(item.name, item.price_rp, item.category, item);
                    const itemClass = (info.class || '').toLowerCase();
                    const itemLabel = (info.label || '').toLowerCase();
                    if (rVal === 'ultimate') {
                        return itemClass.includes('ultimate') || itemLabel.includes('ultimate') || info.rank === 6;
                    }
                    if (rVal === 'mythic') {
                        return itemClass.includes('mythic') || itemLabel.includes('mythic') || info.rank === 5;
                    }
                    if (rVal === 'legendary') {
                        return itemClass.includes('legendary') || itemLabel.includes('legendary') || info.rank === 4;
                    }
                    if (rVal === 'epic') {
                        return itemClass.includes('epic') || itemLabel.includes('epic') || info.rank === 3;
                    }
                    if (rVal === 'standard') {
                        return itemClass.includes('standard') || itemClass.includes('deluxe') || itemLabel.includes('deluxe') || info.rank === 0;
                    }
                    return itemClass.includes(rVal) || itemLabel.includes(rVal);
                });
            }

            const sortFilter = document.getElementById('chroma-sort-filter');
            const sVal = sortFilter ? sortFilter.value : 'rarity';
            const orderFilter = document.getElementById('chroma-order-filter');
            const oVal = orderFilter ? orderFilter.value : 'desc';

            if (sVal === 'price_asc') {
                items = [...items].sort((a, b) => (Number(a.price_rp) || 0) - (Number(b.price_rp) || 0));
            } else if (sVal === 'price_desc') {
                items = [...items].sort((a, b) => (Number(b.price_rp) || 0) - (Number(a.price_rp) || 0));
            } else if (sVal === 'name_asc') {
                items = [...items].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                if (oVal === 'desc') items.reverse();
            } else if (sVal === 'rarity') {
                items = [...items].sort((a, b) => {
                    const rankA = getItemRarityInfo(a.name, a.price_rp, a.category, a).rank || 0;
                    const rankB = getItemRarityInfo(b.name, b.price_rp, b.category, b).rank || 0;
                    if (rankA !== rankB) {
                        return oVal === 'asc' ? (rankA - rankB) : (rankB - rankA);
                    }
                    // Secondary tie-breaker by price
                    return (Number(b.price_rp) || 0) - (Number(a.price_rp) || 0);
                });
            }
        } else {
            // Priority spotlight items list from lolgifting.store
            const spotlightPriority = [
                'miss fortune t1 mvp',
                'veigar cripta de magma de prestígio (vívido)',
                'miss fortune t1 mvp (olho de gato)',
                'miss fortune t1 mvp (pérola)',
                'miss fortune t1 mvp (quartzo-rosa)',
                'miss fortune t1 mvp (rubi)',
                'miss fortune t1 mvp (safira)'
            ];

            function getSpotlightIndex(name) {
                const nl = (name || '').toLowerCase();
                for (let i = 0; i < spotlightPriority.length; i++) {
                    if (nl === spotlightPriority[i] || nl.startsWith(spotlightPriority[i])) return i;
                }
                return -1;
            }

            items = [...items].sort((a, b) => {
                const rA = getItemRarityInfo(a.name, a.price_rp, a.category, a);
                const rB = getItemRarityInfo(b.name, b.price_rp, b.category, b);

                // 1. Ultimates (Rank 6) always at the top!
                if (rA.rank === 6 && rB.rank !== 6) return -1;
                if (rB.rank === 6 && rA.rank !== 6) return 1;
                if (rA.rank === 6 && rB.rank === 6) {
                    const diffRp = (Number(b.price_rp) || 0) - (Number(a.price_rp) || 0);
                    if (diffRp !== 0) return diffRp;
                    return a.name.localeCompare(b.name);
                }

                // 2. Spotlight featured items (Miss Fortune T1 MVP & Chromas, Veigar Cripta...)
                const spotA = getSpotlightIndex(a.name);
                const spotB = getSpotlightIndex(b.name);
                if (spotA !== -1 && spotB !== -1) return spotA - spotB;
                if (spotA !== -1 && spotB === -1) return -1;
                if (spotB !== -1 && spotA === -1) return 1;

                // 3. Higher rarity rank
                if (rB.rank !== rA.rank) return rB.rank - rA.rank;

                // 4. Higher RP
                const diffRp = (Number(b.price_rp) || 0) - (Number(a.price_rp) || 0);
                if (diffRp !== 0) return diffRp;

                return a.name.localeCompare(b.name);
            });
        }

        // Update live count (clean, without timestamps)
        const countEl = document.getElementById('catalogCountTimestamp');
        const isEn = selectedLanguage === 'en';
        if (countEl) {
            countEl.textContent = `${items.length.toLocaleString(isEn ? 'en-US' : 'pt-BR')} ${isEn ? 'items' : 'itens'}`;
        }

        updateItemList(items);
    }
    window.filterItems = filterItems;

    // Filter and Render Champions in Carousel Mode
    function filterChampionSkins(searchTokens) {
        const list = document.getElementById('item-list');
        if (!list) return;
        list.innerHTML = '';

        const isEn = selectedLanguage === 'en';
        const rarityFilter = document.getElementById('chroma-rarity-filter');
        const rVal = rarityFilter ? rarityFilter.value.toLowerCase() : '';
        const sortFilter = document.getElementById('chroma-sort-filter');
        const sVal = sortFilter ? sortFilter.value : 'name_asc';
        const orderFilter = document.getElementById('chroma-order-filter');
        const oVal = orderFilter ? orderFilter.value : 'asc';

        let champions = (window.championsList || []).map(ch => ({
            ...ch,
            currentSkinIndex: ch.currentSkinIndex || 0
        }));

        if (searchTokens && searchTokens.length > 0) {
            champions = champions.filter(champ => {
                const champNorm = normalizeText(champ.championName);
                const champMatches = searchTokens.every(t => champNorm.includes(t));
                if (champMatches) return true;

                // Match by skin name
                const matchingSkinIndex = champ.skins.findIndex(s => {
                    const skinNorm = normalizeText(s.name);
                    return searchTokens.every(t => skinNorm.includes(t));
                });
                if (matchingSkinIndex !== -1) {
                    champ.currentSkinIndex = matchingSkinIndex;
                    return true;
                }
                return false;
            });
        }

        // Rarity filter
        if (rVal) {
            champions = champions.filter(champ => {
                const matchIndex = champ.skins.findIndex(s => {
                    const info = getItemRarityInfo(s.name, s.price_rp, 'Skin', s);
                    const itemClass = (info.class || '').toLowerCase();
                    const itemLabel = (info.label || '').toLowerCase();
                    if (rVal === 'ultimate') return itemClass.includes('ultimate') || itemLabel.includes('ultimate') || info.rank === 6;
                    if (rVal === 'mythic') return itemClass.includes('mythic') || itemLabel.includes('mythic') || info.rank === 5;
                    if (rVal === 'legendary') return itemClass.includes('legendary') || itemLabel.includes('legendary') || info.rank === 4;
                    if (rVal === 'epic') return itemClass.includes('epic') || itemLabel.includes('epic') || info.rank === 3;
                    if (rVal === 'standard') return itemClass.includes('standard') || itemClass.includes('deluxe') || itemLabel.includes('deluxe') || info.rank === 0;
                    return itemClass.includes(rVal) || itemLabel.includes(rVal);
                });
                if (matchIndex !== -1) {
                    champ.currentSkinIndex = matchIndex;
                    return true;
                }
                return false;
            });
        }

        // Sorting
        if (sVal === 'name_asc') {
            champions.sort((a, b) => a.championName.localeCompare(b.championName));
            if (oVal === 'desc') champions.reverse();
        } else if (sVal === 'price_asc' || sVal === 'price_desc') {
            champions.sort((a, b) => {
                const pA = Number(a.skins[a.currentSkinIndex]?.price_rp) || 0;
                const pB = Number(b.skins[b.currentSkinIndex]?.price_rp) || 0;
                return sVal === 'price_asc' ? (pA - pB) : (pB - pA);
            });
        } else if (sVal === 'rarity') {
            champions.sort((a, b) => {
                const sA = a.skins[a.currentSkinIndex];
                const sB = b.skins[b.currentSkinIndex];
                const rA = sA ? getItemRarityInfo(sA.name, sA.price_rp, 'Skin', sA).rank : 0;
                const rB = sB ? getItemRarityInfo(sB.name, sB.price_rp, 'Skin', sB).rank : 0;
                if (rA !== rB) return oVal === 'asc' ? (rA - rB) : (rB - rA);
                return a.championName.localeCompare(b.championName);
            });
        }

        // Live count
        const countEl = document.getElementById('catalogCountTimestamp');
        if (countEl) {
            let totalSkins = champions.reduce((acc, c) => acc + (c.skins ? c.skins.length : 0), 0);
            countEl.textContent = `${champions.length} ${isEn ? 'Champions' : 'Campeões'} · ${totalSkins.toLocaleString()} Skins`;
        }

        renderChampionCards(champions);
    }

    function renderChampionCards(champions) {
        const list = document.getElementById('item-list');
        if (!list) return;
        const isEn = selectedLanguage === 'en';
        const fragment = document.createDocumentFragment();

        champions.forEach(champ => {
            if (!champ.skins || champ.skins.length === 0) return;
            const champKey = champ.championKey;
            const curIdx = champ.currentSkinIndex || 0;
            const activeSkin = champ.skins[curIdx] || champ.skins[0];
            const isBase = (curIdx === 0 && activeSkin.isBase);
            const totalSkinsCount = Math.max(1, champ.skins.length - 1);

            const rarity = isBase 
                ? { label: isEn ? 'BASE CHAMPION' : 'CAMPEÃO', color: '#c8aa6e', glowClass: 'rarity-glow-standard', rank: 0 }
                : getItemRarityInfo(activeSkin.name, activeSkin.price_rp, 'Skin', activeSkin);
            const priceInfo = formatItemPrice(activeSkin.price_rp, currentSelectedRegion);

            const card = document.createElement('li');
            card.className = `catalog-card-node champion-skin-card ${rarity.glowClass || ''}`;
            card.id = `champ_card_${champKey}`;
            card.style.setProperty('--rarity-color', rarity.color);
            card.setAttribute('data-rp', activeSkin.price_rp || '0');

            const headerBadge = isBase
                ? `<p class="inline-flex items-center text-[10px] font-bold uppercase tracking-wider mb-1" style="color: #c8aa6e; min-height: 16px; letter-spacing: 0.08em;">
                     ${isEn ? 'BASE CHAMPION' : 'CAMPEÃO'}
                   </p>`
                : (rarity.iconWebp 
                    ? `<p class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1" style="color: ${rarity.color}; min-height: 16px;">
                         <span class="rarity-badge-official"><img src="${rarity.iconWebp}" alt="${rarity.label}"></span>
                         <span style="color: ${rarity.color}; font-weight: 800; font-size: 10px; letter-spacing: 0.8px;">${rarity.label}</span>
                       </p>`
                    : `<p class="inline-flex items-center text-[10px] font-bold uppercase tracking-wider mb-1" style="color: ${rarity.color}; font-size: 10px; min-height: 16px; letter-spacing: 0.08em;">
                         ${rarity.label}
                       </p>`);

            const navPrevBtn = champ.skins.length > 1 ? `
                <button type="button" class="champ-skin-nav-btn champ-skin-nav-prev" onclick="event.stopPropagation(); window.navigateChampionSkin('${champKey}', -1)" title="${isEn ? 'Previous Skin' : 'Skin Anterior'}">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
            ` : '';

            const navNextBtn = champ.skins.length > 1 ? `
                <button type="button" class="champ-skin-nav-btn champ-skin-nav-next" onclick="event.stopPropagation(); window.navigateChampionSkin('${champKey}', 1)" title="${isEn ? 'Next Skin' : 'Próxima Skin'}">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            ` : '';

            const counterLabel = isBase 
                ? (isEn ? 'Base Skin' : 'Skin Base')
                : (isEn ? `${curIdx} of ${totalSkinsCount}` : `${curIdx} de ${totalSkinsCount}`);

            let skinDotsHtml = '';
            if (champ.skins.length > 1 && champ.skins.length <= 15) {
                skinDotsHtml = `<div class="champ-skin-dots" id="champ_dots_${champKey}">` +
                    champ.skins.map((s, idx) => `<span class="champ-skin-dot ${idx === cur ? 'active' : ''}" onclick="event.stopPropagation(); window.setChampionSkinIndex('${champKey}', ${idx})" title="${s.name}"></span>`).join('') +
                `</div>`;
            }

            card.innerHTML = `
                <div class="champ-card-header">
                    <span class="champ-card-title">${champ.championName}</span>
                    <span class="champ-card-counter" id="champ_counter_${champKey}">${counterLabel}</span>
                </div>
                <div class="item-card-thumbnail-box" style="position: relative; overflow: hidden; background: #02070e; aspect-ratio: 3 / 4; display: flex; align-items: center; justify-content: center;">
                    <img id="champ_thumb_${champKey}" src="${activeSkin.loading_url}" alt="${activeSkin.name}" class="store-card-art" style="width: 100%; height: 100%; object-fit: cover; object-position: center 15%;" loading="lazy" onerror="if (this.src !== '${activeSkin.splash_url}') { this.src = '${activeSkin.splash_url}'; } else { this.onerror=null; this.src='https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png'; }">
                    ${navPrevBtn}
                    ${navNextBtn}
                    ${skinDotsHtml}
                    <button type="button" class="skin-splash-hint" onclick="event.stopPropagation(); window.openChampionWallpaper('${champKey}')" title="${isEn ? 'Enlarge Wallpaper' : 'Ampliar Wallpaper'}">
                        <i class="fa-solid fa-expand me-1"></i>${isEn ? 'ZOOM' : 'AMPLIAR'}
                    </button>
                </div>
                <div class="item-card-body" style="padding: 10px 12px 14px 12px; display: flex; flex-direction: column; flex-grow: 1; justify-content: space-between;">
                    <div id="champ_rarity_${champKey}">
                        ${headerBadge}
                    </div>
                    <div class="item-card-name font-semibold" id="champ_name_${champKey}" style="color: #f0e6d2; font-size: 12px; margin-bottom: 6px; line-height: 1.3; min-height: 32px; max-height: 32px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;" title="${activeSkin.name}">
                        ${activeSkin.name}
                    </div>
                    <div class="item-card-price-stack" id="champ_prices_${champKey}">
                        <div class="item-card-price-money text-teal font-bold" style="font-size: 14px;">${priceInfo.money}</div>
                        <div class="item-card-price-rp text-gold" style="font-size: 11px;">${priceInfo.rp}</div>
                    </div>
                    <button type="button" class="buy-button" id="champ_btn_${champKey}" onclick="event.stopPropagation(); window.selectChampionCardSkin('${champKey}')">
                        ${isEn ? 'ADD TO CART' : 'ADICIONAR AO CARRINHO'}
                    </button>
                </div>
            `;

            card.onclick = () => {
                document.querySelectorAll('#item-list li').forEach(el => el.classList.remove('selected'));
                card.classList.add('selected');
                window.selectChampionCardSkin(champKey);
            };

            fragment.appendChild(card);
        });

        list.appendChild(fragment);
    }

    window.navigateChampionSkin = function(champKey, dir) {
        const champ = (window.championsList || []).find(c => c.championKey === champKey);
        if (!champ || !champ.skins || champ.skins.length <= 1) return;

        let cur = champ.currentSkinIndex || 0;
        cur = (cur + dir + champ.skins.length) % champ.skins.length;
        champ.currentSkinIndex = cur;

        const newSkin = champ.skins[cur];
        const isBase = (cur === 0 && newSkin.isBase);
        const totalSkinsCount = Math.max(1, champ.skins.length - 1);
        const isEn = selectedLanguage === 'en';

        const rarity = isBase
            ? { label: isEn ? 'BASE CHAMPION' : 'CAMPEÃO', color: '#c8aa6e', glowClass: 'rarity-glow-standard', rank: 0 }
            : getItemRarityInfo(newSkin.name, newSkin.price_rp, 'Skin', newSkin);
        const priceInfo = formatItemPrice(newSkin.price_rp, currentSelectedRegion);

        const imgEl = document.getElementById(`champ_thumb_${champKey}`);
        const counterEl = document.getElementById(`champ_counter_${champKey}`);
        const nameEl = document.getElementById(`champ_name_${champKey}`);
        const rarityEl = document.getElementById(`champ_rarity_${champKey}`);
        const pricesEl = document.getElementById(`champ_prices_${champKey}`);
        const cardEl = document.getElementById(`champ_card_${champKey}`);
        const dotsEl = document.getElementById(`champ_dots_${champKey}`);

        // Smooth subtle transition ("animaçãozinha bem sutil")
        if (imgEl) {
            imgEl.classList.add('skin-transitioning');
            if (nameEl) nameEl.classList.add('champ-skin-info-transitioning');
            if (rarityEl) rarityEl.classList.add('champ-skin-info-transitioning');
            if (pricesEl) pricesEl.classList.add('champ-skin-info-transitioning');

            const nextUrl = newSkin.loading_url || newSkin.icon_url;
            const preImg = new Image();
            preImg.src = nextUrl;

            setTimeout(() => {
                imgEl.src = nextUrl;
                imgEl.classList.remove('skin-transitioning');
                if (nameEl) nameEl.classList.remove('champ-skin-info-transitioning');
                if (rarityEl) rarityEl.classList.remove('champ-skin-info-transitioning');
                if (pricesEl) pricesEl.classList.remove('champ-skin-info-transitioning');
            }, 180);
        }

        if (counterEl) {
            counterEl.textContent = isBase 
                ? (isEn ? 'Base Skin' : 'Skin Base')
                : (isEn ? `${cur} of ${totalSkinsCount}` : `${cur} de ${totalSkinsCount}`);
        }
        if (dotsEl) {
            dotsEl.querySelectorAll('.champ-skin-dot').forEach((dot, idx) => {
                dot.classList.toggle('active', idx === cur);
            });
        }
        if (nameEl) {
            nameEl.textContent = newSkin.name;
            nameEl.title = newSkin.name;
        }
        if (rarityEl) {
            rarityEl.innerHTML = isBase
                ? `<p class="inline-flex items-center text-[10px] font-bold uppercase tracking-wider mb-1" style="color: #c8aa6e; min-height: 16px; letter-spacing: 0.08em;">
                     ${isEn ? 'BASE CHAMPION' : 'CAMPEÃO'}
                   </p>`
                : (rarity.iconWebp 
                    ? `<p class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1" style="color: ${rarity.color}; min-height: 16px;">
                         <span class="rarity-badge-official"><img src="${rarity.iconWebp}" alt="${rarity.label}"></span>
                         <span style="color: ${rarity.color}; font-weight: 800; font-size: 10px; letter-spacing: 0.8px;">${rarity.label}</span>
                       </p>`
                    : `<p class="inline-flex items-center text-[10px] font-bold uppercase tracking-wider mb-1" style="color: ${rarity.color}; font-size: 10px; min-height: 16px; letter-spacing: 0.08em;">
                         ${rarity.label}
                       </p>`);
        }
        if (pricesEl) {
            pricesEl.innerHTML = `
                <div class="item-card-price-money text-teal font-bold" style="font-size: 14px;">${priceInfo.money}</div>
                <div class="item-card-price-rp text-gold" style="font-size: 11px;">${priceInfo.rp}</div>
            `;
        }
        if (cardEl) {
            cardEl.style.setProperty('--rarity-color', rarity.color);
            cardEl.className = `catalog-card-node champion-skin-card ${rarity.glowClass || ''}`;
        }
    };

    window.setChampionSkinIndex = function(champKey, targetIdx) {
        const champ = (window.championsList || []).find(c => c.championKey === champKey);
        if (!champ || !champ.skins || targetIdx < 0 || targetIdx >= champ.skins.length) return;
        const diff = targetIdx - (champ.currentSkinIndex || 0);
        if (diff === 0) return;
        window.navigateChampionSkin(champKey, diff);
    };

    window.selectChampionCardSkin = function(champKey) {
        const champ = (window.championsList || []).find(c => c.championKey === champKey);
        if (!champ || !champ.skins) return;
        const cur = champ.currentSkinIndex || 0;
        const activeSkin = champ.skins[cur] || champ.skins[0];
        const priceInfo = formatItemPrice(activeSkin.price_rp, currentSelectedRegion);
        addToCart(activeSkin);
        
        // Tactile Visual Feedback on button
        const btn = document.getElementById(`champ_btn_${champKey}`);
        if (btn) {
            const originalText = btn.innerHTML;
            const isEn = selectedLanguage === 'en';
            btn.innerHTML = `<i class="fa-solid fa-check me-1" style="color: #010a13;"></i> ${isEn ? 'ADDED' : 'ADICIONADO'}`;
            btn.style.background = 'linear-gradient(180deg, #00ffcc 0%, #0ac8b9 100%)';
            btn.style.color = '#010a13';
            btn.style.borderColor = '#00ffcc';
            btn.style.boxShadow = '0 0 16px rgba(0, 255, 204, 0.7)';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.style.color = '';
                btn.style.borderColor = '';
                btn.style.boxShadow = '';
            }, 900);
        }

        if (typeof toggleCartDrawer === 'function') {
            toggleCartDrawer(true);
        }
    };

    window.openChampionWallpaper = function(champKey) {
        const champ = (window.championsList || []).find(c => c.championKey === champKey);
        if (!champ || !champ.skins) return;
        const cur = champ.currentSkinIndex || 0;
        const activeSkin = champ.skins[cur] || champ.skins[0];
        
        const itemKey = 'champ_skin_' + (activeSkin.offer_id || activeSkin.item_id || Math.random().toString(36).substr(2, 9));
        window.catalogItemsStore = window.catalogItemsStore || {};
        window.catalogItemsStore[itemKey] = {
            ...activeSkin,
            icon_url: activeSkin.splash_url || activeSkin.icon_url,
            slides: champ.skins.map(s => ({
                type: 'skin',
                name: s.name,
                label: s.name,
                thumbUrl: s.loading_url,
                fullUrl: s.splash_url || s.icon_url,
                isChroma: false
            })),
            currentSlide: cur
        };
        openWallpaperModal(itemKey);
    };

    window.selectFeaturedCard = function(name, offerId, priceRp, itemId, invType) {
        const cardImg = (name.includes('Leblanc') || name.includes('Pass') || name.includes('Passe'))
            ? 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Leblanc_55.jpg'
            : ((name.includes('Risen') || name.includes('Ascendida'))
                ? 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_85.jpg'
                : 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_86.jpg');

        const item = {
            name: name,
            offer_id: offerId,
            price_rp: priceRp,
            price_ip: 0,
            item_id: itemId,
            icon_url: cardImg,
            category: 'Bundles',
            inventory_type: invType || 'BUNDLES'
        };
        addToCart(item);
        if (typeof toggleCartDrawer === 'function') {
            toggleCartDrawer(true);
        }
    };

    let currentFilteredItems = [];
    let currentRenderIndex = 0;
    const CHUNK_SIZE = 60;

    function updateItemList(items) {
        const list = document.getElementById('item-list');
        if (!list) return;
        list.innerHTML = '';
        currentFilteredItems = items;
        currentRenderIndex = 0;
        renderMoreItems();
    }

    function getItemRarityInfo(name, priceRp, category, rawItem) {
        const nameLower = (name || '').toLowerCase();
        const rp = Number(priceRp) || 0;
        const cat = (category || '').toLowerCase();
        const isSkin = (cat === 'skins' || cat === 'skin' || (rawItem && (rawItem.inventory_type === 'CHAMPION_SKIN' || rawItem.inventoryType === 'CHAMPION_SKIN')));

        if (cat === 'bundles' || cat === 'bundle' || nameLower.startsWith('pacote') || nameLower.startsWith('bundle') || nameLower.includes('conjunto') || nameLower.includes('coleção') || nameLower.includes('passe')) {
            return { 
                label: 'BUNDLE', 
                class: 'rarity-bundle', 
                glowClass: 'rarity-glow-bundle',
                color: '#c8aa6e',
                iconWebp: null, 
                icon: 'fa-ticket',
                rank: 2
            };
        }
        if (cat === 'loot' || nameLower.includes('baú') || nameLower.includes('hextech') || nameLower.includes('chave') || nameLower.includes('orbe')) {
            return { 
                label: 'HEXTECH', 
                class: 'rarity-hextech', 
                glowClass: 'rarity-glow-mythic',
                color: '#a855f7',
                iconWebp: null, 
                icon: 'fa-box-open',
                rank: 2
            };
        }
        if (cat === 'chromas' || cat === 'chroma' || nameLower.includes('croma') || nameLower.includes('chroma') || (rawItem && rawItem.subInventoryType === 'RECOLOR') || rp === 290) {
            const isMythicChroma = nameLower.includes('t1 mvp') || nameLower.includes('cripta de magma') || nameLower.includes('prestígio') || nameLower.includes('prestige') || nameLower.includes('ascendida') || nameLower.includes('imortalizada') || nameLower.includes('faker') || nameLower.includes('mythic') || nameLower.includes('mítica');
            if (isMythicChroma) {
                return { 
                    label: 'MYTHIC', 
                    class: 'rarity-mythic', 
                    glowClass: 'rarity-glow-mythic',
                    color: '#a855f7',
                    iconWebp: '/static/raridades/mythic.webp', 
                    icon: 'fa-gem',
                    rank: 5
                };
            }
            const isLegendaryChroma = nameLower.includes('lendária') || nameLower.includes('legendary') || nameLower.includes('projeto: vayne') || nameLower.includes('project: vayne') || nameLower.includes('projeto: pyke') || nameLower.includes('project: pyke') || nameLower.includes('projeto: mordekaiser') || nameLower.includes('project: mordekaiser') || nameLower.includes('projeto: renekton') || nameLower.includes('project: renekton');
            if (isLegendaryChroma) {
                return { 
                    label: 'LEGENDARY', 
                    class: 'rarity-legendary', 
                    glowClass: 'rarity-glow-legendary',
                    color: '#ff4655',
                    iconWebp: '/static/raridades/legendary.webp', 
                    icon: 'fa-dragon',
                    rank: 4
                };
            }
            return { 
                label: 'CHROMA', 
                class: 'rarity-chroma', 
                glowClass: 'rarity-glow-chroma',
                color: '#ec4899',
                iconWebp: '/static/raridades/chroma.webp', 
                icon: 'fa-palette',
                rank: 1
            };
        }
        if (cat === 'eternals' || cat === 'eternal' || nameLower.includes('eterno') || nameLower.includes('statstone')) {
            return { 
                label: 'ETERNALS', 
                class: 'rarity-deluxe', 
                glowClass: 'rarity-glow-standard',
                color: '#c8aa6e',
                iconWebp: null, 
                icon: 'fa-shield-halved',
                rank: 2
            };
        }
        if (cat === 'boosts' || cat === 'boost') {
            return { 
                label: 'BOOST', 
                class: 'rarity-deluxe', 
                glowClass: 'rarity-glow-standard',
                color: '#0ac8b9',
                iconWebp: null, 
                icon: 'fa-bolt',
                rank: 0
            };
        }
        if (cat === 'littlelegends' || cat === 'companions') {
            return { 
                label: 'PEQUENA LENDA', 
                class: 'rarity-deluxe', 
                glowClass: 'rarity-glow-standard',
                color: '#0ac8b9',
                iconWebp: null, 
                icon: 'fa-paw',
                rank: 0
            };
        }

        const isExplicitUltimate = nameLower.includes('dj sona') || 
                                   nameLower.includes('elementalista') || 
                                   nameLower.includes('pulsefire ezreal') || 
                                   (nameLower.includes('soul fighter') && nameLower.includes('samira')) || 
                                   nameLower.includes('seraphine k/da all out') || 
                                   (nameLower.includes('guardião espiritual') && nameLower.includes('udyr')) || 
                                   nameLower.includes('vingadora exocósmica') ||
                                   (rawItem && (rawItem.rarity === 'kUltimate' || rawItem.rarity === 'ultimate'));

        if ((isSkin && (rp >= 2775 || isExplicitUltimate)) || (rawItem && (rawItem.rarity === 'kUltimate' || rawItem.rarity === 'ultimate'))) {
            return { 
                label: 'ULTIMATE', 
                class: 'rarity-ultimate', 
                glowClass: 'rarity-glow-ultimate',
                color: '#ff8200',
                iconWebp: '/static/raridades/ultimate.webp', 
                icon: 'fa-crown',
                rank: 6
            };
        }
        if (isSkin && (rp >= 2400 || nameLower.includes('mítica') || nameLower.includes('mythic') || nameLower.includes('ascendida') || nameLower.includes('imortalizada'))) {
            return { 
                label: 'MYTHIC', 
                class: 'rarity-mythic', 
                glowClass: 'rarity-glow-mythic',
                color: '#a855f7',
                iconWebp: '/static/raridades/mythic.webp', 
                icon: 'fa-gem',
                rank: 5
            };
        }
        if (isSkin && (rp === 1820 || nameLower.includes('lendária') || nameLower.includes('legendary') || (rawItem && rawItem.rarity === 'kLegendary'))) {
            return { 
                label: 'LEGENDARY', 
                class: 'rarity-legendary', 
                glowClass: 'rarity-glow-legendary',
                color: '#ff4655',
                iconWebp: '/static/raridades/legendary.webp', 
                icon: 'fa-dragon',
                rank: 4
            };
        }
        if (isSkin && (rp === 1350 || nameLower.includes('épica') || nameLower.includes('epic') || (rawItem && rawItem.rarity === 'kEpic'))) {
            return { 
                label: 'EPIC', 
                class: 'rarity-epic', 
                glowClass: 'rarity-glow-epic',
                color: '#0ac8b9',
                iconWebp: '/static/raridades/epic.webp', 
                icon: 'fa-bolt',
                rank: 3
            };
        }
        return { 
            label: 'DELUXE', 
            class: 'rarity-standard', 
            glowClass: 'rarity-glow-standard',
            color: '#c8aa6e',
            iconWebp: null, 
            icon: 'fa-shield-halved',
            rank: 0
        };
    }
    window.getItemRarityInfo = getItemRarityInfo;

    // =========================================================================
    // PRICE CALCULATION & CURRENCY CONVERSION (LOLGIFTING 1:1)
    // =========================================================================
    let currentSelectedRegion = localStorage.getItem('lg_gift_region') || 'BR';

    function formatItemPrice(rawRp, region) {
        const rpNum = Number(rawRp) || 0;
        const isBr = (region || currentSelectedRegion || 'BR').toUpperCase() === 'BR';
        const rpFormatted = rpNum > 0 ? `${rpNum.toLocaleString('pt-BR')} RP` : '0 RP';
        
        if (rpNum <= 0) {
            return {
                money: isBr ? 'R$ 0,00' : '€ 0,00',
                rp: '0 RP',
                currency: isBr ? 'R$' : '€',
                amount: 0
            };
        }

        if (isBr) {
            // lolgifting ratio: 3250 RP = R$ 65,00 (ratio 0.02)
            const brl = rpNum * 0.02;
            const moneyFormatted = `R$ ${brl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            return {
                money: moneyFormatted,
                rp: rpFormatted,
                currency: 'R$',
                amount: brl
            };
        } else {
            // Outside BR: 3250 RP = € 32,50 (ratio 0.01)
            const eur = rpNum * 0.01;
            const moneyFormatted = `€ ${eur.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            return {
                money: moneyFormatted,
                rp: rpFormatted,
                currency: '€',
                amount: eur
            };
        }
    }
    window.formatItemPrice = formatItemPrice;

    function renderMoreItems() {
        const list = document.getElementById('item-list');
        if (!list || !currentFilteredItems || currentRenderIndex >= currentFilteredItems.length) return;

        const fragment = document.createDocumentFragment();
        const nextChunk = currentFilteredItems.slice(currentRenderIndex, currentRenderIndex + CHUNK_SIZE);
        
        nextChunk.forEach(item => {
            const isEn = selectedLanguage === 'en';
            const listItem = document.createElement('li');
            const rarity = getItemRarityInfo(item.name, item.price_rp, item.category);
            listItem.className = `catalog-card-node ${rarity.glowClass || ''}`;
            listItem.style.setProperty('--rarity-color', rarity.color);
            listItem.setAttribute('data-rp', item.price_rp || '0');

            const priceInfo = formatItemPrice(item.price_rp, currentSelectedRegion);
            const isInvalidPrice = price => 
                price === null || 
                price === undefined || 
                price === "Null" || 
                price === 0 || 
                price === "0";

            let rpDisplay = isInvalidPrice(item.price_rp) ? '0' : item.price_rp;
            let priceText = `(${priceInfo.money} · ${priceInfo.rp})`;

            const defaultImg = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png";
            
            const isBundle = Boolean(
                item.category === 'Bundles' || 
                item.category === 'Bundle' || 
                item.category === 'Pacotes' || 
                item.category === 'Pacote' || 
                item.inventory_type === 'BUNDLES' || 
                item.inventory_type === 'BUNDLE' || 
                (item.name && (
                    item.name.startsWith('Pacote') || 
                    item.name.startsWith('Bundle') || 
                    item.name.startsWith('Coleção') || 
                    item.name.startsWith('Collection') ||
                    item.name.startsWith('Conjunto') ||
                    item.name.includes('Collection') ||
                    item.name.includes('Coleção') ||
                    item.name.includes('Legend') ||
                    item.name.includes('Lenda') ||
                    item.name.includes('Assinatura') ||
                    item.name.includes('Signature') ||
                    item.name.includes('Chroma Bundle') ||
                    item.name.includes('Pacote Croma')
                ))
            );

            const isChroma = !isBundle && Boolean(
                item.category === 'Chromas' || 
                item.category === 'Chroma' || 
                item.category === 'Cromas' || 
                item.category === 'Croma' || 
                item.inventory_type === 'CHROMA' || 
                (
                    item.name && 
                    item.name.includes('(') && 
                    item.name.includes(')') && 
                    !item.name.includes('(20') && 
                    !item.name.includes('(19') && 
                    !item.name.includes('Ato') && 
                    !item.name.includes('Act') &&
                    !item.name.includes('Legend') &&
                    !item.name.includes('Lenda') &&
                    !item.name.includes('Collection') &&
                    !item.name.includes('Coleção') &&
                    !item.name.includes('Bundle') &&
                    !item.name.includes('Pacote') &&
                    item.category !== 'Skins' &&
                    item.category !== 'Skin' &&
                    item.category !== 'Champions' &&
                    item.category !== 'Champion' &&
                    item.category !== 'Passes' &&
                    item.category !== 'Pass' &&
                    item.category !== 'Bundles' &&
                    item.category !== 'Bundle' &&
                    item.category !== 'Pacotes' &&
                    item.category !== 'Pacote'
                )
            );
            
            let cardImg = item.icon_url || defaultImg;
            if (isChroma && item.item_id) {
                const cid = Number(item.item_id);
                const champId = Math.floor(cid / 1000);
                cardImg = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-chroma-images/${champId}/${cid}.png`;
            } else if (isBundle) {
                // Hall of Legends collections explicit splash guarantee
                if (item.name && (item.name.includes('Lenda Ascendida') || item.name.includes('Risen Legend'))) {
                    cardImg = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_85.jpg';
                } else if (item.name && (item.name.includes('Lenda Imortalizada') || item.name.includes('Immortalized Legend') || item.name.includes('Assinatura') || item.name.includes('Signature'))) {
                    cardImg = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_86.jpg';
                } else if (item.name && (item.name.includes('Hall of Legends') && (item.name.includes('Pass') || item.name.includes('Passe')))) {
                    cardImg = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Leblanc_55.jpg';
                } else {
                    const cleanName = (item.name || '').replace(/^Pacote\s+Croma\s+/i, '').replace(/^Chroma\s+Bundle\s+/i, '').toLowerCase().trim();
                    if (window.skinToSplashMap && window.skinToSplashMap[cleanName]) {
                        const splashInfo = window.skinToSplashMap[cleanName];
                        cardImg = splashInfo.splash;
                    } else if (!cardImg || cardImg.includes('cloudfront.net') || cardImg.includes('chest_generic')) {
                        const found = (catalogIndexedItems || []).find(s => s && s.name && s.name.toLowerCase().includes(cleanName) && s.icon_url && !s.icon_url.includes('cloudfront.net') && !s.icon_url.includes('chest_generic'));
                        if (found) {
                            cardImg = found.icon_url;
                        } else {
                            const fallbackFound = Object.values(window.catalogItemsStore || {}).find(s => s && s.name && s.name.toLowerCase().includes(cleanName) && s.icon_url && !s.icon_url.includes('cloudfront.net') && !s.icon_url.includes('chest_generic'));
                            if (fallbackFound) cardImg = fallbackFound.icon_url;
                        }
                    }
                }
            } else if (!cardImg || cardImg.includes('cloudfront.net')) {
                cardImg = defaultImg;
            }

            const rarityBadgeHtml = rarity.iconWebp 
                ? `<p class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-1" style="color: ${rarity.color};">
                     <span class="rarity-badge-official"><img src="${rarity.iconWebp}" alt="${rarity.label}"></span>
                     <span style="color: ${rarity.color}; font-weight: 800; font-size: 10px; letter-spacing: 0.8px;">${rarity.label}</span>
                   </p>`
                : `<p class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-1" style="color: ${rarity.color};">
                     <span style="color: ${rarity.color}; font-weight: 800; font-size: 10px; letter-spacing: 0.8px;">${rarity.label}</span>
                   </p>`;

            const safeItemJson = JSON.stringify({
                name: item.name,
                price_rp: item.price_rp,
                price_ip: item.price_ip,
                offer_id: item.offer_id,
                item_id: item.item_id,
                inventory_type: item.inventory_type,
                icon_url: cardImg
            }).replace(/"/g, '&quot;');

            // Find chromas belonging to this item (for Bundles or Skins)
            let baseSkinName = (item.name || '').trim();
            if (isBundle) {
                baseSkinName = baseSkinName.replace(/^Pacote\s+Croma\s+/i, '').replace(/^Chroma\s+Bundle\s+/i, '').trim();
            }
            const itemChromas = (window.skinChromasMap && window.skinChromasMap[baseSkinName.toLowerCase()]) ? window.skinChromasMap[baseSkinName.toLowerCase()] : [];
            
            let cardThumbImg = cardImg;
            const isWideSplash = cardImg && cardImg.includes('/cdn/img/champion/splash/');
            if (isWideSplash) {
                cardThumbImg = cardImg.replace('/splash/', '/loading/');
            }

            const itemSlides = [
                {
                    type: 'skin',
                    name: isBundle ? `${item.name} (${isEn ? 'Base Skin' : 'Skin Base'})` : item.name,
                    label: isEn ? 'Base Skin' : 'Skin Base',
                    thumbUrl: cardThumbImg,
                    fullUrl: cardImg,
                    isChroma: false
                }
            ];
            if (itemChromas && itemChromas.length > 0) {
                itemChromas.forEach((chr, idx) => {
                    itemSlides.push({
                        type: 'chroma',
                        name: chr.fullName,
                        label: chr.color,
                        thumbUrl: chr.icon_url,
                        fullUrl: chr.icon_url,
                        isChroma: true,
                        chromaIndex: idx + 1,
                        chromasTotal: itemChromas.length
                    });
                });
            }

            window.catalogItemsStore = window.catalogItemsStore || {};
            const itemKey = 'item_' + (item.offer_id || item.item_id || Math.random().toString(36).substr(2, 9));
            window.catalogItemsStore[itemKey] = {
                ...item,
                icon_url: cardImg,
                slides: itemSlides,
                currentSlide: 0
            };

            let thumbnailContent = '';
            if (isChroma) {
                thumbnailContent = `
                    <span class="rarity-beams" aria-hidden="true"></span>
                    <div class="item-card-thumbnail-box" style="position: relative; overflow: hidden; background: #02070e; aspect-ratio: 3 / 4; display: flex; align-items: center; justify-content: center; border-radius: 5px 5px 0 0;">
                        <img src="${cardImg}" alt="${item.name}" class="store-card-art store-card-chroma-model" style="max-width: 90%; max-height: 90%; width: auto; height: auto; object-fit: contain; padding: 12px 6px;" loading="lazy" onerror="this.onerror=null;this.src='https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png';">
                        <span class="chroma-corner-pill"><img src="/static/raridades/chroma.webp" alt="Chroma"> Chroma</span>
                    </div>
                `;
            } else if (item.category === 'Icons' || item.category === 'Ícones' || (cardImg && cardImg.includes('profileicon'))) {
                thumbnailContent = `
                    <span class="rarity-beams" aria-hidden="true"></span>
                    <div class="item-card-square-box" id="thumb_box_${itemKey}">
                        <div class="summoner-icon-frame">
                            <img id="thumb_img_${itemKey}" src="${cardImg}" alt="${item.name}" class="summoner-icon-img" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://ddragon.leagueoflegends.com/cdn/14.12.1/img/profileicon/1103.png';">
                        </div>
                    </div>
                `;
            } else if (item.category === 'Emotes' || (cardImg && (cardImg.includes('summoneremotes') || cardImg.includes('emotes')))) {
                thumbnailContent = `
                    <span class="rarity-beams" aria-hidden="true"></span>
                    <div class="item-card-square-box" id="thumb_box_${itemKey}">
                        <div class="emote-frame">
                            <img id="thumb_img_${itemKey}" src="${cardImg}" alt="${item.name}" class="emote-img" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png';">
                        </div>
                    </div>
                `;
            } else if (item.category === 'Eternals' || item.inventory_type === 'STATSTONE' || (item.category === 'Eternos')) {
                const nameLower = (item.name || '').toLowerCase();
                const isPass = nameLower.includes('passe') || nameLower.includes('pass');
                const isSeries2 = nameLower.includes('série 2') || nameLower.includes('series 2');
                const isStarter = nameLower.includes('inicial') || nameLower.includes('starter');

                let stoneImg = '';
                let seriesLabel = '';

                if (isPass) {
                    if (isSeries2) {
                        stoneImg = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/store/statstones/pass2.png';
                        seriesLabel = isEn ? 'PASS · SERIES 2' : 'PASSE · SÉRIE 2';
                    } else if (isStarter) {
                        stoneImg = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/store/statstones/passstarter.png';
                        seriesLabel = isEn ? 'PASS · STARTER' : 'PASSE · SÉRIE INICIAL';
                    } else {
                        stoneImg = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/store/statstones/pass1.png';
                        seriesLabel = isEn ? 'PASS · SERIES 1' : 'PASSE · SÉRIE 1';
                    }
                } else {
                    if (isSeries2) {
                        stoneImg = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/store/statstones/series2.png';
                        seriesLabel = isEn ? 'SERIES 2' : 'SÉRIE 2';
                    } else if (isStarter) {
                        stoneImg = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/store/statstones/seriesstarter.png';
                        seriesLabel = isEn ? 'STARTER' : 'SÉRIE INICIAL';
                    } else {
                        stoneImg = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/store/statstones/series1.png';
                        seriesLabel = isEn ? 'SERIES 1' : 'SÉRIE 1';
                    }
                }

                // If not a pass, display the champion icon badge alongside the eternal
                const champBadgeHtml = (!isPass && cardImg && cardImg.includes('champion')) ? `
                    <div class="eternal-champ-badge" title="${item.name.split('-')[0].trim()}">
                        <img src="${cardImg}" alt="${item.name}" class="eternal-champ-avatar" loading="lazy" decoding="async">
                    </div>
                ` : '';

                thumbnailContent = `
                    <span class="rarity-beams" aria-hidden="true"></span>
                    <div class="eternal-card-thumbnail-box" id="thumb_box_${itemKey}">
                        <span class="eternal-series-badge"><i class="fa-solid fa-gem me-1" style="color: #0ac8b9; font-size: 8px;"></i>${seriesLabel}</span>
                        <div class="eternal-stone-container">
                            <img src="${stoneImg}" alt="${seriesLabel}" class="eternal-stone-img" loading="lazy" decoding="async">
                        </div>
                        ${champBadgeHtml}
                    </div>
                `;
            } else {
                const isSquareItem = (item.category === 'Wards' || item.category === 'Sentinelas' || (cardImg && cardImg.includes('ward')));
                const imgClass = isSquareItem ? 'store-card-art store-card-square' : 'store-card-art';
                const imgStyle = isSquareItem 
                    ? 'object-fit: contain; width: auto; height: auto; max-width: 78%; max-height: 78%; margin: auto; display: block;'
                    : 'width: 100%; height: 100%; object-fit: cover; object-position: center 15%;';

                const zoomButton = !isSquareItem ? `
                    <button type="button" class="skin-splash-hint" onclick="event.stopPropagation(); window.openWallpaperModal('${itemKey}')" title="${isEn ? 'Enlarge Wallpaper' : 'Ampliar Wallpaper'}">
                        <i class="fa-solid fa-expand me-1"></i>${isEn ? 'ZOOM' : 'AMPLIAR'}
                    </button>
                ` : '';

                const carouselButtons = itemSlides.length > 1 ? `
                    <button type="button" class="card-carousel-btn card-carousel-prev" onclick="event.stopPropagation(); window.navigateCardSlide('${itemKey}', -1)" title="${isEn ? 'Previous' : 'Anterior'}">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button type="button" class="card-carousel-btn card-carousel-next" onclick="event.stopPropagation(); window.navigateCardSlide('${itemKey}', 1)" title="${isEn ? 'Next' : 'Próximo'}">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                    <div class="card-chroma-indicator-pill" id="chroma_pill_${itemKey}">
                        <i class="fa-solid fa-layer-group me-1"></i> ${isBundle ? (isEn ? `Bundle · ${itemChromas.length} Chromas` : `Pacote · ${itemChromas.length} Cromas`) : (isEn ? `${itemChromas.length} Chromas available` : `${itemChromas.length} Cromas disponíveis`)}
                    </div>
                ` : '';

                const isPassItem = item.category === 'Passes' || item.category === 'Pass' || item.inventory_type === 'EVENT_PASS' || (item.name && (item.name.toLowerCase().includes('pass') || item.name.toLowerCase().includes('passe')));
                const isChromaBundle = isBundle && (item.name.startsWith('Pacote Croma') || item.name.startsWith('Chroma Bundle'));
                const isSignatureCollection = isBundle && (item.name && (item.name.includes('Assinatura') || item.name.includes('Signature')));
                const isHolCollection = isBundle && !isSignatureCollection && !isPassItem && (item.name && (item.name.includes('Lenda') || item.name.includes('Legend')));

                let bundleBadgeHtml = '';
                if (isPassItem) {
                    const isHolPass = item.name && (item.name.includes('Hall of Legends') || item.name.includes('Lenda'));
                    const isPremium = item.name && (item.name.includes('Premium') || item.name.includes('Bundle'));
                    if (isHolPass) {
                        bundleBadgeHtml = `<span class="bundle-chroma-badge" style="border-color: #0ac8b9; color: #f0e6d2; background: rgba(10, 25, 35, 0.92);"><i class="fa-solid fa-ticket" style="color: #0ac8b9;"></i> ${isEn ? 'PASS · 2026' : 'PASSE · 2026'}</span>`;
                    } else if (isPremium) {
                        bundleBadgeHtml = `<span class="bundle-chroma-badge" style="border-color: #c8aa6e; color: #f0e6d2; background: rgba(15, 20, 30, 0.92);"><i class="fa-solid fa-gem" style="color: #c8aa6e;"></i> ${isEn ? 'PASS BUNDLE' : 'PACOTE PASSE'}</span>`;
                    } else {
                        bundleBadgeHtml = `<span class="bundle-chroma-badge" style="border-color: #0ac8b9; color: #f0e6d2; background: rgba(10, 25, 35, 0.92);"><i class="fa-solid fa-ticket" style="color: #0ac8b9;"></i> ${isEn ? 'EVENT PASS' : 'PASSE DE EVENTO'}</span>`;
                    }
                } else if (isChromaBundle) {
                    bundleBadgeHtml = `<span class="bundle-chroma-badge"><i class="fa-solid fa-palette"></i> ${isEn ? 'Chroma Bundle' : 'Pacote Croma'}</span>`;
                } else if (isSignatureCollection) {
                    bundleBadgeHtml = `<span class="bundle-chroma-badge" style="border-color: #f0e6d2; color: #f0e6d2; background: rgba(14, 25, 42, 0.92); box-shadow: 0 0 10px rgba(200, 170, 110, 0.5);"><i class="fa-solid fa-signature" style="color: #c8aa6e;"></i> ${isEn ? 'FAKER SIGNATURE' : 'EDIÇÃO AUTOGRAFADA'}</span>`;
                } else if (isHolCollection) {
                    bundleBadgeHtml = `<span class="bundle-chroma-badge" style="border-color: #c8aa6e; color: #f0e6d2; background: rgba(10, 18, 30, 0.9);"><i class="fa-solid fa-crown" style="color: #c8aa6e;"></i> ${isEn ? 'COLLECTION' : 'COLEÇÃO OFICIAL'}</span>`;
                }

                thumbnailContent = `
                    <span class="rarity-beams" aria-hidden="true"></span>
                    <div class="item-card-thumbnail-box" id="thumb_box_${itemKey}" style="position: relative; overflow: hidden; background: #02070e; aspect-ratio: 3 / 4; border-radius: 5px 5px 0 0; display: flex; align-items: center; justify-content: center;">
                        <img id="thumb_img_${itemKey}" src="${cardThumbImg}" alt="${item.name}" class="${imgClass}" style="${imgStyle}" loading="lazy" onerror="if (this.src !== '${cardImg}') { this.src = '${cardImg}'; } else { this.onerror=null; this.src='https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png'; }">
                        ${bundleBadgeHtml}
                        ${carouselButtons}
                        ${zoomButton}
                    </div>
                `;
            }

            let catTag = (item.category || '').toUpperCase();
            if (catTag === 'SKIN' || catTag === 'SKINS') catTag = 'SKINS';
            else if (catTag === 'CHROMA' || catTag === 'CHROMAS') catTag = 'CHROMAS';
            else if (catTag === 'BUNDLE' || catTag === 'BUNDLES') catTag = isEn ? 'BUNDLES' : 'PACOTES';
            else if (catTag === 'CHAMPION' || catTag === 'CHAMPIONS') catTag = isEn ? 'CHAMPIONS' : 'CAMPEÕES';
            else if (catTag === 'EMOTE' || catTag === 'EMOTES') catTag = 'EMOTES';
            else if (catTag === 'ICON' || catTag === 'ICONS') catTag = isEn ? 'ICONS' : 'ÍCONES';
            else if (catTag === 'WARD' || catTag === 'WARDS') catTag = isEn ? 'WARDS' : 'SENTINELAS';

            const headerBadge = rarity.iconWebp 
                ? `<p class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1" style="color: ${rarity.color}; min-height: 16px;">
                     <span class="rarity-badge-official"><img src="${rarity.iconWebp}" alt="${rarity.label}"></span>
                     <span style="color: ${rarity.color}; font-weight: 800; font-size: 10px; letter-spacing: 0.8px;">${rarity.label}</span>
                   </p>`
                : `<p class="inline-flex items-center text-[10px] font-bold uppercase tracking-wider mb-1" style="color: #6a7c92; font-size: 10px; min-height: 16px; letter-spacing: 0.08em;">
                     ${catTag}
                   </p>`;

            listItem.innerHTML = `
                ${thumbnailContent}
                <div class="item-card-body" style="padding: 10px 12px 14px 12px; display: flex; flex-direction: column; flex-grow: 1; justify-content: space-between;">
                    ${headerBadge}
                    <div class="item-card-name font-semibold" style="color: #f0e6d2; font-size: 12px; margin-bottom: 6px; line-height: 1.3; min-height: 32px; max-height: 32px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;" title="${item.name}">${item.name}</div>
                    <div class="item-card-price-stack">
                        <div class="item-card-price-money text-teal font-bold" style="font-size: 14px;">${priceInfo.money}</div>
                        <div class="item-card-price-rp text-gold" style="font-size: 11px;">${priceInfo.rp}</div>
                    </div>
                    <button type="button" class="buy-button" onclick="event.stopPropagation(); selectCardGift(${safeItemJson}, event)">
                        <i class="fa-solid fa-cart-plus me-1"></i> ${isEn ? 'ADD TO CART' : 'ADICIONAR AO CARRINHO'}
                    </button>
                </div>
            `;

            listItem.onclick = () => {
                document.querySelectorAll('#item-list li').forEach(el => el.classList.remove('selected'));
                listItem.classList.add('selected');
                selectItem(item, priceText);
            };
            fragment.appendChild(listItem);
        });

        list.appendChild(fragment);
        currentRenderIndex += CHUNK_SIZE;
    }

    function selectCardGift(item, evt) {
        addToCart(item, evt);
        if (typeof toggleCartDrawer === 'function') {
            toggleCartDrawer(true);
        }
    }
    window.selectCardGift = selectCardGift;

    // Card Thumbnail Slide Navigation (Interactive Chroma & Skin Preview)
    window.navigateCardSlide = function(itemKey, dir) {
        const stored = window.catalogItemsStore ? window.catalogItemsStore[itemKey] : null;
        if (!stored || !stored.slides || stored.slides.length <= 1) return;

        let cur = stored.currentSlide || 0;
        cur = (cur + dir + stored.slides.length) % stored.slides.length;
        stored.currentSlide = cur;

        const slide = stored.slides[cur];
        const imgEl = document.getElementById('thumb_img_' + itemKey);
        const pillEl = document.getElementById('chroma_pill_' + itemKey);

        if (imgEl) {
            imgEl.style.opacity = '0.35';
            setTimeout(() => {
                imgEl.src = slide.thumbUrl;
                if (slide.isChroma) {
                    imgEl.className = 'store-card-art store-card-chroma-model';
                    imgEl.style.objectFit = 'contain';
                    imgEl.style.maxWidth = '88%';
                    imgEl.style.maxHeight = '88%';
                    imgEl.style.padding = '12px 6px';
                } else {
                    imgEl.className = 'store-card-art';
                    imgEl.style.objectFit = 'cover';
                    imgEl.style.objectPosition = 'center 15%';
                    imgEl.style.maxWidth = '100%';
                    imgEl.style.maxHeight = '100%';
                    imgEl.style.padding = '0';
                }
                imgEl.style.opacity = '1';
            }, 80);
        }

        if (pillEl) {
            const isEn = window.selectedLanguage === 'en';
            if (cur === 0) {
                pillEl.innerHTML = `<i class="fa-solid fa-star me-1" style="color: #c8aa6e;"></i> ${isEn ? 'Base Skin' : 'Skin Base'} <span style="opacity: 0.75; font-size: 9px; margin-left: 4px;">(0/${stored.slides.length - 1})</span>`;
            } else {
                pillEl.innerHTML = `<i class="fa-solid fa-palette me-1" style="color: #ec4899;"></i> ${slide.label} <span style="opacity: 0.75; font-size: 9px; margin-left: 4px;">(${cur}/${stored.slides.length - 1})</span>`;
            }
        }
    };

    // Fullscreen Wallpaper / Splash Art Modal Logic (1:1 Lolgifting Cinematic View with Chromas)
    window.modalCurrentItemKey = null;
    window.modalCurrentSlideIndex = 0;

    function openWallpaperModal(itemKey) {
        let item = (window.catalogItemsStore && window.catalogItemsStore[itemKey]) ? window.catalogItemsStore[itemKey] : null;
        if (!item && Array.isArray(window.currentFilteredItems)) {
            item = window.currentFilteredItems.find(i => ('item_' + (i.offer_id || i.item_id)) === itemKey);
        }
        if (!item) return;

        window.modalCurrentItemKey = itemKey;
        window.modalCurrentSlideIndex = item.currentSlide || 0;

        let modal = document.getElementById('wallpaperLightboxModal');
        if (!modal) return;

        renderModalSlide();
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    window.openWallpaperModal = openWallpaperModal;

    function renderModalSlide() {
        const itemKey = window.modalCurrentItemKey;
        const item = window.catalogItemsStore ? window.catalogItemsStore[itemKey] : null;
        if (!item) return;

        const defaultImg = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-store/global/default/images/icon-mystery-item.png";
        const baseSplash = (item.icon_url || defaultImg).replace('/loading/', '/splash/');

        const slides = item.slides && item.slides.length > 0 ? item.slides : [
            {
                type: 'skin',
                name: item.name,
                label: 'Skin',
                fullUrl: baseSplash,
                isChroma: false
            }
        ];

        let cur = window.modalCurrentSlideIndex || 0;
        if (cur < 0) cur = 0;
        if (cur >= slides.length) cur = slides.length - 1;
        window.modalCurrentSlideIndex = cur;

        const slide = slides[cur];
        const imgEl = document.getElementById('wallpaperModalImage');
        const titleEl = document.getElementById('wallpaperModalItemName');
        const prevBtn = document.getElementById('modalNavPrev');
        const nextBtn = document.getElementById('modalNavNext');
        const stripEl = document.getElementById('modalChromaStrip');

        if (prevBtn) prevBtn.style.display = slides.length > 1 ? 'flex' : 'none';
        if (nextBtn) nextBtn.style.display = slides.length > 1 ? 'flex' : 'none';

        if (titleEl) {
            if (cur === 0) {
                titleEl.textContent = (item.name || '').toUpperCase();
            } else {
                titleEl.innerHTML = `${(item.name || '').toUpperCase()} <span style="color: #ec4899; font-size: 16px; margin-left: 8px;">· CROMA ${slide.label.toUpperCase()} (${cur}/${slides.length - 1})</span>`;
            }
        }

        if (imgEl) {
            imgEl.style.opacity = '0.35';
            setTimeout(() => {
                imgEl.src = slide.fullUrl;
                imgEl.alt = slide.name;
                if (slide.isChroma) {
                    imgEl.style.objectFit = 'contain';
                    imgEl.style.maxHeight = '72vh';
                    imgEl.style.maxWidth = '72vw';
                    imgEl.style.padding = '24px';
                    imgEl.style.background = 'radial-gradient(circle, rgba(10, 25, 45, 0.8) 0%, rgba(2, 7, 14, 0.95) 75%)';
                } else {
                    imgEl.style.objectFit = 'contain';
                    imgEl.style.maxHeight = '82vh';
                    imgEl.style.maxWidth = '90vw';
                    imgEl.style.padding = '0';
                    imgEl.style.background = 'none';
                }
                imgEl.style.opacity = '1';
            }, 80);
        }

        if (stripEl) {
            if (slides.length > 1) {
                stripEl.innerHTML = slides.map((s, idx) => `
                    <div class="modal-chroma-dot ${idx === cur ? 'active' : ''}" onclick="event.stopPropagation(); window.setModalSlide(${idx})" title="${s.label}"></div>
                `).join('');
                stripEl.style.display = 'flex';
            } else {
                stripEl.style.display = 'none';
            }
        }
    }

    window.changeModalSlide = function(dir) {
        const itemKey = window.modalCurrentItemKey;
        const item = window.catalogItemsStore ? window.catalogItemsStore[itemKey] : null;
        if (!item || !item.slides || item.slides.length <= 1) return;

        window.modalCurrentSlideIndex = (window.modalCurrentSlideIndex + dir + item.slides.length) % item.slides.length;
        renderModalSlide();
    };

    window.setModalSlide = function(idx) {
        window.modalCurrentSlideIndex = idx;
        renderModalSlide();
    };

    function closeWallpaperModal(e) {
        const modal = document.getElementById('wallpaperLightboxModal');
        if (modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }
    }
    window.closeWallpaperModal = closeWallpaperModal;

    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('wallpaperLightboxModal');
        if (modal && modal.classList.contains('open')) {
            if (e.key === 'Escape' || e.key === 'Esc') {
                closeWallpaperModal();
            } else if (e.key === 'ArrowLeft') {
                window.changeModalSlide(-1);
            } else if (e.key === 'ArrowRight') {
                window.changeModalSlide(1);
            }
        }
    });

    // Scroll listener for lazy loading remaining catalog items smoothly (natural document scroll)
    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 600) {
            renderMoreItems();
        }
    });

    const scrollBox = document.querySelector('.scrollable-box');
    if (scrollBox) {
        scrollBox.addEventListener('scroll', () => {
            if (scrollBox.scrollTop + scrollBox.clientHeight >= scrollBox.scrollHeight - 50) {
                renderMoreItems();
            }
        });
    }

    function selectItem(item, priceText) {
        const detailsEl = document.getElementById('selected-item-details');
        if (detailsEl) {
            detailsEl.innerHTML = `<i class="fa-solid fa-gift me-2" style="color: var(--lol-gold-2);"></i>Item Selecionado: <strong>${item.name}</strong> <span style="color: var(--lol-gold-1); margin-left: 6px;">${priceText || ''}</span>`;
        }
        selectedOfferId = item.offer_id;
        selectedItemId = item.item_id;
        selectedPrice = item.price_rp;
        selectedPriceIp = item.price_ip;
        selectedItemName = item.name;
        selectedInventoryType = item.inventory_type;

        // Update Drawer Hextech Banner
        const drawerBanner = document.getElementById('drawerSelectedItemBanner');
        const drawerImg = document.getElementById('drawerGiftImg');
        const drawerTitle = document.getElementById('drawerGiftTitle');
        const drawerRp = document.getElementById('drawerGiftPriceRp');
        const drawerMoney = document.getElementById('drawerGiftPriceMoney');

        if (drawerBanner) drawerBanner.style.display = 'flex';
        if (drawerImg) {
            drawerImg.src = item.icon_url || "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Orianna_40.jpg";
            drawerImg.alt = item.name || '';
        }
        if (drawerTitle) drawerTitle.textContent = item.name || '';
        if (drawerRp) drawerRp.textContent = `${item.price_rp || 0} RP`;
        if (drawerMoney && typeof formatItemPrice === 'function') {
            const pInfo = formatItemPrice(item.price_rp, currentSelectedRegion);
            drawerMoney.textContent = pInfo.money || '';
        }
    }
    window.selectItem = selectItem;

    // Instant search input response
    let searchDebounceTimer = null;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(filterItems, 30);
        });
    }

    // =========================================================================
    // SERVER / REGION SELECTION LOGIC (LOLGIFTING 1:1 WITH OUTROS DROPDOWN)
    // =========================================================================
    function selectRegion(region, btn) {
        if (!region) return;
        currentSelectedRegion = region.toUpperCase();
        localStorage.setItem('lg_gift_region', currentSelectedRegion);

        // Update pills active state
        document.querySelectorAll('.region-pill').forEach(p => {
            const r = (p.getAttribute('data-region') || '').toUpperCase();
            if (r) {
                p.classList.toggle('active', r === currentSelectedRegion);
            }
        });

        // Check if selected server belongs to OUTROS dropdown
        const outrosList = ['OCE', 'KR', 'JP', 'TR', 'RU', 'VN', 'PH', 'SG', 'TH', 'TW', 'ME', 'OC1', 'JP1', 'TR1', 'VN2', 'PH2', 'SG2', 'TH2', 'TW2', 'ME1'];
        const dropdownBtn = document.getElementById('btn-outros-dropdown');
        const dropdownMenu = document.getElementById('outros-dropdown-menu');

        if (dropdownMenu) dropdownMenu.style.display = 'none';

        const isOutros = outrosList.includes(currentSelectedRegion);
        if (dropdownBtn) {
            if (isOutros) {
                dropdownBtn.classList.add('active');
                dropdownBtn.innerHTML = `${currentSelectedRegion} <i class="fa-solid fa-caret-down ms-1"></i>`;
            } else {
                dropdownBtn.classList.remove('active');
                dropdownBtn.innerHTML = `OUTROS... <i class="fa-solid fa-caret-down ms-1"></i>`;
            }
        }

        // Highlight active item inside dropdown menu
        document.querySelectorAll('.server-dropdown-item').forEach(item => {
            const r = (item.getAttribute('data-region') || '').toUpperCase();
            item.classList.toggle('active', r === currentSelectedRegion);
        });

        // Update server currency notice on the right
        const noticeEl = document.getElementById('server-currency-notice');
        if (noticeEl) {
            if (currentSelectedRegion === 'BR') {
                noticeEl.innerHTML = `Preços em <span class="text-contrast">R$ · Pix</span>`;
            } else {
                noticeEl.innerHTML = `Preços em <span class="text-contrast">€ cartão / Stripe · -50% fora do BR</span>`;
            }
        }

        // Dynamically update prices on all cards currently rendered in catalog
        updateRenderedCardPrices();
        if (typeof updateCartUI === 'function') updateCartUI();
    }
    window.selectRegion = selectRegion;

    function toggleOutrosDropdown(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const menu = document.getElementById('outros-dropdown-menu');
        if (!menu) return;
        menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'flex' : 'none';
    }
    window.toggleOutrosDropdown = toggleOutrosDropdown;

    document.addEventListener('click', (e) => {
        const wrapper = document.getElementById('serverDropdownWrapper');
        const menu = document.getElementById('outros-dropdown-menu');
        if (menu && wrapper && !wrapper.contains(e.target)) {
            menu.style.display = 'none';
        }
    });

    function updateRenderedCardPrices() {
        document.querySelectorAll('#item-list .catalog-card-node').forEach(card => {
            const rp = card.getAttribute('data-rp');
            if (rp !== null) {
                const info = formatItemPrice(rp, currentSelectedRegion);
                const moneyEl = card.querySelector('.item-card-price-money');
                const rpEl = card.querySelector('.item-card-price-rp');
                if (moneyEl) moneyEl.textContent = info.money;
                if (rpEl) rpEl.textContent = info.rp;
            }
        });
    }
    window.updateRenderedCardPrices = updateRenderedCardPrices;

    function updateCartUI() {
        localStorage.setItem('lg_gift_cart', JSON.stringify(giftCart));
        const counterBadge = document.getElementById('cart-counter-badge');
        const totalItemsEl = document.getElementById('cart-total-items-count');
        const totalRpEl = document.getElementById('cart-total-rp');
        const cartListEl = document.getElementById('cart-items-list');

        const totalItemsCount = giftCart.reduce((acc, item) => acc + (item.qty || 1), 0);
        if (counterBadge) counterBadge.textContent = totalItemsCount;
        if (totalItemsEl) totalItemsEl.textContent = totalItemsCount;

        const totalRp = giftCart.reduce((acc, item) => acc + ((Number(item.price_rp) || 0) * (item.qty || 1)), 0);
        if (totalRpEl) totalRpEl.textContent = totalRp.toLocaleString('pt-BR');

        const totalMoneyEl = document.getElementById('cart-total-money');
        if (totalMoneyEl) {
            const priceInfoTotal = formatItemPrice(totalRp, currentSelectedRegion);
            totalMoneyEl.textContent = priceInfoTotal.money;
        }

        if (cartListEl) {
            if (giftCart.length === 0) {
                cartListEl.innerHTML = '<div class="text-center text-muted p-4" style="font-size: 11px;"><i class="fa-solid fa-cart-shopping me-2"></i>Seu carrinho está vazio. Adicione itens no catálogo!</div>';
            } else {
                cartListEl.innerHTML = giftCart.map((item, idx) => {
                    const qty = item.qty || 1;
                    const itemTotal = (Number(item.price_rp) || 0) * qty;
                    const itemMoney = formatItemPrice(itemTotal, currentSelectedRegion);
                    let itemThumb = item.icon_url || 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-store/global/default/images/icon-mystery-item.png';
                    if (itemThumb.includes('/splash/')) {
                        itemThumb = itemThumb.replace('/splash/', '/loading/');
                    }
                    return `
                    <div class="cart-item-card">
                        <img src="${itemThumb}" class="cart-item-thumb" alt="${item.name}" onerror="this.onerror=null;this.src='https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png';">
                        <div class="cart-item-details">
                            <div class="cart-item-title" title="${item.name}">${item.name}</div>
                            <div class="cart-item-rp">
                                <span style="color: #00ffcc; font-weight: 700;">${itemMoney.money}</span>
                                <span style="color: #c8aa6e; font-size: 10px; font-weight: 600;">(${itemTotal.toLocaleString('pt-BR')} RP)</span>
                            </div>
                        </div>
                        <div class="cart-qty-stepper">
                            <button type="button" class="btn-qty-step" onclick="changeItemQuantity(${idx}, ${qty - 1})" title="Diminuir">-</button>
                            <span class="qty-value">${qty}</span>
                            <button type="button" class="btn-qty-step" onclick="changeItemQuantity(${idx}, ${qty + 1})" title="Aumentar">+</button>
                        </div>
                        <button type="button" class="btn-remove-cart-item" onclick="removeFromCart(${idx})" title="Remover item">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `;
                }).join('');
            }
        }
    }
    window.updateCartUI = updateCartUI;

    function changeItemQuantity(idx, newQty) {
        if (giftCart[idx]) {
            const val = parseInt(newQty, 10);
            if (val <= 0) {
                removeFromCart(idx);
            } else {
                giftCart[idx].qty = val;
                updateCartUI();
            }
        }
    }
    window.changeItemQuantity = changeItemQuantity;

    function addToCart(item, evt) {
        if (evt) evt.stopPropagation();
        const existingIndex = giftCart.findIndex(i => (item.item_id && i.item_id === item.item_id) || (item.offer_id && i.offer_id === item.offer_id));
        if (existingIndex !== -1) {
            giftCart[existingIndex].qty = (giftCart[existingIndex].qty || 1) + 1;
        } else {
            giftCart.push({ ...item, qty: 1 });
        }
        updateCartUI();

        if (evt && evt.currentTarget) {
            const btn = evt.currentTarget;
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check text-success"></i> Adicionado!';
            setTimeout(() => { btn.innerHTML = orig; }, 900);
        }
    }
    window.addToCart = addToCart;

    function removeFromCart(index) {
        if (index >= 0 && index < giftCart.length) {
            giftCart.splice(index, 1);
            updateCartUI();
        }
    }
    window.removeFromCart = removeFromCart;

    function clearCart() {
        giftCart = [];
        updateCartUI();
    }
    window.clearCart = clearCart;

    function toggleCartDrawer(forceState) {
        const drawer = document.getElementById('cartDrawer');
        const overlay = document.getElementById('cartDrawerOverlay');
        if (!drawer || !overlay) return;
        if (forceState !== undefined) {
            drawer.classList.toggle('open', forceState);
            overlay.classList.toggle('open', forceState);
        } else {
            drawer.classList.toggle('open');
            overlay.classList.toggle('open');
        }
        if (drawer.classList.contains('open')) {
            updateCartUI();
        }
    }
    window.toggleCartDrawer = toggleCartDrawer;

    function syncCartRiotId() {
        const nameEl = document.getElementById('cart-recipient-name');
        const tagEl = document.getElementById('cart-recipient-tag');
        const fullEl = document.getElementById('cart-recipient-id');
        if (!fullEl) return;
        
        let name = nameEl ? nameEl.value.trim() : '';
        let tag = tagEl ? tagEl.value.trim().replace(/^#/, '') : '';
        
        // If user pasted "Name#TAG" directly into the first field
        if (name.includes('#')) {
            const parts = name.split('#');
            name = parts[0].trim();
            tag = parts[1].trim();
            if (nameEl) nameEl.value = name;
            if (tagEl) tagEl.value = tag;
        }
        
        fullEl.value = (name && tag) ? `${name}#${tag}` : (name ? `${name}#` : '');
        
        // Also keep legacy input in sync
        const mainNickname = document.getElementById('nickname-tag');
        if (mainNickname) mainNickname.value = fullEl.value;
    }
    window.syncCartRiotId = syncCartRiotId;

    async function dispatchCartGifts() {
        if (!giftCart || giftCart.length === 0) {
            alert(selectedLanguage === 'en' ? 'Your cart is empty. Add items from the catalog!' : 'O carrinho está vazio. Adicione itens no catálogo!');
            return;
        }

        syncCartRiotId();
        const recipientInput = document.getElementById('cart-recipient-id');
        const recipientId = recipientInput ? recipientInput.value.trim() : '';
        if (!recipientId || !recipientId.includes('#') || recipientId.endsWith('#') || recipientId.startsWith('#')) {
            alert(selectedLanguage === 'en' 
                ? 'Please enter the recipient Riot ID in the format "Name#TAG".' 
                : 'Por favor informe o Riot ID do destinatário no formato Nome#TAG (ex: SeuNome#BR1).');
            const nameEl = document.getElementById('cart-recipient-name');
            if (nameEl) nameEl.focus();
            return;
        }

        const messageInput = document.getElementById('cart-message');
        const giftMessage = messageInput ? messageInput.value.trim() : '';
        const statusDiv = document.getElementById('cart-result-status');
        const dispatchBtn = document.getElementById('btn-dispatch-all-cart');

        if (dispatchBtn) dispatchBtn.disabled = true;

        const [rName, rTag] = recipientId.split('#');

        // Build flat queue taking quantity into account
        const flatQueue = [];
        giftCart.forEach(item => {
            const qty = item.qty || 1;
            for (let q = 0; q < qty; q++) {
                flatQueue.push(item);
            }
        });

        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.className = 'result-status-text alert alert-info';
            statusDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>${selectedLanguage === 'en' ? 'Placing order for' : 'Processando pedido para'} <strong>${recipientId}</strong> (${flatQueue.length} ${selectedLanguage === 'en' ? 'items' : 'itens'})...`;
        }

        let successCount = 0;
        let failCount = 0;
        const savedToken = localStorage.getItem('jwtToken');
        const headers = { 'Content-Type': 'application/json' };
        if (savedToken && savedToken !== 'null' && savedToken !== 'undefined') {
            headers['Authorization'] = 'Bearer ' + savedToken;
        }

        for (let i = 0; i < flatQueue.length; i++) {
            const item = flatQueue[i];
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div style="margin-bottom: 6px;">
                        <i class="fa-solid fa-paper-plane fa-fade me-2 text-warning"></i>
                        [${i + 1}/${flatQueue.length}]: <strong>${item.name}</strong> &rarr; <strong>${recipientId}</strong>
                    </div>
                    <div class="progress" style="height: 6px; background: #040911;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated bg-warning" role="progressbar" style="width: ${Math.round(((i + 1) / flatQueue.length) * 100)}%;"></div>
                    </div>
                `;
            }

            try {
                const payload = {
                    task: 'order',
                    name: rName,
                    tag: rTag,
                    item_name: item.name,
                    offer_id: item.offer_id,
                    item_id: item.item_id,
                    inventory_type: item.inventory_type || item.category || 'CHAMPION_SKIN',
                    price: Number(item.price_rp) || 0,
                    price_ip: item.price_ip || 0,
                    currency: 'RP',
                    quantity: 1,
                    giftmessage: giftMessage
                };

                const res = await fetch('/run-script', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok && (data.status === 'success' || data.message)) {
                    successCount++;
                } else if (data && data.status === 'success') {
                    successCount++;
                } else {
                    console.warn('Order dispatch item warning:', item.name, data);
                    failCount++;
                }
            } catch (err) {
                console.error('Falha ao processar item do carrinho:', item.name, err);
                failCount++;
            }

            if (i < flatQueue.length - 1) {
                await new Promise(r => setTimeout(r, 600));
            }
        }

        if (dispatchBtn) dispatchBtn.disabled = false;

        if (statusDiv) {
            if (failCount === 0 || successCount > 0) {
                statusDiv.className = 'result-status-text alert alert-success';
                statusDiv.innerHTML = `
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <i class="fa-solid fa-circle-check text-success" style="font-size: 18px;"></i>
                        <strong>${selectedLanguage === 'en' ? 'Order Placed Successfully!' : 'Pedido Realizado com Sucesso!'}</strong>
                    </div>
                    <div style="font-size: 12px; line-height: 1.4;">
                        ${selectedLanguage === 'en'
                            ? `Recipient: <strong>${recipientId}</strong><br>Items in queue: <strong>${successCount}</strong>.<br>The bot will send the friend request in LoL. Gifts are delivered after Riot's 24h friendship rule.`
                            : `Destinatário: <strong>${recipientId}</strong><br>Itens na fila: <strong>${successCount}</strong>.<br>O bot enviará a solicitação de amizade no LoL. A entrega é realizada após a regra de 24h da Riot Games.`
                        }
                    </div>
                `;
                // Clear cart on success
                giftCart = [];
                updateCartUI();
            } else {
                statusDiv.className = 'result-status-text alert alert-danger';
                statusDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation me-2"></i>${selectedLanguage === 'en' ? 'Failed to place order. Please check your credentials or try again.' : 'Falha ao realizar pedido. Verifique seu saldo ou contate o suporte.'}`;
            }
        }
    }
    window.dispatchCartGifts = dispatchCartGifts;

    // Restore saved region on init
    const savedRegion = localStorage.getItem('lg_gift_region') || 'BR';
    selectRegion(savedRegion);

    // Initialize Cart badge counter
    updateCartUI();

    const uiTranslations = {
        pt: {
            filter_rarity: "Raridade",
            filter_all: "Todas",
            rarity_ultimate: "Ultimate",
            rarity_mythic: "Mítica",
            rarity_legendary: "Lendária",
            rarity_epic: "Épica",
            rarity_standard: "Padrão",
            filter_sort: "Ordenar",
            sort_rarity: "Por raridade",
            sort_price_asc: "Menor preço",
            sort_price_desc: "Maior preço",
            sort_name_asc: "Nome (A-Z)",
            filter_order: "Ordem",
            order_rare_first: "Mais rara primeiro",
            order_common_first: "Mais comum primeiro",
            store_tag: "LOJA",
            catalog_title: "CATÁLOGO",
            catalog_count: "8.758 itens",
            server_region_title: "SERVIDOR DO PRESENTE",
            btn_enter: "ENTRAR",
            btn_send_gift: "ENVIAR PRESENTE",
            btn_gift_now: "Enviar Presente Agora",
            drawer_selected_label: "ITEM SELECIONADO",
            label_sender_acc: "Conta Riot Sender (user:pass)",
            label_add_pass: "Senha Adicional (Opcional)",
            label_token_url: "Token / Cookies de Sessão",
            label_recipient: "Destinatário (Riot ID)",
            label_gift_message: "Mensagem do Presente (Opcional)",
            label_gift_qty: "Quantidade de Presentes",
            simple_login_mode: "Modo Simples (user:pass)",
            menu_label: "NAVEGAÇÃO",
            nav_tab1: "Visão Geral & Loja",
            nav_tab2: "Histórico de Pedidos",
            nav_tab3: "Cofre de Contas",
            nav_tab4: "Rede de Amigos",
            status_authenticated: "Autenticado",
            rp_balance_label: "Saldo RP",
            btn_new_gift: "Novo Agendamento / Envio",
            page_title: "Visão Geral & Loja",
            page_subtitle: "Resumo das atividades da plataforma e disparo de presentes em tempo real.",
            card_rp_label: "Saldo de RP",
            card_items_label: "Itens no Catálogo",
            updated_status: "Atualizado",
            card_sent_label: "Presentes Enviados",
            card_daily_gifts: "Presentes Diários",
            quota_status: "Limite 10",
            card_saved_label: "Contas Salvas",
            catalog_header_title: "Catálogo de Itens Disponíveis",
            search_placeholder: "Buscar skins, campeões, passes, pacotes...",
            cat_all: "Todos",
            cat_skins: "Skins",
            cat_chromas: "Chromas",
            cat_bundles: "Pacotes",
            cat_passes: "Passes",
            cat_champions: "Campeões",
            cat_emotes: "Emotes",
            cat_icons: "Ícones",
            cat_wards: "Sentinelas",
            cat_little_legends: "Pequenas Lendas",
            cat_tft_arena: "Tabuleiros TFT",
            cat_boosts: "Boosts",
            cat_eternals: "Eternals",
            cat_mystery: "Mistério",
            cat_hextech: "Hextec",
            selected_item_none: "Item Selecionado: Nenhum",
            msg_placeholder: "Mensagem do Presente (Opcional)",
            qty_label: "Qtd:",
            quick_actions_title: "Ações Rápidas & Sessão",
            simple_login_mode: "Modo Simples (user:pass)",
            label_sender_acc: "Conta Riot Sender",
            sender_placeholder: "Usuário:Senha",
            label_add_pass: "Senha Adicional (Opcional)",
            pass_placeholder: "Senha",
            label_token_url: "Token / Cookies de Sessão",
            token_placeholder: "Token URL",
            label_recipient: "Destinatário (Riot ID)",
            recipient_placeholder: "Nickname#TAG",
            qa_check_rp: "Checar Saldo RP",
            qa_check_rp_sub: "Consultar saldo da conta",
            qa_send_friend: "Enviar Amizade",
            qa_send_friend_sub: "Adicionar destinatário",
            qa_dispatch: "Enviar Presente",
            qa_dispatch_sub: "Enviar item selecionado",
            tab2_title: "Histórico de Pedidos & Transações",
            tab2_subtitle: "Acompanhe todos os disparos de presentes executados pela plataforma.",
            tab2_card_title: "Registros de Envio",
            btn_refresh_log: "Atualizar",
            btn_export_log: "Exportar Log",
            btn_clear_log: "Limpar Log",
            th_sender: "Remetente",
            th_recipient: "Destinatário",
            th_item: "Item",
            th_cost: "Custo (RP)",
            th_order_date: "Data do Pedido",
            th_finish_date: "Conclusão",
            th_status: "Status",
            th_actions: "Ações",
            tab3_title: "Cofre de Contas & Chaves API",
            tab3_subtitle: "Gerencie suas contas de envio salvas e chaves de resolução de Captcha.",
            tab3_credentials_title: "Gerenciador de Credenciais",
            label_riot_cred: "Credencial Riot (user:pass)",
            btn_save_account: "Salvar Conta",
            btn_clear_accounts: "Limpar Todas as Contas",
            tab3_captcha_title: "Chave Captcha Solver",
            label_captcha_key: "Chave CapMonster / 2Captcha",
            captcha_placeholder: "Cole sua chave API",
            btn_save_captcha: "Salvar Chave Captcha",
            tab3_accounts_table_title: "Contas Riot Cadastradas",
            th_user_pass: "Usuário:Senha",
            th_region: "Região",
            th_rp_balance: "Saldo RP",
            th_rp_ordered: "RP Pedido",
            th_rp_remaining: "RP Restante",
            tab4_title: "Rede de Amigos & Disparos em Massa",
            tab4_subtitle: "Gerencie amizades do League of Legends e solicite envios em lote.",
            tab4_ops_title: "Operações de Amizade",
            label_operator_acc: "Conta Operadora",
            btn_load_friends: "Carregar Amigos",
            btn_accept_all: "Aceitar Todos os Pedidos",
            label_mass_msg: "Mensagem de Chat em Massa",
            mass_msg_placeholder: "Digite a mensagem para todos os amigos...",
            btn_send_mass_msg: "Disparar Mensagens",
            label_mass_list: "Lista de Pedidos em Massa (.txt)",
            btn_import_list: "Importar Lista (Máx 50)",
            btn_clear_friends: "Limpar Amigos",
            tab4_friends_list_title: "Lista de Amigos & Solicitações",
            filter_friends_placeholder: "Filtrar por Riot ID ou Tag...",
            th_riot_id: "Riot ID (Nome#TAG)",
            th_friendship_time: "Tempo de Amizade",
            tab_featured: "DESTAQUES",
            tab_champions: "CAMPEÕES",
            tab_skins: "SKINS",
            tab_loot: "ESPÓLIOS",
            tab_accessories: "ACESSÓRIOS",
            btn_purchase_rp: "COMPRE RP",
            heading_most_popular: "MAIS POPULARES",
            view_by_champion: "Por Campeão",
            view_all_skins: "Todas as Skins"
        },
        en: {
            filter_rarity: "Rarity",
            filter_all: "All",
            rarity_ultimate: "Ultimate",
            rarity_mythic: "Mythic",
            rarity_legendary: "Legendary",
            rarity_epic: "Epic",
            rarity_standard: "Standard",
            filter_sort: "Sort by",
            sort_rarity: "By rarity",
            sort_price_asc: "Lowest price",
            sort_price_desc: "Highest price",
            sort_name_asc: "Name (A-Z)",
            filter_order: "Order",
            order_rare_first: "Most rare first",
            order_common_first: "Most common first",
            store_tag: "STORE",
            catalog_title: "CATALOG",
            catalog_count: "8,758 items",
            server_region_title: "GIFT SERVER",
            btn_enter: "SIGN IN",
            btn_send_gift: "SEND AS GIFT",
            btn_gift_now: "Send Gift Now",
            drawer_selected_label: "SELECTED ITEM",
            label_sender_acc: "Riot Sender Account (user:pass)",
            label_add_pass: "Additional Password (Optional)",
            label_token_url: "Session Token / Cookies",
            label_recipient: "Recipient (Riot ID)",
            label_gift_message: "Gift Message (Optional)",
            label_gift_qty: "Gift Quantity",
            simple_login_mode: "Simple Mode (user:pass)",
            tab_featured: "FEATURED",
            tab_champions: "CHAMPIONS",
            tab_skins: "SKINS",
            tab_loot: "LOOT",
            tab_accessories: "ACCESSORIES",
            btn_purchase_rp: "PURCHASE RP",
            heading_most_popular: "MOST POPULAR",
            menu_label: "NAVIGATION",
            nav_tab1: "Overview & Store",
            nav_tab2: "Order History",
            nav_tab3: "Accounts Vault",
            nav_tab4: "Friend Network",
            status_authenticated: "Authenticated",
            rp_balance_label: "RP Balance",
            btn_new_gift: "New Schedule / Send",
            page_title: "Overview & Store",
            page_subtitle: "Platform activities summary and real-time gift delivery.",
            card_rp_label: "RP Balance",
            card_items_label: "Catalog Items",
            updated_status: "Updated",
            card_sent_label: "Sent Gifts",
            card_daily_gifts: "Daily Gifts",
            quota_status: "Quota: 10",
            card_saved_label: "Saved Accounts",
            catalog_header_title: "Available Items Catalog",
            search_placeholder: "Search skins, champions, passes, bundles...",
            cat_all: "All",
            cat_skins: "Skins",
            cat_chromas: "Chromas",
            cat_bundles: "Bundles",
            cat_passes: "Passes",
            cat_champions: "Champions",
            cat_emotes: "Emotes",
            cat_icons: "Icons",
            cat_wards: "Wards",
            cat_little_legends: "Little Legends",
            cat_tft_arena: "TFT Arenas",
            cat_boosts: "Boosts",
            cat_eternals: "Eternals",
            cat_mystery: "Mystery",
            cat_hextech: "Hextech",
            selected_item_none: "Selected Item: None",
            msg_placeholder: "Gift Message (Optional)",
            qty_label: "Qty:",
            quick_actions_title: "Quick Actions & Session",
            simple_login_mode: "Simple Mode (user:pass)",
            label_sender_acc: "Riot Sender Account",
            sender_placeholder: "Username:Password",
            label_add_pass: "Additional Password (Optional)",
            pass_placeholder: "Password",
            label_token_url: "Session Token / Cookies",
            token_placeholder: "Token URL",
            label_recipient: "Recipient (Riot ID)",
            recipient_placeholder: "Nickname#TAG",
            qa_check_rp: "Check RP Balance",
            qa_check_rp_sub: "Consult account balance",
            qa_send_friend: "Send Friend Request",
            qa_send_friend_sub: "Add recipient ID",
            qa_dispatch: "Send Gift",
            qa_dispatch_sub: "Send selected item",
            tab2_title: "Order & Transaction History",
            tab2_subtitle: "Track all gift dispatches executed through the platform.",
            tab2_card_title: "Delivery Logs",
            btn_refresh_log: "Refresh",
            btn_export_log: "Export Log",
            btn_clear_log: "Clear Log",
            th_sender: "Sender",
            th_recipient: "Recipient",
            th_item: "Item",
            th_cost: "Cost (RP)",
            th_order_date: "Order Date",
            th_finish_date: "Completion",
            th_status: "Status",
            th_actions: "Actions",
            tab3_title: "Accounts Vault & API Keys",
            tab3_subtitle: "Manage your saved sender accounts and Captcha solver keys.",
            tab3_credentials_title: "Credentials Manager",
            label_riot_cred: "Riot Credential (user:pass)",
            btn_save_account: "Save Account",
            btn_clear_accounts: "Clear All Accounts",
            tab3_captcha_title: "Captcha Solver Key",
            label_captcha_key: "CapMonster / 2Captcha Key",
            captcha_placeholder: "Paste your API key",
            btn_save_captcha: "Save Captcha Key",
            tab3_accounts_table_title: "Registered Riot Accounts",
            th_user_pass: "Username:Password",
            th_region: "Region",
            th_rp_balance: "RP Balance",
            th_rp_ordered: "Ordered RP",
            th_rp_remaining: "Remaining RP",
            tab4_title: "Friend Network & Mass Delivery",
            tab4_subtitle: "Manage League of Legends friendships and request batch delivery.",
            tab4_ops_title: "Friendship Operations",
            label_operator_acc: "Operator Account",
            btn_load_friends: "Load Friends",
            btn_accept_all: "Accept All Requests",
            label_mass_msg: "Mass Chat Message",
            mass_msg_placeholder: "Type a message for all friends...",
            btn_send_mass_msg: "Send Messages",
            label_mass_list: "Mass Order List (.txt)",
            btn_import_list: "Import List (Max 50)",
            btn_clear_friends: "Clear Friends",
            tab4_friends_list_title: "Friend List & Requests",
            filter_friends_placeholder: "Filter by Riot ID or Tag...",
            th_riot_id: "Riot ID (Name#TAG)",
            th_friendship_time: "Friendship Time",
            view_by_champion: "By Champion",
            view_all_skins: "All Skins"
        }
    };

    function applyUiTranslations(lang) {
        const isEn = (lang === 'en' || selectedLanguage === 'en');
        const dict = uiTranslations[lang] || uiTranslations[isEn ? 'en' : 'pt'] || uiTranslations.pt;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) el.textContent = dict[key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[key]) el.setAttribute('placeholder', dict[key]);
        });

        // Also update search input placeholder
        const searchInput = document.getElementById('search-item');
        if (searchInput) {
            if (isEn) {
                if (selectedActiveCategory === 'Skin') searchInput.placeholder = 'Search skins or champions...';
                else if (selectedActiveCategory === 'Chroma') searchInput.placeholder = 'Search chromas...';
                else if (selectedActiveCategory === 'Champion') searchInput.placeholder = 'Search champions...';
                else searchInput.placeholder = 'Search skins, champions, bundles...';
            } else {
                if (selectedActiveCategory === 'Skin') searchInput.placeholder = 'Buscar skin ou campeão...';
                else if (selectedActiveCategory === 'Chroma') searchInput.placeholder = 'Buscar chroma...';
                else if (selectedActiveCategory === 'Champion') searchInput.placeholder = 'Buscar campeão...';
                else searchInput.placeholder = 'Buscar skin, campeão, pacote...';
            }
        }

        // Also update category heading
        const headingEl = document.getElementById('catalogCategoryHeading');
        const catTitlesPt = {
            'all': 'CATÁLOGO', 'Skin': 'SKINS', 'Chroma': 'CHROMAS', 'Bundle': 'PACOTES',
            'Champion': 'CAMPEÕES', 'Emote': 'EMOTES', 'Icon': 'ÍCONES', 'Ward': 'SENTINELAS',
            'LittleLegends': 'PEQUENAS LENDAS', 'TFTArena': 'TABULEIROS TFT', 'Eternals': 'ETERNALS',
            'Mystery': 'MISTÉRIO', 'Hextech': 'HEXTEC'
        };
        const catTitlesEn = {
            'all': 'CATALOG', 'Skin': 'SKINS', 'Chroma': 'CHROMAS', 'Bundle': 'BUNDLES',
            'Champion': 'CHAMPIONS', 'Emote': 'EMOTES', 'Icon': 'ICONS', 'Ward': 'WARDS',
            'LittleLegends': 'LITTLE LEGENDS', 'TFTArena': 'TFT ARENAS', 'Eternals': 'ETERNALS',
            'Mystery': 'MYSTERY', 'Hextech': 'HEXTECH'
        };
        const titles = isEn ? catTitlesEn : catTitlesPt;
        if (headingEl) headingEl.textContent = titles[selectedActiveCategory] || selectedActiveCategory.toUpperCase();
    }
    window.applyUiTranslations = applyUiTranslations;

    // Custom Sleek Language Dropdown Logic
    const dropdownTrigger = document.getElementById('lang-dropdown-trigger');
    const dropdownMenu = document.getElementById('lang-dropdown-menu');
    const selectedLabel = document.getElementById('lang-selected-label');
    const langOptions = document.querySelectorAll('.lang-option');

    if (dropdownTrigger && dropdownMenu) {
        dropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });

        langOptions.forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                langOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                const val = opt.getAttribute('data-value');
                selectedLanguage = val;
                languageSelect.value = val;
                
                selectedLabel.textContent = val === 'pt' ? '🇧🇷 Português (BR)' : '🇺🇸 English (US)';
                dropdownMenu.classList.remove('show');

                applyUiTranslations(selectedLanguage);
                fetchCatalog();
            });
        });
    }

    categoryRadios.forEach(radio => radio.addEventListener('change', filterItems));
    languageSelect.addEventListener('change', () => {
        selectedLanguage = languageSelect.value;
        applyUiTranslations(selectedLanguage);
        fetchCatalog();
    });

    // Sync initial active language button
    document.querySelectorAll('.header-lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.id === `btn-lang-${selectedLanguage}`);
    });

    applyUiTranslations(selectedLanguage);
    fetchCatalog();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCatalogApp);
} else {
    initCatalogApp();
}


// Carregar todos os itens inicialmente para a categoria "all"
/*window.onload = async () => {
    const catalog = await fetchCatalog();
    if (catalog) {
        const allItems = getAllItems(catalog);
        updateItemList(allItems);
    }
};*/



function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    
    // Esconde todos os elementos com class="tabcontent"
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
    }
    
    // Remove a classe "active" de todos os elementos com class="tablinks"
    tablinks = document.getElementsByClassName("tab");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    
    // Mostra o conteúdo da aba atual e adiciona uma classe "active" ao botão que abriu a aba
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

// Adiciona um evento para abrir a primeira aba por padrão
document.addEventListener("DOMContentLoaded", function() {
    document.getElementsByClassName("tab")[0].click();
});





document.addEventListener('DOMContentLoaded', function() {
    document.getElementsByClassName("tab")[1].addEventListener('click', fetchOrders);
});

async function fetchOrders() {
    const jwtToken = localStorage.getItem('jwtToken');

    try {
        const response = await fetch('/get_orders', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            }
        });

        if (response.ok) {
            const orders = await response.json();
            renderOrders(orders);
        } else {
            const errorData = await response.json();
            //console.error('Error fetching orders:', errorData.error);
        }
    } catch (error) {
        //console.error('Error:', error);
    }
}

function renderOrders(orders) {

    orders.sort((a, b) => new Date(b.date_order) - new Date(a.date_order));

    const ordersList = document.getElementById('orders-list');
    ordersList.innerHTML = ''; // Clear the existing list

    orders.forEach(order => {
        const row = document.createElement('tr');

        row.id = `order-${order.id}`;  // Atribui um ID único baseado no ID da ordem

        
        // Adicionando as células normais
        row.appendChild(createCell(order.sender));
        row.appendChild(createCell(order.receiver));
        row.appendChild(createCell(order.item_name));
        row.appendChild(createCell(order.item_price));
        row.appendChild(createCell(new Date(order.date_order).toLocaleString()));
        //row.appendChild(createCell(new Date(order.date_finished).toLocaleString()));
        row.appendChild(createCell(formatDate(order.date_finished)));
        row.appendChild(createCell(order.status));


        const cancelCell = document.createElement('td');
  

        // Adicionando a célula do botão de cancelar
        
  
        cancelCell.style.width = '100%'; // Garante que a célula ocupe a largura total disponível
        cancelCell.style.height = '100%'; // Garante que a célula ocupe a altura total disponível

        cancelCell.className = 'cancel-cell'; // Aplica a classe correta à célula
        
        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-button';
        cancelButton.textContent = 'X';


        // Adiciona manipulador de eventos ao botão
        cancelButton.addEventListener('click', () => cancelOrder(order.id));
        
        const cancelText = document.createElement('span');
        cancelText.textContent = 'Cancel';
        cancelText.className = 'cancel-text';
        
        cancelCell.appendChild(cancelButton);
        cancelCell.appendChild(cancelText);

        //

        row.appendChild(cancelCell);
        
        ordersList.appendChild(row);
    });
}

function createCell(text) {
    const cell = document.createElement('td');
    cell.textContent = text;
    return cell;
}

async function cancelOrder(orderId) {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    const jwtToken = localStorage.getItem('jwtToken');
    try {
        const response = await fetch(`/cancel_order/${orderId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            }
        });

        if (response.ok) {
            alert('Order canceled successfully.');
            // Removendo a linha da ordem
            document.getElementById(`order-${orderId}`).remove();
        } else {
            const errorData = await response.json();
            //console.error('Error cancelling order:', errorData.msg);
            alert(`Failed to cancel order: ${errorData.msg}`);
        }
    } catch (error) {
        //console.error('Error:', error);
        alert('An error occurred while cancelling the order.');
    }
}

async function clearOrders() {
    const jwtToken = localStorage.getItem('jwtToken');

    try {
        const response = await fetch('/clear_orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Transactions cleared:', data.deleted_count);
            // Limpar a lista na interface do usuário
            document.getElementById('orders-list').innerHTML = '';
            alert('All transactions have been cleared.');
        } else {
            const errorData = await response.json();
            //console.error('Error clearing transactions:', errorData.msg);
            alert(`Error: ${errorData.msg}`);
        }
    } catch (error) {
        //console.error('Error:', error);
        alert('An error occurred while clearing the transactions.');
    }
}

async function exportOrders() {
    const jwtToken = localStorage.getItem('jwtToken');

    try {
        const response = await fetch('/export_orders', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtToken}`
            }
        });

        if (response.ok) {
            const ordersText = await response.text();
            // Cria um link temporário para download
            const blob = new Blob([ordersText], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'orders.txt';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            alert('Orders have been exported.');
        } else {
            const errorData = await response.json();
            //console.error('Error exporting transactions:', errorData.msg);
            alert(`Error: ${errorData.msg}`);
        }
    } catch (error) {
        //console.error('Error:', error);
        alert('An error occurred while exporting the transactions.');
    }
}







async function saveAccount() {
    const jwtToken = localStorage.getItem('jwtToken');

    // Obtém o username e o password do formulário
    const userPassInput = document.getElementById('user-pass');
    var credentials = removeSpaces(userPassInput.value).split(':');
    if (credentials.length !== 2) {
        alert('Please enter your credentials in the format "username:password".');
        return;  // Sai da função se o formato não estiver correto
    }

    const accountData = {
        user_pass: document.getElementById('user-pass').value
    };



    try {
        const response = await fetch('/save_account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify(accountData)
        });

        if (response.ok) {
            const data = await response.json();
            console.log(data.msg);
            //alert("Account registered successfully!");

            // Atualiza a lista de contas após o registro bem-sucedido
            fetchAccounts().then(() => {
                console.log('Accounts list updated successfully.');
                // Dispara o check automático para puxar a região e saldo
                const username = credentials[0];
                const password = credentials[1];
                checkAccountByCredentials(username, password);
            });

        } else {
            const errorData = await response.json();
            //console.error(errorData.msg);
            alert(`Error registering account: ${errorData.msg}`);
        }
    } catch (error) {
        //console.error('Error:', error);
        alert('Error registering account.');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementsByClassName("tab")[2].addEventListener('click', fetchAccounts);
    // Fetch accounts on load so metrics are updated immediately
    fetchAccounts();
});

async function fetchAccounts() {
    const jwtToken = localStorage.getItem('jwtToken');

    try {
        const response = await fetch('/get_accounts?t=' + Date.now(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            }
        });

        if (response.ok) {
            const accounts = await response.json();
            renderAccounts(accounts);
            
            // Update the overview metric card
            const totalSavedAccountsElement = document.getElementById('total-saved-accounts');
            if (totalSavedAccountsElement) {
                totalSavedAccountsElement.innerText = accounts.length;
            }
        } else {
            const errorData = await response.json();
            //console.error('Error fetching accounts:', errorData.message);
        }
    } catch (error) {
        //console.error('Error:', error);
    }
}

function renderAccounts(accounts) {
    const accountsList = document.getElementById('accounts-list');
    accountsList.innerHTML = '';

    accounts.forEach(account => {
        const row = document.createElement('tr');

        row.id = `account-${account.user_pass}`; // Assumindo que o backend retorna um ID
        //row.setAttribute('data-user-pass', account.user_pass); // Armazena user_pass como um atributo data
        row.setAttribute('data-account', JSON.stringify(account)); // Serializa e armazena o objeto account


        row.appendChild(createCell(account.user_pass));
        row.appendChild(createCell(account.region));
        row.appendChild(createCell(account.rp_balance));
        row.appendChild(createCell(account.rp_ordered));
        row.appendChild(createCell(account.rp_remaining));
        
        
        // Célula para ações com botões e textos
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell'; // Aplica a classe correta à célula

        // Primeiro conjunto: Botão Checar (Check)
        const checkContainer = document.createElement('div');
        checkContainer.className = 'action-container';
        const checkButton = document.createElement('button');
        checkButton.className = 'check-button action-button';
        checkButton.innerHTML = '✔'; // Símbolo de check dentro de um círculo
        checkButton.addEventListener('click', () => checkAccount(account));
        const checkText = document.createElement('span');
        checkText.textContent = ' Check';
        checkContainer.appendChild(checkButton);
        checkContainer.appendChild(checkText);

        // Segundo conjunto: Botão Cancelar (Remove)
        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-button action-button';
        cancelButton.innerHTML = '✖'; // Símbolo de cancel dentro de um círculo
        cancelButton.addEventListener('click', () => cancelAccount(account));
        const cancelText = document.createElement('span');
        cancelText.textContent = ' Remove';
        const cancelContainer = document.createElement('div');
        cancelContainer.className = 'action-container';
        cancelContainer.appendChild(cancelButton);
        cancelContainer.appendChild(cancelText);

        // Adiciona os contêineres à célula de ações
        actionsCell.appendChild(checkContainer);
        actionsCell.appendChild(cancelContainer);

        // Adiciona a célula de ações à linha
        row.appendChild(actionsCell);




        accountsList.appendChild(row);
    });
}



async function checkAccount(account) {

    var resultDiv = document.getElementById('result-acc');
    resultDiv.innerText = 'Checking account...';


    const jwtToken = localStorage.getItem('jwtToken');
    //const row = document.querySelector(`[data-user-pass="${userPass}"]`);
    const row = document.querySelector(`[data-account='${JSON.stringify(account)}']`);



    if (!row) {
        //console.error('Account row not found for user_pass:', userPass);
        return;
    }

    userPass = account.user_pass
    const [username, password] = userPass.split(':');

    var resultDiv = document.getElementById('result-acc');

    resultDiv.innerText = "Verifying Authentication...";

    userpass = `${username}:${password}`;


/*     try {
        result_captcha = await getAuthCaptcha(userpass)
        captcha_solved = result_captcha.captchaResponse
        session_id = result_captcha.session_id
    } catch (error) {
        //console.error("Erro on geting captcha:", error);
        throw error;
    }

    console.log('Captcha response:', result_captcha.captchaResponse);*/

    resultDiv.innerText = 'Checking account...';

    try {
        const response = await fetch('/run-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
                username: username,
                password: password,
                task: 'saldo',
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            // Atualiza a célula do saldo diretamente
            row.cells[1].textContent = data.region; // Assumindo que o region está na segunda célula (index 1)
            row.cells[2].textContent = data.saldo; // Assumindo que o saldo está na terceira célula (index 2)
            row.cells[3].textContent = data.total_ordered; // Assumindo que o total_ordered está na quarta célula (index 3)
            row.cells[4].textContent = data.rp_remaining; // Assumindo que o total_ordered está na quarta célula (index 3)

            console.log('Success:', data);
            var resultDiv = document.getElementById('result-acc');
            resultDiv.innerText = 'Account checked';


        } else {
            //console.error('Failed to fetch balance:', data.message);
            alert(`Failed to fetch balance: ${data.message}`);
        }
    } catch (error) {
        //console.error('Error fetching balance for:', username, error);
        alert('An error occurred while fetching the balance.');
    }
}

async function checkAccountByCredentials(username, password) {
    const userPass = `${username}:${password}`;
    const row = document.getElementById(`account-${userPass}`);
    if (!row) return;

    var resultDiv = document.getElementById('result-acc');
    resultDiv.innerText = 'Checking account...';

    const jwtToken = localStorage.getItem('jwtToken');
    try {
        const response = await fetch('/run-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
                username: username,
                password: password,
                task: 'saldo',
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            row.cells[1].textContent = data.region;
            row.cells[2].textContent = data.saldo;
            row.cells[3].textContent = data.total_ordered;
            row.cells[4].textContent = data.rp_remaining;
            resultDiv.innerText = 'Account checked';
        } else {
            alert(`Failed to fetch balance: ${data.message}`);
        }
    } catch (error) {
        alert('An error occurred while fetching the balance.');
    }
}







async function cancelAccount(account) {
    if (!confirm("Are you sure you want to cancel this account?")) return;

    const jwtToken = localStorage.getItem('jwtToken');
    try {
        const response = await fetch(`/cancel_account/${account.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            }
        });

        if (response.ok) {
            alert('Account canceled successfully.');
            // Removendo a linha da conta
            //document.querySelector(`[data-user-pass="${userPass}"]`).remove();
            document.querySelector(`[data-account='${JSON.stringify(account)}']`).remove()
        } else {
            const errorData = await response.json();
            //console.error('Error cancelling account:', errorData.message);
            alert(`Failed to cancel account: ${errorData.message}`);
        }
    } catch (error) {
        //console.error('Error:', error);
        alert('An error occurred while cancelling the account.');
    }
}




async function clearAccounts() {
    if (!confirm("Are you sure you want to clear all accounts? This action cannot be undone.")) return;

    const jwtToken = localStorage.getItem('jwtToken');
    try {
        const response = await fetch('/clear_accounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log(data.message);
            alert(`All accounts cleared. Total cleared: ${data.deleted_count}`);
            document.getElementById('accounts-list').innerHTML = ''; // Limpa a lista visual de contas
        } else {
            const errorData = await response.json();
            //console.error('Error clearing accounts:', errorData.message);
            alert(`Error clearing accounts: ${errorData.message}`);
        }
    } catch (error) {
        //console.error('Error:', error);
        alert('An error occurred while clearing accounts.');
    }
}


async function checkAllAccounts() {

    var resultDiv = document.getElementById('result-acc');
    resultDiv.innerText = 'Checking all accounts...';

    const jwtToken = localStorage.getItem('jwtToken');
    const accountsRows = document.querySelectorAll('#accounts-list tr'); // Seleciona todas as linhas da lista de contas

    let promises = [...accountsRows].map(row => { // Converte NodeList para Array usando spread operator
        //const user_pass = row.dataset.userPass; // Assumindo que o user:pass está armazenado como data-attribute na linha
        //const [username, password] = user_pass.split(':');

        const account = JSON.parse(row.getAttribute('data-account')); // Desserializando o objeto account
        const [username, password] = account.user_pass.split(':'); // Ajustando para usar user_pass de account

        return fetch('/run-script', { // Checa o endpoint correto para obter o saldo
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
                username: username,
                password: password,
                task: 'saldo',
                
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Atualiza a célula do saldo diretamente
                row.cells[1].textContent = data.region; // Assumindo que o region está na terceira célula (index 1)
                row.cells[2].textContent = data.saldo; // Assumindo que o saldo está na terceira célula (index 2)
                row.cells[3].textContent = data.total_ordered; // Assumindo que o total_ordered está na terceira célula (index 3)

                console.log('Success:', data);
                var resultDiv = document.getElementById('result-acc');
                resultDiv.innerText = 'Accounts checked';

            } else {
                //console.error('Failed to fetch balance:', data.message);
                return 'Error';
            }
        })
        .catch(error => {
            //console.error('Error fetching balance for:', username, error);
            return 'Error';
        });
    });

    // Aguarda todas as promessas serem resolvidas
    const results = await Promise.all(promises);
    console.log('All balances updated:', results);
}

async function fetchFriends() {
    const jwtToken = localStorage.getItem('jwtToken');

    // Obtém o username e o password do formulário
    const userPassInput = document.getElementById('user-pass-friendlist');

    var credentials = removeSpaces(userPassInput.value).split(':');
    if (credentials.length === 2) {
        var username = credentials[0];
        var password = credentials[1];
    } else {
        alert('Please enter your credentials in the format "username:password".');
        return;  // Sai da função se o formato não estiver correto
    }


    document.getElementById('result-friends').innerText = "Verifying Authentication...";

    userpass = `${username}:${password}`;

/*     try {
        result_captcha = await getAuthCaptcha(userpass)
        captcha_solved = result_captcha.captchaResponse
        session_id = result_captcha.session_id
    } catch (error) {
        //console.error("Erro on geting captcha:", error);
        throw error;
    }
    console.log('Captcha response:', result_captcha.captchaResponse);*/

    document.getElementById('result-friends').innerText = "Loading friendlist...";

    try {
        const response = await fetch('/run-script', {
            method: 'POST',  // Usando POST para enviar dados no corpo da requisição
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
                username: username,
                password: password,
                task: 'friend_list',
            })  // Envia o username e password no corpo da requisição
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status == 'success' || data.friendlist) {
                // Se 'friendlist' é uma string, tenta parseá-la como JSON
                const friendlist = (typeof data.friendlist === 'string' && data.friendlist !== 'None' && data.friendlist !== "null") ? JSON.parse(data.friendlist.replace(/'/g, '"')) : (data.friendlist === 'None' || data.friendlist === 'null' ? null : data.friendlist);
                renderFriends(friendlist);
                document.getElementById('result-friends').innerText = "Friendlist loaded";
            } else {
                //console.error('Error fetching friends:', data.message);
                document.getElementById('result-friends').innerText = 'Error fetching friends - '+ data.message;
            }
        } else {
            const errorData = await response.json();
            //console.error('Error fetching friends:', errorData.message);
            document.getElementById('result-friends').innerText = 'Error fetching friends - ' + errorData.message;
        }
    } catch (error) {
        //console.error('Error:', error);
        document.getElementById('result-friends').innerText = 'Error fetching friends - ' + error;
    }
}





function renderFriends(riots_info) {

    if (!riots_info) {
        console.log("No friends data available to render.");
        return;  // Sai da função se não houver dados válidos
    }

    const friendList = document.getElementById('friend-list');
    friendList.innerHTML = '';  // Limpa a lista existente

    const statusOrder = ['Friend', 'Friend request', 'Pending', 'Unknown'];
    const sortedFriends = Object.entries(riots_info).sort((a, b) => {
        const indexA = statusOrder.indexOf(a[1].status);
        const indexB = statusOrder.indexOf(b[1].status);

        if (indexA !== indexB) {
            return indexA - indexB; // Ordena primeiro pelo status conforme definido em statusOrder
        }

        if (a[1].status === 'Friend') {
            const timeA = a[1].friendship_time ? parseInt(a[1].friendship_time.split(' ')[0]) : Infinity;
            const timeB = b[1].friendship_time ? parseInt(b[1].friendship_time.split(' ')[0]) : Infinity;
            return timeA - timeB;
        }

        return 0; // Mantém a ordem atual para outros status se os índices forem iguais
    });

    // Update stats counters
    let friendCount = 0;
    let requestCount = 0;
    Object.values(riots_info).forEach(f => {
        if (f.status === 'Friend') friendCount++;
        if (f.status === 'Friend request' || f.status === 'Pending') requestCount++;
    });

    const statFriendEl = document.getElementById('stat-friend-count');
    const statReqEl = document.getElementById('stat-request-count');
    if (statFriendEl) statFriendEl.textContent = friendCount;
    if (statReqEl) statReqEl.textContent = requestCount;

    sortedFriends.forEach(([key, friend]) => {
        const row = document.createElement('tr');
        row.setAttribute('friend-key', key);
        row.setAttribute('data-friend', JSON.stringify(friend));
        
        // Riot ID Cell
        const riotIdTd = document.createElement('td');
        riotIdTd.innerHTML = `<span class="fw-bold text-primary"><i class="fa-solid fa-gamepad me-2 text-pink"></i>${key}</span>`;
        row.appendChild(riotIdTd);

        // Status Badge Cell
        const statusTd = document.createElement('td');
        let badgeClass = 'badge-status friend';
        if (friend.status === 'Friend request') badgeClass = 'badge-status request';
        if (friend.status === 'Pending') badgeClass = 'badge-status pending';
        statusTd.innerHTML = `<span class="${badgeClass}"><i class="fa-solid fa-circle text-xs"></i> ${friend.status}</span>`;
        row.appendChild(statusTd);

        // Friendship Time Cell
        const timeTd = document.createElement('td');
        timeTd.innerHTML = `<span class="text-secondary small"><i class="fa-regular fa-clock me-1"></i>${friend.friendship_time || 'N/A'}</span>`;
        row.appendChild(timeTd);

        // Actions Cell
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell text-end';

        if (friend.status === 'Friend request') {
            const checkButton = document.createElement('button');
            checkButton.className = 'action-button accept-btn me-2';
            checkButton.innerHTML = '<i class="fa-solid fa-check"></i> Accept';
            checkButton.addEventListener('click', () => acceptFriendRequest(key, friend));
            actionsCell.appendChild(checkButton);
        }

        if (friend.status === 'Friend') {
            const buyButton = document.createElement('button');
            buyButton.className = 'action-button buy-btn me-2';
            buyButton.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Buy RP';
            buyButton.addEventListener('click', () => sendRPGift(friend.puuid));
            actionsCell.appendChild(buyButton);
        }

        const cancelButton = document.createElement('button');
        cancelButton.className = 'action-button cancel-btn';
        cancelButton.innerHTML = '<i class="fa-solid fa-user-minus"></i> Remove';
        cancelButton.addEventListener('click', () => cancelFriend(key, friend));
        actionsCell.appendChild(cancelButton);

        row.appendChild(actionsCell);
        friendList.appendChild(row);
    });
}


async function cancelFriend(key, friend) {
    
    
    const jwtToken = localStorage.getItem('jwtToken');

    // Obtém o username e o password do formulário
    const userPassInput = document.getElementById('user-pass-friendlist');

    var credentials = removeSpaces(userPassInput.value).split(':');
    if (credentials.length === 2) {
        var username = credentials[0];
        var password = credentials[1];
    } else {
        alert('Please enter your credentials in the format "username:password".');
        return;  // Sai da função se o formato não estiver correto
    }

    row = document.querySelector(`[friend-key="${key}"]`);

    if (!row) {
        //console.error('Friend row not found for key:', key);
        return;
    }

    if (friend.status == 'Friend request' || friend.status == 'Unknown') { 
        id = friend.jid
    }
    else {
        id = friend.puuid
    }   

    id = friend.puuid

    document.getElementById('result-friends').innerText = "Verifying Authentication...";

    userpass = `${username}:${password}`;

/*     try {
        result_captcha = await getAuthCaptcha(userpass)
        captcha_solved = result_captcha.captchaResponse
        session_id = result_captcha.session_id
    } catch (error) {
        //console.error("Erro on geting captcha:", error);
        throw error;
    }
    console.log('Captcha response:', result_captcha.captchaResponse);*/

    document.getElementById('result-friends').innerText = "Removing friend...";

    try {
        const response = await fetch('/run-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
                username: username,
                password: password,
                task: 'remove_one',
                friend_id: id,
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success') {
                alert('Friend removed successfully.');
                // Removendo a linha do amigo
                row.remove();
                document.getElementById('result-friends').innerText = "Friend removed";
            } else {
                //console.error('Error on friend removal:', data.message);
                document.getElementById('result-friends').innerText = 'Error on friend removal';
            }
        } else {
            const errorData = await response.json();
            //console.error('Error on friend removal:', errorData.message);
            document.getElementById('result-friends').innerText = 'Error on friend removal - '+errorData.message;
        }
    } catch (error) {
        //console.error('Error:', error);
        document.getElementById('result-friends').innerText = 'Error on friend removal - '+ error;

    }
}

async function removeAllFriends() {

    if (!confirm("Are you sure you want to clear all friends and friend requests? This action cannot be undone.")) return;

    const jwtToken = localStorage.getItem('jwtToken');

    // Obtém o username e o password do formulário
    const userPassInput = document.getElementById('user-pass-friendlist');
    var credentials = removeSpaces(userPassInput.value).split(':');
    if (credentials.length !== 2) {
        alert('Please enter your credentials in the format "username:password".');
        return;  // Sai da função se o formato não estiver correto
    }
    const [username, password] = credentials;

    // Seleciona todas as linhas na tabela
    const rows = document.querySelectorAll('[friend-key]');

    document.getElementById('result-friends').innerText = "Verifying Authentication...";

    userpass = `${username}:${password}`;

/*     try {
        result_captcha = await getAuthCaptcha(userpass)
        captcha_solved = result_captcha.captchaResponse
        session_id = result_captcha.session_id
    } catch (error) {
        //console.error("Erro on geting captcha:", error);
        throw error;
    }
    console.log('Captcha response:', result_captcha.captchaResponse);*/


    document.getElementById('result-friends').innerText = "Removing all friends...";

    // Construir a requisição
    try {
        const response = await fetch('/run-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
                username: username,
                password: password,
                task: 'remove_all',

            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success') {
                alert('Multiple friends removed successfully.');
                rows.forEach(row => row.remove()); // Remove todas as linhas da tabela
                document.getElementById('result-friends').innerText = "All friends removed";
            } else {
                //console.error('Error removing multiple friends:', data.message);
                document.getElementById('result-friends').innerText = "Error removing multiple friends - "+data.message;

            }
        } else {
            const errorData = await response.json();
            //console.error('Error removing multiple friends:', errorData.message);
            document.getElementById('result-friends').innerText = "Error removing multiple friends - "+errorData.message;

        }
    } catch (error) {
        //console.error('Network error:', error);
        document.getElementById('result-friends').innerText = "Error removing multiple friends - "+error;

    }
}

async function acceptFriendRequest(key, friend) {
    console.log('Check friend request for:', friend);
    // Implementar a lógica de verificação de pedido de amizade
    
    
    const jwtToken = localStorage.getItem('jwtToken');

    // Obtém o username e o password do formulário
    const userPassInput = document.getElementById('user-pass-friendlist');

    var credentials = removeSpaces(userPassInput.value).split(':');
    if (credentials.length === 2) {
        var username = credentials[0];
        var password = credentials[1];
    } else {
        alert('Please enter your credentials in the format "username:password".');
        return;  // Sai da função se o formato não estiver correto
    }

    row = document.querySelector(`[friend-key="${key}"]`);

    if (!row) {
        //console.error('Friend row not found for key:', key);
        return;
    }

    if (friend.status == 'Friend request' || friend.status == 'Unknown') { 
        id = friend.jid
    }
    else {
        id = friend.puuid
    }   

    id = friend.puuid

    document.getElementById('result-friends').innerText = "Verifying Authentication...";

    userpass = `${username}:${password}`;

    /*try {
        result_captcha = await getAuthCaptcha(userpass)
    } catch (error) {
        //console.error("Erro on geting captcha:", error);
        throw error;
    }
    
    captcha_solved = result_captcha.captchaResponse
    session_id = result_captcha.session_id
    console.log('Captcha response:', result_captcha.captchaResponse);*/

    document.getElementById('result-friends').innerText = "Accepting friend request...";

    try {
        const response = await fetch('/run-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
                username: username,
                password: password,
                task: 'accept_friend',
                friend_id: id,
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success') {
                alert('Friend added successfully.');
                // Removendo a linha do amigo
                row.remove();
                document.getElementById('result-friends').innerText = "Friend request accepted";
            } else {
                //console.error('Error on friend removal:', data.message);
                document.getElementById('result-friends').innerText = 'Error on accept friend request - '+data.message;
            }
        } else {
            const errorData = await response.json();
            //console.error('Error on accept friend request:', errorData.message);
            document.getElementById('result-friends').innerText = 'Error on accept friend request - '+errorData.message;
        }
    } catch (error) {
        //console.error('Error:', error);
        document.getElementById('result-friends').innerText = 'Error on accept friend request - '+error;

    }
}






async function uploadRiotIdList(friendIdsfileContent) {

        const jwtToken = localStorage.getItem('jwtToken');

        // Obtém o username e o password do formulário
        const userPassInput = document.getElementById('user-pass-friendlist');
        var credentials = removeSpaces(userPassInput.value).split(':');
        if (credentials.length !== 2) {
            alert('Please enter your credentials in the format "username:password".');
            return;  // Sai da função se o formato não estiver correto
        }

        const [username, password] = credentials;

        document.getElementById('result-friends').innerText = "Verifying Authentication...";

        userpass = `${username}:${password}`;

        /*try {
            result_captcha = await getAuthCaptcha(userpass)
        } catch (error) {
            //console.error("Erro on geting captcha:", error);
            throw error;
        }
        captcha_solved = result_captcha.captchaResponse
        session_id = result_captcha.session_id
        console.log('Captcha response:', result_captcha.captchaResponse);*/

        
        document.getElementById('result-friends').innerText = "Sending mass friend requests...";

        try {

            const response = await fetch('/run-script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}`
                },
                body: JSON.stringify({ 
                    username: username,
                    password: password,
                    task: 'send_all',
                    friend_ids: friendIdsfileContent })
            });

            if (response.ok) {
                const responseData = await response.json();
                if (responseData.status === 'success') {
                    document.getElementById('result-friends').innerText = "Friend requests sended";
                } else {
                    //console.error('Error on file upload:', responseData.message);
                    document.getElementById('result-friends').innerText = 'Error on send mass requests';
                }
            } else {
                const errorData = await response.json();
                //console.error('Error on file upload:', errorData.message);
                document.getElementById('result-friends').innerText = 'Error on send mass requests';
            }
        } catch (error) {
            //console.error('Network or other error:', error);
            document.getElementById('result-friends').innerText = 'Network or other error during file upload';
        }


}






function validateRiotIdList(line) {
    const parts = line.split('#');
    // Verifica se existem exatamente duas partes após o split.
    return parts.length === 2 && parts[0].trim() !== "" && parts[1].trim() !== "";
}


document.getElementById('upload-riot-id-list').addEventListener('click', function() {
    document.getElementById('fileInput').click();
});


document.getElementById('fileInput').addEventListener('change', function() {
    if (this.files.length > 0) {
        const file = this.files[0];
        const reader = new FileReader();

        reader.onload = function() {
            // Supondo que você queira ver o conteúdo no navegador
            console.log(reader.result);

            const lines = reader.result.split('\n');
            const validData = [];

            // Validar cada linha usando a função validateRiotIdList
            for (const line of lines) {
                if (validateRiotIdList(line.trim())) {
                    validData.push(line.trim());
                } else {
                    document.getElementById('result-friends').innerText = "Invalid file format in one or more lines.";
                    return; // Interrompe a leitura se encontrar uma linha inválida
                }
            }

            // Se todas as linhas forem válidas, procede com a requisição HTTP
            if (validData.length > 0) {
                uploadRiotIdList(validData);
            } else {
                document.getElementById('result-friends').innerText = "Incorrect format.";
            }

        };

        reader.onerror = function() {
            document.getElementById('result').innerText = 'Error reading file: ' + reader.error;
        };

        reader.readAsText(file);
    }
});



async function acceptAllRequests() {

    const jwtToken = localStorage.getItem('jwtToken');

    // Obtém o username e o password do formulário
    const userPassInput = document.getElementById('user-pass-friendlist');
    var credentials = removeSpaces(userPassInput.value).split(':');
    if (credentials.length !== 2) {
        alert('Please enter your credentials in the format "username:password".');
        return;  // Sai da função se o formato não estiver correto
    }

    const [username, password] = credentials;

    document.getElementById('result-friends').innerText = "Verifying Authentication...";



    userpass = `${username}:${password}`;

/*     try {
        result_captcha = await getAuthCaptcha(userpass)
        captcha_solved = result_captcha.captchaResponse
        session_id = result_captcha.session_id
    } catch (error) {
        //console.error("Erro on geting captcha:", error);
        throw error;
    }

    console.log('Captcha response:', result_captcha.captchaResponse);*/

    document.getElementById('result-friends').innerText = "Accepting all friend requests...";

    try {

        const response = await fetch('/run-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({ 
                username: username,
                password: password,
                task: 'accept_all',
            })
        });

        if (response.ok) {
            const responseData = await response.json();
            if (responseData.status === 'success') {
                document.getElementById('result-friends').innerText = "Friend requests accepted";
            } else {
                //console.error('Error on chat connection:', responseData.message);
                document.getElementById('result-friends').innerText = 'Error on accept requests - '+ responseData.message;
            }
        } else {
            const errorData = await response.json();
            //console.error('Error on chat connection:', errorData.message);
            document.getElementById('result-friends').innerText = 'Error on accept requests - '+errorData.message;
        }
    } catch (error) {
        //console.error('Error on chat connection:', error);
        document.getElementById('result-friends').innerText = 'Error on accept requests - '+error;
    }


}


async function massMessage() {

    const jwtToken = localStorage.getItem('jwtToken');

    // Obtém o username e o password do formulário
    const userPassInput = document.getElementById('user-pass-friendlist');
    var credentials = removeSpaces(userPassInput.value).split(':');
    if (credentials.length !== 2) {
        alert('Please enter your credentials in the format "username:password".');
        return;  // Sai da função se o formato não estiver correto
    }

    const [username, password] = credentials;

    document.getElementById('result-friends').innerText = "Verifying Authentication...";



    userpass = `${username}:${password}`;

/*     try {
        result_captcha = await getAuthCaptcha(userpass)
        captcha_solved = result_captcha.captchaResponse
        session_id = result_captcha.session_id
    } catch (error) {
        //console.error("Erro on geting captcha:", error);
        throw error;
    }

    console.log('Captcha response:', result_captcha.captchaResponse);*/

    document.getElementById('result-friends').innerText = "Sending mass messages...";

    message_input = document.getElementById('mass_message').value;

    try {

        const response = await fetch('/run-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({ 
                username: username,
                password: password,
                task: 'mass_message',
                friend_message: message_input
            })
        });

        if (response.ok) {
            const responseData = await response.json();
            if (responseData.status === 'success') {
                document.getElementById('result-friends').innerText = "Mass messages success";
            } else {
                //console.error('Error on chat connection:', responseData.message);
                document.getElementById('result-friends').innerText = 'Error on mass messages - '+ responseData.message;
            }
        } else {
            const errorData = await response.json();
            //console.error('Error on chat connection:', errorData.message);
            document.getElementById('result-friends').innerText = 'Error on mass messages - '+errorData.message;
        }
    } catch (error) {
        //console.error('Error on chat connection:', error);
        document.getElementById('result-friends').innerText = 'Error on mass messages - '+error;
    }


}


function logout() {
    fetch('/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .finally(() => {
        try {
            localStorage.clear();
            sessionStorage.clear();
            document.cookie = "access_token_cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        } catch(e) {}
        window.location.href = '/';
    });
}


async function getAuthCaptcha(userpass) {

    const jwtToken = localStorage.getItem('jwtToken');

    if (captchaWidgetId != null) {
        console.log("captchadiget is not undefined, reset...");
        hcaptcha.reset(captchaWidgetId);
        hcaptcha.remove(captchaWidgetId);
        //hcaptcha.close(captchaWidgetId);
        captchaWidgetId = null;
    }

    try {

        const response = await fetch(`/get-auth-captcha`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                userpass: userpass,
            })
        });

        if (response.ok) {
            const responseData = await response.json();
            if (responseData.auth){
                return {
                    captchaResponse: null,
                    session_id: responseData.session_id
                };
            }

            else {

                console.log('Message:', responseData.message);
                console.log('Token:', responseData.token);
                console.log('Key:', responseData.key);
                console.log('Session ID:', responseData.session_id);

                // Modificar o key e token captcha salvos no DOM
                document.getElementById('hiddenKey').textContent = responseData.key;
                document.getElementById('hiddenToken').textContent = responseData.token;



                
                const captchaResponseLocalHost = await waitForCaptchaResponse();
                //console.log(" capcha solved: ", captchaResponseLocalHost.response)

                //const captchaResponse = await showPopup(responseData.key, responseData.token);
                captchaResponse = captchaResponseLocalHost.response
                return {
                    captchaResponse: captchaResponse,
                    session_id: responseData.session_id
                };

            }
        } else {
            const errorData = await response.json();
            //console.error('Error on auth captcha request:', errorData.message);
            document.getElementById('result-friends').innerText = 'Error on auth captcha request - ' + errorData.message;
            document.getElementById('result').innerText = 'Error on auth captcha request - ' + errorData.message;

            throw new Error('Failed to load captcha');
        }
    } catch (error) {
        //console.error('Error on auth captcha request:', error);
        document.getElementById('result-friends').innerText = 'Error on auth captcha request - ' + error;
        document.getElementById('result').innerText = 'Error on auth captcha request - ' + errorData.message;

        throw error; // Ensure the error is propagated up
    }
}



function waitForCaptchaResponse() {
    return new Promise((resolve, reject) => {
        window.addEventListener('CaptchaResponseReceived', function handler(event) {
            window.removeEventListener('CaptchaResponseReceived', handler);
            resolve(event.detail); // resolve the promise with the data from the event
        });
    });
}




async function waitForRiotCookie() {
    return new Promise((resolve, reject) => {
        window.addEventListener('CredentialsCaptured', function handler(event) {
            window.removeEventListener('CredentialsCaptured', handler);
            resolve(event.detail); // resolve the promise with the data from the event
        });
    });
}


async function saveUserCaptcha() {
    // Obtém o valor do campo de texto de entrada
    const captchaKey = document.getElementById('captcha-key').value;
    var savecaptchaDiv = document.getElementById('result-savecaptcha');
  
    try {
      // Faz uma requisição POST para o endpoint com o texto do captcha
      const response = await fetch('/save-user-captcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`  // Assume que o token JWT está armazenado no localStorage
        },
        body: JSON.stringify({ captchaKey: captchaKey })
      });
  
      if (response.ok) {
        const result = await response.json();
        console.log(result.message);
        savecaptchaDiv.innerText = result.message;

      } else {
        //console.error('Failed to save captcha:', response.message);
        savecaptchaDiv.innerText = 'Failed to save captcha';
      }
    } catch (error) {
      //console.error('Error:', error);
      savecaptchaDiv.innerText = 'Failed to save captcha';

    }
  }
  







function showPopup(key, token) {
    console.log("Showing popup...");
    document.getElementById('overlay').style.display = 'flex';
    document.getElementById('captchaContainer').style.display = 'block';

    return new Promise((resolve, reject) => {
            console.log("null captcha widget id");
            captchaWidgetId = hcaptcha.render('captchaContainer', {
                "sitekey": key,
                "callback": (response) => {
                    console.log("Captcha resolved:", response);
                    resolve(response);
                    closePopup();
                },
                "theme": "dark",
                "size": "compact"
            });
            hcaptcha.setData(captchaWidgetId, { rqdata: token });
    });
}

/* Backup funcional
function showPopup(key, token) {
    console.log("Showing popup...");
    document.getElementById('overlay').style.display = 'flex';
    document.getElementById('captchaContainer').style.display = 'block';

    return new Promise((resolve, reject) => {
        if (captchaWidgetId == null) {
            console.log("null captcha widget id");
            captchaWidgetId = hcaptcha.render('captchaContainer', {
                "sitekey": key,
                "callback": (response) => {
                    console.log("Captcha resolved:", response);
                    resolve(response);
                    closePopup();
                },
                "theme": "dark",
                "size": "compact"
            });
            hcaptcha.setData("", { rqdata: token });
        } else {
            hcaptcha.reset(captchaWidgetId);
            hcaptcha.setData("", { rqdata: token });
        }
    });
}*/



async function capsolver_auth(){
        // Pega o estado do checkbox
        var isSimpleLogin = document.getElementById('simple-login').checked;
        var usernameInput = document.getElementById('username-password');
        var passwordInput = document.getElementById('password');
    
        
        // Variáveis para armazenar username e password
        var username, password;
    
        if (isSimpleLogin) {
            // Modo Simples de Login - username e password no mesmo campo
            var credentials = usernameInput.value.split(':');
            if (credentials.length === 2) {
                username = credentials[0];
                password = credentials[1];
            } else {
                alert('Please enter your credentials in the format "username:password".');
                return;  // Sai da função se o formato não estiver correto
            }
        } else {
            // Modo Normal - username e password em campos separados
            username = removeSpaces(usernameInput.value);
            password = removeSpaces(passwordInput.value);
            if (!username || !password) {
                alert('Please make sure both username and password are entered.');
                return;  // Sai da função se algum campo estiver vazio
            }
        }

        var resultDiv = document.getElementById('result');

        resultDiv.innerText = "Authenticating with 2captcha...";

        fetch('/auth_2captcha', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('jwtToken') // Adiciona o token JWT do armazenamento local
            },
            body: JSON.stringify({
                username: username,
                password: password,
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success'){
                console.log('Success:', data);
                resultDiv.innerText = data.message;

            }
            else if (data.message == 'Wrong credentials: Invalid username or password') {
                console.log('Wrong credentials:', data);
                resultDiv.innerText = data.message;
            }
    
            else {
                console.log('Failed:', data);
                resultDiv.innerText = data.message;
            }
    
        })
        .catch((error) => {
            //console.error('Error:', error);
            var resultDiv = document.getElementById('result');
            resultDiv.innerText = 'Authentication failed for ' + username;
        });

}


function closePopup() {
    console.log("Closing popup..."); // Verifies function call
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('captchaContainer').style.display = 'none';

}

function onSuccessCaptcha(token) {
    console.log("Callback start..."); // Check function call
    console.log("h-captcha-response:", token); // Should display the captcha response
    closePopup();
}

function extractTokens(url) {
    if (!url) return { access_token: null, id_token: null };
    let cleanUrl = url.trim();
    let fragment = '';
    if (cleanUrl.includes('#')) {
        fragment = cleanUrl.substring(cleanUrl.indexOf('#') + 1);
    } else if (cleanUrl.includes('?')) {
        fragment = cleanUrl.substring(cleanUrl.indexOf('?') + 1);
    } else {
        fragment = cleanUrl;
    }
    let params = new URLSearchParams(fragment);
    let accessToken = params.get('access_token') || params.get('accessToken');
    let idToken = params.get('id_token') || params.get('idToken');

    // Se o usuário colou diretamente o token JWT puro
    if (!accessToken && cleanUrl.startsWith('eyJ')) {
        accessToken = cleanUrl;
    }

    return {
      access_token: accessToken,
      id_token: idToken,
    };
}



async function sendRPGift(receiver_puuid) {
    const jwtToken = localStorage.getItem('jwtToken');

    // Obtém o username e o password do formulário
    const userPassInput = document.getElementById('user-pass-friendlist');


    // Verifica se as credenciais e o receiver_id foram informados
    const credentials = removeSpaces(userPassInput.value).split(':');
    if (receiver_puuid) {
        receiverId = receiver_puuid
    }
    else {
        receiverId = null
    }


    if (credentials.length === 2) {
        var username = credentials[0];
        var password = credentials[1];
    } else {
        alert('Please enter your credentials in the format "username:password".');
        return;  // Sai da função se o formato não estiver correto
    }

    document.getElementById('result-friends').innerText = `Generating URL...`;


    try {
        const response = await fetch('/send-rp-gift', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
                username: username,
                password: password,
                receiver_id: receiverId,
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success') {
                // Analisa o campo message como JSON para acessar pmcStartUrl
                const messageData = JSON.parse(data.message.replace(/'/g, '"'));
                document.getElementById('result-friends').innerText = `RP URL generated successfully\nUser: ${username}\nToken: ${messageData.token}\nExpire: ${messageData.expiresAt} `;
                if (messageData.pmcStartUrl) {
                    // Exibe o link clicável na página
                    const linkContainer = document.getElementById('rp-link');
                    linkContainer.innerHTML = `<a href="${messageData.pmcStartUrl}" target="_blank">RP Purchase URL</a>`;
                }
            } else {
                //console.error('Error sending RP gift:', data.message);
                document.getElementById('result-friends').innerText = 'Error on generate RP url - ' + data.message;
            }
        } else {
            const errorData = await response.json();
            //console.error('Error sending RP gift:', errorData.message);
            document.getElementById('result-friends').innerText = 'Error on generate RP url - ' + errorData.message;
        }
    } catch (error) {
        //console.error('Error:', error);
        document.getElementById('result-friends').innerText = 'Error on generate RP url - ' + error;
    }
}

// Custom Profile Avatar Change
document.addEventListener('DOMContentLoaded', () => {
    const profileIcon = document.getElementById('profile-user-icon');
    const avatarInput = document.getElementById('avatar-file-input');
    
    if (avatarInput && profileIcon) {
        avatarInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Url = e.target.result;
                
                // Instantly show the new icon
                profileIcon.src = base64Url;
                
                // Call API to save to DB
                try {
                    const localJwtToken = localStorage.getItem('jwtToken');
                    const response = await fetch('/run-script', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localJwtToken}`
                        },
                        body: JSON.stringify({
                            task: 'save_avatar',
                            avatar_url: base64Url
                        })
                    });
                    const data = await response.json();
                    console.log('Avatar save status:', data);
                } catch(err) {
                    console.error('Failed to save avatar:', err);
                }
            };
            reader.readAsDataURL(file);
        });
    }
});