(function (angular) {
    'use strict';
    angular.module('FileManagerApp').service('option', [
        'apiMiddleware',
        function (ApiMiddleware) {
            var Option = function () {
                this.apiMiddleware = new ApiMiddleware();
                this.requesting = false;
                this.isOptioned = true;
            };
            Option.prototype.setConfigs = function (params) {
                return this.apiMiddleware.setConfigs(params,this.deferredHandler.bind(this));
            };
            //异步处理，调用$q实现
            Option.prototype.deferredHandler = function (data, deferred, code, defaultMsg) {
                if (!data || typeof data !== 'object') {
                    this.error = 'Error %s - Bridge response error, please check the API docs or this ajax response.'.replace('%s', code);
                }
                if (code == 404) {
                    this.error = 'Error 404 - Backend bridge is not working, please check the ajax response.';
                }
                if (code == 200) {
                    this.error = null;
                }
                if (!this.error && data.result && data.result.error) {
                    this.error = data.result.error;
                }
                if (!this.error && data.error) {
                    this.error = data.error.message;
                }
                if (!this.error && defaultMsg) {
                    this.error = defaultMsg;
                }
                if (this.error) {
                    return deferred.reject(data);
                }
                return deferred.resolve(data);
            };
            Option.prototype.setConfig = function(config,callBack) {
                var self = this;
                self.requesting = true;
                return self.setConfigs(config).then(function (data) {
                    if(data.result.success){
                        self.isOptioned = false;
                        callBack();
                    }
                }).finally(function () {
                    self.requesting = false;
                });
            };
            Option.prototype.getConfig = function(){

                return JSON.parse(localStorage.getItem('token_path'));
            };
            return Option;
        }
    ]);
})(angular);
