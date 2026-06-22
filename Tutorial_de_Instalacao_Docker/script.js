const steps = [
    {
        title: "1. Requisitos e Docker Desktop",
        description: "Certifique-se de ter o <strong>Docker Desktop</strong> instalado e rodando (o ícone da baleia deve estar na bandeja do seu sistema). Se não tiver, baixe no site oficial da Docker.",
        command: null,
        showEnvBtn: false
    },
    {
        title: "2. Abra a Pasta no Terminal",
        description: "Precisamos abrir a pasta <code>Entregavel</code> no seu terminal. Se estiver usando o VSCode, basta usar o atalho <code>Ctrl + \`</code> (crase) para abrir o terminal integrado.",
        command: "cd \"C:\\Users\\Pichau\\Desktop\\Banco de Dados\\Entregavel\"",
        showEnvBtn: false
    },
    {
        title: "3. Configurar Variáveis de Ambiente",
        description: "O sistema precisa de credenciais e portas configuradas. Para o Docker funcionar de forma blindada, precisamos gerar o arquivo <code>.env</code> na pasta <code>backend/</code>. Clique no botão abaixo para copiar o conteúdo ou gere-o diretamente.",
        command: "New-Item -Path .\\backend\\.env -ItemType File -Value \"DB_HOST=db`nDB_PORT=5432`nDB_NAME=financeiro_pessoal`nDB_USER=postgres`nDB_PASSWORD=postgres123`nPORT=3000\"",
        showEnvBtn: true
    },
    {
        title: "4. Subir a Infraestrutura",
        description: "Agora o momento mágico! Execute o comando do Docker Compose. Ele vai baixar o PostgreSQL 16, configurar o banco, importar os dados, subir o pgAdmin e rodar a API Node.js.",
        command: "docker-compose up --build -d",
        showEnvBtn: false
    }
];

let currentStep = 0;

const stepTitle = document.getElementById('stepTitle');
const stepDescription = document.getElementById('stepDescription');
const terminalWindow = document.getElementById('terminalWindow');
const commandCode = document.getElementById('commandCode');
const progressBar = document.getElementById('progressBar');
const currentStepNum = document.getElementById('currentStepNum');
const totalStepsNum = document.getElementById('totalStepsNum');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const copyBtn = document.getElementById('copyBtn');
const tutorialCard = document.querySelector('.tutorial-card');
const successScreen = document.getElementById('successScreen');
const restartBtn = document.getElementById('restartBtn');

// Create the dynamic ENV button
const envBtnContainer = document.createElement('div');
envBtnContainer.style.marginTop = '1rem';
envBtnContainer.style.display = 'none';
envBtnContainer.innerHTML = `<button class="btn btn-secondary" id="copyEnvBtn" style="width:100%; border-color:var(--primary); color:var(--primary);">Copiar conteúdo do .env</button>`;
document.querySelector('.content-area').insertBefore(envBtnContainer, terminalWindow);

const copyEnvBtn = document.getElementById('copyEnvBtn');
copyEnvBtn.addEventListener('click', async () => {
    const envContent = `DB_HOST=localhost
DB_PORT=5432
DB_NAME=financeiro_pessoal
DB_USER=postgres
DB_PASSWORD=postgres123
JWT_SECRET=financedb_admin_8k3m9x2p7w_secret_2025
ADMIN_EMAIL=Admin_DB@gmail.com
ADMIN_PASSWORD=AdminDB123
PORT=3000`;
    await navigator.clipboard.writeText(envContent);
    copyEnvBtn.innerText = "Copiado para a área de transferência!";
    copyEnvBtn.style.background = "var(--primary)";
    copyEnvBtn.style.color = "white";
    setTimeout(() => {
        copyEnvBtn.innerText = "Copiar conteúdo do .env";
        copyEnvBtn.style.background = "transparent";
        copyEnvBtn.style.color = "var(--primary)";
    }, 2000);
});

totalStepsNum.innerText = steps.length;

function renderStep() {
    const step = steps[currentStep];
    
    stepTitle.style.opacity = 0;
    stepDescription.style.opacity = 0;
    
    setTimeout(() => {
        stepTitle.innerHTML = step.title;
        stepDescription.innerHTML = step.description;
        
        stepTitle.style.transition = 'opacity 0.3s';
        stepDescription.style.transition = 'opacity 0.3s';
        stepTitle.style.opacity = 1;
        stepDescription.style.opacity = 1;
    }, 150);

    if (step.command) {
        commandCode.innerText = step.command;
        terminalWindow.style.display = 'block';
    } else {
        terminalWindow.style.display = 'none';
    }

    envBtnContainer.style.display = step.showEnvBtn ? 'block' : 'none';

    const progressPercent = ((currentStep + 1) / steps.length) * 100;
    progressBar.style.width = `${progressPercent}%`;
    currentStepNum.innerText = currentStep + 1;

    prevBtn.disabled = currentStep === 0;
    
    if (currentStep === steps.length - 1) {
        nextBtn.innerText = "Finalizar";
    } else {
        nextBtn.innerText = "Próximo";
    }
}

nextBtn.addEventListener('click', () => {
    if (currentStep < steps.length - 1) {
        currentStep++;
        renderStep();
    } else {
        tutorialCard.style.display = 'none';
        successScreen.style.display = 'block';
    }
});

prevBtn.addEventListener('click', () => {
    if (currentStep > 0) {
        currentStep--;
        renderStep();
    }
});

restartBtn.addEventListener('click', () => {
    currentStep = 0;
    successScreen.style.display = 'none';
    tutorialCard.style.display = 'block';
    renderStep();
});

copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(commandCode.innerText);
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        copyBtn.classList.add('copied');
        
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.classList.remove('copied');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
});

renderStep();
