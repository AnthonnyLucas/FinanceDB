const steps = [
    {
        title: "1. Node.js",
        description: "Precisamos do ambiente Node para rodar a API. Baixe a versão LTS (Long Term Support) em <a href='https://nodejs.org' target='_blank'>nodejs.org</a>, instale aceitando tudo e verifique.",
        commands: {
            powershell: "node -v\nnpm -v",
            cmd: "node -v\r\nnpm -v",
            vscode: "node -v\r\nnpm -v"
        }
    },
    {
        title: "2. PostgreSQL",
        description: "Baixe o PostgreSQL 16 Windows x64 no <a href='https://www.enterprisedb.com/downloads/postgres-postgresql-downloads' target='_blank'>site oficial</a>. Durante a instalação, **anote a senha do superusuário postgres** (sugestão: <code>postgres123</code>) e marque a instalação do pgAdmin 4.",
        commands: {
            powershell: "psql --version",
            cmd: "psql --version",
            vscode: "psql --version"
        }
    },
    {
        title: "3. Criar Banco de Dados",
        description: "Abra o seu terminal, conecte-se ao PostgreSQL usando a senha que você definiu na instalação e crie o banco de dados principal do projeto.",
        commands: {
            powershell: "# Conectar\npsql -U postgres\n\n# Criar banco (dentro do psql)\nCREATE DATABASE financeiro_pessoal ENCODING 'UTF8' TEMPLATE template0;\n\\q",
            cmd: "psql -U postgres\n\nCREATE DATABASE financeiro_pessoal ENCODING 'UTF8' TEMPLATE template0;\n\\q",
            vscode: "psql -U postgres\n\nCREATE DATABASE financeiro_pessoal ENCODING 'UTF8' TEMPLATE template0;\n\\q"
        }
    },
    {
        title: "4. Importar o Schema",
        description: "Ainda no terminal, vá até a pasta do projeto `Entregavel` e importe o arquivo SQL para gerar as tabelas e usuários padrão.",
        commands: {
            powershell: "cd \"C:\\Users\\Pichau\\Desktop\\Banco de Dados\\Entregavel\"\n$env:PGCLIENTENCODING = \"UTF8\"\npsql -U postgres -d financeiro_pessoal -f \"financeiro_pessoal.sql\"",
            cmd: "cd \"C:\\Users\\Pichau\\Desktop\\Banco de Dados\\Entregavel\"\nset PGCLIENTENCODING=UTF8\npsql -U postgres -d financeiro_pessoal -f \"financeiro_pessoal.sql\"",
            vscode: "cd \"C:\\Users\\Pichau\\Desktop\\Banco de Dados\\Entregavel\"\n$env:PGCLIENTENCODING = \"UTF8\"\npsql -U postgres -d financeiro_pessoal -f \"financeiro_pessoal.sql\""
        }
    },
    {
        title: "5. Configurar o .env",
        description: "O backend precisa saber como se conectar ao banco. Vá na pasta `backend`, crie um arquivo `.env` com suas credenciais. Troque `postgres123` pela sua senha se necessário.",
        commands: {
            powershell: "cd backend\nNew-Item -Path .env -ItemType File -Value \"DB_HOST=localhost`nDB_PORT=5432`nDB_NAME=financeiro_pessoal`nDB_USER=postgres`nDB_PASSWORD=postgres123`nJWT_SECRET=financedb_admin_8k3m9x2p7w_secret_2025`nPORT=3000\"",
            cmd: "cd backend\necho DB_HOST=localhost> .env\necho DB_PORT=5432>> .env\necho DB_NAME=financeiro_pessoal>> .env\necho DB_USER=postgres>> .env\necho DB_PASSWORD=postgres123>> .env\necho JWT_SECRET=financedb_admin_8k3m9x2p7w_secret_2025>> .env\necho PORT=3000>> .env",
            vscode: "cd backend\nNew-Item -Path .env -ItemType File -Value \"DB_HOST=localhost`nDB_PORT=5432`nDB_NAME=financeiro_pessoal`nDB_USER=postgres`nDB_PASSWORD=postgres123`nJWT_SECRET=financedb_admin_8k3m9x2p7w_secret_2025`nPORT=3000\""
        }
    },
    {
        title: "6. Instalar Dependências",
        description: "Com tudo configurado, execute o instalador do Node.js (`npm install`) dentro da pasta `backend` para baixar os pacotes como o Express e o pg.",
        commands: {
            powershell: "npm install",
            cmd: "npm install",
            vscode: "npm install"
        }
    },
    {
        title: "7. Rodar a Aplicação",
        description: "Tudo pronto! Inicie o servidor. Se aparecer 'Servidor rodando na porta 3000' e 'Conectado ao PostgreSQL!', você venceu!",
        commands: {
            powershell: "npm start",
            cmd: "npm start",
            vscode: "npm start"
        }
    }
];

let currentStep = 0;
let currentPlatform = 'powershell';

// Elements
const stepTitle = document.getElementById('stepTitle');
const stepDescription = document.getElementById('stepDescription');
const commandCode = document.getElementById('commandCode');
const progressBar = document.getElementById('progressBar');
const currentStepNum = document.getElementById('currentStepNum');
const totalStepsNum = document.getElementById('totalStepsNum');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const copyBtn = document.getElementById('copyBtn');
const terminalWindow = document.getElementById('terminalWindow');
const platformBtns = document.querySelectorAll('.platform-btn');
const tutorialCard = document.querySelector('.tutorial-card');
const successScreen = document.getElementById('successScreen');
const restartBtn = document.getElementById('restartBtn');

totalStepsNum.innerText = steps.length;

function renderStep() {
    const step = steps[currentStep];
    
    // Animate content change
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

    commandCode.innerText = step.commands[currentPlatform];

    // Update progress bar
    const progressPercent = ((currentStep + 1) / steps.length) * 100;
    progressBar.style.width = `${progressPercent}%`;
    currentStepNum.innerText = currentStep + 1;

    // Manage buttons
    prevBtn.disabled = currentStep === 0;
    
    if (currentStep === steps.length - 1) {
        nextBtn.innerText = "Finalizar";
    } else {
        nextBtn.innerText = "Próximo";
    }
}

// Platform switching
platformBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        platformBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPlatform = btn.dataset.os;
        
        // Update terminal header styling slightly based on platform
        const header = document.querySelector('.terminal-header .terminal-title');
        header.innerText = currentPlatform === 'cmd' ? 'Command Prompt' : currentPlatform === 'vscode' ? 'VSCode Terminal' : 'PowerShell';
        
        renderStep();
    });
});

// Navigation
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

// Copy Command
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

// Init
renderStep();
