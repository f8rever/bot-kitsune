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

    if (isSimpleLogin) {
        // Modo Simples de Login - username e password no mesmo campo
        var credentials = removeSpaces(usernameInput.value).split(':');
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


    // Se username e password estiverem corretos, faz uma requisição AJAX ao servidor
    fetch('/run-script', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('jwtToken') // Adiciona o token JWT do armazenamento local
        },
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
                
                // Initialize Daily Gifts to 0 / 10 if fetching balance
                const sentCardNum = document.getElementById('daily-gifts-counter');
                if (sentCardNum) {
                    sentCardNum.innerText = `0 / 10`;
                    sentCardNum.dataset.current = 0;
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
            //console.error('Failed:', data);
            resultDiv.innerText = 'Gift failed for ' + username;
        }

    })
    .catch((error) => {
        //console.error('Error:', error);
        var resultDiv = document.getElementById('result');
        resultDiv.innerText = 'Unknown error for ' + username;
    });

    }


setInterval(function() {
    window.location.reload();
}, 21600*1000);  // Recarrega a página a cada 10000 milissegundos (ou seja, a cada 10 segundos)







document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-item');
    const categoryRadios = document.querySelectorAll('input[name="category"]');
    const languageSelect = document.getElementById('catalog-language');
    let catalog = {};
    let selectedLanguage = 'pt';
    let catalogIndexedItems = [];

    // Category pill visual toggle listener
    categoryRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            document.querySelectorAll('.category-pill').forEach(pill => pill.classList.remove('active'));
            if (this.parentElement) this.parentElement.classList.add('active');
            filterItems();
        });
    });

    async function fetchCatalog() {
        try {
            const response = await fetch(`/get-catalog?lang=${selectedLanguage}`);
            if (!response.ok) {
                throw new Error('Failed to fetch catalog');
            }
            catalog = await response.json();
            
            catalogIndexedItems = [];
            for (const category in catalog) {
                if (typeof catalog[category] === 'object' && catalog[category] !== null) {
                    Object.entries(catalog[category]).forEach(([name, details]) => {
                        let effectiveCategory = category;

                        catalogIndexedItems.push({
                            name,
                            searchName: normalizeText(name),
                            price_rp: details.price_rp,
                            price_ip: details.price_ip,
                            offer_id: details.offer_id,
                            item_id: details.item_id,
                            inventory_type: details.inventory_type || effectiveCategory.toUpperCase(),
                            category: effectiveCategory
                        });
                    });
                }
            }

            filterItems();
        } catch (error) {
            console.error('Catalog fetch error:', error);
        }
    }

    function normalizeText(text) {
        return (text || '')
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    function filterItems() {
        const rawSearch = searchInput ? searchInput.value : '';
        const searchNormalized = normalizeText(rawSearch).trim();
        const searchTokens = searchNormalized ? searchNormalized.split(/\s+/).filter(Boolean) : [];
        
        const selectedRadio = document.querySelector('input[name="category"]:checked');
        const selectedCategory = selectedRadio ? selectedRadio.value : 'all';
        let items = catalogIndexedItems;

        if (selectedCategory !== 'all') {
            items = items.filter(item => item.category === selectedCategory);
        }

        if (searchTokens.length > 0) {
            items = items.filter(item => {
                const itemNorm = item.searchName;
                // Every search token must match somewhere in the item's normalized name
                return searchTokens.every(token => itemNorm.includes(token));
            });
        }

        updateItemList(items);
    }

    let currentFilteredItems = [];
    let currentRenderIndex = 0;
    const CHUNK_SIZE = 60;

    function updateItemList(items) {
        const list = document.getElementById('item-list');
        list.innerHTML = '';
        currentFilteredItems = items;
        currentRenderIndex = 0;
        renderMoreItems();
    }

    function getItemRarityInfo(name, priceRp, category) {
        const nameLower = (name || '').toLowerCase();
        const rp = Number(priceRp) || 0;

        if (nameLower.includes('croma') || nameLower.includes('chroma') || rp === 290) {
            return { label: 'CHROMA', class: 'rarity-chroma', icon: 'fa-palette' };
        }
        if (nameLower.includes('baú') || nameLower.includes('hextech') || nameLower.includes('chave') || nameLower.includes('orbe')) {
            return { label: 'HEXTECH', class: 'rarity-hextech', icon: 'fa-box-open' };
        }
        if (rp >= 3200 || nameLower.includes('ultimato') || nameLower.includes('ultimate')) {
            return { label: 'ULTIMATE', class: 'rarity-ultimate', icon: 'fa-crown' };
        }
        if (rp >= 2400 || nameLower.includes('mítica') || nameLower.includes('mythic') || nameLower.includes('exalted') || nameLower.includes('ascendida')) {
            return { label: 'MYTHIC', class: 'rarity-mythic', icon: 'fa-gem' };
        }
        if (rp === 1820 || nameLower.includes('lendária') || nameLower.includes('legendary')) {
            return { label: 'LEGENDARY', class: 'rarity-legendary', icon: 'fa-dragon' };
        }
        if (rp === 1350 || nameLower.includes('épica') || nameLower.includes('epic')) {
            return { label: 'EPIC', class: 'rarity-epic', icon: 'fa-bolt' };
        }
        if (nameLower.includes('passe') || nameLower.includes('pacote') || nameLower.includes('conjunto') || nameLower.includes('coleção')) {
            return { label: 'BUNDLE', class: 'rarity-bundle', icon: 'fa-ticket' };
        }
        return { label: 'DELUXE', class: 'rarity-standard', icon: 'fa-shield-halved' };
    }

    function renderMoreItems() {
        const list = document.getElementById('item-list');
        if (!currentFilteredItems || currentRenderIndex >= currentFilteredItems.length) return;

        const fragment = document.createDocumentFragment();
        const nextChunk = currentFilteredItems.slice(currentRenderIndex, currentRenderIndex + CHUNK_SIZE);
        
        nextChunk.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = 'catalog-card-node';

            const rarity = getItemRarityInfo(item.name, item.price_rp, item.category);

            const isInvalidPrice = price => 
                price === null || 
                price === undefined || 
                price === "Null" || 
                price === 0 || 
                price === "0";

            let rpDisplay = isInvalidPrice(item.price_rp) ? '0' : item.price_rp;
            let priceText = `(${rpDisplay} RP)`;

            listItem.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <i class="fa-solid fa-gift text-emerald"></i>
                    <span>${item.name}</span>
                </div>
                <span class="badge bg-light text-success border">${rpDisplay} RP</span>
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

    // Scroll listener for lazy loading remaining catalog items smoothly
    const scrollBox = document.querySelector('.scrollable-box');
    if (scrollBox) {
        scrollBox.addEventListener('scroll', () => {
            if (scrollBox.scrollTop + scrollBox.clientHeight >= scrollBox.scrollHeight - 50) {
                renderMoreItems();
            }
        });
    }

    function selectItem(item, priceText) {
        document.getElementById('selected-item-details').innerHTML = `<i class="fa-solid fa-check-circle text-cyan me-2"></i>Selected Item: <strong>${item.name}</strong> <span class="text-cyan">${priceText}</span>`;
        selectedOfferId = item.offer_id;
        selectedItemId = item.item_id;
        selectedPrice = item.price_rp;
        selectedPriceIp = item.price_ip;
        selectedItemName = item.name;
        selectedInventoryType = item.inventory_type;
    }

    // Instant search input response
    let searchDebounceTimer = null;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(filterItems, 30);
        });
    }

    const uiTranslations = {
        pt: {
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
            th_friendship_time: "Tempo de Amizade"
        },
        en: {
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
            th_friendship_time: "Friendship Time"
        }
    };

    function applyUiTranslations(lang) {
        const dict = uiTranslations[lang] || uiTranslations.pt;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) el.textContent = dict[key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[key]) el.setAttribute('placeholder', dict[key]);
        });
    }

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

    applyUiTranslations(selectedLanguage);
    fetchCatalog();
});


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
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        // Aqui você pode adicionar código para redirecionar o usuário ou atualizar a interface
        alert(data.message);
        window.location.reload();
    })
    .catch(error => {
        //console.error('Erro ao fazer logout:', error);
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
    // Criar um objeto URL para analisar a URL fornecida
    let parser = document.createElement('a');
    parser.href = url;
  
    // Obter a parte do fragmento após o '#' (hash)
    let fragment = parser.hash.substring(1); // Remove o '#' inicial
  
    // Converter o fragmento em um objeto de parâmetros
    let params = new URLSearchParams(fragment);
  
    // Extrair os tokens desejados
    let accessToken = params.get('access_token');
    let idToken = params.get('id_token');
  
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