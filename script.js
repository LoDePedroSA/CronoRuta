(function(){
    let ramal = '';
    let linea = '';
    let formatActual = '';
    let totalRouteSeconds = 600;
    let phase = 'idle';
    let mainState = 1;
    let idaTime = 0;
    let esperaTime = 0;
    let vueltaTime = 0;
    let currentSegmentStart = null;
    let timerInterval = null;
    let currentElapsed = 0;
    let esperaDuration = 0;
    let esperaConfirmada = false;
    let idaFinalizada = false;
    let isProcessing = false;
    let esperaAutomaticaDisparada = false;
    let notificacionIdaEnviada = false;
    let notificacionVueltaEnviada = false;
    let notificacionEsperaEnviada = false;
    let pipWindow = null;

    const EMPRESAS = {
        callao: { nombre: 'Transportes Callao S.A.', lineas: ['12'], ramales: ['A">"Z'] },
        primeroJulio: { nombre: 'Primero de Julio S.A.', lineas: ['195'], ramales: ['X Dique Lujan'] },
        condor: { nombre: 'Condor SRL', lineas: ['L4'], ramales: ['Liniers Directo'] },
        casanova: { nombre: 'Transporte Automotor Casanova S.A.', lineas: ['208', '11'], ramales: ['Geli - U. de Lomas - San Justo - Est. Isidro Casanova'] },
        moqsa: { nombre: 'Micro Omnibus Quilmes S.A.', lineas: ['159', '219', '300', '584', '603', '619'], ramales: ['Correo - Berazategui'] },
        laUnionVicenteLopez: { nombre: 'La Union de Vicente Lopez', lineas: ['229'], ramales: ['X220'] },
        chubut: { nombre: 'Empresas C. R. Chubut', lineas: ['229'], ramales: ['A'] },
        mogsma: {
            nombre: 'M.O.G.S.M. S.A.',
            lineas: ['707'],
            ramales: ['Suárez x Méndez']
        },
        tum: {
            nombre: 'Transportes Unidos de Merlo S.A.',
            lineas: ['238', '297', '500'],
            ramales: [
                'Sta Rosa x Sere - Haedo',
                'Vergara - Haedo',
                'La Teja  X Libertad - Est Moron',
                'La Teja X Libertad - Distrito Militar',
                'La Teja X Libertad - Est Castelar',
                'Est 20 De Junio X Pontevedra - Est Merlo',
                'B. Campanillas X B. Rivadavia - Est. Padua',
                'Pontevedra X V. Magdalena - Est. Padua',
                'Pericon - Est. Padua',
                'San Lorenzo - Est. Padua',
                'El Ceibo - Est. Padua',
                'Petracci - Est. Padua',
                'La Teja - Est. Padua',
                'M. Gómez X B. Nuevo - Est. Merlo',
                'Helvecia X Padua - Est. Merlo',
                'B. El Mirador X V. Magdalena - Est. Merlo',
                'Lasalle X Vivero - Est. Merlo',
                'Lasalle X Vivero - Las Torres Est. Merlo',
                'Santa Isabel 2 X Heredia - Est. Merlo ',
                'EL Ceibo - Est. Merlo',
                'El Cortijo X B. El Mirador - Est. Merlo',
                'Luchetti X B. Los Vascos - Est. Merlo',
                'B. Matera X B. Rivadavia - Est. Merlo',
                'La Teja - Est. Merlo'
            ]
        }
    };

    const FORMATO_CAMPOS = {
        callao: ['name','int','ing-srv','sda-term-i','llg-term-i','receso','sda-term-v','llg-term-v'],
        primeroJulio: ['name','int','sda-term-i','llg-term-i','sda-term-v','llg-term-v','satisfaccion','adelanto_atraso_ida','adelanto_atraso_vuelta'],
        condor: ['name','int','sda-term-i','llg-term-i','sda-term-v','llg-term-v'],
        casanova: ['name','int','modelo','sda-term-i','llg-term-i','receso','sda-term-v','llg-term-v','adelanto_atraso_ida','adelanto_atraso_vuelta'],
        moqsa: ['name','int','sda-term-i','llg-term-i','sda-term-v','llg-term-v','satisfaccion','adelanto_atraso_ida','adelanto_atraso_vuelta'],
        laUnionVicenteLopez: ['name','int','modelo','sda-term-i','llg-term-i','receso','sda-term-v','llg-term-v','satisfaccion'],
        chubut: ['name','int','modelo','sda-term-i','llg-term-i','receso','sda-term-v','llg-term-v','satisfaccion'],
        mogsma: ['name','int','sda-term-i','llg-term-i','sda-term-v','llg-term-v'],
        tum: ['name','legajo','int','sda-term-i','llg-term-i','receso','sda-term-v','llg-term-v','satisfaccion']
    };

    const TODOS_CAMPOS = ['name','legajo','int','modelo','ing-srv','sda-term-i','llg-term-i','receso','sda-term-v','llg-term-v','satisfaccion','adelanto_atraso_ida','adelanto_atraso_vuelta'];

    const timeDisplay = document.getElementById('timeDisplay');
    const phaseIndicator = document.getElementById('phaseIndicator');
    const totalTimeDisplay = document.getElementById('totalTimeDisplay');
    const ramalDisplay = document.getElementById('ramalDisplay');
    const lineaDisplay = document.getElementById('lineaDisplay');
    const routeTimeBadge = document.getElementById('routeTimeBadge');
    const btnMain = document.getElementById('btnMain');
    const resultPanel = document.getElementById('resultPanel');
    const btnCopy = document.getElementById('btnCopy');
    const toast = document.getElementById('toast');

    const ingSrvInput = document.getElementById('ing-srv');
    const sdaTermIInput = document.getElementById('sda-term-i');
    const llgTermIInput = document.getElementById('llg-term-i');
    const sdaTermVInput = document.getElementById('sda-term-v');
    const llgTermVInput = document.getElementById('llg-term-v');
    const recesoInput = document.getElementById('receso');
    const nameInput = document.getElementById('name');
    const satisfaccionInput = document.getElementById('satisfaccion');
    const adelantoAtrasoIDAInput = document.getElementById('adelanto_atraso_ida');
    const adelantoAtrasoVUELTAInput = document.getElementById('adelanto_atraso_vuelta');

    function solicitarPermisoNotificaciones() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') return;
        if (Notification.permission === 'denied') return;
        Notification.requestPermission();
    }

    function enviarNotificacion(titulo, cuerpo) {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
    
    
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(function(registration) {
                registration.showNotification(titulo, {
                    body: cuerpo,
                    icon: './logo.png',
                    badge: './logo.png',
                    vibrate: [200, 100, 200],
                    requireInteraction: true,
                    data: {}
                });
            }).catch(function(error) {
                console.warn('Error al enviar notificación vía Service Worker:', error);
                try {
                    new Notification(titulo, { body: cuerpo, icon: './logo.png' });
                } catch(e) {}
            });
        } else {
            try {
                new Notification(titulo, { body: cuerpo, icon: './logo.png' });
            } catch(e) {}
        }
    }

    function reproducirNotificacionSonido() {
        playSound('notificacion.mp3');
    }

    function esAndroid() {
        return /Android/i.test(navigator.userAgent);
    }

    async function togglePiP() {
        if (pipWindow && !pipWindow.closed) {
            try { pipWindow.close(); } catch(e) {}
            pipWindow = null;
            return;
        }

        if ('documentPictureInPicture' in window) {
            try {
                pipWindow = await documentPictureInPicture.requestWindow({
                    width: 580,
                    height: 300,
                });
                construirVentanaFlotante(pipWindow);
                return;
            } catch (e) {
                console.warn('Document PiP falló, intentando ventana emergente');
            }
        }

        if (esAndroid() || true) {
            const w = 580;
            const h = 320;
            const left = (screen.width - w) / 2;
            const top = (screen.height - h) / 2;
            const popup = window.open('', 'CronoRutaFloat', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no`);
            if (popup) {
                pipWindow = popup;
                construirVentanaFlotante(popup, true);
            } else {
                alert('⚠️ No se pudo abrir la ventana flotante. Permita las ventanas emergentes.');
            }
        }
    }

    function construirVentanaFlotante(win, esPopup) {
        const style = win.document.createElement('style');
        style.textContent = `
            body {
                margin: 0;
                padding: 12px;
                background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                color: #e2e8f0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .counter-card-pip {
                background: #16213e;
                border: 1px solid #334155;
                border-radius: 12px;
                padding: 16px;
                width: 100%;
                max-width: 520px;
                box-shadow: 0 4px 24px rgba(0,0,0,0.3);
            }
            .counter-header-pip {
                display: flex;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 8px;
                font-size: 0.75rem;
                color: #94a3b8;
            }
            .counter-header-pip span {
                background: #0f3460;
                padding: 4px 10px;
                border-radius: 20px;
                font-weight: 500;
            }
            .counter-header-pip strong { color: #0ea5e9; }
            .time-display-pip {
                text-align: center;
                font-size: 3rem;
                font-weight: 700;
                font-variant-numeric: tabular-nums;
                font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
                letter-spacing: -2px;
                padding: 8px 0;
                transition: color 0.4s ease;
            }
            .time-display-pip.going { color: #22c55e; text-shadow: 0 0 20px rgba(34,197,94,0.3); }
            .time-display-pip.warning { color: #f59e0b; text-shadow: 0 0 20px rgba(245,158,11,0.4); }
            .time-display-pip.returning { color: #ef4444; text-shadow: 0 0 20px rgba(239,68,68,0.3); }
            .time-display-pip.paused { color: #94a3b8; }
            .phase-indicator-pip {
                text-align: center;
                font-size: 0.8rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 4px;
                padding: 4px 12px;
                border-radius: 20px;
                display: inline-block;
            }
            .phase-ida-pip { background: rgba(34,197,94,0.15); color: #22c55e; }
            .phase-espera-pip { background: rgba(245,158,11,0.15); color: #f59e0b; }
            .phase-vuelta-pip { background: rgba(239,68,68,0.15); color: #ef4444; }
            .total-time-pip {
                text-align: center;
                font-size: 0.75rem;
                color: #94a3b8;
                margin-top: 6px;
                padding: 6px;
                background: #0f3460;
                border-radius: 8px;
            }
            .total-time-pip strong { color: #0ea5e9; }
            .btn-pip-close {
                position: fixed;
                top: 8px;
                right: 8px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 1px solid #334155;
                background: #0f3460;
                color: #e2e8f0;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
            }
        `;
        win.document.head.innerHTML = '';
        win.document.head.appendChild(style);
        win.document.title = 'CronoRuta Pro';

        const cardHTML = `
            <div class="counter-card-pip">
                <div class="counter-header-pip">
                    <span>🚏 Ramal: <strong id="pipRamal">—</strong></span>
                    <span>🔢 Línea: <strong id="pipLinea">—</strong></span>
                </div>
                <div class="time-display-pip paused" id="pipTimeDisplay">+ 00:00</div>
                <div style="text-align:center;">
                    <span class="phase-indicator-pip phase-ida-pip" id="pipPhaseIndicator">⏳ Esperando inicio</span>
                    <span class="route-time-badge" id="pipRouteTimeBadge" style="display:inline-block;background:#0f3460;padding:2px 10px;border-radius:20px;font-size:0.7rem;margin-left:6px;color:#0ea5e9;">⏱️ 10 min</span>
                </div>
                <div class="total-time-pip" id="pipTotalTimeDisplay">Tiempo total: <strong>—</strong></div>
            </div>
            <button class="btn-pip-close" id="pipCloseBtn">✕</button>
        `;
        win.document.body.innerHTML = cardHTML;

        win.document.getElementById('pipCloseBtn').addEventListener('click', () => {
            try { win.close(); } catch(e) {}
            pipWindow = null;
        });

        function actualizarPiP() {
            if (!pipWindow || pipWindow.closed) return;
            try {
                const pipRamal = pipWindow.document.getElementById('pipRamal');
                const pipLinea = pipWindow.document.getElementById('pipLinea');
                const pipTimeDisplay = pipWindow.document.getElementById('pipTimeDisplay');
                const pipPhaseIndicator = pipWindow.document.getElementById('pipPhaseIndicator');
                const pipRouteTimeBadge = pipWindow.document.getElementById('pipRouteTimeBadge');
                const pipTotalTimeDisplay = pipWindow.document.getElementById('pipTotalTimeDisplay');

                if (pipRamal) pipRamal.textContent = ramal || '—';
                if (pipLinea) pipLinea.textContent = linea || '—';
                if (pipRouteTimeBadge) pipRouteTimeBadge.textContent = `⏱️ ${Math.round(totalRouteSeconds / 60)} min`;
                if (pipTimeDisplay) {
                    pipTimeDisplay.textContent = timeDisplay.textContent;
                    pipTimeDisplay.className = 'time-display-pip ' + (timeDisplay.className.replace('time-display ', '') || 'paused');
                }
                if (pipPhaseIndicator) {
                    pipPhaseIndicator.textContent = phaseIndicator.textContent;
                    pipPhaseIndicator.className = 'phase-indicator-pip ' + phaseIndicator.className.replace('phase-indicator ', '').replace('phase-ida', 'phase-ida-pip').replace('phase-espera', 'phase-espera-pip').replace('phase-vuelta', 'phase-vuelta-pip');
                }
                if (pipTotalTimeDisplay) {
                    pipTotalTimeDisplay.innerHTML = totalTimeDisplay.innerHTML;
                }
            } catch(e) {}
        }

        const pipInterval = setInterval(actualizarPiP, 200);
        actualizarPiP();

        win.addEventListener('pagehide', () => {
            clearInterval(pipInterval);
            pipWindow = null;
        });
    }

    // ============ SISTEMA DE AUDIO ROBUSTO ============
    const audioCache = {};
    let audioDesbloqueado = false;

    const ARCHIVOS_AUDIO = {
        'start.mp3': './start.mp3',
        'sound1.mp3': './sound1.mp3',
        'notificacion.mp3': './notificacion.mp3'
    };

    function precargarAudios() {
        Object.keys(ARCHIVOS_AUDIO).forEach(nombre => {
            try {
                const a = new Audio();
                a.src = ARCHIVOS_AUDIO[nombre];
                a.preload = 'auto';
                a.volume = 1.0;
                a.addEventListener('error', () => {
                    console.error('❌ No se pudo cargar el audio:', ARCHIVOS_AUDIO[nombre]);
                }); 
                a.load();
                audioCache[nombre] = a;
            } catch(e) {
                console.error('Error al precargar audio:', nombre, e);
            }
        });
    }

    function desbloquearAudio() {
        if (audioDesbloqueado) return;
        audioDesbloqueado = true;
        Object.keys(audioCache).forEach(nombre => {
            const a = audioCache[nombre];
            if (!a) return;
            const p = a.play();
            if (p && p.then) {
                p.then(() => {
                    a.pause();
                    a.currentTime = 0;
                }).catch(() => {});
            }
        });
    }

    document.addEventListener('touchstart', desbloquearAudio, { once: true });
    document.addEventListener('click', desbloquearAudio, { once: true });
    document.addEventListener('keydown', desbloquearAudio, { once: true });

    async function playSound(nombreArchivo) {
        const ruta = ARCHIVOS_AUDIO[nombreArchivo] || ('./' + nombreArchivo);
        try {
            let audio = audioCache[nombreArchivo];
            if (!audio) {
                audio = new Audio(ruta);
                audio.preload = 'auto';
                audio.volume = 1.0;
                audioCache[nombreArchivo] = audio;
            }
            audio.currentTime = 0;
            audio.volume = 1.0;
            await audio.play();
        } catch (err) {
            console.warn('⚠️ No se pudo reproducir', ruta, '→', err.name, err.message);
            if (err.name === 'NotAllowedError') {
                console.warn('El navegador bloqueó el audio. Se necesita una interacción del usuario.');
            } else if (err.name === 'NotSupportedError' || err.name === 'NotReadableError') {
                console.error('El archivo no existe o no se puede leer:', ruta);
                mostrarToast('❌ No se encontró ' + nombreArchivo);
            }
        }
    }

    function playStartSound() { playSound('start.mp3'); }
    function playClickSound() { playSound('sound1.mp3'); }
    function reproducirNotificacionSonido() { playSound('notificacion.mp3'); }

    function blockButtons(ms = 500) {
        if (isProcessing) return false;
        isProcessing = true;
        document.querySelectorAll('button:not(.navbar-btn)').forEach(b => b.disabled = true);
        setTimeout(() => {
            document.querySelectorAll('button:not(.navbar-btn)').forEach(b => b.disabled = false);
            isProcessing = false;
        }, ms);
        return true;
    }

    function handleStartSound() { playStartSound(); }

    function iniciarVuelta() {
        if (phase !== 'espera') return;
        esperaTime += Math.floor((Date.now() - currentSegmentStart) / 1000);
        currentElapsed = 0;
        phase = 'vuelta';
        currentSegmentStart = Date.now();
        mainState = 4;
        updateMainButton();
        playStartSound();
        updateDisplay();
    }

    function formatTime(totalSeconds) {
        const isNegative = totalSeconds < 0;
        const abs = Math.abs(totalSeconds);
        const mins = Math.floor(abs / 60);
        const secs = abs % 60;
        const sign = isNegative ? '- ' : '+ ';
        return sign + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    function updateDisplay() {
        if (currentSegmentStart && phase !== 'idle') {
            currentElapsed = Math.floor((Date.now() - currentSegmentStart) / 1000);
        }

        let displayTime = 0;
        let cssClass = 'paused';
        let remaining = 0;

        if (phase === 'ida') {
            const totalElapsed = idaTime + currentElapsed;
            remaining = totalRouteSeconds - totalElapsed;
            displayTime = remaining > 0 ? -remaining : Math.abs(remaining);

            if (remaining <= 0 && !notificacionIdaEnviada) {
                notificacionIdaEnviada = true;
                const minutosRamal = Math.round(totalRouteSeconds / 60);
                enviarNotificacion(
                    '⏱️ Tiempo de IDA completado',
                    `Ya vas ${minutosRamal} minutos en la IDA...`
                );
                reproducirNotificacionSonido();
            }
        } else if (phase === 'espera') {
            displayTime = esperaTime + currentElapsed;
            cssClass = 'going';

            if (esperaDuration > 0 && currentElapsed >= esperaDuration && !notificacionEsperaEnviada) {
                notificacionEsperaEnviada = true;
                const minutosEspera = Math.round(esperaDuration / 60);
                enviarNotificacion(
                    '⏳ Tiempo de espera completado',
                    `Ya tienes que empezar la vuelta. Ya pasaron ${minutosEspera} minutos...`
                );
                reproducirNotificacionSonido();
            }

            if (esperaDuration > 0 && currentElapsed >= esperaDuration && !esperaAutomaticaDisparada) {
                esperaAutomaticaDisparada = true;
                iniciarVuelta();
                return;
            }
        } else if (phase === 'vuelta') {
            const totalElapsed = vueltaTime + currentElapsed;
            remaining = totalRouteSeconds - totalElapsed;
            displayTime = remaining > 0 ? -remaining : Math.abs(remaining);

            if (remaining <= 0 && !notificacionVueltaEnviada) {
                notificacionVueltaEnviada = true;
                const minutosRamal = Math.round(totalRouteSeconds / 60);
                enviarNotificacion(
                    '⏱️ Tiempo de VUELTA completado',
                    `Ya vas ${minutosRamal} minutos en la VUELTA...`
                );
                reproducirNotificacionSonido();
            }
        }

        if (phase === 'ida' || phase === 'vuelta') {
            const ratio = remaining / totalRouteSeconds;
            if (remaining > 0 && ratio > 0.55) {
                cssClass = 'going';
            } else if (remaining > 0 && ratio >= 0.45) {
                cssClass = 'warning';
            } else {
                cssClass = 'returning';
            }
        }

        timeDisplay.textContent = formatTime(displayTime);
        timeDisplay.className = 'time-display ' + cssClass;

        let phaseText = '⏳ Esperando inicio';
        let phaseClass = 'phase-ida';
        if (phase === 'ida') { phaseText = '🟢 IDA'; phaseClass = 'phase-ida'; }
        else if (phase === 'espera') { phaseText = '🟡 ESPERA'; phaseClass = 'phase-espera'; }
        else if (phase === 'vuelta') { phaseText = '🔴 VUELTA'; phaseClass = 'phase-vuelta'; }
        phaseIndicator.textContent = phaseText;
        phaseIndicator.className = 'phase-indicator ' + phaseClass;

        const total = idaTime + currentElapsed + esperaTime + vueltaTime;
        totalTimeDisplay.innerHTML = `Tiempo total: <strong>${formatTime(total)}</strong>`;

        autoCompletarCampos();
    }

    function autoCompletarCampos() {
        const valor = localStorage.getItem('valores');
        if (valor !== 'contador-si') return;
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const timeStr = hh + ':' + mm;

        if (phase === 'ida' && !ingSrvInput.value) {
            ingSrvInput.value = timeStr;
        }
        if (phase === 'ida' && currentElapsed > 0 && !sdaTermIInput.value) {
            const startTime = new Date(Date.now() - (idaTime + currentElapsed) * 1000);
            const shh = String(startTime.getHours()).padStart(2, '0');
            const smm = String(startTime.getMinutes()).padStart(2, '0');
            sdaTermIInput.value = shh + ':' + smm;
        }
        if (idaFinalizada && !llgTermIInput.value) {
            llgTermIInput.value = timeStr;
        }
        if (phase === 'espera' && !recesoInput.value && esperaConfirmada) {
            const esperaMin = Math.floor(esperaDuration / 60);
            recesoInput.value = esperaMin || 15;
        }
        if (phase === 'vuelta' && currentElapsed > 0 && !sdaTermVInput.value) {
            const startTime = new Date(Date.now() - (vueltaTime + currentElapsed) * 1000);
            const shh = String(startTime.getHours()).padStart(2, '0');
            const smm = String(startTime.getMinutes()).padStart(2, '0');
            sdaTermVInput.value = shh + ':' + smm;
        }
        if (phase === 'vuelta' && vueltaTime + currentElapsed >= totalRouteSeconds && !llgTermVInput.value) {
            llgTermVInput.value = timeStr;
        }
    }

    function calcularAdelantoAtrasoIDA() {
        if (localStorage.getItem('valores') !== 'contador-si') return;
        const real = idaTime;
        const programado = totalRouteSeconds;
        const diffMinutos = Math.round((real - programado) / 60);
        let texto = '';
        if (diffMinutos === 0) texto = '0 min';
        else if (diffMinutos > 0) texto = '-' + diffMinutos + ' min';
        else texto = '+' + Math.abs(diffMinutos) + ' min';
        adelantoAtrasoIDAInput.value = texto;
        localStorage.setItem('input_adelanto_atraso_ida', texto);
    }

    function calcularAdelantoAtrasoVUELTA() {
        if (localStorage.getItem('valores') !== 'contador-si') return;
        const real = vueltaTime;
        const programado = totalRouteSeconds;
        const diffMinutos = Math.round((real - programado) / 60);
        let texto = '';
        if (diffMinutos === 0) texto = '0 min';
        else if (diffMinutos > 0) texto = '-' + diffMinutos + ' min';
        else texto = '+' + Math.abs(diffMinutos) + ' min';
        adelantoAtrasoVUELTAInput.value = texto;
        localStorage.setItem('input_adelanto_atraso_vuelta', texto);
    }

    function updateMainButton() {
        const texts = {
            1: 'Iniciar Ramal - S: IDA',
            2: 'Finalizar Ramal - S: IDA',
            3: 'Iniciar Ramal - S: VUELTA',
            4: 'Finalizar Ramal - S: VUELTA'
        };
        btnMain.textContent = texts[mainState] || 'Iniciar Ramal - S: IDA';
    }

    function handleMainClick() {
        if (!blockButtons()) return;
        playClickSound();

        if (mainState === 1) {
            if (!ramal || !linea) {
                alert('⚠️ Por favor, defina la empresa, línea y ramal antes de iniciar.');
                return;
            }
            detenerTimer();
            idaTime = 0;
            esperaTime = 0;
            vueltaTime = 0;
            currentElapsed = 0;
            esperaConfirmada = false;
            idaFinalizada = false;
            esperaAutomaticaDisparada = false;
            notificacionIdaEnviada = false;
            notificacionVueltaEnviada = false;
            notificacionEsperaEnviada = false;
            if (localStorage.getItem('valores') === 'contador-si') {
                ingSrvInput.value = '';
                sdaTermIInput.value = '';
                llgTermIInput.value = '';
                recesoInput.value = '';
                sdaTermVInput.value = '';
                llgTermVInput.value = '';
                adelantoAtrasoIDAInput.value = '';
                adelantoAtrasoVUELTAInput.value = '';
            }
            phase = 'ida';
            currentSegmentStart = Date.now();
            mainState = 2;
            updateMainButton();
            handleStartSound();
            timerInterval = setInterval(updateDisplay, 200);
            updateDisplay();
        }
        else if (mainState === 2) {
            if (phase !== 'ida') return;
            document.getElementById('esperaModal').classList.add('active');
            document.getElementById('esperaInput').focus();
        }
        else if (mainState === 3) {
            if (phase !== 'espera') return;
            iniciarVuelta();
        }
        else if (mainState === 4) {
            if (phase !== 'vuelta') return;
            vueltaTime += Math.floor((Date.now() - currentSegmentStart) / 1000);
            currentElapsed = 0;
            detenerTimer();
            phase = 'idle';
            mainState = 1;
            updateMainButton();
            handleStartSound();
            if (localStorage.getItem('valores') === 'contador-si') {
                const now = new Date();
                const hh = String(now.getHours()).padStart(2, '0');
                const mm = String(now.getMinutes()).padStart(2, '0');
                llgTermVInput.value = hh + ':' + mm;
                calcularAdelantoAtrasoVUELTA();
            }
            updateDisplay();
        }
    }

    function confirmarEspera() {
        const input = document.getElementById('esperaInput');
        const minutos = parseFloat(input.value);
        if (isNaN(minutos) || minutos < 0) {
            alert('⚠️ Por favor, ingrese un número válido de minutos.');
            return;
        }
        esperaDuration = minutos * 60;
        esperaConfirmada = true;
        esperaAutomaticaDisparada = false;
        notificacionEsperaEnviada = false;
        if (localStorage.getItem('valores') === 'contador-si') {
            recesoInput.value = minutos;
        }
        document.getElementById('esperaModal').classList.remove('active');

        if (phase === 'ida') {
            idaTime += Math.floor((Date.now() - currentSegmentStart) / 1000);
            currentElapsed = 0;
            idaFinalizada = true;
            if (localStorage.getItem('valores') === 'contador-si') {
                const now = new Date();
                const hh = String(now.getHours()).padStart(2, '0');
                const mm = String(now.getMinutes()).padStart(2, '0');
                llgTermIInput.value = hh + ':' + mm;
                calcularAdelantoAtrasoIDA();
            }
            phase = 'espera';
            currentSegmentStart = Date.now();
            mainState = 3;
            updateMainButton();
            handleStartSound();
            updateDisplay();
        }
    }

    function detenerTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        currentSegmentStart = null;
        currentElapsed = 0;
    }

    let modalMode = '';

    function abrirModal(mode) {
        modalMode = mode;
        const title = document.getElementById('modalTitle');
        const input = document.getElementById('modalInput');
        if (mode === 'tiempo') {
            title.textContent = 'Definir tiempo del recorrido (minutos)';
            input.value = totalRouteSeconds / 60;
            input.placeholder = 'Ej: 10';
            input.type = 'number';
        }
        document.getElementById('modalOverlay').classList.add('active');
        input.focus();
    }

    function cerrarModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    }

    document.getElementById('modalConfirm').addEventListener('click', () => {
        const input = document.getElementById('modalInput');
        const valor = input.value.trim();
        if (modalMode === 'tiempo') {
            const minutos = parseFloat(valor);
            if (!isNaN(minutos) && minutos > 0) {
                totalRouteSeconds = Math.round(minutos * 60);
                routeTimeBadge.textContent = `⏱️ ${Math.round(minutos)} min`;
                localStorage.setItem('tiempo_guardado', minutos);
            }
        }
        cerrarModal();
    });

    document.getElementById('modalInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('modalConfirm').click();
        if (e.key === 'Escape') cerrarModal();
    });

    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) cerrarModal();
    });

    function abrirModalPreferencias() {
        document.getElementById('preferenciasOverlay').classList.add('active');
    }

    function cerrarPreferencias() {
        document.getElementById('preferenciasOverlay').classList.remove('active');
    }

    document.getElementById('preferenciasOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) cerrarPreferencias();
    });

    function abrirModalCredits() {
        document.getElementById('creditsOverlay').classList.add('active');
    }

    function cerrarModalCredits() {
        document.getElementById('creditsOverlay').classList.remove('active');
    }

    document.getElementById('creditsOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) cerrarModalCredits();
    });

    function saveData(value) {
        try {
            localStorage.setItem('valores', value);
            cerrarPreferencias();
            aplicarPreferencias();
            mostrarToast('✅ Preferencia guardada correctamente');
        } catch (error) {}
    }

    function aplicarPreferencias() {
        const valor = localStorage.getItem('valores');
        const campos = ['ing-srv', 'sda-term-i', 'llg-term-i', 'receso', 'sda-term-v', 'llg-term-v'];
        const botones = ['btn-ing-srv', 'btn-sda-term-i', 'btn-llg-term-i', 'btn-sda-term-v', 'btn-llg-term-v'];
        campos.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = (valor === 'contador-si');
        });
        botones.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = (valor === 'contador-si');
        });
    }

    function guardarInput(id) {
        const el = document.getElementById(id);
        if (!el) return;
        const val = el.value;
        if (val) localStorage.setItem('input_' + id, val);
        else localStorage.removeItem('input_' + id);
    }

    function cargarInputs() {
        const ids = ['name','legajo','int','modelo','ing-srv','sda-term-i','llg-term-i','receso','sda-term-v','llg-term-v','satisfaccion','adelanto_atraso_ida','adelanto_atraso_vuelta'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const saved = localStorage.getItem('input_' + id);
            if (saved) el.value = saved;
        });
        const tiempoGuardado = localStorage.getItem('tiempo_guardado');
        if (tiempoGuardado) {
            const min = parseFloat(tiempoGuardado);
            if (!isNaN(min) && min > 0) {
                totalRouteSeconds = Math.round(min * 60);
                routeTimeBadge.textContent = `⏱️ ${Math.round(min)} min`;
            }
        }
        try {
            const nombre = localStorage.getItem('chofer_nombre');
            const legajo = localStorage.getItem('chofer_legajo');
            const interno = localStorage.getItem('chofer_interno');
            if (nombre) document.getElementById('name').value = nombre;
            if (legajo) document.getElementById('legajo').value = legajo;
            if (interno) document.getElementById('int').value = interno;
        } catch(e) {}
    }

    function guardarDatosChofer() {
        try {
            localStorage.setItem('chofer_nombre', document.getElementById('name').value.trim());
            localStorage.setItem('chofer_legajo', document.getElementById('legajo').value.trim());
            localStorage.setItem('chofer_interno', document.getElementById('int').value.trim());
        } catch(e) {}
    }

    function mostrarToast(mensaje) {
        toast.textContent = mensaje;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    function setNow(inputId) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        document.getElementById(inputId).value = hh + ':' + mm;
        guardarInput(inputId);
    }

    function inicializarAutocompletado() {
        const inputs = document.querySelectorAll('.autocomplete');
        inputs.forEach(input => {
            const inputId = input.id;
            if (!inputId) return;
            let datalist = document.getElementById('datalist_' + inputId);
            if (!datalist) {
                datalist = document.createElement('datalist');
                datalist.id = 'datalist_' + inputId;
                document.body.appendChild(datalist);
            }
            input.setAttribute('list', 'datalist_' + inputId);

            input.addEventListener('focus', function() {
                cargarHistorial(inputId);
            });

            input.addEventListener('input', function() {
                const valor = this.value.trim();
                if (valor.length > 0) {
                    guardarHistorial(inputId, valor);
                }
            });
        });
    }

    function cargarHistorial(inputId) {
        const datalist = document.getElementById('datalist_' + inputId);
        if (!datalist) return;
        const historial = JSON.parse(localStorage.getItem('autocomplete_history') || '{}');
        const valores = historial[inputId] || [];
        datalist.innerHTML = '';
        valores.forEach(val => {
            const option = document.createElement('option');
            option.value = val;
            datalist.appendChild(option);
        });
    }

    function guardarHistorial(inputId, valor) {
        const historial = JSON.parse(localStorage.getItem('autocomplete_history') || '{}');
        if (!historial[inputId]) historial[inputId] = [];
        let valores = historial[inputId];
        valores = valores.filter(v => v !== valor);
        valores.unshift(valor);
        if (valores.length > 10) valores.pop();
        historial[inputId] = valores;
        localStorage.setItem('autocomplete_history', JSON.stringify(historial));
    }

    function poblarEmpresas() {
        const sel = document.getElementById('empresaSelect');
        sel.innerHTML = '';
        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = 'Seleccione una empresa';
        blank.disabled = true;
        sel.appendChild(blank);
        Object.keys(EMPRESAS).forEach(key => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = EMPRESAS[key].nombre;
            sel.appendChild(opt);
        });
    }

    function poblarLineas(empKey) {
        const sel = document.getElementById('lineaSelect');
        sel.innerHTML = '';
        if (!empKey || !EMPRESAS[empKey]) return;
        EMPRESAS[empKey].lineas.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l;
            opt.textContent = l;
            sel.appendChild(opt);
        });
    }

    function poblarRamales(empKey) {
        const sel = document.getElementById('ramalSelect');
        sel.innerHTML = '';
        if (!empKey || !EMPRESAS[empKey]) return;
        EMPRESAS[empKey].ramales.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            sel.appendChild(opt);
        });
    }

    function aplicarCamposVisibles(formato) {
        const campos = FORMATO_CAMPOS[formato] || [];
        TODOS_CAMPOS.forEach(id => {
            const fg = document.getElementById('fg-' + id);
            if (fg) fg.style.display = campos.includes(id) ? '' : 'none';
        });
    }

    function abrirModalFormato() {
        const emp = formatActual || localStorage.getItem('formato_empresa') || '';
        if (emp && EMPRESAS[emp]) {
            document.getElementById('empresaSelect').value = emp;
            poblarLineas(emp);
            poblarRamales(emp);
            const lin = linea || localStorage.getItem('linea_guardado');
            const ram = ramal || localStorage.getItem('ramal_guardado');
            if (lin) document.getElementById('lineaSelect').value = lin;
            if (ram) document.getElementById('ramalSelect').value = ram;
        } else {
            poblarLineas('');
            poblarRamales('');
        }
        document.getElementById('formatoOverlay').classList.add('active');
    }

    function confirmarFormato() {
        const emp = document.getElementById('empresaSelect').value;
        if (!emp) {
            alert('⚠️ Seleccione una empresa.');
            return;
        }
        const lin = document.getElementById('lineaSelect').value;
        const ram = document.getElementById('ramalSelect').value;
        formatActual = emp;
        linea = lin;
        ramal = ram;
        localStorage.setItem('formato_empresa', emp);
        localStorage.setItem('linea_guardado', lin);
        localStorage.setItem('ramal_guardado', ram);
        ramalDisplay.textContent = ram || '—';
        lineaDisplay.textContent = lin || '—';
        aplicarCamposVisibles(emp);
        document.getElementById('formatoOverlay').classList.remove('active');
    }

    document.getElementById('empresaSelect').addEventListener('change', function() {
        poblarLineas(this.value);
        poblarRamales(this.value);
    });

    document.getElementById('formatoOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            document.getElementById('formatoOverlay').classList.remove('active');
        }
    });

    function completar() {
        guardarDatosChofer();
        const formato = formatActual;
        if (!formato) {
            alert('⚠️ Por favor, seleccione una empresa.');
            return;
        }
        const name = document.getElementById('name').value.trim();
        const legajo = document.getElementById('legajo').value.trim();
        const interno = document.getElementById('int').value.trim();
        const modelo = document.getElementById('modelo').value.trim();
        const ingSrv = document.getElementById('ing-srv').value;
        const sdaTermI = document.getElementById('sda-term-i').value;
        const llgTermI = document.getElementById('llg-term-i').value;
        const recesoValor = document.getElementById('receso').value;
        const sdaTermV = document.getElementById('sda-term-v').value;
        const llgTermV = document.getElementById('llg-term-v').value;
        const satisfaccion = document.getElementById('satisfaccion').value.trim();
        const adelantoAtrasoIDA = document.getElementById('adelanto_atraso_ida').value.trim();
        const adelantoAtrasoVUELTA = document.getElementById('adelanto_atraso_vuelta').value.trim();

        const requeridosBase = ['name','int','sda-term-i','llg-term-i','sda-term-v','llg-term-v'];
        if (formato === 'callao') requeridosBase.push('ing-srv','receso');
        if (formato === 'casanova') requeridosBase.push('receso');
        if (formato === 'laUnionVicenteLopez') requeridosBase.push('receso');
        if (formato === 'chubut') requeridosBase.push('receso');
        if (formato === 'tum') requeridosBase.push('legajo','receso');

        const faltantes = requeridosBase.filter(id => {
            const el = document.getElementById(id);
            return el && !el.value.trim();
        });
        if (faltantes.length) {
            alert('⚠️ Por favor, complete todos los campos antes de enviar.');
            return;
        }

        let plantilla = '';

        if (formato === 'callao') {
            plantilla = `
*Planilla✍🏻*
*Horario de entrada:* ${ingSrv}
*Inicio...*

*Hora de salida de la Terminal:* ${sdaTermI}
*Hora de llegada al destino:* ${llgTermI}

*Descanso: ${recesoValor} minutos.*
*Vuelta...*

*Hora de salida de la Terminal:* ${sdaTermV}
*Hora de llegada a la Terminal:* ${llgTermV}

*Chófer:* ${name}
*Interno:* ${interno}
*Línea:* ${linea || '—'}-${ramal || '—'}
`.trim();
        } else if (formato === 'primeroJulio') {
            const atrasoIda = adelantoAtrasoIDA ? ` (${adelantoAtrasoIDA})` : '';
            const atrasoVuelta = adelantoAtrasoVUELTA ? ` (${adelantoAtrasoVUELTA})` : '';
            plantilla = `
_*PLANILLA*_

_Empresa:_ Primero de Julio S.A

_Nombre del chófer:_ ${name}

_Interno:_ ${interno}

_Línea:_ ${linea || '—'}

_Ramal:_ ${ramal || '—'}

*HORARIO:* (Mañana/Tarde/Noche)

*IDA*

_Salida:_ ${sdaTermI}

_Llegada:_ ${llgTermI}${atrasoIda}

*VUELTA*

_Salida:_ ${sdaTermV}

_Llegada:_ ${llgTermV}${atrasoVuelta}

_¿Satisfacción? %:_ ${satisfaccion || '_________________'}

_Fotos ✅_
`.trim();
        } else if (formato === 'condor') {
            plantilla = `
*PLANILLA CONDOR SRL*
*Nombre del chofer:* ${name}
*Interno:* ${interno}
*Linea/recorrido:* ${linea || '—'} - ${ramal || '—'}
*Turno:* noche
*Vueltas:* 1
*Horario*
    *IDA 1:*
Salida: ${sdaTermI}
Llegada: ${llgTermI}

*VUELTA 1:*
Salida: ${sdaTermV}
Llegada: ${llgTermV}
`.trim();
        } else if (formato === 'casanova') {
            plantilla = `
Planilla Transporte Automotor Casanova S.A

Linea : ${linea || '—'}
Chofer : ${name}
Coche: ${modelo || '—'}
Interno : ${interno}
Ramal : ${ramal || '—'}
IDA

Salida : ${sdaTermI}

llegada: ${llgTermI}

Adelanto/Atraso IDA: ${adelantoAtrasoIDA || '—'}

ESPERA

Espera : ${recesoValor} Minutos

VUELTA           

Salida : ${sdaTermV}

Llegada: ${llgTermV}

Adelanto/Atraso VUELTA: ${adelantoAtrasoVUELTA || '—'}

Incidente : 
`.trim();
        } else if (formato === 'moqsa') {
            const atrasoIda = adelantoAtrasoIDA ? ` (${adelantoAtrasoIDA})` : '';
            const atrasoVuelta = adelantoAtrasoVUELTA ? ` (${adelantoAtrasoVUELTA})` : '';
            plantilla = `
_*PLANILLA*_

_Empresa:_ MOQSA

_Nombre del chófer:_ ${name}

_Interno:_ ${interno}

_Línea:_ ${linea || '—'}

_Ramal:_ ${ramal || '—'}

*HORARIO:* (Mañana/Tarde/Noche)

*IDA*

_Salida:_ ${sdaTermI}

_Llegada:_ ${llgTermI}${atrasoIda}

*VUELTA*

_Salida:_ ${sdaTermV}

_Llegada:_ ${llgTermV}${atrasoVuelta}

_¿Satisfacción? :_ ${satisfaccion || '_________________'}

_Fotos ✅_
`.trim();
        } else if (formato === 'laUnionVicenteLopez') {
            plantilla = `
_*Planillas La Unión de Vicente Lopez S.A*_

*_Chofer: ${name}_* 
*_Linea:_* ${linea || '—'}
 *_Ramal:_* ${ramal || '—'}
*_Interno:_* ${interno}
*_Turno:_* 
*_Unidad:_* ${modelo || '—'}

*_IDA_*

*_Salida:_* ${sdaTermI}
*_Llegada:_* ${llgTermI}

*_Espera:_* ${recesoValor}

*_VUELTA_*

*_Salida:_* ${sdaTermV}
*_Llegada:_* ${llgTermV}
*_Satisfaccion:_* ${satisfaccion || '_________________'}
*_Justificación:_*
`.trim();
        } else if (formato === 'chubut') {
            plantilla = `
*PLANILLA:* 

*CHOFER:* ${name}
*COCHE N°:* ${modelo || '—'}
*RAMAL:* ${ramal || '—'}
*INSPECCIÓN MECANICA:* 

IDA:

*SALIDA:* ${sdaTermI}
*LLEGADA:* ${llgTermI}
*ESPERA:* ${recesoValor}

VUELTA:

*SALIDA*: ${sdaTermV}
*LLEGADA:* ${llgTermV}

*INCONVENIENTES:* 
*SATISFACCIÓN:* ${satisfaccion || '_________________'}
*ESTADO DEL COCHE:*
`.trim();
        } else if (formato === 'mogsma') {
            plantilla = `
*PLANILLAS M.O.G.S.M 🚍*

*Nombre:* ${name}
*Interno:* ${interno}
*Linea:* ${linea || '—'}
*Ramal: ${ramal || '—'}


*HORARIOS 🕒*

*IDA
*Salida:* ${sdaTermI}
*Llegada:* ${llgTermI}

*Vuelta:1

*CONTEO DE PLANILLAS ECHAS*

*Planillas totales:*1
*Planillas semanales:*0
*Planillas mensuales:*0
`.trim();
        } else if (formato === 'tum') {
            const fechaHoy = new Date();
            const dia = String(fechaHoy.getDate()).padStart(2, '0');
            const mes = String(fechaHoy.getMonth() + 1).padStart(2, '0');
            const anio = fechaHoy.getFullYear();
            const fechaFormateada = `${dia}/${mes}/${anio}`;
            const esperaTexto = recesoValor ? `${recesoValor} minutos` : '—';
            plantilla = `
*PLANILLA TRANSPORTES UNIDOS DE MERLO S.A*

*CHOFER*: ${name}
*LEJAGO*: ${legajo || '—'}
*INTERNO*: ${interno}
*RAMAL*: ${ramal || '—'}
*LINEA*: ${linea || '—'}
*FECHA*: ${fechaFormateada}

*RECORRIDO*

*IDA*

*HORARIO SALIDA*: ${sdaTermI}
*HORARIO LLEGADA*: ${llgTermI}

*ESPERA*:  ${esperaTexto}

*VUELTA* 

*HORARIO DE SALIDA*: ${sdaTermV}
*HORARIO DE LLEGADA*: ${llgTermV}

*SATISFACCIÓN DE PASAJEROS/%*: ${satisfaccion || '_________________'}
`.trim();
        }

        resultPanel.textContent = plantilla;
        resultPanel.classList.add('active');
        btnCopy.style.display = 'block';
    }

    function copiarAlPortapapeles() {
        const texto = resultPanel.textContent;
        navigator.clipboard.writeText(texto).then(() => {
            mostrarToast('✅ Copiado al portapapeles');
        }).catch(() => {
            alert('❌ No se pudo copiar. Intente manualmente.');
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'BUTTON') {
                return;
            }
            e.preventDefault();
            btnMain.click();
        }
    });

    window.addEventListener('load', () => {
            solicitarPermisoNotificaciones();
            precargarAudios();

        poblarEmpresas();
        const empGuardada = localStorage.getItem('formato_empresa');
        if (empGuardada && EMPRESAS[empGuardada]) {
            document.getElementById('empresaSelect').value = empGuardada;
            poblarLineas(empGuardada);
            poblarRamales(empGuardada);
            const lin = localStorage.getItem('linea_guardado');
            const ram = localStorage.getItem('ramal_guardado');
            if (lin) document.getElementById('lineaSelect').value = lin;
            if (ram) document.getElementById('ramalSelect').value = ram;
            formatActual = empGuardada;
            linea = lin || document.getElementById('lineaSelect').value;
            ramal = ram || document.getElementById('ramalSelect').value;
            ramalDisplay.textContent = ramal || '—';
            lineaDisplay.textContent = linea || '—';
            aplicarCamposVisibles(empGuardada);
        } else {
            poblarLineas('');
            poblarRamales('');
        }
        cargarInputs();
        aplicarPreferencias();
        document.getElementById('formatoOverlay').classList.add('active');
        if (!localStorage.getItem('valores')) {
            document.getElementById('preferenciasOverlay').classList.add('active');
        }
        updateMainButton();
        updateDisplay();
        inicializarAutocompletado();
    });

    document.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('change', function() {
            if (this.id) guardarInput(this.id);
        });
        el.addEventListener('input', function() {
            if (this.id) {
                clearTimeout(this._timer);
                this._timer = setTimeout(() => guardarInput(this.id), 1000);
            }
        });
    });

    btnMain.addEventListener('click', handleMainClick);

    window.abrirModalPreferencias = abrirModalPreferencias;
    window.saveData = saveData;
    window.abrirModal = abrirModal;
    window.cerrarModal = cerrarModal;
    window.setNow = setNow;
    window.completar = completar;
    window.copiarAlPortapapeles = copiarAlPortapapeles;
    window.confirmarEspera = confirmarEspera;
    window.mostrarToast = mostrarToast;
    window.abrirModalFormato = abrirModalFormato;
    window.confirmarFormato = confirmarFormato;
    window.togglePiP = togglePiP;
    window.abrirModalCredits = abrirModalCredits;
    window.cerrarModalCredits = cerrarModalCredits;

    document.getElementById('esperaModal').addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('esperaModal').classList.remove('active');
        }
    });
    document.getElementById('esperaInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmarEspera();
    });

    mainState = 1;
    updateMainButton();
})();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado', reg))
            .catch(err => console.error('Error al registrar Service Worker', err));
    });
}
