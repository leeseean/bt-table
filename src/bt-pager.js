﻿(function (angular) {

    var tableModule = angular.module('bt-table')

    tableModule
        .controller('btPagerController', ['$scope', '$attrs', '$parse', '$timeout', function ($scope, $attrs, $parse, $timeout) {
            var self = this,
                ngModelCtrl = { $setViewValue: angular.noop }, // nullModelCtrl
                setNumPages = $attrs.numPages ? $parse($attrs.numPages).assign : angular.noop;

            this.init = function (ngModelCtrl_, config) {
                ngModelCtrl = ngModelCtrl_;
                this.config = config;

                ngModelCtrl.$render = function () {
                    self.render();
                };

                if ($scope.itemsPerPage) {
                    //$scope.$parent.$watch('itemsPerPage', function (value) {
                    //    $scope.itemsPerPage = parseInt(value, 10);
                    //    $scope.totalPages = self.calculateTotalPages();
                    //});
                } else {
                    $scope.itemsPerPage = config.itemsPerPage;
                }
            };

            this.calculateTotalPages = function () {
                var totalPages = $scope.itemsPerPage < 1 ? 1 : Math.ceil($scope.totalItems / $scope.itemsPerPage);
                return Math.max(totalPages || 0, 1);
            };

            this.render = function () {
                $scope.page = parseInt(ngModelCtrl.$viewValue, 10) || 1;
            };

            $scope.selectPage = function (page) {
                if ($scope.page !== page && page > 0 && page <= $scope.totalPages) {
                    ngModelCtrl.$setViewValue(page);
                    ngModelCtrl.$render();

                    if (angular.isFunction($scope.pageChanged)) {
                        $scope.pageChanged();
                    }
                }
            };

            $scope.setPageSize = function (size) {
                if ($scope.itemsPerPage !== size && size > 0) {
                    $scope.itemsPerPage = size;
                }
            };

            $scope.getText = function (key) {
                return $scope[key + 'Text'] || self.config[key + 'Text'];
            };

            //page_size changed
            $scope.$watch('itemsPerPage', function (newValue, oldValue) {
                //if(newValue === oldValue) return
                $scope.totalPages = self.calculateTotalPages()
            })

            //total_result changed
            $scope.$watch('totalItems', function (newValue, oldValue) {
                $scope.totalPages = self.calculateTotalPages()
            })

            var change_state = 0

            $scope.$watch('totalPages', function (value, oldValue) {
                setNumPages($scope.$parent, value); // Readonly variable

                if ($scope.page > value) {
                    $scope.selectPage(value);
                } else if (angular.isFunction(ngModelCtrl.$render)) {
                    ngModelCtrl.$render();

                    if (change_state === 0) {
                        change_state = 1
                    }
                    else if(change_state === 1) {
                        change_state = 2
                        return
                    }

                    if (angular.isFunction($scope.pageChanged)) {
                        $scope.pageChanged()
                    }
                }
            })

            $scope.getCurrentCount = function () {
                return Math.min($scope.totalItems, $scope.page * $scope.itemsPerPage);
            };
        }])
        .constant('btPagerConfig', {
            itemsPerPage: 10,
            boundaryLinks: false,
            directionLinks: true,
            firstText: 'First',
            previousText: 'Previous',
            nextText: 'Next',
            lastText: 'Last',
            numDisplayEntries: 6, //连续分页主体部分分页条目数
            numEdgeEntries: 2,   //两侧首尾分页条目数
            rotate: true
        })
        .directive('btPager', ['$parse', 'btPagerConfig', function ($parse, paginationConfig) {
            return {
                restrict: 'EA',
                scope: {
                    itemsPerPage: '=',
                    totalItems: '=',
                    pageChanged: '&?',
                    firstText: '@',
                    previousText: '@',
                    nextText: '@',
                    lastText: '@'
                },
                require: ['btPager', '?ngModel'],
                controller: 'btPagerController',
                templateUrl: require('./bt-pager.html'),
                replace: true,
                link: function (scope, element, attrs, ctrls) {
                    var paginationCtrl = ctrls[0], ngModelCtrl = ctrls[1];

                    if (!ngModelCtrl) {
                        return; // do nothing if no ng-model
                    }

                    // Setup configuration parameters
                    var maxSize = angular.isDefined(attrs.maxSize) ? scope.$parent.$eval(attrs.maxSize) : paginationConfig.maxSize,
                        rotate = angular.isDefined(attrs.rotate) ? scope.$parent.$eval(attrs.rotate) : paginationConfig.rotate;
                    scope.boundaryLinks = angular.isDefined(attrs.boundaryLinks) ? scope.$parent.$eval(attrs.boundaryLinks) : paginationConfig.boundaryLinks;
                    scope.directionLinks = angular.isDefined(attrs.directionLinks) ? scope.$parent.$eval(attrs.directionLinks) : paginationConfig.directionLinks;

                    var num_display_entries = angular.isDefined(attrs.numDisplayEntries) ? scope.$parent.$eval(attrs.numDisplayEntries) : paginationConfig.numDisplayEntries,
                        num_edge_entries = angular.isDefined(attrs.numEdgeEntries) ? scope.$parent.$eval(attrs.numEdgeEntries) : paginationConfig.numEdgeEntries;

                    paginationCtrl.init(ngModelCtrl, paginationConfig);

                    if (attrs.maxSize) {
                        scope.$parent.$watch($parse(attrs.maxSize), function (value) {
                            maxSize = parseInt(value, 10);
                            paginationCtrl.render();
                        });
                    }

                    // Create page object used in template
                    function makePage(number, text, isActive) {
                        return {
                            number: number,
                            text: text,
                            active: isActive,
                            disabled: text == '...',
                        };
                    }

                    function getPages2(currentPage, totalPages) {
                        var ret = [];
                        var num_edge_entries = 2;
                        var np = totalPages;
                        var interval = getInterval(currentPage - 1, totalPages);

                        // Generate starting points
                        if (interval[0] > 0 && num_edge_entries > 0) {
                            var end = Math.min(num_edge_entries, interval[0]);
                            for (var i = 0; i < end; i++) {
                                var page = makePage(i + 1, i + 1, (i + 1) === currentPage);
                                ret.push(page);
                            }
                            if (num_edge_entries < interval[0]) {
                                var page = makePage(-1, '...', false);
                                ret.push(page);
                            }
                        }
                        // Generate interval links
                        for (var i = interval[0]; i < interval[1]; i++) {
                            var page = makePage(i + 1, i + 1, (i + 1) === currentPage);
                            ret.push(page);
                        }
                        // Generate ending points
                        if (interval[1] < np && num_edge_entries > 0) {
                            if (np - num_edge_entries > interval[1]) {
                                var page = makePage(-1, '...', false);
                                ret.push(page);
                            }
                            var begin = Math.max(np - num_edge_entries, interval[1]);
                            for (var i = begin; i < np; i++) {
                                var page = makePage(i + 1, i + 1, (i + 1) === currentPage);
                                ret.push(page);
                            }
                        }

                        return ret;
                    }

                    function getPages(currentPage, totalPages) {
                        var pages = [];

                        // Default page limits
                        var startPage = 1, endPage = totalPages;
                        var isMaxSized = (angular.isDefined(maxSize) && maxSize < totalPages);

                        // recompute if maxSize
                        if (isMaxSized) {
                            if (rotate) {
                                // Current page is displayed in the middle of the visible ones
                                startPage = Math.max(currentPage - Math.floor(maxSize / 2), 1);
                                endPage = startPage + maxSize - 1;

                                // Adjust if limit is exceeded
                                if (endPage > totalPages) {
                                    endPage = totalPages;
                                    startPage = endPage - maxSize + 1;
                                }
                            } else {
                                // Visible pages are paginated with maxSize
                                startPage = ((Math.ceil(currentPage / maxSize) - 1) * maxSize) + 1;

                                // Adjust last page if limit is exceeded
                                endPage = Math.min(startPage + maxSize - 1, totalPages);
                            }
                        }

                        // Add page number links
                        for (var number = startPage; number <= endPage; number++) {
                            var page = makePage(number, number, number === currentPage);
                            pages.push(page);
                        }

                        // Add links to move between page sets
                        if (isMaxSized && !rotate) {
                            if (startPage > 1) {
                                var previousPageSet = makePage(startPage - 1, '...', false);
                                pages.unshift(previousPageSet);
                            }

                            if (endPage < totalPages) {
                                var nextPageSet = makePage(endPage + 1, '...', false);
                                pages.push(nextPageSet);
                            }
                        }

                        return pages;
                    }

                    /**
                    * Calculate start and end point of pagination links depending on
                    * currentPage and num_display_entries.
                    * @return {Array}
                    */
                    function getInterval(currentPage, pageCount) {
                        //var num_display_entries = 6;
                        //var num_edge_entries = 2;

                        var ne_half = Math.ceil(num_display_entries / 2);
                        var np = pageCount;
                        var upper_limit = np - num_display_entries;
                        var start = currentPage > ne_half ? Math.max(Math.min(currentPage - ne_half, upper_limit), 0) : 0;
                        var end = currentPage > ne_half ? Math.min(currentPage + ne_half, np) : Math.min(num_display_entries, np);
                        return [start, end];
                    }

                    var originalRender = paginationCtrl.render;
                    paginationCtrl.render = function () {
                        originalRender();
                        if (scope.page > 0 && scope.page <= scope.totalPages) {
                            scope.pages = getPages2(scope.page, scope.totalPages);
                        }
                    }
                }
            }
        }])

})(angular)