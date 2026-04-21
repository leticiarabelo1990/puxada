// Configuração das APIs disponíveis
// Configuração das APIs disponíveis (agora usando proxy via Vercel)
const API_ENDPOINTS = {
    cpf: {
        name: 'CPF',
        icon: 'fa-id-card',
        endpoint: '/api/busca_cpf.php',        // ← Caminho relativo
        paramName: 'cpf',
        placeholder: 'Ex: 12345678901',
        hint: 'Digite o CPF (somente números)'
    },
    mae: {
        name: 'Mãe',
        icon: 'fa-female',
        endpoint: '/api/busca_mae.php',
        paramName: 'mae',
        placeholder: 'Ex: MARIA',
        hint: 'Digite o nome exato da mãe'
    },
    nome: {
        name: 'Nome',
        icon: 'fa-user',
        endpoint: '/api/busca_nome.php',
        paramName: 'nome',
        placeholder: 'Ex: JOAO',
        hint: 'Digite o nome exato'
    },
    pai: {
        name: 'Pai',
        icon: 'fa-male',
        endpoint: '/api/busca_pai.php',
        paramName: 'pai',
        placeholder: 'Ex: JOSE',
        hint: 'Digite o nome do pai (mínimo 3 letras)'
    },
    rg: {
        name: 'RG',
        icon: 'fa-address-card',
        endpoint: '/api/busca_rg.php',
        paramName: 'rg',
        placeholder: 'Ex: 1234567',
        hint: 'Digite o número do RG'
    },
    tel: {
        name: 'Telefone',
        icon: 'fa-phone',
        endpoint: '/api/busca_tel.php',
        paramName: 'tel',
        placeholder: 'Ex: 11987654321',
        hint: 'Digite DDD + número'
    },
    titulo: {
        name: 'Título',
        icon: 'fa-vote-yea',
        endpoint: '/api/busca_titulo.php',
        paramName: 'titulo',
        placeholder: 'Ex: 123456789012',
        hint: 'Digite o número do título de eleitor'
    }
};

// Estado da aplicação
let currentApi = 'cpf'; // API selecionada
let isLoading = false;
let lastResult = null;

// Elementos do DOM
const apiSelector = document.getElementById('apiSelector');
const queryInput = document.getElementById('queryInput');
const searchBtn = document.getElementById('searchBtn');
const clearInputBtn = document.getElementById('clearInputBtn');
const inputLabel = document.getElementById('inputLabel');
const apiHint = document.getElementById('apiHint');
const resultContainer = document.getElementById('resultContainer');
const resultCount = document.getElementById('resultCount');

// Toast
let toastTimeout;
const toastEl = document.getElementById('toast');
const toastIcon = document.getElementById('toastIcon');
const toastMessage = document.getElementById('toastMessage');

// Inicialização
function init() {
    renderApiCards();
    setupEventListeners();
    updateUIForApi(currentApi);
}

// Renderiza os cards de seleção de API
function renderApiCards() {
    let html = '';
    for (const [key, api] of Object.entries(API_ENDPOINTS)) {
        html += `
            <div class="api-card bg-white border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${key === currentApi ? 'active' : ''}" data-api="${key}">
                <div class="flex flex-col items-center text-center">
                    <i class="fas ${api.icon} text-2xl mb-2 ${key === currentApi ? 'text-blue-600' : 'text-gray-600'}"></i>
                    <span class="text-sm font-medium ${key === currentApi ? 'text-blue-700' : 'text-gray-700'}">${api.name}</span>
                </div>
            </div>
        `;
    }
    apiSelector.innerHTML = html;
}

// Configura os event listeners
function setupEventListeners() {
    // Seleção de API
    apiSelector.addEventListener('click', (e) => {
        const card = e.target.closest('.api-card');
        if (!card) return;

        const apiKey = card.dataset.api;
        if (apiKey) {
            currentApi = apiKey;
            renderApiCards();
            updateUIForApi(apiKey);
            clearResults();
        }
    });

    // Botão de busca
    searchBtn.addEventListener('click', performSearch);

    // Enter no input
    queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Monitorar input para mostrar/ocultar botão limpar
    queryInput.addEventListener('input', () => {
        clearInputBtn.style.display = queryInput.value ? 'flex' : 'none';
    });

    // Limpar input
    clearInputBtn.addEventListener('click', clearInput);
}

// Atualiza a UI com base na API selecionada
function updateUIForApi(apiKey) {
    const api = API_ENDPOINTS[apiKey];
    inputLabel.textContent = `${api.name}:`;
    queryInput.placeholder = api.placeholder;
    apiHint.textContent = api.hint;
    document.title = `API Brasil Pro - ${api.name}`;
}

// Limpa o campo de input
function clearInput() {
    queryInput.value = '';
    clearInputBtn.style.display = 'none';
    queryInput.focus();
}

// Limpa a área de resultados
function clearResults() {
    resultContainer.innerHTML = `
        <div class="text-center py-12 text-gray-400">
            <i class="fas fa-database text-5xl mb-4"></i>
            <p class="text-lg">Nenhuma consulta realizada.</p>
            <p class="text-sm">Selecione uma API e faça uma busca.</p>
        </div>
    `;
    resultCount.textContent = '';
    lastResult = null;
}

// Realiza a busca na API
async function performSearch() {
    const query = queryInput.value.trim();

    if (!query) {
        showToast('Por favor, digite um valor para consulta.', 'warning');
        queryInput.focus();
        return;
    }

    const api = API_ENDPOINTS[currentApi];
    const endpointFile = api.endpoint.split('/').pop();
    const url = `/api/proxy?path=${endpointFile}&${api.paramName}=${encodeURIComponent(query)}`;

    // Mostrar loading
    setLoading(true);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        lastResult = data;
        displayResult(data);

        // Contar resultados
        let count = 0;
        if (data.RESULTADOS && Array.isArray(data.RESULTADOS)) {
            count = data.RESULTADOS.length;
        } else if (data.DADOS) {
            count = 1;
        } else if (!data.erro && Object.keys(data).length > 1) {
            count = 1;
        }

        resultCount.textContent = count > 0 ? `${count} resultado(s)` : 'Nenhum resultado';

    } catch (error) {
        console.error('Erro na consulta:', error);
        showToast('Erro ao realizar a consulta. Verifique sua conexão.', 'error');
        resultContainer.innerHTML = `
            <div class="text-center py-12 text-red-400">
                <i class="fas fa-exclamation-triangle text-5xl mb-4"></i>
                <p class="text-lg">Erro na consulta</p>
                <p class="text-sm">Não foi possível conectar ao servidor.</p>
            </div>
        `;
        resultCount.textContent = '';
    } finally {
        setLoading(false);
    }
}

// Exibe o resultado formatado
function displayResult(data) {
    // Verificar se há erro na resposta
    if (data.erro) {
        resultContainer.innerHTML = `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                <div class="flex items-center">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    <span>${data.erro}</span>
                </div>
            </div>
        `;
        return;
    }

    // Se tiver array de RESULTADOS (como na API de telefone)
    if (data.RESULTADOS && Array.isArray(data.RESULTADOS)) {
        if (data.RESULTADOS.length === 0) {
            resultContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-search text-4xl mb-3"></i>
                    <p>Nenhum resultado encontrado.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="space-y-4">';
        data.RESULTADOS.forEach((item, index) => {
            html += `
                <div class="border rounded-lg p-4 bg-gray-50">
                    <div class="flex items-center mb-2">
                        <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Resultado ${index + 1}</span>
                    </div>
                    <pre class="text-sm text-gray-700 overflow-auto max-h-60">${JSON.stringify(item, null, 2)}</pre>
                </div>
            `;
        });
        html += '</div>';
        resultContainer.innerHTML = html;
        return;
    }

    // Para outros formatos (objeto único)
    resultContainer.innerHTML = `
        <div class="border rounded-lg p-4 bg-gray-50">
            <pre class="text-sm text-gray-700 overflow-auto max-h-96">${JSON.stringify(data, null, 2)}</pre>
        </div>
    `;
}

// Controla o estado de loading
function setLoading(loading) {
    isLoading = loading;

    if (loading) {
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Consultando...';
        queryInput.disabled = true;
    } else {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search mr-2"></i> Consultar';
        queryInput.disabled = false;
    }
}

// Sistema de Toast
function showToast(message, type = 'info') {
    clearTimeout(toastTimeout);

    toastMessage.textContent = message;

    // Configurar ícone e cor baseado no tipo
    const iconMap = {
        info: { icon: 'fa-info-circle', color: 'text-blue-500' },
        success: { icon: 'fa-check-circle', color: 'text-green-500' },
        warning: { icon: 'fa-exclamation-triangle', color: 'text-yellow-500' },
        error: { icon: 'fa-times-circle', color: 'text-red-500' }
    };

    const config = iconMap[type] || iconMap.info;
    toastIcon.className = `fas ${config.icon} ${config.color} text-xl`;

    // Mostrar toast
    toastEl.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');

    // Esconder após 4 segundos
    toastTimeout = setTimeout(hideToast, 4000);
}

function hideToast() {
    toastEl.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
}

// Modal Sobre
function showAboutModal() {
    document.getElementById('aboutModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeAboutModal() {
    document.getElementById('aboutModal').classList.add('hidden');
    document.body.style.overflow = '';
}

// Iniciar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);