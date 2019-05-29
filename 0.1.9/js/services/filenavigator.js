(function (angular) {
    'use strict';
    angular.module('FileManagerApp').service('fileNavigator', [
        'apiMiddleware', 'fileManagerConfig', 'item',
        function (ApiMiddleware, fileManagerConfig, Item) {

            var FileNavigator = function () {
                this.apiMiddleware = new ApiMiddleware();
                this.requesting = false;
                this.fileList = [];
                this.currentPath = this.getBasePath();
                this.history = [];
                this.error = '';
                this.deviceList = [];
                this.onRefresh = function () {};
            };

            FileNavigator.prototype.getBasePath = function () {
                var path = (fileManagerConfig.basePath || '').replace(/^\//, '');
                return path.trim() ? path.split('/') : [];
            };

            FileNavigator.prototype.deferredHandler = function (data, deferred, code, defaultMsg) {
                if (!data || typeof data !== 'object') {
                    this.error = 'Error %s - Bridge response error, please check the API docs or this ajax response.'.replace('%s', code);
                }
                if (code == 404) {
                    this.error = 'Error 404 - Backend bridge is not working, please check the ajax response.';
                }
                if (code == 200) {
                    this.error = null;
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

            FileNavigator.prototype.list = function () {
                return this.apiMiddleware.list(this.currentPath, this.deferredHandler.bind(this));
            };
            FileNavigator.prototype.getRouterInfo = function () {
                return this.apiMiddleware.getRouterInfo(this.deferredHandler.bind(this));
            };
            FileNavigator.prototype.refresh = function () {
                var self = this;
                var list = JSON.parse(localStorage.getItem('deviceList'));
                if (!self.currentPath.length) {
                    self.currentPath = this.getBasePath();
                }
                var path = self.currentPath.join('/');
                self.requesting = true;
                self.fileList = [];
                return self.list().then(function (data) {
                    self.fileList = (data.result || []).map(function (file) {
                        return new Item(file, self.currentPath);
                    });
                    for (var i = 0, len = list.length; i < len; i++) {
                        for (var j = 0, jLen = self.fileList.length; j < jLen; j++) {
                            if (list[i].routerId == self.fileList[j].model.name) {
                                self.fileList[j].model.key = list[i].name;
                                continue;
                            }
                        }
                    }
                    if (!path) {
                        self.getCurrentDevices();
                    }
                    self.buildTree(path);
                    self.onRefresh();
                }).finally(function () {
                    self.requesting = false;
                });
            };
            //获取当前在线设备信息
            FileNavigator.prototype.getCurrentDevices = function () {
                var self = this;
                self.requesting = true;
                return self.getRouterInfo().then(function (data) {
                    if(data.result) {
                        data = data.result;
                    }
                    var array = data.routers;
                    if(!array){
                        if (data.err === 'unready') {
                            alert('未初始化，请填写正确的信息');
                            window.location.href='/static/config.html';
                        } else {
                            alert('网络存在问题，请重试！');
                        }
                        return;
                    }else{
                        self.deviceList = [];
                        for (var i = 0, len = array.length; i < len; i++) {
                            var o = {};
                            o.routerId = array[i].routerId;
                            o.name = array[i].name;
                            if(data.routerId==array[i].routerId){
                                o.isCurrentDevice = true;
                            }else{
                                o.isCurrentDevice = false;
                            }
                            self.deviceList.push(o);
                        }
                    }
                    localStorage.setItem('deviceList', JSON.stringify(self.deviceList));
                    self.refresh2(self.deviceList);
                }).catch(function(error) {
                    if(error && error.error === 'login-require') {
                        alert('未登录，请登录再进行访问');
                        window.location.href='/static/config.html?nologin=1';
                    }
                }).finally(function () {
                    self.requesting = false;
                });
            };
            FileNavigator.prototype.refresh2 = function (list) {
                var self = this;
                if (!self.currentPath.length) {
                    self.currentPath = this.getBasePath();
                }
                var path = self.currentPath.join('/');
                self.requesting = true;
                self.fileList = [];
                return self.list().then(function (data) {
                    self.fileList = (data.result || []).map(function (file) {
                        return new Item(file, self.currentPath);
                    });
                    // 根据routerId相同进行赋名字
                    for(var i = 0,len = list.length;i < len; i++){
                        for(var j = 0,jLen = self.fileList.length; j < jLen; j++){
                            if(list[i].routerId == self.fileList[j].model.name){
                                self.fileList[j].model.key = list[i].name;
                                continue;
                            }
                        }
                    }
                    self.buildTree(path);
                    self.onRefresh();
                }).finally(function () {
                    self.requesting = false;
                });
            };

            FileNavigator.prototype.buildTree = function (path) {
                var flatNodes = [],
                    selectedNode = {};

                function recursive(parent, item, path) {
                    var absName = path ? (path + '/' + item.model.name) : item.model.name;
                    if (parent.name && parent.name.trim() && path.trim().indexOf(parent.name) !== 0) {
                        parent.nodes = [];
                    }
                    if (parent.name !== path) {
                        parent.nodes.forEach(function (nd) {
                            recursive(nd, item, path);
                        });
                    } else {
                        for (var e in parent.nodes) {
                            if (parent.nodes[e].name === absName) {
                                return;
                            }
                        }
                        parent.nodes.push({
                            item: item,
                            name: absName,
                            nodes: []
                        });
                    }

                    parent.nodes = parent.nodes.sort(function (a, b) {
                        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() === b.name.toLowerCase() ? 0 : 1;
                    });
                }

                function flatten(node, array) {
                    array.push(node);
                    for (var n in node.nodes) {
                        flatten(node.nodes[n], array);
                    }
                }

                function findNode(data, path) {
                    return data.filter(function (n) {
                        return n.name === path;
                    })[0];
                }

                //!this.history.length && this.history.push({name: '', nodes: []});
                !this.history.length && this.history.push({
                    name: this.getBasePath()[0] || '',
                    nodes: []
                });
                flatten(this.history[0], flatNodes);
                selectedNode = findNode(flatNodes, path);
                selectedNode && (selectedNode.nodes = []);

                for (var o in this.fileList) {
                    var item = this.fileList[o];
                    item instanceof Item && item.isFolder() && recursive(this.history[0], item, path);
                }
                for(var i = 0,iLen = this.history[0].nodes.length; i < iLen;i++){
                    for(var j = 0,jLen = this.deviceList.length; j < jLen; j++){
                        if (this.history[0].nodes[i].name == this.deviceList[j].routerId&&this.deviceList[j].isCurrentDevice){
                            var temp = this.history[0].nodes.splice(i,1);
                            this.history[0].nodes.unshift(temp[0]);
                            break;
                        }
                    }
                }
            };

            FileNavigator.prototype.folderClick = function (item) {
                this.currentPath = [];
                if (item && item.isFolder()) {
                    this.currentPath = item.model.fullPath().split('/').splice(1);
                }
                this.refresh();
            };

            FileNavigator.prototype.upDir = function () {
                if (this.currentPath[0]) {
                    this.currentPath = this.currentPath.slice(0, -1);
                    this.refresh();
                }
            };

            FileNavigator.prototype.goTo = function (index) {
                this.currentPath = this.currentPath.slice(0, index + 1);
                this.refresh();
            };

            FileNavigator.prototype.fileNameExists = function (fileName) {
                return this.fileList.find(function (item) {
                    return fileName && item.model.name.trim() === fileName.trim();
                });
            };

            FileNavigator.prototype.listHasFolders = function () {
                return this.fileList.find(function (item) {
                    return item.model.type === 'dir';
                });
            };

            FileNavigator.prototype.getCurrentFolderName = function () {
                return this.currentPath.slice(-1)[0] || '/';
            };

            return FileNavigator;
        }
    ]);
})(angular);
