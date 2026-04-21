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
    const source = obj.DADOS || obj;
    return source.NOME || source.nome || source.NOME_PESSOA || source.RAZAO_SOCIAL || source.TITLE || source.CPF || source.cpf || '- - -';
}

function extractSecondaryInfo(obj, order) {
    const source = obj.DADOS || obj;

    // Auxiliar prático para telefones formatados se existirem
    let firstPhone = '';
    if (obj.TELEFONE && Array.isArray(obj.TELEFONE) && obj.TELEFONE.length > 0) {
        firstPhone = `(${obj.TELEFONE[0].DDD || ''}) ${obj.TELEFONE[0].TELEFONE || ''}`;
    } else if (source.TELEFONE || source.telefone) {
        firstPhone = source.TELEFONE || source.telefone;
    }

    if (order === 1) {
        if (source.CPF || source.cpf) return `<span class="text-brand-500 font-medium">CPF:</span> ${source.CPF || source.cpf}`;
        if (firstPhone) return `<span class="text-brand-500 font-medium">Tel:</span> ${firstPhone}`;
        if (source.NASCIMENTO || source.NASC || source.dt_nascimento) return `<span class="text-brand-500 font-medium">Nasc:</span> ${source.NASCIMENTO || source.NASC || source.dt_nascimento}`;
    }
    if (order === 2) {
        if (source.NOME_MAE || source.mae) return `<span class="text-brand-500 font-medium">Mãe:</span> <span class="capitalize">${(source.NOME_MAE || source.mae).toLowerCase()}</span>`;
        if (source.RG || source.rg) return `<span class="text-brand-500 font-medium">RG:</span> ${source.RG || source.rg}`;
        if (firstPhone) return `<span class="text-brand-500 font-medium">Tel:</span> ${firstPhone}`;
    }
    return null;
}

// Sistema de Modal
window.openDetailsModal = function (encodedJson, indexId) {
    const data = JSON.parse(decodeURIComponent(encodedJson));
    const title = extractPrimaryTitle(data);

    modalTitle.textContent = title;
    modalSubtitle.textContent = `DOSSIÊ #00${indexId} • STATUS: VERIFICADO`;

    // Gerar visual atraente ao invés do JSON cru
    modalContent.innerHTML = buildVisualDossier(data);

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

// Build Visual Dossier (HTML agradável)
function buildVisualDossier(json) {
    let html = '<div class="space-y-6">';

    // TELEFONES EM DESTAQUE (NO TOPO)
    if (json.TELEFONE && Array.isArray(json.TELEFONE) && json.TELEFONE.length > 0) {
        html += `
            <div class="bg-brand-900/30 rounded-xl border border-brand-500/40 overflow-hidden shadow-[0_0_20px_rgba(14,165,233,0.15)]">
                <div class="bg-brand-500/20 px-4 py-3 flex items-center gap-3 border-b border-brand-500/30">
                    <div class="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center animate-pulse">
                        <i class="fas fa-phone-volume text-brand-400"></i>
                    </div>
                    <h4 class="text-brand-300 font-bold tracking-wide uppercase">Contatos em Destaque</h4>
                    <span class="bg-brand-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold ml-auto">${json.TELEFONE.length}</span>
                </div>
                <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        `;

        json.TELEFONE.forEach(t => {
            html += `
                <div class="flex items-center gap-3 bg-[#0a0f18]/80 p-3 rounded-lg border border-white/5 hover:border-brand-500/30 transition-colors">
                    <div class="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-mobile-alt text-brand-400 text-lg"></i>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-white font-bold text-xl tracking-wider select-all">(${t.DDD || '-'}) ${t.TELEFONE || '-'}</span>
                        <span class="text-brand-500/70 text-xs font-semibold uppercase">Atualizado: ${formatDate(t.DT_INCLUSAO || t.DT_INFORMACAO)}</span>
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
    }

    // DADOS PRINCIPAIS
    if (json.DADOS) {
        html += renderSection('Informações Pessoais', 'fa-id-card', json.DADOS);
    } else if (Object.keys(json).length > 0 && !json.DADOS && !json.TELEFONE) {
        html += renderSection('Detalhes Principais', 'fa-asterisk', json);
        return html + '</div>';
    }

    // ENDERECOS
    if (json.ENDERECO && Array.isArray(json.ENDERECO)) {
        html += renderListSection('Endereços Vinculados', 'fa-map-marker-alt', json.ENDERECO, (e) => {
            return `
                <div class="flex flex-col gap-1">
                   <span class="text-white text-sm">${e.TIPO_LOGRADOURO || ''} ${e.LOGRADOURO || ''}, ${e.NUMERO || 'S/N'} ${e.COMPLEMENTO ? '(' + e.COMPLEMENTO + ')' : ''}</span>
                   <span class="text-slate-400 text-xs">${e.BAIRRO || ''} • ${e.CIDADE || ''} - ${e.UF || ''} • CEP: ${e.CEP || ''}</span>
                </div>
            `;
        });
    }

    // EMAILS
    if (json.EMAIL && Array.isArray(json.EMAIL)) {
        html += renderListSection('E-mails Cadastrados', 'fa-envelope', json.EMAIL, (e) => {
            return `<span class="text-brand-400 font-medium text-sm break-all">${e.EMAIL || ''}</span>`;
        });
    }

    // VEICULOS (Caso haja dependendo da API)
    if (json.VEICULO && Array.isArray(json.VEICULO)) {
        html += renderListSection('Veículos', 'fa-car', json.VEICULO, (v) => {
            return `<span class="text-white text-sm">PLACA: <strong class="text-brand-400">${v.PLACA || ''}</strong> • ${v.MODELO || ''} ${v.ANO_FABRICACAO || ''}</span>`;
        });
    }

    // SOCIEDADES / EMPRESAS
    if (json.SOCIEDADE && Array.isArray(json.SOCIEDADE)) {
        html += renderListSection('Participações Societárias', 'fa-building', json.SOCIEDADE, (s) => {
            return `
               <div class="flex flex-col gap-1">
                  <span class="text-white text-sm font-semibold">${s.RAZAO_SOCIAL || ''}</span>
                  <span class="text-slate-400 text-xs">CNPJ: ${s.CNPJ || ''} • Participação: ${s.PARTICIPACAO || ''}%</span>
               </div>
            `;
        });
    }

    html += '</div>';
    return html;
}

function renderSection(title, icon, dataObj) {
    if (!dataObj || Object.keys(dataObj).length === 0) return '';

    let html = `
        <div class="bg-[#151a28] rounded-xl border border-white/5 overflow-hidden">
            <div class="bg-black/20 px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <i class="fas ${icon} text-brand-500"></i>
                <h4 class="text-white font-bold tracking-wide">${title}</h4>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
    `;

    for (const [key, value] of Object.entries(dataObj)) {
        if (value === '' || value === null || typeof value === 'object') continue;

        let label = key.replace(/_/g, ' ');
        // Mapear Siglas Feias
        if (key === 'NASC') label = 'DATA DE NASCIMENTO';
        else if (key === 'NOME_MAE') label = 'NOME DA MÃE';
        else if (key === 'NOME_PAI') label = 'NOME DO PAI';
        else if (key === 'ESTCIV') label = 'ESTADO CIVIL';
        else if (key === 'DT_SIT_CAD') label = 'DATA SIT. CADASTRAL';

        html += `
            <div class="flex flex-col">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">${label}</span>
                <span class="text-slate-200 text-sm font-medium uppercase break-words">${value}</span>
            </div>
        `;
    }

    html += `</div></div>`;
    return html;
}

function renderListSection(title, icon, items, renderItem) {
    if (!items || items.length === 0) return '';

    let html = `
        <div class="bg-[#151a28] rounded-xl border border-white/5 overflow-hidden">
            <div class="bg-black/20 px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <i class="fas ${icon} text-purple-500"></i>
                <h4 class="text-white font-bold tracking-wide">${title} <span class="bg-white/10 px-2 py-0.5 rounded-full text-[10px] ml-2">${items.length}</span></h4>
            </div>
            <div class="divide-y divide-white/5">
    `;

    items.forEach((item, idx) => {
        html += `<div class="p-4 hover:bg-white/5 transition-colors">${renderItem(item)}</div>`;
    });

    html += `</div></div>`;
    return html;
}

function formatDate(dateStr) {
    if (!dateStr) return 'Desconhecida';
    // Remove tempo extra se houver "2008-05-13 00:00:00" -> "13/05/2008"
    try {
        const parts = dateStr.split(' ')[0].split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
    } catch { return dateStr; }
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