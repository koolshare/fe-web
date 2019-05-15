(function (angular, $) {
    'use strict';
    angular.module('FileManagerApp').controller('FileManagerCtrl', [
        '$scope', '$rootScope', '$window', '$translate', '$interval', 'fileManagerConfig', 'item', 'fileNavigator', 'apiMiddleware', 'cogradient',
        function ($scope, $rootScope, $window, $translate, $interval, fileManagerConfig, Item, FileNavigator, ApiMiddleware, Cogradient) {

            var $storage = $window.localStorage;
            $scope.config = fileManagerConfig;
            $scope.reverse = false;
            $scope.predicate = ['model.type', 'model.name'];
            $scope.order = function (predicate) {
                $scope.reverse = ($scope.predicate[1] === predicate) ? !$scope.reverse : false;
                $scope.predicate[1] = predicate;
            };
            $scope.query = '';
            $scope.fileNavigator = new FileNavigator();
            $scope.apiMiddleware = new ApiMiddleware();
            $scope.cogradient = new Cogradient();
            $scope.uploadFileList = [];
            $scope.viewTemplate = $storage.getItem('viewTemplate') || 'main-icons.html';
            $scope.fileList = [];
            $scope.temps = [];
            $scope.historyTask = [];
            $scope.isPc = IsPC();
            $scope.selectIndex = undefined;
            $scope.dropdownIndex = undefined;

            function IsPC() {
                var userAgentInfo = navigator.userAgent;
                var Agents = new Array('Android', 'iPhone', 'SymbianOS', 'Windows Phone', 'iPad', 'iPod');
                var flag = true;
                for (var v = 0; v < Agents.length; v++) {
                  if (userAgentInfo.indexOf(Agents[v]) > 0) { flag = false; break; }
                }
                return flag;
            }

            $scope.$watch('temps', function () {
                if ($scope.singleSelection()) {
                    $scope.temp = $scope.singleSelection();
                } else {
                    $scope.temp = new Item({
                        rights: 644
                    });
                    $scope.temp.multiple = true;
                }
                $scope.temp.revert();
            });

            $scope.fileNavigator.onRefresh = function () {
                $scope.temps = [];
                $scope.query = '';
                $scope.selectIndex = undefined;
                $rootScope.selectedModalPath = $scope.fileNavigator.currentPath;
            };

            $scope.setTemplate = function (name) {
                $storage.setItem('viewTemplate', name);
                $scope.viewTemplate = name;
            };

            $scope.changeLanguage = function (locale) {
                if (locale) {
                    $storage.setItem('language', locale);
                    return $translate.use(locale);
                }
                $translate.use($storage.getItem('language') || fileManagerConfig.defaultLang);
            };

            $scope.isSelected = function (item) {
                return $scope.temps.indexOf(item) !== -1;
            };

            $scope.showContextMenuInMobile = function ($event) {
                $event.stopPropagation();
                var menu = $('#context-menu');
                var item = $('.main-navigation .main-item')[$scope.selectIndex];
                var pos = item.getBoundingClientRect();

                menu.hide().css({
                  left: pos.left + 30,
                  top: pos.top + 20
                }).appendTo('body').show();
            };

            $scope.clickContainer = function() {
              $('#context-menu').hide();
            };

            $scope.selectOrUnselect = function (item, $event, index) {
                var indexInTemp = $scope.temps.indexOf(item);
                var isRightClick = $event && $event.which == 3;

                if ($event && $event.target.hasAttribute('prevent')) {
                    $scope.temps = [];
                    return;
                }
                if (!item || (isRightClick && $scope.isSelected(item))) {
                    return;
                }
                if ($event && $event.shiftKey && !isRightClick) {
                    var list = $scope.fileList;
                    var indexInList = list.indexOf(item);
                    var lastSelected = $scope.temps[0];
                    var i = list.indexOf(lastSelected);
                    var current = undefined;
                    if (lastSelected && list.indexOf(lastSelected) < indexInList) {
                        $scope.temps = [];
                        while (i <= indexInList) {
                            current = list[i];
                            !$scope.isSelected(current) && $scope.temps.push(current);
                            i++;
                        }
                        return;
                    }
                    if (lastSelected && list.indexOf(lastSelected) > indexInList) {
                        $scope.temps = [];
                        while (i >= indexInList) {
                            current = list[i];
                            !$scope.isSelected(current) && $scope.temps.push(current);
                            i--;
                        }
                        return;
                    }
                }
                if ($event && !isRightClick && ($event.ctrlKey || $event.metaKey)) {
                    $scope.isSelected(item) ? $scope.temps.splice(indexInTemp, 1) : $scope.temps.push(item);
                    return;
                }

                if(!isRightClick && !$scope.isPc) {
                  $scope.selectIndex = index;
                }
                $scope.temps = [item];
            };

            $scope.singleSelection = function () {
                return $scope.temps.length === 1 && $scope.temps[0];
            };

            $scope.totalSelecteds = function () {
                return {
                    total: $scope.temps.length
                };
            };

            $scope.selectionHas = function (type) {
                return $scope.temps.find(function (item) {
                    return item && item.model.type === type;
                });
            };

            $scope.prepareNewFolder = function () {
                var item = new Item(null, $scope.fileNavigator.currentPath);
                $scope.temps = [item];
                return item;
            };

            $scope.smartClick = function (item) {
                var pick = $scope.config.allowedActions.pickFiles;
                if (item.isFolder()) {
                    return $scope.fileNavigator.folderClick(item);
                }

                if (typeof $scope.config.pickCallback === 'function' && pick) {
                    var callbackSuccess = $scope.config.pickCallback(item.model);
                    if (callbackSuccess === true) {
                        return;
                    }
                }

                if (item.isImage()) {
                    if ($scope.config.previewImagesInModal) {
                        return $scope.openImagePreview(item);
                    }
                    return $scope.apiMiddleware.download(item, true);
                }

                if (item.isVideo()) {
                    if ($scope.config.previewVideosInModal) {
                        return $scope.openVideoPreview(item);
                    }
                    return $scope.apiMiddleware.download(item, true);
                }

                if (item.isEditable()) {
                    return $scope.openEditItem(item);
                }
            };

            $scope.openImagePreview = function () {
                var item = $scope.singleSelection();
                $scope.apiMiddleware.apiHandler.inprocess = true;
                $scope.modal('imagepreview', null, true)
                    .find('#imagepreview-target')
                    .attr('src', $scope.apiMiddleware.getUrl(item))
                    .unbind('load error')
                    .on('load error', function () {
                        $scope.apiMiddleware.apiHandler.inprocess = false;
                        $scope.$apply();
                    });
            };

            $scope.openVideoPreview = function () {
                var item = $scope.singleSelection();
                $scope.apiMiddleware.apiHandler.inprocess = true;
                var item_url=$scope.apiMiddleware.getUrl(item);
                var index1=item_url.lastIndexOf('.');
                var index2=item_url.length;
                var postf=item_url.substring(index1+1,index2);//后缀名
                var strTem1=postf.toLocaleLowerCase();
                if('mp4'==strTem1){
                    // Play directly
                    $scope.modal('videopreview', null, true)
                        .find('#videopreview-target')
                        .attr('controls','controls')
                        .attr('autoplay','autoplay')
                        .attr('preload','auto')
                        .attr('src', item_url)
                        .unbind('load error')
                        .on('load error', function () {
                            $scope.apiMiddleware.apiHandler.inprocess = false;
                            $scope.$apply();
                        });

                } else {
                    var sfile = '/files';
                    item_url = item_url.slice(sfile.length);
                    if (/(iPhone|iPad|iPod|iOS)/i.test(navigator.userAgent)) {
                        // Use VLC to play
                        window.open('vlc://'+window.location.href+$scope.apiMiddleware.getUrl(item).slice(1));
                    } else {
                        item_url = '/res-video?path='+item_url+'&transcode=chromecast';
                        //alert(item_url);
                        $scope.modal('videopreview', null, true)
                            .find('#videopreview-target')
                            .attr('controls','controls')
                            .attr('autoplay','autoplay')
                            .attr('preload','auto')
                            .attr('src', item_url)
                            .unbind('load error')
                            .on('load error', function () {
                                $scope.apiMiddleware.apiHandler.inprocess = false;
                                $scope.$apply();
                            });
                    }
                }

            };

            $scope.openEditItem = function () {
                var item = $scope.singleSelection();
                $scope.apiMiddleware.getContent(item).then(function (data) {
                    item.tempModel.content = item.model.content = data.result;
                });
                $scope.modal('edit');
            };

            $scope.modal = function (id, hide, returnElement) {
                var element = $('#' + id);
                element.modal(hide ? 'hide' : 'show');
                $scope.apiMiddleware.apiHandler.error = '';
                $scope.apiMiddleware.apiHandler.asyncSuccess = false;
                return returnElement ? element : true;
            };

            $scope.modalWithPathSelector = function (id) {
                $rootScope.selectedModalPath = $scope.fileNavigator.currentPath;
                return $scope.modal(id);
            };

            $scope.isInThisPath = function (path) {
                var currentPath = $scope.fileNavigator.currentPath.join('/') + '/';
                return currentPath.indexOf(path + '/') !== -1;
            };

            $scope.isRootPath = function () {
                if ($scope.fileNavigator.currentPath && $scope.fileNavigator.currentPath.length == 0) {
                    return true;
                }
                return false;
            };

            $scope.edit = function () {
                $scope.apiMiddleware.edit($scope.singleSelection()).then(function () {
                    $scope.modal('edit', true);
                });
            };

            $scope.changePermissions = function () {
                $scope.apiMiddleware.changePermissions($scope.temps, $scope.temp).then(function () {
                    $scope.fileNavigator.refresh();
                    $scope.modal('changepermissions', true);
                });
            };

            $scope.download = function () {
                var item = $scope.singleSelection();
                if ($scope.selectionHas('dir')) {
                    return;
                }
                if (item) {
                    return $scope.apiMiddleware.download(item);
                }
                return $scope.apiMiddleware.downloadMultiple($scope.temps);
            };

            $scope.copy = function () {
                var item = $scope.singleSelection();
                if (item) {
                    var name = item.tempModel.name.trim();
                    var nameExists = $scope.fileNavigator.fileNameExists(name);
                    if (nameExists && validateSamePath(item)) {
                        $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                        return false;
                    }
                    if (!name) {
                        $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                        return false;
                    }
                }
                $scope.apiMiddleware.copy($scope.temps, $rootScope.selectedModalPath).then(function () {
                    $scope.fileNavigator.refresh();
                    $scope.modal('copy', true);
                });
            };

            $scope.compress = function () {
                var name = $scope.temp.tempModel.name.trim();
                var nameExists = $scope.fileNavigator.fileNameExists(name);

                if (nameExists && validateSamePath($scope.temp)) {
                    $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                    return false;
                }
                if (!name) {
                    $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                    return false;
                }

                $scope.apiMiddleware.compress($scope.temps, name, $rootScope.selectedModalPath).then(function () {
                    $scope.fileNavigator.refresh();
                    if (!$scope.config.compressAsync) {
                        return $scope.modal('compress', true);
                    }
                    $scope.apiMiddleware.apiHandler.asyncSuccess = true;
                }, function () {
                    $scope.apiMiddleware.apiHandler.asyncSuccess = false;
                });
            };

            $scope.extract = function () {
                var item = $scope.temp;
                var name = $scope.temp.tempModel.name.trim();
                var nameExists = $scope.fileNavigator.fileNameExists(name);

                if (nameExists && validateSamePath($scope.temp)) {
                    $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                    return false;
                }
                if (!name) {
                    $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                    return false;
                }

                $scope.apiMiddleware.extract(item, name, $rootScope.selectedModalPath).then(function () {
                    $scope.fileNavigator.refresh();
                    if (!$scope.config.extractAsync) {
                        return $scope.modal('extract', true);
                    }
                    $scope.apiMiddleware.apiHandler.asyncSuccess = true;
                }, function () {
                    $scope.apiMiddleware.apiHandler.asyncSuccess = false;
                });
            };

            $scope.remove = function () {
                $scope.apiMiddleware.remove($scope.temps).then(function () {
                    $scope.fileNavigator.refresh();
                    $scope.modal('remove', true);
                });
            };

            $scope.move = function () {
                var anyItem = $scope.singleSelection() || $scope.temps[0];
                if (anyItem && validateSamePath(anyItem)) {
                    $scope.apiMiddleware.apiHandler.error = $translate.instant('error_cannot_move_same_path');
                    return false;
                }
                $scope.apiMiddleware.move($scope.temps, $rootScope.selectedModalPath).then(function () {
                    $scope.fileNavigator.refresh();
                    $scope.modal('move', true);
                });
            };

            $scope.rsync = function () {
                var anyItem = $scope.singleSelection() || $scope.temps[0];
                if (anyItem && validateSamePath(anyItem)) {
                    $scope.apiMiddleware.apiHandler.error = $translate.instant('error_cannot_move_same_path');
                    return false;
                }
                $scope.apiMiddleware.rsync($scope.temps, $rootScope.selectedModalPath).then(function () {
                    $scope.fileNavigator.refresh();
                    $scope.modal('rsync', true);
                });
            };

            $scope.rename = function () {
                var item = $scope.singleSelection();
                var name = item.tempModel.name;
                var samePath = item.tempModel.path.join('') === item.model.path.join('');
                if (!name || (samePath && $scope.fileNavigator.fileNameExists(name))) {
                    $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                    return false;
                }
                $scope.apiMiddleware.rename(item).then(function () {
                    $scope.fileNavigator.refresh();
                    $scope.modal('rename', true);
                });
            };

            $scope.createFolder = function () {
                var item = $scope.singleSelection();
                var name = item.tempModel.name;
                if (!name || $scope.fileNavigator.fileNameExists(name)) {
                    return $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                }
                $scope.apiMiddleware.createFolder(item).then(function () {
                    $scope.fileNavigator.refresh();
                    $scope.modal('newfolder', true);
                });
            };

            $scope.addForUpload = function ($files) {
                $scope.uploadFileList = $scope.uploadFileList.concat($files);
                $scope.modal('uploadfile');
            };

            $scope.removeFromUpload = function (index) {
                $scope.uploadFileList.splice(index, 1);
            };

            $scope.uploadFiles = function () {
                $scope.apiMiddleware.upload($scope.uploadFileList, $scope.fileNavigator.currentPath).then(function () {
                    $scope.fileNavigator.refresh();
                    $scope.uploadFileList = [];
                    $scope.modal('uploadfile', true);
                }, function (data) {
                    var errorMsg = data.result && data.result.error || $translate.instant('error_uploading_files');
                    $scope.apiMiddleware.apiHandler.error = errorMsg;
                });
            };

            var validateSamePath = function (item) {
                var selectedPath = $rootScope.selectedModalPath.join('');
                var selectedItemsPath = item && item.model.path.join('');
                return selectedItemsPath === selectedPath;
            };

            var getQueryParam = function (param) {
                var found = $window.location.search.substr(1).split('&').filter(function (item) {
                    return param === item.split('=')[0];
                });
                return found[0] && found[0].split('=')[1] || undefined;
            };

            $scope.changeLanguage(getQueryParam('lang'));
            $scope.isWindows = getQueryParam('server') === 'Windows';
            $scope.fileNavigator.deviceList = JSON.parse(localStorage.getItem('deviceList'));
            $scope.fileNavigator.getCurrentDevices();

            //显示系统对话框
            // $scope.showSysteminfo = function () {
            //     if ($('#progress').css('display') == 'block'){
            //         $('#progress').toggle();
            //     }
            //     $('#systeminfo').toggle();
            //     if ($('#systeminfo').css('display') == 'block') {
            //         $scope.getSys();
            //         //$scope.timer = $interval(function () {
            //         //    $scope.getSys();
            //         //}, 5000);
            //     } else {
            //         //$interval.cancel($scope.timer);
            //     }
            // };

            //显示系统对话框
            $scope.showSysteminfo = function () {
                if ($('#progress').css('display') == 'block'){
                    $('#progress').toggle();
                }
                $('#systeminfo').toggle();
                if ($('#systeminfo').css('display') == 'block') {
                    $scope.getSys();
                    //$scope.timer = $interval(function () {
                    //    $scope.getSys();
                    //}, 5000);
                } else {
                    //$interval.cancel($scope.timer);
                }
            };

            //重新进行配置
            $scope.sysReconfig = function () {
                window.location.href='/static/config.html';
            };

            //获取系统状态信息
             $scope.getSys = function(){
                $.get('/api/routerInfo', function(result){
                    if(result.result) {
                        //get inner result
                        result = result.result;
                    }
                    $('#wtcp').text(result.natTcpExternalAddr);
                    $('#wudp').text(result.natUdpExternalAddr);
                    $('#ntcp').text(result.natTcpLocalAddr);
                    $('#nattype').text(result.natType);
                    $('#routerid').html('<a target="_blank" href="http://www.ddnsto.com:5000/desktop.html?ksdev='+result.routerId+'">'+result.routerId+'</a>');
                    $('#sharePath').text(result.sharePath);
                    $('#userToken').text(result.userToken);
                    $('#version').text(result.version);
                    var listHtml = '';
                    for (var i=0;i<result.routers.length; i++) {
                        if (result.routers[i]['routerId'] != result.routerId) {
                            listHtml+='<ul><li class="info">设备编号：'+result.routers[i]['routerId']+'</li>';
                            listHtml+='<li class="info">设备名称：'+result.routers[i]['name']+'</li>';
                            listHtml+='<li class="info">本地设备：'+result.routers[i]['useLan']+'</li>';
                            listHtml+='<li class="info">P2P类型：'+result.routers[i]['p2pType']+'</li>';
                            listHtml+='<li class="info">是否直连：'+result.routers[i]['useDirect']+'</li>';
                            listHtml+='<li class="info">正在连接：'+result.routers[i]['isConnect']+'</li></ul>';
                        }
                    }
                    $('#dlist').html(listHtml);
                });
                $.get('/static/version.json', function(result){
                    $('#newversion').text(result.version);
                });
                $.get('/api/createShare', function(result){
                    if (typeof(result.result) === 'string') {
                        $('#shareKey').text(result.result);
                    }
                });
            };
            //显示同步对话框
            $scope.showProgress = function () {
                if ($('#systeminfo').css('display') == 'block'){
                    $('#systeminfo').toggle();
                }
                $('#progress').toggle();
                if ($('#progress').css('display') == 'block' && $('.list-history').css('display') == 'block') {

                    $scope.cogradient.getCurrentDevice();
                    $scope.cogradient.refreshList();
                    $scope.timer = $interval(function () {
                        $scope.cogradient.refreshList();
                    }, 5000);
                } else {
                    $interval.cancel($scope.timer);
                }
            };
            //显示同步对话框
            $scope.showProgress = function () {
                if ($('#systeminfo').css('display') == 'block'){
                    $('#systeminfo').toggle();
                }
                $('#progress').toggle();
                if ($('#progress').css('display') == 'block' && $('.list-history').css('display') == 'block') {

                    $scope.cogradient.getCurrentDevice();
                    $scope.cogradient.refreshList();
                    $scope.timer = $interval(function () {
                        $scope.cogradient.refreshList();
                    }, 5000);
                } else {
                    $interval.cancel($scope.timer);
                }
                // if (index==4) {
                //   $scope.selectHistoryList('history-list')
                // }else {
                //   $scope.selectHistoryList('list-history')
                // }
            };
            //切换同步列表和同步历史界面
            $scope.selectHistoryList = function (className) {

                if (className == 'list-history') {
                    $scope.cogradient.refreshHistory();
                    $interval.cancel($scope.timer);
                } else {
                    $scope.timer = $interval(function () {
                        $scope.cogradient.refreshList();
                    }, 5000);
                    $scope.cogradient.refreshList();
                }
                $('.list-history').toggle();
                $('.history-list').toggle();
            };
            // 取消任务
            $scope.cancelTask = function (routerId, key) {
                var r = confirm('是否取消同步？');
                if (r == true) {
                    $scope.cogradient.cancelTask(routerId, key);
                } else {
                    //console.log('继续同步！');
                }
            };
            // 显示详情
            $scope.showDetail = function (routerId) {
                var array = $scope.cogradient.deviceLists;
                for (var i = 0, len = array.length; i < len; i++) {
                    if (array[i].routerId == routerId) {
                        array[i].hidden = !array[i].hidden;
                        if (array[i].hidden == false) {
                            $scope.cogradient.refreshList(routerId);
                        }
                    } else {
                        array[i].hidden = true;
                    }
                }
            };
            $scope.reSynchro = function (params) {
                var array = params.toPath.split('/');
                array.splice(array.length - 1);
                //var folderPath = params.toPath.split('/');
                var param = {
                    action: 'rsync',
                    items: [
                        '/' + params.fromRouter + params.fromPath
                    ],
                    newPath: '/' + params.toRouter + array.join('/')
                };
                var r = confirm('是否再次同步？');
                if (r == true) {
                    $scope.cogradient.reloadFile(param);
                    $scope.selectHistoryList('list-history', 'list');

                } else {
                    //console.log('再次同步取消');
                }
            };
        }
    ]);
})(angular, jQuery);
