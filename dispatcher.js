var $ = require('zepto');
var f = require('fastclick');
var defaultConfig = require('spaconfig');
var runtime = require('runtime');

var Dispatcher = {
    init: function (initConfig) {
        f.attach(document.body);
        $(runtime).trigger('before_app_init');
        var _this = this;
        this.setConfig(initConfig || {});
        if(runtime.config.forceIndex){
            location.hash = '#' + runtime.config.defaultPage;
        }
        $(window).bind('hashchange', function () {
            _this.onPageChange();
        });
        $(window).bind('unload', function(){
            var page = runtime.env.page;
            if(page){
                page.unload();
            }
        });
        this.onPageChange();
        if(runtime.config.useAppCache){
            this.initAppcache();
        }
    },
    setConfig: function (initConfig) {
        runtime.config = $.extend(defaultConfig, initConfig);
    },
    onPageChange: function () {
        var hash, id, action = 'index', datas = {};
        hash = location.hash.replace(/^#/, '').split('?');
        id = hash[0] || runtime.config.defaultPage;
        if(id.indexOf('/') > -1){
            var tmp = id.split('/');
            id = tmp[0];
            action = tmp[1];
        }
        $.each((hash[1] || '').split('&'), function (_, o) {
            var queryItem = o.split('=');
            if (queryItem[0] && queryItem[1]) {
                datas[queryItem[0]] = queryItem[1];
            }
        });
        this.loadPage(id, action, datas);
    },
    loadPage: function (id, action, datas) {
        var _this = this,
            lastPage = runtime.env.page,
            firstLoad = false;

        require.async(runtime.config.pageComponents + id, function (page) {
            if (lastPage == page && !page.reloadOnQueryChanged) {
                page.queryChanged(action, datas);
                _this.reportPV();
                return;
            }
            if (lastPage) {
                lastPage.unload();
            } else {
                firstLoad = true;
            }
            runtime.env.page = page;
            page.load(action, datas);
            if (!firstLoad) {
                $(runtime).trigger('after_app_init');
                _this.reportPV(); //mar会在页面加载自动上报一次
            }
        });
    },
    initAppcache: function () {
        window.addEventListener('load', function (e) {
            window.applicationCache.addEventListener('updateready', function (e) {
                if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
                    window.applicationCache.swapCache();
                    window.location.reload();
                }

            }, false);
        }, false);
    },
    reportPV: function () {
        if (window.Mar && typeof Mar.PV === 'function') {
            Mar.Base.url = escape(location.href);
            Mar.PV();
        }
    }
};

module.exports = {
    init: function (appConfig) {
        Dispatcher.init(appConfig);
    }
};
