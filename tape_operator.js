// ==Plugin==
// @name        Супер-простая кнопка
// @version     1.0
// ==/Plugin==

(function() {
    'use strict';

    console.log('Супер-простая кнопка запущена');
    
    // Создаем кнопку
    function createButton() {
        const button = document.createElement('div');
        button.className = 'full-start__button selector';
        button.style.cssText = `
            display: flex;
            align-items: center;
            padding: 10px 15px;
            margin: 5px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
        `;
        
        button.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="margin-right: 10px;">
                <path d="M8 5v14l11-7z"/>
            </svg>
            <span style="color: white;">Тест</span>
        `;
        
        // Обработчик клика
        button.addEventListener('click', function() {
            console.log('Супер-простая кнопка нажата!');
        });
        
        // Добавляем эффект при наведении
        button.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255,255,255,0.2)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(255,255,255,0.1)';
        });
        
        return button;
    }
    
    // Функция добавления кнопки
    function addButton() {
        // Ищем контейнер с кнопками
        const buttonsContainer = document.querySelector('.full-start__buttons');
        if (!buttonsContainer) return;
        
        // Проверяем, не добавлена ли уже наша кнопка
        if (document.querySelector('.super-simple-button-added')) return;
        
        // Создаем и добавляем кнопку
        const button = createButton();
        button.classList.add('super-simple-button-added');
        buttonsContainer.appendChild(button);
    }
    
    // Пытаемся добавить кнопку сразу
    addButton();
    
    // И следим за изменениями DOM
    const observer = new MutationObserver(function(mutations) {
        for (let mutation of mutations) {
            if (mutation.type === 'childList') {
                addButton();
            }
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });

})();