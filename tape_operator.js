(function () {
    'use strict';
    
    function startPlugin() {
        window.plugin_[ИМЯ]_ready = true;
        
        function add() {
            // Основная логика плагина
        }
        
        // Инициализация
        if (window.appready) add(); 
        else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') { add(); }
            });
        }
    }
    
    if (!window.plugin_[ИМЯ]_ready) startPlugin();
})();