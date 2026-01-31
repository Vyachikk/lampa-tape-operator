// ==Plugin==
// @name        Минимальная кнопка
// @version     1.0
// ==/Plugin==

(function() {
    'use strict';

    // Ждем загрузки Lampa
    function waitForLampa(callback) {
        if (window.Lampa) {
            callback();
        } else {
            setTimeout(() => waitForLampa(callback), 100);
        }
    }

    waitForLampa(function() {
        console.log('Минимальная кнопка загружена');
        
        // HTML кнопки
        const buttonHTML = `
            <div class="full-start__button selector view--minimal_button">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="10,8 16,12 10,16"/>
                </svg>
                <span>Тест</span>
            </div>
        `;

        // Добавляем кнопку на страницу карточки
        Lampa.Listener.follow('full', function(e) {
            if (e.type === 'complite') {
                // Создаем кнопку
                const btn = $(buttonHTML);
                
                // Простой обработчик клика
                btn.on('hover:enter', function() {
                    // Показываем уведомление
                    Lampa.Noty.show('Кнопка работает!');
                    
                    // Выводим в консоль
                    console.log('Простая кнопка нажата');
                    
                    // Получаем информацию о фильме
                    if (e.data && e.data.movie) {
                        const title = e.data.movie.title || 'Неизвестно';
                        console.log('Название фильма:', title);
                    }
                });
                
                // Ищем, куда вставить кнопку
                const container = e.object.activity.render().find('.full-start__buttons');
                if (container.length) {
                    container.append(btn);
                }
            }
        });
    });

})();