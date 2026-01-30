(function () {
    "use strict";

    // Имя вашего плагина
    const PLUGIN_NAME = "Tape Operator Sources";
    const PLUGIN_VERSION = "1.0.0";
    const API_URL = "https://api.kinobox.tv/api/players";

    // --- 1. Функция для извлечения финальной ссылки из iframeUrl ---
    // Эта функция НЕ реализована в шаблоне и должна быть написана вручную для каждого источника.
    // Пример структуры:
    function extractFinalUrl(iframeUrl, callback, errorCallback) {
        // Пример: для Alloha iframeUrl может содержать токен и требовать выполнения JS для получения m3u8
        // Это требует глубокого анализа конкретного плеера.
        // В MODSS это делается в функциях типа getStream, extractData, extractItems внутри конкретных балансеров.
        // Ниже пример для простого случая (НЕ для Alloha!), если бы в HTML была прямая ссылка.
        /*
        const network = new Lampa.Reguest();
        network.timeout(15000);
        network.silent(iframeUrl, function(html) {
            // Пример поиска ссылки в HTML
            const match = html.match(/file['"]?\s*:\s*['"]([^'"]+\.(?:m3u8|mp4|mkv))['"]/i);
            if (match) {
                callback(match[1]);
            } else {
                errorCallback(new Error("Failed to extract final URL"));
            }
        }, errorCallback, false, { dataType: 'text' });
        */

        // !!! ЗАГЛУШКА: возвращает iframeUrl как есть (НЕ БУДЕТ РАБОТАТЬ С Alloha и большинством других) !!!
        console.warn("extractFinalUrl: Function not implemented for iframe:", iframeUrl);
        callback(iframeUrl);
    }

    // --- 2. Компонент плагина ---
    function TapeOperatorSourcesComponent(object) {
        const network = new Lampa.Reguest();
        const scroll = new Lampa.Scroll({ mask: true, over: true });
        const files = new Lampa.Explorer(object);
        const filter = new Lampa.Filter(object);

        let sourcesData = []; // Хранит весь ответ от API
        let filteredItems = []; // Хранит отфильтрованные элементы для отображения
        let choice = { source: 0, translation: 0 }; // Сохраняем выбор источника и перевода

        this.create = function () {
            this.activity.loader(true);
            this.initializeFilters();
            this.fetchSources();
            return this.render();
        };

        this.initializeFilters = function() {
            filter.onBack = () => this.start();
            filter.render().find('.selector').on('hover:enter', () => {
                // Дополнительная логика при нажатии на фильтр (если нужно)
            });

            filter.onSelect = (type, filterItem, selectedItem) => {
                if (type === 'filter') {
                    if (filterItem.reset) {
                        this.resetSelection();
                    } else {
                        this.handleFilterChange(type, filterItem, selectedItem);
                    }
                }
                // Обработка сортировки (если нужно)
                // else if (type === 'sort') { ... }
            };

            files.appendFiles(scroll.render());
            files.appendHead(filter.render());
            scroll.body().addClass('torrent-list');
            scroll.minus(files.render().find('.explorer__files-head'));
        };

        this.fetchSources = function() {
            const params = new URLSearchParams();
            if (object.movie.kinopoisk_id) {
                params.append('kinopoisk', object.movie.kinopoisk_id);
            } else if (object.movie.imdb_id) {
                params.append('imdb', object.movie.imdb_id); // Проверьте, поддерживает ли API imdb
            } else {
                console.error("No kinopoisk_id or imdb_id found");
                this.activity.loader(false);
                this.empty("Не удалось найти ID фильма для поиска.");
                return;
            }
            params.append('title', encodeURIComponent(object.movie.title)); // Заголовок как fallback

            const requestUrl = `${API_URL}?${params.toString()}`;
            console.log("Fetching sources from:", requestUrl);

            network.timeout(15000);
            network.silent(requestUrl, (response) => {
                console.log("API Response:", response);
                if(response && response.data && Array.isArray(response.data)) {
                    sourcesData = response.data;
                    this.processSources();
                    this.activity.loader(false);
                } else {
                    this.empty("Не удалось получить данные источников.");
                }
            }, (error, statusText) => {
                console.error("Error fetching sources:", error, statusText);
                this.empty(`Ошибка запроса: ${statusText}`);
            });
        };

        this.processSources = function() {
            const filterItems = {
                source: [],
                translation: []
            };

            // Извлекаем доступные источники
            sourcesData.forEach(source => {
                if(source.type) {
                    filterItems.source.push(source.type);
                }
            });

            // Применяем выбор пользователя к фильтрам
            if (!filterItems.source[choice.source]) choice.source = 0;
            if (!filterItems.source[choice.source]) return; // Нет доступных источников

            // Извлекаем переводы для выбранного источника
            const selectedSource = sourcesData[choice.source];
            if(selectedSource && selectedSource.translations && Array.isArray(selectedSource.translations)) {
                 selectedSource.translations.forEach(translation => {
                     // Используем имя перевода как текст для фильтра
                     filterItems.translation.push(translation.name || `Перевод ${translation.id || 'N/A'}`);
                 });
            }

            if (!filterItems.translation[choice.translation]) choice.translation = 0;

            filter.set('filter', [
                { title: 'Сбросить', reset: true },
                {
                    title: 'Источник',
                    subtitle: filterItems.source[choice.source] || 'N/A',
                    items: filterItems.source.map((name, idx) => ({
                        title: name,
                        selected: choice.source === idx,
                        index: idx
                    })),
                    stype: 'source'
                },
                {
                    title: 'Перевод',
                    subtitle: filterItems.translation[choice.translation] || 'N/A',
                    items: filterItems.translation.map((name, idx) => ({
                        title: name,
                        selected: choice.translation === idx,
                        index: idx
                    })),
                    stype: 'translation'
                }
            ]);

            // Обновляем выбранные значения в интерфейсе фильтра
            filter.chosen('filter', [
                `Источник: ${filterItems.source[choice.source]}`,
                `Перевод: ${filterItems.translation[choice.translation]}`
            ]);

            // Формируем список элементов для отображения
            this.updateFilteredItems();
        };

        this.updateFilteredItems = function() {
            filteredItems = [];
            const selectedSource = sourcesData[choice.source];
            if(selectedSource && selectedSource.translations && Array.isArray(selectedSource.translations)) {
                const selectedTranslation = selectedSource.translations[choice.translation];
                if(selectedTranslation) {
                    filteredItems.push({
                        title: `[${selectedSource.type}] ${selectedTranslation.name || 'N/A'}`,
                        quality: selectedTranslation.quality || 'N/A',
                        info: selectedSource.type,
                        translation_info: selectedTranslation.name,
                        iframeUrl: selectedTranslation.iframeUrl || selectedSource.iframeUrl,
                        timeline: {} // Плейсхолдер для тайминга
                    });
                }
            }
            this.displayItems();
        };

        this.handleFilterChange = function(type, filterItem, selectedItem) {
            if (filterItem.stype === 'source') {
                choice.source = selectedItem.index;
                // Сбросить выбор перевода при смене источника
                choice.translation = 0;
            } else if (filterItem.stype === 'translation') {
                choice.translation = selectedItem.index;
            }
            // Обновить фильтры и список элементов
            this.processSources();
            this.updateFilteredItems();
        };

        this.resetSelection = function() {
            choice = { source: 0, translation: 0 };
            this.processSources();
            this.updateFilteredItems();
        };

        this.displayItems = function() {
            scroll.clear();
            if (!filteredItems.length) {
                this.empty("Нет доступных элементов для отображения.");
                return;
            }

            filteredItems.forEach(item => {
                const html = Lampa.Template.get('modss_online_full', {
                    title: item.title,
                    quality: item.quality,
                    info: item.info
                });

                html.on('hover:enter', () => {
                    if (item.iframeUrl) {
                        console.log("Attempting to play iframe URL:", item.iframeUrl);
                        // --- КЛЮЧЕВОЙ ШАГ: Извлечение финальной ссылки ---
                        extractFinalUrl(item.iframeUrl, (finalUrl) => {
                            if(finalUrl) {
                                console.log("Final URL extracted:", finalUrl);
                                const playlistItem = {
                                    title: item.title,
                                    url: finalUrl, // Передаем извлеченную ссылку
                                    timeline: item.timeline,
                                    quality: item.quality ? { [item.quality]: finalUrl } : {} // Простая передача качества
                                };
                                Lampa.Player.play(playlistItem);
                                // item.mark(); // Отметка о просмотре (если нужно)
                            } else {
                                Lampa.Noty.show("Не удалось получить ссылку на видео.");
                            }
                        }, (error) => {
                            console.error("Error extracting final URL:", error);
                            Lampa.Noty.show("Ошибка извлечения видео: " + (error.message || "Неизвестная ошибка"));
                        });
                    } else {
                        Lampa.Noty.show("Ссылка на видео отсутствует.");
                    }
                }).on('hover:focus', (e) => {
                    scroll.update($(e.target), true);
                });

                scroll.append(html);
            });
        };

        this.empty = function(message) {
            const emptyHtml = Lampa.Template.get('list_empty');
            if (message) emptyHtml.find('.empty__descr').text(message);
            scroll.append(emptyHtml);
            this.activity.loader(false);
        };

        this.render = function () {
            return files.render();
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: () => {
                    Lampa.Controller.collectionSet(scroll.render(), files.render());
                    Lampa.Controller.collectionFocus(false, scroll.render()); // Фокус на первый элемент
                },
                up: () => {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: () => Navigator.move('down'),
                right: () => {
                    if (Navigator.canmove('right')) Navigator.move('right');
                    else filter.show('Фильтры', 'filter'); // Показываем фильтры при нажатии вправо
                },
                left: () => {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                back: this.back
            });
            Lampa.Controller.toggle('content');
        };

        this.back = () => Lampa.Activity.backward();
        this.pause = () => {};
        this.stop = () => {};
        this.destroy = () => {
            network.clear();
            scroll.destroy();
            files.destroy();
        };
    }

    // --- 3. Добавление кнопки на страницу full ---
    Lampa.Listener.follow('full', (event) => {
        if (event.type === 'complite') {
            const movie = event.data.movie;
            // Проверяем, есть ли ID для запроса к API
            if ((movie.kinopoisk_id || movie.imdb_id) && movie.title) {
                const buttonHtml = $(`<div class="full-start__button selector view--tape_operator_sources">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px"><path d="M0 0h24v24H0z" fill="none"/><path d="M10 16.5l6-4.5-6-4.5v9z"/></svg>
                    <span>Смотреть (TO)</span>
                </div>`);

                // Вставляем кнопку (пример: перед кнопкой торрента, если она есть)
                const torrentButton = $('.view--torrent');
                if (torrentButton.length) {
                    torrentButton.before(buttonHtml);
                } else {
                    // Или в начало блока кнопок
                    $('.full-start__buttons').prepend(buttonHtml);
                }

                buttonHtml.on('hover:enter', () => {
                    Lampa.Activity.push({
                        url: '',
                        title: `Источники (TO) - ${movie.title}`,
                        component: 'tape_operator_sources',
                        movie: movie, // Передаем данные фильма
                        page: 1
                    });
                });
            }
        }
    });

    // --- 4. Регистрация компонента ---
    Lampa.Component.add('tape_operator_sources', TapeOperatorSourcesComponent);

    // --- 5. Регистрация плагина ---
    const pluginManifest = {
        type: 'video',
        version: PLUGIN_VERSION,
        name: PLUGIN_NAME,
        description: 'Плагин для просмотра онлайн-источников с tapeop.dev (через API)',
        component: 'tape_operator_sources',
        onContextMenu: (object) => {
            return {
                name: 'Смотреть (TO)',
                description: 'Открыть источники с tapeop.dev'
            };
        },
        onContextLauch: (object) => {
            Lampa.Activity.push({
                url: '',
                title: `Источники (TO) - ${object.title}`,
                component: 'tape_operator_sources',
                movie: object,
                page: 1
            });
        }
    };

    // Добавляем плагин в список плагинов Lampa
    if (!Lampa.Manifest.plugins) Lampa.Manifest.plugins = [];
    Lampa.Manifest.plugins.push(pluginManifest);

})();