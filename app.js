// Configuração das APIs disponíveis
const API_ENDPOINTS = {
    cpf: {
        name: 'CPF',
        icon: 'fa-id-card',
        endpoint: '/api/busca_cpf.php',
        paramName: 'cpf',
        placeholder: 'Ex: 12345678901',
        hint: 'Digite apenas números (11 dígitos)'
    },
    mae: {
        name: 'Mãe',
        icon: 'fa-female',
        endpoint: '/api/busca_mae.php',
        paramName: 'mae',
        placeholder: 'Ex: MARIA DA SILVA',
        hint: 'Digite o nome exato'
    },
    nome: {
        name: 'Nome',
        icon: 'fa-user',
        endpoint: '/api/busca_nome.php',
        paramName: 'nome',
        placeholder: 'Ex: JOAO SILVA',
        hint: 'Digite o nome exato ou parcial'
    },
    pai: {
        name: 'Pai',
        icon: 'fa-male',
        endpoint: '/api/busca_pai.php',
        paramName: 'pai',
        placeholder: 'Ex: JOSE DA SILVA',
        hint: 'Mínimo 3 letras informadas'
    },
    rg: {
        name: 'RG',
        icon: 'fa-address-card',
        endpoint: '/api/busca_rg.php',
        paramName: 'rg',
        placeholder: 'Ex: 1234567',
        hint: 'Digite apenas números'
    },
    tel: {
        name: 'Telefone',
        icon: 'fa-phone-volume',
        endpoint: '/api/busca_tel.php',
        paramName: 'tel',
        placeholder: 'Ex: 11987654321',
        hint: 'DDD + Número'
    },
    titulo: {
        name: 'Título Eleitor',
        icon: 'fa-vote-yea',
        endpoint: '/api/busca_titulo.php',
        paramName: 'titulo',
        placeholder: 'Ex: 123456789012',
        hint: 'Número completo do título'
    }
};

// Estado
let currentApi = 'cpf';
let isLoading = false;
let toastTimeout;

// DOM
const apiSelector = document.getElementById('apiSelector');
const queryInput = document.getElementById('queryInput');
const searchBtn = document.getElementById('searchBtn');
const clearInputBtn = document.getElementById('clearInputBtn');
const inputLabel = document.getElementById('inputLabel');
const apiHint = document.getElementById('apiHint');

// Resultados
const resultCount = document.getElementById('resultCount');
const resultPlaceholder = document.getElementById('resultPlaceholder');
const resultGrid = document.getElementById('resultGrid');

// Modal
const fullDataModal = document.getElementById('fullDataModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalDrawer = document.getElementById('modalDrawer');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const modalContent = document.getElementById('modalContent');

// Init
function init() {
    renderApiCards();
    setupEventListeners();
    updateUIState(currentApi);
}

function renderApiCards() {
    let html = '';
    for (const [key, api] of Object.entries(API_ENDPOINTS)) {
        const isActive = key === currentApi;
        html += `
            <div class="group relative cursor-pointer" onclick="selectApi('${key}')">
                <div class="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-purple-600 rounded-xl blur opacity-0 ${isActive ? 'opacity-50' : 'group-hover:opacity-30'} transition duration-300"></div>
                <div class="relative flex flex-col items-center justify-center p-4 rounded-xl border ${isActive ? 'bg-brand-900/40 border-brand-500/50' : 'bg-darkcard border-white/5'} backdrop-blur-md transition-all duration-300 h-full">
                    <i class="fas ${api.icon} text-2xl mb-2 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-brand-400'}"></i>
                    <span class="text-xs font-semibold text-center tracking-wide ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}">${api.name}</span>
                </div>
            </div>
        `;
    }
    apiSelector.innerHTML = html;
}

window.selectApi = function (apiKey) {
    if (apiKey === currentApi || isLoading) return;
    currentApi = apiKey;
    renderApiCards();
    updateUIState(apiKey);
    resetResults();
};

function setupEventListeners() {
    searchBtn.addEventListener('click', performSearch);

    queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    queryInput.addEventListener('input', () => {
        clearInputBtn.style.display = queryInput.value ? 'flex' : 'none';
    });

    clearInputBtn.addEventListener('click', () => {
        queryInput.value = '';
        clearInputBtn.style.display = 'none';
        queryInput.focus();
    });

    // Modal
    closeModalBtn.addEventListener('click', closeDetailsModal);
    modalBackdrop.addEventListener('click', closeDetailsModal);
}

function updateUIState(apiKey) {
    const api = API_ENDPOINTS[apiKey];
    inputLabel.innerHTML = `<i class="fas ${api.icon} mr-2 text-brand-500"></i> ${api.name}`;
    queryInput.placeholder = api.placeholder;
    apiHint.textContent = "DICA: " + api.hint;
}

function resetResults() {
    resultGrid.classList.add('hidden');
    resultPlaceholder.classList.remove('hidden');
    resultCount.classList.add('hidden');
    resultGrid.innerHTML = '';
}

async function performSearch() {
    const query = queryInput.value.trim();

    if (!query) {
        showToast('Parâmetro vazio. Verifique os dados.', 'warning');
        queryInput.focus();
        return;
    }

    const api = API_ENDPOINTS[currentApi];
    const endpointFile = api.endpoint.split('/').pop();
    const url = `/api/proxy?path=${endpointFile}&${api.paramName}=${encodeURIComponent(query)}`;

    setLoading(true);
    resetResults();

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Servidor inacessível. HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.erro) {
            showToast(data.erro, 'error');
            return;
        }

        renderResults(data);

    } catch (error) {
        console.error('Erro geral:', error);
        showToast('Falha na comunicação com o datalake.', 'error');
    } finally {
        setLoading(false);
    }
}

function renderResults(data) {
    resultPlaceholder.classList.add('hidden');
    resultGrid.classList.remove('hidden');

    // Normalizar como Array
    let items = [];
    if (data.RESULTADOS && Array.isArray(data.RESULTADOS)) {
        items = data.RESULTADOS;
    } else if (data.DADOS) {
        items = Array.isArray(data.DADOS) ? data.DADOS : [data.DADOS];
    } else {
        items = [data]; // Objeto único
    }

    if (items.length === 0) {
        resultGrid.innerHTML = `
            <div class="col-span-full py-16 flex flex-col items-center">
                <i class="fas fa-ghost text-5xl text-slate-700 mb-4"></i>
                <p class="text-slate-400 font-medium tracking-wide">NENHUM DADO ENCONTRADO</p>
            </div>
        `;
        resultCount.classList.add('hidden');
        return;
    }

    resultCount.textContent = `${items.length} ${items.length === 1 ? 'REGISTRO' : 'REGISTROS'}`;
    resultCount.classList.remove('hidden');

    let html = '';
    items.forEach((item, idx) => {
        // Extrair informações chaves baseado no tipo
        const titleProp = extractPrimaryTitle(item);
        const sub1 = extractSecondaryInfo(item, 1);
        const sub2 = extractSecondaryInfo(item, 2);

        // O item vai ser guardado no DOM via dataset ou em variável local para o modal
        const jsonStr = encodeURIComponent(JSON.stringify(item));

        html += `
            <div class="group relative bg-[#0f1523] border border-white/5 rounded-xl overflow-hidden hover:border-brand-500/50 transition-all duration-300 shadow-lg hover:shadow-brand-900/20 transform hover:-translate-y-1">
                <div class="absolute top-0 right-0 p-3">
                    <span class="text-xs font-bold text-slate-600 bg-black/20 px-2 py-1 rounded-md">#${idx + 1}</span>
                </div>
                
                <div class="p-6 border-b border-white/5">
                    <div class="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center mb-4 border border-brand-500/20">
                        <i class="fas ${API_ENDPOINTS[currentApi].icon} text-brand-400"></i>
                    </div>
                    
                    <h4 class="text-lg font-bold text-white mb-1 truncate" title="${titleProp}">${titleProp}</h4>
                    
                    <div class="space-y-1 mt-3">
                        ${sub1 ? `<div class="flex items-center text-sm text-slate-400"><i class="fas fa-chevron-right text-xs text-brand-600 mr-2"></i><span class="truncate">${sub1}</span></div>` : ''}
                        ${sub2 ? `<div class="flex items-center text-sm text-slate-400"><i class="fas fa-chevron-right text-xs text-brand-600 mr-2"></i><span class="truncate">${sub2}</span></div>` : ''}
                    </div>
                </div>
                
                <div class="p-3 bg-black/20">
                    <button class="w-full py-2.5 rounded-lg bg-white/5 hover:bg-brand-600 font-medium text-sm text-slate-300 hover:text-white transition-colors flex items-center justify-center" onclick="openDetailsModal('${jsonStr}', ${idx + 1})">
                        <i class="fas fa-expand-alt mr-2"></i> VER DOSSIÊ
                    </button>
                </div>
            </div>
        `;
    });

    resultGrid.innerHTML = html;
}

// Helpers para extrair info (Como a API retorna dados flexíveis)
function extractPrimaryTitle(obj) {
    if (!obj || typeof obj !== 'object') return 'Dado Inválido';
    return obj.NOME || obj.nome || obj.NOME_PESSOA || obj.RAZAO_SOCIAL || obj.TITLE || obj.CPF || obj.cpf || '- - -';
}
function extractSecondaryInfo(obj, order) {
    if (order === 1) {
        if (obj.CPF || obj.cpf) return `CPF: ${obj.CPF || obj.cpf}`;
        if (obj.TELEFONE || obj.telefone) return `Tel: ${obj.TELEFONE || obj.telefone}`;
        if (obj.NASCIMENTO || obj.dt_nascimento) return `Nasc: ${obj.NASCIMENTO || obj.dt_nascimento}`;
    }
    if (order === 2) {
        if (obj.NOME_MAE || obj.mae) return `Mãe: ${obj.NOME_MAE || obj.mae}`;
        if (obj.RG || obj.rg) return `RG: ${obj.RG || obj.rg}`;
    }
    return null;
}

// Sistema de Modal
window.openDetailsModal = function (encodedJson, indexId) {
    const data = JSON.parse(decodeURIComponent(encodedJson));
    const title = extractPrimaryTitle(data);

    modalTitle.textContent = title;
    modalSubtitle.textContent = `DOSSIÊ #00${indexId} • STATUS: VERIFICADO`;
    modalContent.innerHTML = syntaxHighlightJson(data);

    fullDataModal.classList.remove('hidden');
    // Animate in
    setTimeout(() => {
        modalBackdrop.classList.remove('opacity-0');
        modalDrawer.classList.remove('translate-x-full');
    }, 10);
    document.body.style.overflow = 'hidden';
}

window.closeDetailsModal = function () {
    modalBackdrop.classList.add('opacity-0');
    modalDrawer.classList.add('translate-x-full');

    setTimeout(() => {
        fullDataModal.classList.add('hidden');
        document.body.style.overflow = '';
    }, 300);
}

// Pretty print JSON view
function syntaxHighlightJson(json) {
    if (typeof json != 'string') {
        json = JSON.stringify(json, null, 4);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'text-blue-400';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'text-purple-400 font-semibold'; // key
            } else {
                cls = 'text-green-400'; // string
            }
        } else if (/true|false/.test(match)) {
            cls = 'text-yellow-400'; // boolean
        } else if (/null/.test(match)) {
            cls = 'text-slate-500'; // null
        } else {
            cls = 'text-orange-400'; // number
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

function setLoading(loading) {
    isLoading = loading;
    const btnContent = searchBtn.innerHTML;

    if (loading) {
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> PROCESSANDO...';
        queryInput.disabled = true;
    } else {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-bolt mr-3"></i> PROCESSAR';
        queryInput.disabled = false;
    }
}

function showToast(message, type = 'info') {
    clearTimeout(toastTimeout);

    const toastEl = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    const iconContainer = document.getElementById('toastIconContainer');

    toastMessage.textContent = message;

    // Configurations
    if (type === 'error' || type === 'warning') {
        iconContainer.className = 'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-red-500/20 text-red-500';
        toastIcon.className = type === 'error' ? 'fas fa-shield-alt' : 'fas fa-exclamation-triangle';
    } else {
        iconContainer.className = 'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-brand-500/20 text-brand-500';
        toastIcon.className = 'fas fa-check';
    }

    toastEl.classList.remove('translate-y-24', 'opacity-0');

    toastTimeout = setTimeout(() => {
        toastEl.classList.add('translate-y-24', 'opacity-0');
    }, 4000);
}

document.addEventListener('DOMContentLoaded', init);