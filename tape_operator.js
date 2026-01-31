// ==Plugin==
// @name        Минимальная кнопка
// @version     1.0
// ==/Plugin==

(function() {
    'use strict';

    // Создаем заглушку компонента
    const component = {
        template: `<div style="display:none"></div>`,
        mounted() {
            // Пустая функция
        }
    };

    // Функция для перевода (заглушка)
    function translate(text) {
        // Просто возвращаем текст как есть
        return text;
    }

    // Основная функция инициализации
    function initMain() {
        console.log('Минимальная кнопка запущена');
        
        // Регистрируем компонент (заглушка)
        if (Lampa.Component && Lampa.Component.add) {
            Lampa.Component.add('minimal_button', component);
        }

        // Манифест плагина (упрощенный)
        const manifest = {
            type: 'video',
            version: '1.0',
            name: 'Минимальная кнопка - 1.0',
            description: 'Простая тестовая кнопка',
            component: 'minimal_button'
        };

        // Регистрируем манифест
        if (Lampa.Manifest) {
            Lampa.Manifest.plugins = manifest;
        }

        // HTML кнопки (упрощенный SVG)
        const buttonHTML = `
            <div class="full-start__button selector view--minimal_button" data-subtitle="minimal_button 1.0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                <span>Тест</span>
            </div>
        `;

        // Добавляем кнопку при открытии карточки фильма
        if (Lampa.Listener) {
            Lampa.Listener.follow('full', function(e) {
                if (e.type === 'complite') {
                    // Создаем элемент кнопки
                    const btn = $(buttonHTML);
                    
                    // Простой обработчик событий
                    btn.on('hover:enter', function() {
                        // Показываем простое уведомление
                        if (Lampa.Noty && Lampa.Noty.show) {
                            Lampa.Noty.show('Тестовая кнопка нажата!');
                        } else {
                            console.log('Тестовая кнопка нажата!');
                        }
                    });
                    
                    // Добавляем кнопку после кнопки torrent
                    const torrentBtn = e.object.activity.render().find('.view--torrent');
                    if (torrentBtn.length) {
                        torrentBtn.after(btn);
                    } else {
                        // Если кнопки torrent нет, добавляем в начало
                        const buttonsContainer = e.object.activity.render().find('.full-start__buttons');
                        if (buttonsContainer.length) {
                            buttonsContainer.prepend(btn);
                        }
                    }
                }
            });
        }
    }

    // Запускаем плагин при загрузке
    function startPlugin() {
        if (window.Lampa) {
            initMain();
        } else {
            // Ждем загрузки Lampa
            const checkLampa = setInterval(function() {
                if (window.Lampa) {
                    clearInterval(checkLampa);
                    initMain();
                }
            }, 100);
        }
    }

    // Запускаем плагин
    startPlugin();

})();