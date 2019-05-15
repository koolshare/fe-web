(function (angular) {
    'use strict';
    angular.module('FileManagerApp').service('cogradient', [
        'apiMiddleware',
        function (ApiMiddleware) {
            var Cogradient = function () {
                this.apiMiddleware = new ApiMiddleware();
                this.requesting = false;
                this.historyList = [];
                this.list = [];
                this.deviceLists = [];
                this.device = {};
                this.error = '';
                this.testArray = [{
                        'key': '/test11-13/test/[无心]第02集v2_bd.mp4',
                        'parentKey': '',
                        'fromRouter': 'C494ACB40260',
                        'fromRouterName': '',
                        'fromPath': '/[无心]第02集v2_bd.mp4',
                        'toPath': '/test11-13/test/[无心]第02集v2_bd.mp4',
                        'toRouter': '8B46EC49E550',
                        'toRouterName': '',
                        'progress': 48,
                        'downloadSpeed': 0,
                        'uploadSpeed': 262994,
                        'isDir': false,
                        'error': '',
                        'childs': null
                    },
                    {
                        'key': '/test11-13/test/hello',
                        'parentKey': '',
                        'fromRouter': 'C494ACB40260',
                        'fromRouterName': '',
                        'fromPath': '/test',
                        'toPath': '/test11-13/test/test',
                        'toRouter': '8B46EC49E550',
                        'toRouterName': '',
                        'progress': 89,
                        'downloadSpeed': 20,
                        'uploadSpeed': 150482,
                        'isDir': true,
                        'error': '',
                        'childs': [{
                                'key': '/test11-13/test/test/hello.exe',
                                'parentKey': '/test11-13/test/test',
                                'fromRouter': 'C494ACB40260',
                                'fromRouterName': '',
                                'fromPath': '/test/client-11-11.exe',
                                'toPath': '/test11-13/test/test/client-11-11.exe',
                                'toRouter': '8B46EC49E550',
                                'toRouterName': '',
                                'progress': 7,
                                'downloadSpeed': 5,
                                'uploadSpeed': 36050,
                                'isDir': false,
                                'error': '',
                                'childs': null
                            },
                            {
                                'key': '/test11-13/test/test/client-11-13.exe',
                                'parentKey': '/test11-13/test/test',
                                'fromRouter': 'C494ACB40260',
                                'fromRouterName': '',
                                'fromPath': '/test/client-11-13.exe',
                                'toPath': '/test11-13/test/test/client-11-13.exe',
                                'toRouter': '8B46EC49E550',
                                'toRouterName': '',
                                'progress': 7,
                                'downloadSpeed': 5,
                                'uploadSpeed': 36186,
                                'isDir': false,
                                'error': '',
                                'childs': null
                            },
                            {
                                'key': '/test11-13/test/test',
                                'parentKey': '',
                                'fromRouter': 'C494ACB40260',
                                'fromRouterName': '',
                                'fromPath': '/test222',
                                'toPath': '/test11-13/test/test',
                                'toRouter': '8B46EC49E550',
                                'toRouterName': '',
                                'progress': 80,
                                'downloadSpeed': 20,
                                'uploadSpeed': 10000,
                                'isDir': true,
                                'error': '',
                                'childs': [{
                                    'key': '/test11-13/test/test/client-11-11.exe',
                                    'parentKey': '/test11-13/test/test',
                                    'fromRouter': 'C494ACB40260',
                                    'fromRouterName': '',
                                    'fromPath': '/test/hello',
                                    'toPath': '/test11-13/test/test/client-11-11.exe',
                                    'toRouter': '8B46EC49E550',
                                    'toRouterName': '',
                                    'progress': 7,
                                    'downloadSpeed': 5,
                                    'uploadSpeed': 10000,
                                    'isDir': false,
                                    'error': '',
                                    'childs': null
                                }]
                            },
                            {
                                'key': '/test11-13/test/test/client-1117.exe',
                                'parentKey': '/test11-13/test/test',
                                'fromRouter': 'C494ACB40260',
                                'fromRouterName': '',
                                'fromPath': '/test/client-1117.exe',
                                'toPath': '/test11-13/test/test/client-1117.exe',
                                'toRouter': '8B46EC49E550',
                                'toRouterName': '',
                                'progress': 7,
                                'downloadSpeed': 5,
                                'uploadSpeed': 37143,
                                'isDir': false,
                                'error': '',
                                'childs': null
                            }
                        ]
                    }
                ];
            };
            //异步处理，调用$q实现
            Cogradient.prototype.deferredHandler = function (data, deferred, code, defaultMsg) {
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
                    this.error = data.error;
                }
                if (!this.error && defaultMsg) {
                    this.error = defaultMsg;
                }
                if (this.error) {
                    return deferred.reject(data);
                }
                return deferred.resolve(data);
            };
            //废弃该方法
            Cogradient.prototype.lists = function () {
                return this.apiMiddleware.list([], this.deferredHandler.bind(this));
            };
            Cogradient.prototype.listTask = function (routerId) {
                return this.apiMiddleware.listTask(routerId, this.deferredHandler.bind(this));
            };
            Cogradient.prototype.historyTask = function () {
                return this.apiMiddleware.historyTask(this.deferredHandler.bind(this));
            };
            Cogradient.prototype.cancel = function (routerId, key) {
                return this.apiMiddleware.cancelTask(routerId, key, this.deferredHandler.bind(this));
            };
            Cogradient.prototype.getRouterInfo = function () {
                return this.apiMiddleware.getRouterInfo(this.deferredHandler.bind(this));
            };
            Cogradient.prototype.uploadFile = function (params) {
                return this.apiMiddleware.uploadFile(params, this.deferredHandler.bind(this));
            };
            //刷新同步列表
            Cogradient.prototype.refreshHistory = function () {
                var self = this;
                self.requesting = true;
                self.historyList = [];
                return self.historyTask().then(function (data) {
                    if (!data.success && data.success != 0) {
                        var r = confirm('请求失败，是否重试');
                        if (r == true) {
                            self.refreshHistory();
                        } else {
                            alert('取消请求！');
                        }
                    } else {

                        self.historyList = data.result;
                    }
                }).finally(function () {
                    self.requesting = false;
                });
            };
            //根据[routerId]，默认当前设备，刷新同步列表 5秒一次
            Cogradient.prototype.refreshList = function (routerId) {
                var self = this;
                var deviceId = routerId || self.device.routerId;
                // self.requesting = true;
                // self.list = [];

                // mock data
                // self.deviceLists[0].list = self.testArray;
                // self.deviceLists[0].child = true;
                // return;
                return self.listTask(deviceId).then(function (data) {
                    if (deviceId == self.device.routerId) {
                        self.list = data.result;
                        //console.log(JSON.stringify(self.list));
                    } else {
                        var array = self.deviceLists;
                        for (var i = 0, len = array.length; i < len; i++) {
                            if (array[i].routerId == routerId) {
                                array[i].list = data.result;
                                if (data.result == 0) {
                                    array[i].child = false;
                                } else {
                                    array[i].child = true;
                                }
                                break;
                            }
                        }
                    }
                }).finally(function () {
                    // self.requesting = false;
                });
            };
            //根据routerId和key取消任务
            Cogradient.prototype.cancelTask = function (routerId, key) {
                var self = this;
                self.requesting = true;
                return self.cancel(routerId, key).then(function () {
                    //console.log(data);
                }).finally(function () {
                    self.requesting = false;
                });
            };
            //获取当前设备信息
            Cogradient.prototype.getCurrentDevice = function () {
                var self = this;
                self.deviceLists = [];
                var array = JSON.parse(localStorage.getItem('deviceList'));
                for (var i = 0, len = array.length; i < len; i++) {
                    if (array[i].isCurrentDevice) {
                        self.device = {
                            routerId: array[i].routerId,
                            name: array[i].name
                        };
                        continue;
                    }
                    var o = {};
                    o.routerId = array[i].routerId;
                    o.name = array[i].name;
                    o.hidden = true;
                    o.list = [];
                    o.child = false;
                    self.deviceLists.push(o);
                }
            };
            Cogradient.prototype.reloadFile = function (param) {
                var self = this;
                self.requesting = true;
                return self.uploadFile(param).then(function () {
                    //console.log(JSON.stringify(data));
                }).finally(function () {
                    self.requesting = false;
                });
            };
            return Cogradient;
        }
    ]);
})(angular);
