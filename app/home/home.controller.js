(function () {

  'use strict';

  angular
    .module('app')
    .controller('HomeController', homeController)
    .filter('trustAsHtml',['$sce', function($sce) {
      return function(text) {
          return $sce.trustAsHtml(text);
      };
  }]);

  homeController.$inject = ['authService', '$scope', '$http', '$mdDialog', '$rootScope'];

  function homeController(authService, $scope, $http, $mdDialog, $rootScope) {

    var vm = this;
    vm.auth = authService;

    $scope.$watch(function(){
        return $rootScope.g_bIsAuth;
    }, function(newVal, oldVal){
        //do something with values
        if (newVal == true) getProfile();
    }) 


    const getProfile = () => {
        authService.getProfile(function(err, profile) {
            // vm.profile = profile;
            $scope.nickname = profile.nickname;
            $scope.email = profile.name;
            $scope.user = profile.sub.substr(6);
            $scope.isLogged = true;
            $scope.$apply();
        });
    }    

    getProfile();

    $rootScope.saveResult = (item) => {

        if(item.isSaved)
            return;
        
        $http({
            method : "POST",
            url : `https://19d7d779f8a502497d7eed2a5d035771.ap-southeast-2.aws.found.io:9243/saveddoc/_doc`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "user": $scope.user,
                "date_created": new Date().toJSON(),
                "categories": [...item._source.categories],
                "title": item._source.title,
                "text": item._source.text
            }
        }).then((response) => {
            
            item.isSaved = true;
        },(error) => {
            console.log(error.statusText);
        });
    }

    $rootScope.removeResult = (item) => {

        $http({
            method : "DELETE",
            url : `https://19d7d779f8a502497d7eed2a5d035771.ap-southeast-2.aws.found.io:9243/saveddoc/_doc/${item._id}`,
            headers: {
                'Content-Type': 'application/json'
            },
        }).then((response) => {
            
            for(let i=0; i<$scope.hits.length; i++) {
                if(response.data._id === $scope.hits[i]._id) {
                    $scope.hits.splice(i, 1);
                    break;
                }
            }
        },(error) => {
            console.log(error.statusText);
        });
    }

    $scope.openMenu = function($mdMenu, ev) {
        $mdMenu.open(ev);
    };

    $scope.logout = () => {
        $scope.isLogged = false;
        $scope.currentNavItem = 'web';
        vm.auth.logout();
    }
    

    $scope.profile = function(ev) {

        $mdDialog.show({
            parent: angular.element(document.querySelector('#searchHeader')),
            targetEvent: ev,
            template:
              '<md-dialog aria-label="List dialog">' +
              '<md-toolbar>' +
                '<div class="md-toolbar-tools">' +
                    '<h2>Profile</h2>' +
                    // '<md-button class="md-icon-button" ng-click="cancel()">' +
                    // '<md-icon md-svg-src="img/icons/ic_close_24px.svg" aria-label="Close dialog"></md-icon>' +
                    // '</md-button>' +
                '</div>' +
              '</md-toolbar>' +
              '  <md-dialog-content>'+
              '    <md-list>'+
              '      <md-list-item>'+
              '       <p>Email: {{email}}</p>' +
              '      '+
              '      </md-list-item>'+
              '      <md-list-item>'+
              '       <p>Nickname: {{nickname}}</p>' +
              '      '+
              '      </md-list-item>'+
              '    </md-list>'+
              '  </md-dialog-content>' +
              '  <md-dialog-actions>' +
              '    <md-button ng-click="closeDialog()" class="md-primary">' +
              '      Got it!' +
              '    </md-button>' +
              '  </md-dialog-actions>' +
              '</md-dialog>',
            locals: {
                email: $scope.email,
                nickname: $scope.nickname
            },
            controller: function($scope, $mdDialog, email, nickname) {
                $scope.email = email;
                $scope.nickname = nickname;
                $scope.closeDialog = function() {
                  $mdDialog.hide();
                }
            }
         });
      };

    $scope.from = 0;
    $scope.size = 12;
    $scope.categorySize = 5;

    $scope.isFacetFilter = false;
    $scope.isMultiFacetSelect = false;
    $scope.multiFacetsData = {};
    $scope.selectedMultiFacets = [];
    $scope.nickname = "";

    $scope.currentNavItem = 'web';

    var originatorEv;

    

    $scope.search = (isReplaceReturnedFacets=true) => {
        console.log($scope.query);
        if($scope.query === '')
            return;

        let requestObj = {
            method : "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "from": $scope.from,
                "size": $scope.size,
                "aggs" : {
                    "index" : {
                        "terms" : { "field" : "_index" }
                    },
                    "category" : {
                        "terms" : { 
                            "field" : "categories.keyword", 
                            "size" : $scope.categorySize
                        },
                        
                    }
                },
            }
        }

        if($scope.isMySaves) {

            requestObj.url = `https://19d7d779f8a502497d7eed2a5d035771.ap-southeast-2.aws.found.io:9243/saveddoc/_search`;

            if($scope.isFacetFilter) {
                requestObj.data.query = {
                    "bool" : {
                        "must": {
                            "match": {
                                "user": $scope.user
                            }
                        },
                        "filter":{
                            "terms":{
                                "categories.keyword": ($scope.isMultiFacetSelect ? $scope.selectedMultiFacets : [$scope.selectedFacetValue])
                            }
                        }
                    }
                };
            } else {
                requestObj.data.query = {
                    "bool" : {
                        "must": {
                            "match": {
                                "user": $scope.user
                            }
                        },
                    }
                };
            }
        } else {

            requestObj.url = `https://19d7d779f8a502497d7eed2a5d035771.ap-southeast-2.aws.found.io:9243/wiki/_search`;

            if($scope.isFacetFilter) {
                requestObj.data.query = {
                    "bool" : {
                        "must" : {
                            "query_string" : {
                                "fields" : ["text"],
                                "query" : $scope.query
                            }
                        },
                        "filter":{
                            "terms":{
                                "categories.keyword": ($scope.isMultiFacetSelect ? $scope.selectedMultiFacets : [$scope.selectedFacetValue])
                            }
                        }
                    }
                };
            } else {
                requestObj.data.query = {
                    "bool" : {
                        "must" : {
                            "query_string" : {
                                "fields" : ["text"],
                                "query" : $scope.query
                            }
                        },
                    }
                };
            }
        }
        

        $http(requestObj).then((response) => {
            
            const searchResult = response.data;
            const { category: categoryData, index } = searchResult.aggregations;
            const { buckets: categories } = categoryData;
            const { hits, total } = searchResult.hits;

            if(isReplaceReturnedFacets) {
                $scope.categories = categories;
                $("div.facet-container").find(".facet-option[data-facet-value='all']").addClass('selected');

                for(let i=0; i<categories.length; i++) {
                    $scope.multiFacetsData[categories[i].key] = false;
                }
            }
            $scope.index = index;
            $scope.hits = hits;
            $scope.total = total;

            $scope.isNotEmptyRecords = $scope.total > 0;
            $scope.page_row_count_summary = ($scope.from + 1) + '-' + ($scope.from + $scope.hits.length);
            $scope.isInvalidPrevPage = $scope.from <= 0;
            $scope.isInvalidNextPage = ($scope.from + $scope.hits.length) >= $scope.total;

            

        },(error) => {
            console.log(error.statusText);
        });

    }
    
    $scope.handleChangeQuery = () => {

        $scope.from = 0;
        $scope.isFacetFilter = false;
        $scope.isMultiFacetSelect = false;

        for(let val in $scope.multiFacetsData)
            $scope.multiFacetsData[val] = false;
        $scope.selectedMultiFacets = [];

        $scope.currentNavItem = 'web';
        $scope.isMySaves = false;
        $scope.search();
        
    }
    
    $scope.prevPage = () => {
        $scope.from -= $scope.size;
        $scope.search(false);
    }
    $scope.nextPage = () => {
        $scope.from += $scope.size;
        $scope.search(false);
    }

    $scope.goto = (page) => {
        
        $scope.from = 0;
        $scope.isFacetFilter = false;
        $scope.isMultiFacetSelect = false;

        for(let val in $scope.multiFacetsData)
            $scope.multiFacetsData[val] = false;
        $scope.selectedMultiFacets = [];

        if(page === 'mysaves') {
            $scope.isMySaves = true;
        }
        else
            $scope.isMySaves = false;
        
        $scope.search();
        
    }

    $scope.handleClickFacet = (e, facetValue) => {

        $scope.isMultiFacetSelect = false;
        for(let val in $scope.multiFacetsData) {
            $scope.multiFacetsData[val] = false;
            $scope.selectedMultiFacets = [];
        }

        $(e.target).parents(".facets").find('.facet-option').removeClass('selected');
        let el = angular.element(e.target.parentElement);
        el.addClass('selected');
        
        $scope.from = 0;

        let query = {};
        let requestObj = {
            method : "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "from": $scope.from,
                "size": $scope.size,
                query
            }
        };

        if($scope.isMySaves) {

            requestObj.url = `https://19d7d779f8a502497d7eed2a5d035771.ap-southeast-2.aws.found.io:9243/saveddoc/_search`

            if(facetValue === '_all') {
                requestObj.data.query = {
                    "bool":{
                        "must": {
                            "match": {
                                "user": $scope.user
                            }
                        },
                    }
                }
    
                $scope.isFacetFilter = false;
            } else {
                requestObj.data.query = {
                    "bool":{
                        "must": {
                            "match": {
                                "user": $scope.user
                            }
                        },
                        "filter":{
                            "terms":{
                                "categories.keyword": [
                                    facetValue
                                ]
                            }
                        }
                    }
                }
                $scope.isFacetFilter = true;
                $scope.selectedFacetValue = facetValue;
            }
        } else {

            requestObj.url = `https://19d7d779f8a502497d7eed2a5d035771.ap-southeast-2.aws.found.io:9243/wiki/_search`;

            if(facetValue === '_all') {
                requestObj.data.query = {
                    "bool":{
                        "must":{
                            "query_string" : {
                                "fields" : ["text"],
                                "query" : $scope.query
                            }
                        },
                    }
                }
    
                $scope.isFacetFilter = false;
            } else {
                requestObj.data.query = {
                    "bool":{
                        "must":{
                            "query_string" : {
                                "fields" : ["text"],
                                "query" : $scope.query
                            }
                        },
                        "filter":{
                            "terms":{
                                "categories.keyword": [
                                    facetValue
                                ]
                            }
                        }
                    }
                }
                $scope.isFacetFilter = true;
                $scope.selectedFacetValue = facetValue;
            }
        }     

        $http(requestObj).then((response) => {
            
            const searchResult = response.data;
            const { hits, total } = searchResult.hits;

            $scope.hits = hits;
            $scope.total = total;

            $scope.isNotEmptyRecords = $scope.total > 0;
            $scope.page_row_count_summary = ($scope.from + 1) + '-' + ($scope.from + $scope.hits.length);
            $scope.isInvalidPrevPage = $scope.from <= 0;
            $scope.isInvalidNextPage = ($scope.from + $scope.hits.length) >= $scope.total;

        },(error) => {
            console.log(error.statusText);
        });

    }

    $scope.handleClickMultiFacet = () => {
        $scope.isMultiFacetSelect = true;
        $("div.facet-container").find(".facet-option").removeClass('selected');

        $scope.selectedMultiFacets = [];
        for(let val in $scope.multiFacetsData) {
            if($scope.multiFacetsData[val])
                $scope.selectedMultiFacets.push(val);
        }

        $scope.from = 0;

        let requestObj = {
            method : "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "from": $scope.from,
                "size": $scope.size,
            }
        };

        if($scope.isMySaves) {

            requestObj.url = `https://19d7d779f8a502497d7eed2a5d035771.ap-southeast-2.aws.found.io:9243/saveddoc/_search`;

            if($scope.selectedMultiFacets.length === 0) {
                requestObj.data.query = {
                    "bool":{
                        "must": {
                            "match": {
                                "user": $scope.user
                            }
                        },
                    }
                }
    
                $scope.isFacetFilter = false;
            } else {
                requestObj.data.query = {
                    "bool":{
                        "must": {
                            "match": {
                                "user": $scope.user
                            }
                        },
                        "filter":{
                            "terms":{
                                "categories.keyword": $scope.selectedMultiFacets
                            }
                        }
                    }
                }
                $scope.isFacetFilter = true;
            }
        } else {

            requestObj.url = `https://19d7d779f8a502497d7eed2a5d035771.ap-southeast-2.aws.found.io:9243/wiki/_search`;

            if($scope.selectedMultiFacets.length === 0) {
                requestObj.data.query = {
                    "bool":{
                        "must":{
                            "query_string" : {
                                "fields" : ["text"],
                                "query" : $scope.query
                            }
                        },
                    }
                }
    
                $scope.isFacetFilter = false;
            } else {
                requestObj.data.query = {
                    "bool":{
                        "must":{
                            "query_string" : {
                                "fields" : ["text"],
                                "query" : $scope.query
                            }
                        },
                        "filter":{
                            "terms":{
                                "categories.keyword": $scope.selectedMultiFacets
                            }
                        }
                    }
                }
                $scope.isFacetFilter = true;
            }
        }

        $http(requestObj).then((response) => {
            
            const searchResult = response.data;
            const { hits, total } = searchResult.hits;

            $scope.hits = hits;
            $scope.total = total;

            $scope.isNotEmptyRecords = $scope.total > 0;
            $scope.page_row_count_summary = ($scope.from + 1) + '-' + ($scope.from + $scope.hits.length);
            $scope.isInvalidPrevPage = $scope.from <= 0;
            $scope.isInvalidNextPage = ($scope.from + $scope.hits.length) >= $scope.total;

        },(error) => {
            console.log(error.statusText);
        });
    }

    
  }

})();