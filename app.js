// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    // Настройка обработчика файлов
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function (e) {
            if (e.target.files.length > 0) {
                uploadFile(e.target.files[0]);
            }
        });
    }

    // Добавляем drag & drop
    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleDrop);
    }
});

// Drag & Drop функции
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.target.style.background = 'rgba(67, 97, 238, 0.2)';
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.target.style.background = '';

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        uploadFile(files[0]);
    }
}

// Уведомления
function showNotification(message, type = 'info') {
    const notif = document.getElementById('notification');
    if (!notif) return;

    notif.textContent = message;
    notif.style.display = 'block';
    notif.style.background = type === 'error' ? '#f72585' :
        type === 'success' ? '#4361ee' :
            type === 'warning' ? '#ff9f1c' : '#4cc9f0';

    setTimeout(() => {
        notif.style.display = 'none';
    }, 3000);
}

// Загрузка файла
async function uploadFile(file) {
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');

    if (!loading || !result) return;

    // Проверка типа файла
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showNotification('Пожалуйста, загрузите PDF файл', 'error');
        return;
    }

    // Показываем загрузку
    loading.style.display = 'block';
    result.style.display = 'none';

    const formData = new FormData();
    formData.append('file', file);

    try {
        // РЕАЛЬНЫЙ ЗАПРОС К БЭКЕНДУ
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'error') {
            throw new Error(data.error || 'Неизвестная ошибка');
        }

        loading.style.display = 'none';
        displayStructuredData(data);
        result.style.display = 'block';
        showNotification('Файл успешно обработан ИИ!', 'success');

    } catch (error) {
        loading.style.display = 'none';
        console.error('Ошибка:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

// Отображение структурированных данных
function displayStructuredData(data) {
    const container = document.getElementById('structuredData');

    if (!container) return;

    if (!data.all_materials) {
        container.innerHTML = `<div class="error">Материалы не созданы. Попробуйте снова.</div>`;
        return;
    }

    const m = data.all_materials;

    let html = `
        <div class="stats">
            <div class="stat-item">
                <span class="stat-number">${m.stats.total_characters}</span>
                <span class="stat-label">персонажей</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${m.stats.total_events}</span>
                <span class="stat-label">событий</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${m.stats.total_flashcards}</span>
                <span class="stat-label">карточек</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${m.stats.total_questions}</span>
                <span class="stat-label">вопросов</span>
            </div>
        </div>
        
        <!-- Анализ типа контента -->
        <div class="content-analysis">
            <h3><i class="fas fa-search"></i> Анализ контента</h3>
            <div class="analysis-card" data-type="${data.content_analysis.primary_type}">
                <p><strong><i class="fas fa-tag"></i> Тип:</strong> ${data.content_analysis.primary_type}</p>
                <p><strong><i class="fas fa-chart-line"></i> Уверенность:</strong> ${Math.round(data.content_analysis.confidence * 100)}%</p>
                <p><strong><i class="fas fa-lightbulb"></i> Рекомендация:</strong> ${data.content_analysis.reason}</p>
                
                ${data.content_analysis.secondary_types && data.content_analysis.secondary_types.length > 0 ?
            `<p><strong><i class="fas fa-layer-group"></i> Дополнительные типы:</strong> ${data.content_analysis.secondary_types.join(', ')}</p>`
            : ''}
                
                <!-- Кнопка для расширенного режима -->
                <button class="advanced-btn" onclick="showAdvancedOptions('${data.content_analysis.primary_type}')">
                    <i class="fas fa-gamepad"></i> Расширенные игровые форматы
                </button>
            </div>
        </div>
        
        <div class="materials-tabs">
            <button class="mat-tab active" onclick="showMatTab('guide')">
                <i class="fas fa-book"></i> Конспект
            </button>
            <button class="mat-tab" onclick="showMatTab('cards')">
                <i class="fas fa-layer-group"></i> Карточки
            </button>
            <button class="mat-tab" onclick="showMatTab('test')">
                <i class="fas fa-question-circle"></i> Тест
            </button>
            <button class="mat-tab" onclick="showMatTab('export')">
                <i class="fas fa-download"></i> Экспорт
            </button>
        </div>
        
        <!-- Конспект -->
        <div id="guideTab" class="mat-content active">
            <h2><i class="fas fa-graduation-cap"></i> ${m.study_guide.title}</h2>
            <p class="timestamp"><i class="far fa-clock"></i> Создано: ${m.study_guide.created_at}</p>
            
            ${m.study_guide.sections.map(section => `
                <div class="section">
                    <h3><i class="fas ${getSectionIcon(section.type)}"></i> ${section.title}</h3>
                    ${section.items.map(item => `
                        <div class="item">
                            ${item.name ? `<h4><i class="fas ${getItemIcon(section.type)}"></i> ${item.name}</h4>` : ''}
                            ${item.role ? `<p><strong><i class="fas fa-user-tag"></i> Роль:</strong> ${item.role}</p>` : ''}
                            ${item.description ? `<p>${item.description}</p>` : ''}
                            ${item.participants ? `<p><strong><i class="fas fa-users"></i> Участники:</strong> ${item.participants.join(', ')}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>
        
        <!-- Карточки -->
        <div id="cardsTab" class="mat-content">
            <h2><i class="fas fa-layer-group"></i> Карточки для запоминания</h2>
            <p>Нажми на карточку чтобы перевернуть</p>
            
            <div id="flashcardsContainer">
                ${m.flashcards.map((card, index) => `
                    <div class="flashcard" onclick="flipCard(${index})" id="card${index}">
                        <div class="front">
                            <div class="card-content">${card.front}</div>
                            ${card.hint ? `<div class="hint"><i class="fas fa-lightbulb"></i> ${card.hint}</div>` : ''}
                        </div>
                        <div class="back">
                            <div class="card-content">${card.back}</div>
                            <div>
                                <button class="difficulty-btn" onclick="event.stopPropagation(); rateCard(${index}, 1)">
                                    <i class="fas fa-frown"></i> Трудно
                                </button>
                                <button class="difficulty-btn" onclick="event.stopPropagation(); rateCard(${index}, 2)">
                                    <i class="fas fa-meh"></i> Нормально
                                </button>
                                <button class="difficulty-btn" onclick="event.stopPropagation(); rateCard(${index}, 3)">
                                    <i class="fas fa-smile"></i> Легко
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="card-controls">
                <button onclick="prevCard()">
                    <i class="fas fa-arrow-left"></i> Предыдущая
                </button>
                <span id="cardCounter">1 / ${m.flashcards.length}</span>
                <button onclick="nextCard()">
                    Следующая <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
        
        <!-- Тест -->
        <div id="testTab" class="mat-content">
            <h2><i class="fas fa-question-circle"></i> ${m.test.title}</h2>
            <p>${m.test.description}</p>
            
            ${m.test.questions.map((q, index) => `
                <div class="question">
                    <h4><i class="far fa-question-circle"></i> Вопрос ${index + 1}: ${q.text}</h4>
                    
                    ${q.type === 'choice' ? `
                        <div class="options">
                            ${q.options.map((opt, optIndex) => `
                                <label>
                                    <input type="radio" name="q${index}" value="${optIndex}">
                                    ${opt}
                                </label>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${q.type === 'true_false' ? `
                        <div class="options">
                            <label><input type="radio" name="q${index}" value="true"> <i class="fas fa-check"></i> Верно</label>
                            <label><input type="radio" name="q${index}" value="false"> <i class="fas fa-times"></i> Неверно</label>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
            
            <button onclick="submitTest()" class="submit-btn">
                <i class="fas fa-check-circle"></i> Проверить тест
            </button>
        </div>
        
        <!-- Экспорт -->
        <div id="exportTab" class="mat-content">
            <h2><i class="fas fa-download"></i> Экспорт в Markdown</h2>
            <p>Скопируйте этот текст или сохраните в файл</p>
            
            <textarea id="markdownContent" readonly>${m.markdown}</textarea>
            
            <div class="export-buttons">
                <button onclick="copyMarkdown()">
                    <i class="far fa-copy"></i> Копировать
                </button>
                <button onclick="downloadMarkdown()">
                    <i class="fas fa-file-download"></i> Скачать файл
                </button>
                <button onclick="printMarkdown()">
                    <i class="fas fa-print"></i> Печать
                </button>
            </div>
        </div>
    `;

    container.innerHTML = html;
    initCardSystem(m.flashcards);
}

// Вспомогательные функции для иконок
function getSectionIcon(type) {
    const icons = {
        'characters': 'fa-user',
        'timeline': 'fa-history',
        'locations': 'fa-map-marker-alt',
        'objects': 'fa-cube'
    };
    return icons[type] || 'fa-list';
}

function getItemIcon(type) {
    const icons = {
        'characters': 'fa-user-circle',
        'timeline': 'fa-calendar-alt',
        'locations': 'fa-map-pin',
        'objects': 'fa-box'
    };
    return icons[type] || 'fa-circle';
}

// Функции для управления интерфейсом
function showMatTab(tabName) {
    document.querySelectorAll('.mat-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.mat-tab').forEach(el => el.classList.remove('active'));

    document.getElementById(tabName + 'Tab').classList.add('active');
    document.querySelector(`[onclick="showMatTab('${tabName}')"]`).classList.add('active');
}

// Система карточек
let currentCardIndex = 0;
let allFlashcards = [];

function initCardSystem(flashcards) {
    allFlashcards = flashcards;
    currentCardIndex = 0;
    updateCardCounter();

    // Показать только первую карточку
    document.querySelectorAll('.flashcard').forEach((card, index) => {
        card.style.display = index === 0 ? 'block' : 'none';
    });
}

function flipCard(index) {
    const card = document.getElementById(`card${index}`);
    if (card) {
        card.classList.toggle('flipped');
    }
}

function nextCard() {
    if (currentCardIndex < allFlashcards.length - 1) {
        // Скрыть текущую карточку
        document.getElementById(`card${currentCardIndex}`).style.display = 'none';
        document.getElementById(`card${currentCardIndex}`).classList.remove('flipped');

        currentCardIndex++;
        // Показать следующую
        document.getElementById(`card${currentCardIndex}`).style.display = 'block';
        updateCardCounter();
    }
}

function prevCard() {
    if (currentCardIndex > 0) {
        // Скрыть текущую карточку
        document.getElementById(`card${currentCardIndex}`).style.display = 'none';
        document.getElementById(`card${currentCardIndex}`).classList.remove('flipped');

        currentCardIndex--;
        // Показать предыдущую
        document.getElementById(`card${currentCardIndex}`).style.display = 'block';
        updateCardCounter();
    }
}

function updateCardCounter() {
    const counter = document.getElementById('cardCounter');
    if (counter) {
        counter.textContent = `${currentCardIndex + 1} / ${allFlashcards.length}`;
    }
}

function rateCard(cardIndex, difficulty) {
    const difficulties = ['', 'Трудно', 'Нормально', 'Легко'];
    showNotification(`Карточка отмечена как "${difficulties[difficulty]}"`, 'success');
}

// Тест
function submitTest() {
    let correct = 0;
    const answers = [1, "true"]; // Правильные ответы для демо

    document.querySelectorAll('.question').forEach((q, index) => {
        const selected = q.querySelector('input:checked');
        if (selected && selected.value == answers[index]) {
            correct++;
            q.style.background = 'rgba(76, 201, 240, 0.1)';
        } else if (selected) {
            q.style.background = 'rgba(247, 37, 133, 0.1)';
        }
    });

    showNotification(`Результат: ${correct} из ${answers.length} правильных`, 'success');
}

// Экспорт
function copyMarkdown() {
    const textarea = document.getElementById('markdownContent');
    textarea.select();
    document.execCommand('copy');
    showNotification('Markdown скопирован в буфер обмена!', 'success');
}

function downloadMarkdown() {
    const content = document.getElementById('markdownContent').value;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'learngame-material.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Файл скачан!', 'success');
}

function printMarkdown() {
    const content = document.getElementById('markdownContent').value;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>LearnGame Material</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; }
                    h1 { color: #4361ee; }
                </style>
            </head>
            <body>
                <h1>Учебный материал - LearnGame AI</h1>
                <pre>${content}</pre>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Расширенные игровые форматы
function showAdvancedOptions(contentType) {
    let message = `🎮 ИГРОВЫЕ ФОРМАТЫ ДЛЯ ${contentType}\n\n`;

    if (contentType === 'NARRATIVE') {
        message += "✅ Визуальная новелла:\n• Сюжет с персонажами\n• Диалоги и выборы\n• Таймлайн событий\n• Исторические локации";
    } else if (contentType === 'PROCESS') {
        message += "✅ Алгоритмический симулятор:\n• Пошаговое выполнение\n• Ветвления и условия\n• Визуализация процесса\n• Ошибки и последствия";
    } else if (contentType === 'STRUCTURE') {
        message += "✅ Интерактивный конструктор:\n• Сборка из частей\n• Слоистая структура\n• 3D моделирование\n• Тестирование сборки";
    } else if (contentType === 'CONCEPT') {
        message += "✅ Карта понятий-квест:\n• Поиск связей\n• Логические цепочки\n• Дерево решений\n• Теории и гипотезы";
    } else if (contentType === 'MIXED') {
        message += "✅ Комбинированный курс:\n• Адаптивные главы\n• Разные форматы\n• Прогресс обучения\n• Игровая механика";
    }

    message += "\n\n🚀 Эта функция скоро будет доступна!";
    alert(message);
}