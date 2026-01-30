// ==Plugin==
// @name        Tape Operator для Lampa
// @version     1.0.0
// @author      Ваше имя
// @description Плагин для просмотра через Aloha, Vibix, Veveo и другие онлайн-кинотеатры
// ==/Plugin==

(function(plugin) {
    // Конфигурация плагина
    const plugin_info = {
        id: 'tape_operator',
        name: 'Tape Operator',
        version: '1.0.0',
        player: false,
        source: true
    };

    // Константы из вашего скрипта
    const PLAYER_URL = 'https://tapeop.dev/';
    const STORAGE_KEY = 'tape_operator_movie_data';
    
    // Основной класс парсера
    class TapeOperatorParser {
        constructor() {
            this.name = 'Tape Operator';
            this.logo = 'https://raw.githubusercontent.com/Kirlovon/Tape-Operator/main/assets/favicon.png';
            this.supported = {
                movie: true,
                serial: true
            };
        }

        // Получить информацию о контенте
        async getMetadata(id, type) {
            try {
                const data = await this._extractMovieData(id, type);
                return {
                    id: id,
                    type: type,
                    title: data.title || 'Неизвестно',
                    year: data.year || '',
                    poster: data.poster || '',
                    description: data.description || '',
                    voice: []
                };
            } catch (e) {
                console.error('Tape Operator getMetadata error:', e);
                return null;
            }
        }

        // Поиск контента
        async search(query) {
            try {
                // Здесь можно реализовать поиск через TMDB/Kinopoisk API
                // или использовать данные из Lampa
                return [];
            } catch (e) {
                console.error('Tape Operator search error:', e);
                return [];
            }
        }

        // Получить ссылки для просмотра
        async getSource(ids, type, season, episode) {
            try {
                // Формируем данные для Tape Operator
                const movieData = await this._prepareMovieData(ids, type);
                
                if (!movieData) {
                    throw new Error('Не удалось получить данные фильма');
                }

                // Сохраняем данные в localStorage для передачи в Tape Operator
                this._saveToStorage(movieData);

                // Возвращаем ссылку на плеер Tape Operator
                return {
                    links: [{
                        name: 'Tape Operator',
                        url: this._generatePlayerUrl(movieData),
                        quality: '1080p',
                        format: 'm3u8',
                        preload: true,
                        headers: {},
                        external: true // Открывать во внешнем плеере
                    }],
                    subtitles: []
                };
            } catch (e) {
                console.error('Tape Operator getSource error:', e);
                return {
                    links: [],
                    subtitles: []
                };
            }
        }

        // Подготовить данные фильма
        async _prepareMovieData(ids, type) {
            // Используем доступные ID из Lampa
            const data = {
                title: '',
                year: '',
                type: type
            };

            // Приоритет ID
            if (ids.kinopoisk) {
                data.kinopoisk = ids.kinopoisk;
            } else if (ids.imdb) {
                data.imdb = ids.imdb;
            } else if (ids.tmdb) {
                data.tmdb = ids.tmdb;
            }

            // Получаем метаданные из Lampa
            const meta = await Lampa.API.meta(ids, type);
            if (meta) {
                data.title = meta.title || '';
                data.year = meta.year || '';
                data.poster = meta.poster || '';
            }

            return data;
        }

        // Извлечь данные фильма (адаптация из вашего скрипта)
        async _extractMovieData(id, type) {
            // Этот метод можно использовать для парсинга страниц
            // если будет реализовано расширение функционала
            return {
                title: '',
                year: '',
                poster: ''
            };
        }

        // Сгенерировать URL для плеера
        _generatePlayerUrl(movieData) {
            // Кодируем данные для передачи в URL
            const encodedData = btoa(JSON.stringify(movieData));
            
            // Альтернативный вариант - использовать параметры URL
            let url = PLAYER_URL;
            
            if (movieData.kinopoisk) {
                url += `?kinopoisk=${movieData.kinopoisk}`;
            } else if (movieData.imdb) {
                url += `?imdb=${movieData.imdb}`;
            } else if (movieData.tmdb) {
                url += `?tmdb=${movieData.tmdb}`;
            }
            
            if (movieData.title) {
                url += `&title=${encodeURIComponent(movieData.title)}`;
            }
            
            return url;
        }

        // Сохранить данные в хранилище
        _saveToStorage(data) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                // Очищаем через 5 минут
                setTimeout(() => {
                    localStorage.removeItem(STORAGE_KEY);
                }, 5 * 60 * 1000);
            } catch (e) {
                console.error('Ошибка сохранения в localStorage:', e);
            }
        }
    }

    // Регистрация плагина
    plugin.init = function() {
        // Создаем экземпляр парсера
        const parser = new TapeOperatorParser();
        
        // Регистрируем парсер в Lampa
        Lampa.Parser.add(parser);
        
        console.log('Tape Operator плагин загружен');
    };

    // Возвращаем информацию о плагине
    plugin.info = function() {
        return plugin_info;
    };

})(window.Plugin = window.Plugin || {});

// Автоматическая инициализация при загрузке
if (window.Lampa && window.Lampa.Parser) {
    window.Plugin.init();
}