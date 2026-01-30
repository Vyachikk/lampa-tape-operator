(function () {
    "use strict";

    // Имя вашего плагина
    const PLUGIN_NAME = "Kinobox Sources";
    const PLUGIN_VERSION = "1.0.0";

    // URL API, который мы нашли
    const API_URL = "https://api.kinobox.tv/api/players";

    /**
     * Основная функция компонента плагина
     * @param {Object} component - Экземпляр компонента online_mod (из шаблона)
     * @param {Object} _object - Объект фильма/сериала из Lampa
     */
    function KinoboxSourcesComponent(component, _object) {
        const network = new Lampa.Reguest();
        let extractData = {}; // Хранит ответ от api.kinobox.tv
        let object = _object;
        let selectTitle = '';

        // Фильтры
        let filterItems = {
            season: [],
            voice: [],
            source: [] // Добавляем фильтр по источнику
        };
        let choice = {
            season: 0,
            voice: 0,
            source: 0 // Индекс выбранного источника
        };

        /**
         * Поиск по ID фильма
         * @param {Object} _object
         * @param {String} id - ID фильма (кинопоиск или imdb)
         */
        this.search = function (_object, id) {
            object = _object;
            selectTitle = object.search || object.movie.title;

            const params = new URLSearchParams();
            if (object.movie.kinopoisk_id) {
                params.append('kinopoisk', object.movie.kinopoisk_id);
            } else if (object.movie.imdb_id) {
                params.append('imdb', object.movie.imdb_id);
            } else {
                // Если нет ID, пробуем использовать заголовок (менее надежно)
                params.append('title', encodeURIComponent(selectTitle));
            }

            const requestUrl = `${API_URL}?${params.toString()}`;

            component.loading(true);
            network.timeout(15000);
            network.native(component.proxyLink(requestUrl), (response) => {
                if (response && response.data && Array.isArray(response.data)) {
                    extractData = response.data;
                    component.loading(false);
                    filter(); // Построить фильтры
                    append(filtered()); // Показать файлы
                } else {
                    component.emptyForQuery(selectTitle);
                }
            }, (a, c) => {
                component.empty(network.errorDecode(a, c));
            });
        };

        /**
         * Сброс фильтра
         */
        this.reset = function () {
            component.reset();
            choice = { season: 0, voice: 0, source: 0 };
            filter();
            append(filtered());
            component.saveChoice(choice);
        };

        /**
         * Применить фильтр
         * @param {*} type
         * @param {*} a - объект фильтра (stype)
         * @param {*} b - объект выбранного элемента (index)
         */
        this.filter = function (type, a, b) {
            choice[a.stype] = b.index;
            component.reset();
            filter();
            append(filtered());
            component.saveChoice(choice);
        };

        /**
         * Уничтожить
         */
        this.destroy = function () {
            network.clear();
            extractData = null;
        };

        /**
         * Построить фильтры
         */
        function filter() {
            // Обновляем доступные источники
            filterItems.source = extractData.map(item => item.type || 'Unknown Source');
            if (!filterItems.source[choice.source]) choice.source = 0;

            const selectedSourceType = filterItems.source[choice.source];

            // Находим выбранный источник в данных
            const selectedSource = extractData.find(item => item.type === selectedSourceType);

            if (selectedSource && selectedSource.translations && Array.isArray(selectedSource.translations)) {
                // Обновляем доступные озвучки для выбранного источника
                filterItems.voice = selectedSource.translations.map(translation => translation.name || 'N/A');
                if (!filterItems.voice[choice.voice]) choice.voice = 0;
            } else {
                filterItems.voice = [];
                choice.voice = 0;
            }

            // Для сериалов можно добавить фильтр по сезонам, если он есть в данных
            // Предположим, что данные о сезонах могут быть внутри translations или отдельно
            // Этот пример не учитывает сезоны, так как в API не всегда явно есть список сезонов для фильма
            // Если это сериал, и данные позволяют, нужно будет парсить seasons из selectedSource или translations
            filterItems.season = []; // Пока пусто для фильмов
            choice.season = 0; // Пока не используется

            component.filter(filterItems, choice);
        }

        /**
         * Отфильтровать файлы
         * @returns array
         */
        function filtered() {
            const filtered = [];
            const selectedSourceType = filterItems.source[choice.source];
            const selectedSource = extractData.find(item => item.type === selectedSourceType);

            if (selectedSource && selectedSource.translations && Array.isArray(selectedSource.translations)) {
                const selectedTranslation = selectedSource.translations[choice.voice];
                if (selectedTranslation) {
                    // Для сериалов здесь можно было бы перебирать эпизоды
                    // Пока создаем одну запись для выбранной озвучки
                    filtered.push({
                        title: `${selectedSourceType} - ${selectedTranslation.name}`,
                        quality: selectedTranslation.quality || 'N/A',
                        info: ` / ${selectedSourceType}`,
                        // season: ..., // Не используется в этом примере
                        // episode: ..., // Не используется в этом примере
                        media: selectedTranslation // Сохраняем объект с информацией о переводе
                    });
                }
            }
            return filtered;
        }

        /**
         * Найти поток (НЕ РЕАЛИЗОВАНО)
         * @param {*} element - элемент из filtered()
         */
        function getStream(element, call, error) {
            // element.media.iframeUrl содержит URL, который нужно обработать
            const iframeUrl = element.media.iframeUrl;
            if (!iframeUrl) {
                error('No iframeUrl found');
                return;
            }

            // --- ТУТ НАЧИНАЕТСЯ СЛОЖНАЯ ЧАСТЬ ---
            // Нужно загрузить iframeUrl и извлечь оттуда настоящую ссылку на видео.
            // Это делается по-разному для каждого источника (Alloha, Veoveo и т.д.).
            // Ниже приведен общий каркас, который НЕ БУДЕТ РАБОТАТЬ без конкретной реализации для каждого iframeUrl.

            // Пример: загрузка HTML страницы из iframeUrl
            network.timeout(15000);
            network.silent(component.proxyLink(iframeUrl), (htmlStr) => {
                // Тут должна быть логика парсинга htmlStr для нахождения m3u8/mp4 ссылки
                // или выполнения JS, если плеер динамический.
                // Это может быть сложным и уникальным для каждого плеера.

                // ПСЕВДОКОД:
                // const videoUrl = parseHtmlForVideoUrl(htmlStr); // Реализовать parseHtmlForVideoUrl
                // const qualityMap = parseHtmlForQualities(htmlStr); // Реализовать parseHtmlForQualities

                // if (videoUrl) {
                //     element.stream = videoUrl;
                //     element.qualitys = qualityMap;
                //     call(element);
                // } else {
                //     error('Could not extract video URL from iframe');
                // }

                // ПОКА ЗАГЛУШКА: возвращаем iframeUrl как есть (НЕ БУДЕТ РАБОТАТЬ!)
                console.warn("getStream: Extraction logic not implemented for URL:", iframeUrl);
                element.stream = iframeUrl; // Заглушка
                element.qualitys = false;    // Заглушка
                call(element);               // Заглушка
            }, (a, c) => {
                error(network.errorDecode(a, c));
            }, false, { dataType: 'text' });
        }


        /**
         * Показать файлы
         * @param {Array} items - результат filtered()
         */
        function append(items) {
            component.reset();
            const viewed = Lampa.Storage.cache('online_view', 5000, []);

            items.forEach((element) => {
                const hash = Lampa.Utils.hash(
                    element.season
                        ? [element.season, element.episode, object.movie.original_title].join('')
                        : object.movie.original_title
                );
                const view = Lampa.Timeline.view(hash);
                const item = Lampa.Template.get('online_mod', element);

                element.timeline = view;
                item.append(Lampa.Timeline.render(view));

                if (Lampa.Timeline.details) {
                    item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
                }

                const hashFile = Lampa.Utils.hash(
                    element.season
                        ? [element.season, element.episode, object.movie.original_title, filterItems.voice[choice.voice]].join('')
                        : object.movie.original_title + element.title
                );

                if (viewed.indexOf(hashFile) !== -1) {
                    item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
                }

                item.on('hover:enter', () => {
                    if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);

                    getStream(element, (elementWithStream) => {
                        const first = {
                            url: component.getDefaultQuality(elementWithStream.qualitys, elementWithStream.stream),
                            quality: component.renameQualityMap(elementWithStream.qualitys),
                            subtitles: elementWithStream.subtitles, // Подсчитайте, если есть
                            timeline: elementWithStream.timeline,
                            title: elementWithStream.title || selectTitle
                        };

                        Lampa.Player.play(first);
                        // Плейлист для сериалов...
                        // Lampa.Player.playlist([...]);

                        if (viewed.indexOf(hashFile) === -1) {
                            viewed.push(hashFile);
                            item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
                            Lampa.Storage.set('online_view', viewed);
                        }
                    }, (err) => {
                        Lampa.Noty.show(err || Lampa.Lang.translate('online_mod_nolink'));
                    });
                });

                component.append(item);

                component.contextmenu({
                    item: item,
                    view: view,
                    viewed: viewed,
                    hash_file: hashFile,
                    element: element,
                    file: (call) => {
                        getStream(element, (elem) => {
                            call({ file: elem.stream, quality: elem.qualitys });
                        }, (err) => {
                            Lampa.Noty.show(err || Lampa.Lang.translate('online_mod_nolink'));
                        });
                    }
                });
            });

            component.start(true);
        }
    }

    // --- 1. Добавление кнопки на страницу full ---
    Lampa.Listener.follow('full', (event) => {
        if (event.type === 'complite') {
            const movie = event.data.movie;
            // Проверяем, есть ли ID для запроса к API
            if ((movie.kinopoisk_id || movie.imdb_id) && movie.title) {
                const buttonHtml = $(`<div class="full-start__button selector view--kinobox_sources">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px"><path d="M0 0h24v24H0z" fill="none"/><path d="M8 5v14l11-7z"/></svg>
                    <span>Смотреть (Kinobox)</span>
                </div>`);

                // Вставляем кнопку перед кнопкой торрента или в начало
                const torrentButton = $('.view--torrent');
                if (torrentButton.length) {
                    torrentButton.before(buttonHtml);
                } else {
                    $('.full-start__buttons').prepend(buttonHtml);
                }

                buttonHtml.on('hover:enter', () => {
                    Lampa.Activity.push({
                        url: '',
                        title: `Источники (Kinobox) - ${movie.title}`,
                        component: 'kinobox_sources', // Имя нового компонента
                        movie: movie,
                        page: 1
                    });
                });
            }
        }
    });

    // --- 2. Регистрация компонента ---
    Lampa.Component.add('kinobox_sources', KinoboxSourcesComponent);

    // --- 3. Регистрация плагина ---
    const pluginManifest = {
        type: 'video',
        version: PLUGIN_VERSION,
        name: PLUGIN_NAME,
        description: 'Плагин для просмотра онлайн-источников через api.kinobox.tv',
        component: 'kinobox_sources',
        onContextMenu: (object) => {
            return {
                name: 'Смотреть (Kinobox)',
                description: 'Открыть источники с api.kinobox.tv'
            };
        },
        onContextLaunch: (object) => {
            Lampa.Activity.push({
                url: '',
                title: `Источники (Kinobox) - ${object.title}`,
                component: 'kinobox_sources',
                movie: object,
                page: 1
            });
        }
    };

    // Добавляем плагин в список плагинов Lampa
    if (!Lampa.Manifest.plugins) Lampa.Manifest.plugins = [];
    Lampa.Manifest.plugins.push(pluginManifest);

    console.log(`Plugin "${PLUGIN_NAME}" v${PLUGIN_VERSION} loaded.`);

})();