const tourSteps = [
    {
        elementId: 'dml-select-table',
        title: "DML: O Comando SELECT",
        description: "Esta é a tela de DML (Linguagem de Manipulação de Dados). Quando você seleciona uma tabela neste campo, o sistema executa um comando <strong>SELECT * FROM tabela</strong> no banco e exibe os dados na grade abaixo. Tente clicar no campo de seleção.",
        actionRequired: 'click'
    },
    {
        elementId: 'dml-btn-insert',
        title: "DML: O Comando INSERT",
        description: "Este botão 'Novo Registro' abre um formulário. Ao preencher e salvar, o sistema executa um <strong>INSERT INTO tabela (...) VALUES (...)</strong>. Clique no botão para simular a abertura do modal de Inserção.",
        actionRequired: 'click'
    },
    {
        elementId: 'dml-btn-edit',
        title: "DML: O Comando UPDATE",
        description: "O botão de lápis permite editar o registro específico. Ao salvar as edições, um comando <strong>UPDATE tabela SET ... WHERE id = X</strong> é disparado. Simule um clique.",
        actionRequired: 'click'
    },
    {
        elementId: 'dml-btn-delete',
        title: "DML: O Comando DELETE",
        description: "O botão de X vermelho remove o registro executando <strong>DELETE FROM tabela WHERE id = X</strong>. Atenção: isso é irreversível! Simule a exclusão.",
        actionRequired: 'click'
    },
    {
        elementId: 'tab-ddl',
        title: "Vamos para DDL",
        description: "DML manipula os dados, mas DDL (Linguagem de Definição de Dados) manipula a ESTRUTURA. Clique na aba DDL para ver como funciona.",
        actionRequired: 'click',
        onExecute: () => switchTab('ddl')
    },
    {
        elementId: 'ddl-btn-create',
        title: "DDL: CREATE TABLE",
        description: "Aqui você cria novas tabelas no banco de dados. O sistema usa <strong>CREATE TABLE nome (coluna tipo)</strong>. Clique aqui para abrir o modal de criação.",
        actionRequired: 'click'
    },
    {
        elementId: 'tab-dcl',
        title: "Vamos para DCL",
        description: "Por fim, DCL (Linguagem de Controle de Dados) gerencia as permissões dos usuários do banco de dados (Roles). Clique na aba DCL.",
        actionRequired: 'click',
        onExecute: () => switchTab('dcl')
    },
    {
        elementId: 'dcl-btn-priv',
        title: "DCL: GRANT / REVOKE",
        description: "O botão 'Gerenciar Privilégios' executa comandos como <strong>GRANT SELECT ON tabela TO app_user</strong>, liberando ou bloqueando acesso a dados sensíveis. Simule o clique.",
        actionRequired: 'click'
    },
    {
        elementId: 'tour-tabs',
        title: "Parabéns!",
        description: "Você concluiu o tour interativo. Agora você sabe exatamente onde cada comando SQL (SELECT, INSERT, CREATE, GRANT) está mapeado na interface gráfica original!",
        actionRequired: 'next'
    }
];

let currentStepIndex = 0;

const tourWelcome = document.getElementById('tourWelcome');
const startTourBtn = document.getElementById('startTourBtn');
const tourTooltip = document.getElementById('tourTooltip');
const ttTitle = document.getElementById('ttTitle');
const ttDesc = document.getElementById('ttDesc');
const ttNextBtn = document.getElementById('ttNextBtn');
const fakeModal = document.getElementById('fakeModal');
const fmCloseBtn = document.getElementById('fmCloseBtn');

startTourBtn.addEventListener('click', () => {
    tourWelcome.classList.remove('active');
    document.body.classList.add('tour-active');
    showStep(currentStepIndex);
});

function showStep(index) {
    if(index >= tourSteps.length) {
        tourTooltip.classList.add('hidden');
        document.body.classList.remove('tour-active');
        alert("Tour finalizado com sucesso!");
        return;
    }

    const step = tourSteps[index];
    
    // Remove highlight from previous
    document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));

    const targetEl = document.getElementById(step.elementId);
    if(targetEl) {
        targetEl.classList.add('tour-highlight');
        
        // Position tooltip near the element
        const rect = targetEl.getBoundingClientRect();
        tourTooltip.style.top = `${rect.bottom + 10}px`;
        tourTooltip.style.left = `${rect.left}px`;
        
        // Ensure tooltip doesn't go offscreen
        setTimeout(() => {
            const ttRect = tourTooltip.getBoundingClientRect();
            if(ttRect.right > window.innerWidth) {
                tourTooltip.style.left = `${window.innerWidth - ttRect.width - 20}px`;
            }
        }, 50);
    } else {
        // Fallback center
        tourTooltip.style.top = '50%';
        tourTooltip.style.left = '50%';
        tourTooltip.style.transform = 'translate(-50%, -50%)';
    }

    ttTitle.innerHTML = step.title;
    ttDesc.innerHTML = step.description;
    tourTooltip.classList.remove('hidden');

    if(step.actionRequired === 'click') {
        ttNextBtn.style.display = 'none';
        
        const clickHandler = (e) => {
            e.preventDefault();
            targetEl.removeEventListener('click', clickHandler);
            
            // Show fake modal based on what was clicked
            if(targetEl.id.includes('insert')) showFakeModal("Novo Registro", "Formulário de Inserção sendo simulado...");
            if(targetEl.id.includes('edit')) showFakeModal("Editar Registro", "Formulário de Edição sendo simulado...");
            if(targetEl.id.includes('delete')) showFakeModal("Excluir", "Você tem certeza? Isso executaria um DELETE.");
            if(targetEl.id.includes('create')) showFakeModal("Criar Tabela", "Formulário de criação de tabela DDL...");
            if(targetEl.id.includes('priv')) showFakeModal("Privilégios de app_user", "Selecione as permissões GRANT/REVOKE...");
            
            if(step.onExecute) step.onExecute();
            
            currentStepIndex++;
            showStep(currentStepIndex);
        };
        targetEl.addEventListener('click', clickHandler);
    } else {
        ttNextBtn.style.display = 'block';
        ttNextBtn.onclick = () => {
            currentStepIndex++;
            showStep(currentStepIndex);
        };
    }
}

function showFakeModal(title, body) {
    document.getElementById('fmTitle').innerText = title;
    document.getElementById('fmBody').innerText = body;
    fakeModal.classList.remove('hidden');
}

fmCloseBtn.addEventListener('click', () => {
    fakeModal.classList.add('hidden');
});

function switchTab(tabId) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`content-${tabId}`).classList.remove('hidden');
}

// Ensure default tab click behavior if user clicks freely after tour
document.querySelectorAll('.admin-tab').forEach(t => {
    t.addEventListener('click', () => switchTab(t.dataset.tab));
});
