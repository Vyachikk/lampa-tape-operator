// ==Plugin==
// @name        Kinobox Player (Alloha, Vibix, Veveo, Lumex, Collaps)
// @version     1.0.0
// @author      Ваше имя
// @description Плагин для просмотра через онлайн-кинотеатры с поддержкой озвучек
// ==/Plugin==

(function() {
    'use strict';

    // Конфигурация плагина
    const PLUGIN_INFO = {
        id: 'kinobox_player',
        name: 'Kinobox Player',
        version: '1.0.0',
        player: false,
        source: true
    };

    // API Kinobox.tv
    const KINOBOX_API = 'https://api.kinobox.tv/api/players';
    
    // Карта сервисов для отображения
    const SERVICE_NAMES = {
        'Turbo': 'Turbo',
        'Alloha': 'Alloha',
        'Veoveo': 'Veveo',
        'Kodik': 'Kodik',
        'Vibix': 'Vibix',
        'Lumex': 'Lumex',
        'Collaps': 'Collaps'
    };

    // Основной класс парсера
    class KinoboxParser {
        constructor() {
            this.name = 'Kinobox Player';
            this.logo = 'https://kinobox.tv/favicon.ico';
            this.supported = {
                movie: true,
                serial: true
            };
            this.cache = new Map();
            this.cacheTime = 10 * 60 * 1000; // 10 минут кэша
        }

        // Получить источники для контента
        async getSource(params) {
            try {
                const { ids, title, year, type, season, episode } = params;
                
                // Получаем данные из Kinobox API
                const players = await this._fetchPlayers(ids, title);
                
                if (!players || players.length === 0) {
                    throw new Error('Нет доступных источников');
                }

                // Формируем список источников
                const sources = [];
                
                for (const player of players) {
                    if (!player.iframeUrl || player.type === 'Kodik') continue;
                    
                    // Основной источник
                    const source = this._createSource(player, ids, title, type);
                    
                    // Добавляем озвучки как отдельные источники
                    if (player.translations && player.translations.length > 0) {
                        for (const translation of player.translations) {
                            if (translation.iframeUrl) {
                                const voiceSource = this._createSource(
                                    player, 
                                    ids, 
                                    title, 
                                    type,
                                    translation
                                );
                                sources.push(voiceSource);
                            }
                        }
                    } else {
                        sources.push(source);
                    }
                }

                return {
                    source: sources,
                    subtitle: []
                };

            } catch (error) {
                console.error('Kinobox Player error:', error);
                return {
                    source: [],
                    subtitle: []
                };
            }
        }

        // Создать объект источника
        _createSource(player, ids, title, type, translation = null) {
            const serviceName = SERVICE_NAMES[player.type] || player.type;
            const url = translation?.iframeUrl || player.iframeUrl;
            const voiceName = translation?.name || null;
            const quality = translation?.quality || 'HD';
            
            // Формируем имя для отображения
            let displayName = serviceName;
            if (voiceName) {
                displayName += ` (${voiceName})`;
            }
            if (quality) {
                displayName += ` [${quality}]`;
            }

            return {
                name: displayName,
                title: title || '',
                url: url.trim(),
                quality: quality,
                type: 'iframe', // Важно для Lampa - еслиrame плеер
                external: false, // Встроенный плеер
                headers: {
                    'Referer': 'https://kinobox.tv/',
                    'Origin': 'https://kinobox.tv'
                },
                format: 'iframe',
                parse: false, // Не парсить дальше
                meta: {
                    service: player.type,
                    voice: voiceName,
                    kinopoisk: ids.kinopoisk,
                    imdb: ids.imdb,
                    tmdb: ids.tmdb
                }
            };
        }

        // Запрос к API Kinobox
        async _fetchPlayers(ids, title) {
            const cacheKey = this._getCacheKey(ids);
            
            // Проверяем кэш
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTime) {
                    return cached.data;
                }
                this.cache.delete(cacheKey);
            }

            // Параметры запроса
            const params = new URLSearchParams();
            
            if (ids.kinopoisk) {
                params.append('kinopoisk', ids.kinopoisk);
            } else if (ids.imdb) {
                params.append('imdb', ids.imdb);
            } else if (ids.tmdb) {
                params.append('tmdb', ids.tmdb);
            }
            
            if (title) {
                params.append('title', title);
            }

            try {
                const response = await fetch(`${KINOBOX_API}?${params}`, {
                    headers: {
                        'Accept': 'application/json',
                        'Referer': 'https://kinobox.tv/',
                        'Origin': 'https://kinobox.tv'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                
                if (data && data.data) {
                    // Кэшируем результат
                    this.cache.set(cacheKey, {
                        data: data.data,
                        timestamp: Date.now()
                    });
                    
                    return data.data;
                }
                
                return [];
            } catch (error) {
                console.error('Kinobox API error:', error);
                return [];
            }
        }

        // Ключ для кэша
        _getCacheKey(ids) {
            if (ids.kinopoisk) return `kp_${ids.kinopoisk}`;
            if (ids.imdb) return `imdb_${ids.imdb}`;
            if (ids.tmdb) return `tmdb_${ids.tmdb}`;
            return 'unknown';
        }

        // Метод для поиска (опционально)
        async search(query) {
            // Можно реализовать поиск через TMDB API
            return [];
        }
    }

    // Инициализация плагина
    function initPlugin() {
        try {
            const parser = new KinoboxParser();
            
            // Регистрируем парсер в Lampa
            if (window.Lampa && window.Lampa.Parser) {
                Lampa.Parser.add(parser);
                console.log('Kinobox Player плагин загружен');
            }
            
            // Альтернативная регистрация для разных версий Lampa
            if (window.Parser && window.Parser.add) {
                window.Parser.add(parser);
            }
            
            // Добавляем в меню (опционально)
            addToMenu();
            
        } catch (error) {
            console.error('Ошибка инициализации плагина:', error);
        }
    }

    // Добавление в меню Lampa (опционально)
    function addToMenu() {
        if (!window.Lampa || !Lampa.Menu) return;
        
        Lampa.Menu.add({
            title: 'Kinobox Player',
            component: {
                template: `
                    <div class="selector" @click="showInfo">
                        <div class="selector__icon">
                            <svg viewBox="0 0 24 24" fill="white">
                                <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                            </svg>
                        </div>
                        <div class="selector__title">Kinobox Player</div>
                        <div class="selector__description">Alloha, Vibix, Veveo, Lumex, Collaps</div>
                    </div>
                `,
                methods: {
                    showInfo() {
                        Lampa.Noty.show('Kinobox Player - плагин для онлайн-кинотеатров');
                    }
                }
            }
        });
    }

    // Автоматическая инициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPlugin);
    } else {
        initPlugin();
    }

    // Экспорт для ручной инициализации
    window.KinoboxPlugin = {
        info: PLUGIN_INFO,
        init: initPlugin,
        Parser: KinoboxParser
    };

})();